-- DC Emlak — güvenlik sıkılaştırması 2 (0008): imza bağlantısı, imza kanıtı,
-- komisyon yazma yetkisi, bağlantı/dosya yolu doğrulaması, çoklu ofis üyeliği.

-- ---------------------------------------------------------------------------
-- 1) İmza bağlantısı sunucuda üretilir ve süresi dolar
-- ---------------------------------------------------------------------------
alter table document add column if not exists imza_token_expires_at timestamptz;

-- İstemci belirteci kendisi yazamaz (zayıf/tahmin edilebilir belirteç riskine karşı);
-- yalnızca open_for_signing() ile üretilir. 0007'deki document_guard güncellenir.
create or replace function document_guard() returns trigger
language plpgsql as $$
begin
  if not _is_client_role() then
    return new;
  end if;

  if new.office_id is distinct from old.office_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or new.sablon is distinct from old.sablon then
    raise exception 'Belgenin ofisi, oluşturanı, tarihi ve şablonu değiştirilemez' using errcode = '42501';
  end if;

  if old.durum = 'iptal' then
    raise exception 'İptal edilmiş belge değiştirilemez' using errcode = '42501';
  end if;

  if old.durum = 'imzalandi' then
    if new.durum <> 'iptal'
       or new.alanlar is distinct from old.alanlar
       or new.sablon_surum is distinct from old.sablon_surum
       or new.kural_surum is distinct from old.kural_surum
       or new.portfolio_id is distinct from old.portfolio_id
       or new.saklama_bitis is distinct from old.saklama_bitis
       or new.pdf_path is distinct from old.pdf_path then
      raise exception 'İmzalanmış belge değiştirilemez' using errcode = '42501';
    end if;
    if member_role_in(old.office_id) is distinct from 'broker' then
      raise exception 'İmzalanmış belgeyi yalnızca broker iptal edebilir' using errcode = '42501';
    end if;
    new.imza_token := null;
    new.imza_token_expires_at := null;
    return new;
  end if;

  if new.durum = 'imzalandi' and not exists (select 1 from signature s where s.document_id = old.id) then
    raise exception 'İmza kaydı olmadan belge imzalandı yapılamaz' using errcode = '42501';
  end if;

  -- Belirteç yalnızca open_for_signing() ile atanır; istemci yalnızca silebilir
  if new.imza_token is not null and new.imza_token is distinct from old.imza_token then
    raise exception 'İmza bağlantısı yalnızca sunucuda üretilir' using errcode = '42501';
  end if;
  if new.imza_token_expires_at is distinct from old.imza_token_expires_at and new.imza_token_expires_at is not null then
    raise exception 'İmza bağlantısının süresi istemciden değiştirilemez' using errcode = '42501';
  end if;
  -- İçerik değişirse açık imza bağlantısı geçersiz olur (imzalanan metin = gösterilen metin)
  if old.durum = 'imzada' and new.alanlar is distinct from old.alanlar then
    new.durum := 'taslak';
  end if;
  if new.durum <> 'imzada' then
    new.imza_token := null;
    new.imza_token_expires_at := null;
  end if;

  if old.saklama_bitis is not null and (new.saklama_bitis is null or new.saklama_bitis < old.saklama_bitis) then
    new.saklama_bitis := old.saklama_bitis;
  end if;
  return new;
end $$;

-- 256 bitlik rastgele belirteç (iki UUID v4'ün 244 rastgele biti + zaman bağımsız), 14 gün geçerli
create or replace function open_for_signing(p_doc uuid, p_gun int default 14)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_doc document%rowtype;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Oturum açmanız gerekiyor' using errcode = '28000';
  end if;
  select * into v_doc from document where id = p_doc for update;
  if not found or not is_member(v_doc.office_id) then
    raise exception 'Belge bulunamadı' using errcode = 'P0002';
  end if;
  if v_doc.durum not in ('taslak', 'imzada') then
    raise exception 'Bu belge imzaya açılamaz' using errcode = '22023';
  end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update document
     set durum = 'imzada',
         imza_token = v_token,
         imza_token_expires_at = now() + make_interval(days => least(greatest(coalesce(p_gun, 14), 1), 30))
   where id = p_doc;
  return v_token;
end $$;

revoke all on function open_for_signing(uuid, int) from public;
grant execute on function open_for_signing(uuid, int) to authenticated;

-- İmzalayana iç alanlar (_kisi_id vb.) gösterilmez; süresi dolan bağlantı çalışmaz
create or replace function get_document_for_signing(p_token text)
returns table (
  id uuid,
  sablon text,
  sablon_surum text,
  alanlar jsonb,
  durum text,
  unvan text,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select d.id, d.sablon, d.sablon_surum,
         coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(d.alanlar) e where left(e.key, 1) <> '_'), '{}'::jsonb),
         d.durum, o.unvan, d.created_at
  from document d
  join office o on o.id = d.office_id
  where p_token is not null
    and length(p_token) >= 32
    and d.imza_token = p_token
    and d.durum = 'imzada'
    and (d.imza_token_expires_at is null or d.imza_token_expires_at > now())
  limit 1
$$;

-- İmza kanıtı sunucuda üretilir: zaman damgası, cihaz bilgisi (User-Agent),
-- belge özet değeri (imzalanan kayıt içeriğinin SHA-256'sı), IP. İstemciden
-- yalnızca konum ve istemci tarafı özet (bilgi amaçlı) alınır.
create or replace function sign_document(
  p_token text,
  p_ad_soyad text,
  p_kanit jsonb,
  p_konum jsonb default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_doc document%rowtype;
  v_person uuid;
  v_konum jsonb;
  v_headers jsonb;
  v_ip text;
  v_ua text;
  v_ozet text;
  v_ekler jsonb;
begin
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('ok', false, 'hata', 'gecersiz_baglanti');
  end if;
  if p_ad_soyad is null or length(btrim(p_ad_soyad)) < 3 or length(p_ad_soyad) > 200 then
    return jsonb_build_object('ok', false, 'hata', 'ad_soyad');
  end if;
  if p_kanit is not null and pg_column_size(p_kanit) > 8192 then
    return jsonb_build_object('ok', false, 'hata', 'kanit_boyutu');
  end if;

  select * into v_doc from document
   where imza_token = p_token and durum = 'imzada'
     and (imza_token_expires_at is null or imza_token_expires_at > now())
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'hata', 'bulunamadi');
  end if;

  begin
    v_person := nullif(v_doc.alanlar->>'_kisi_id', '')::uuid;
  exception when others then
    v_person := null;
  end;
  if v_person is not null and not exists (select 1 from person p where p.id = v_person and p.office_id = v_doc.office_id) then
    v_person := null;
  end if;

  if p_konum is not null and jsonb_typeof(p_konum->'lat') = 'number' and jsonb_typeof(p_konum->'lng') = 'number'
     and (p_konum->>'lat')::numeric between -90 and 90 and (p_konum->>'lng')::numeric between -180 and 180 then
    v_konum := jsonb_build_object('lat', (p_konum->>'lat')::numeric, 'lng', (p_konum->>'lng')::numeric);
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_ip := nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  v_ua := left(coalesce(v_headers->>'user-agent', ''), 300);

  -- İmzalanan içerik: şablon + sürüm + alanlar (imza öncesi hâli)
  v_ozet := encode(sha256(convert_to(v_doc.sablon || '|' || v_doc.sablon_surum || '|' || v_doc.alanlar::text, 'UTF8')), 'hex');

  v_ekler := jsonb_build_object(
    'zaman_damgasi', to_char(now() at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI:SS') || ' (TSİ)',
    'belge_ozet_degeri', v_ozet,
    'cihaz_bilgisi', nullif(v_ua, '')
  );
  if v_konum is not null then
    v_ekler := v_ekler || jsonb_build_object('konum_enlem', v_konum->>'lat', 'konum_boylam', v_konum->>'lng');
  end if;
  v_ekler := jsonb_strip_nulls(v_ekler);

  insert into signature (document_id, person_id, yontem, imzalandi_at, ip, konum, kanit)
  values (
    v_doc.id, v_person, 'link', now(), v_ip, v_konum,
    jsonb_build_object(
      'ad_soyad', btrim(p_ad_soyad),
      'sunucu_zamani', now(),
      'belge_ozet_degeri', v_ozet,
      'cihaz_bilgisi', nullif(v_ua, ''),
      'istemci_sha256', left(coalesce(p_kanit->>'sha256', p_kanit->>'belge_ozet_degeri', ''), 128),
      'kvkk_onay', coalesce((p_kanit->>'kvkk_onay')::boolean, false),
      'okudum_onay', coalesce((p_kanit->>'okudum_onay')::boolean, false)
    )
  );

  update document
     set durum = 'imzalandi',
         imza_token = null,
         imza_token_expires_at = null,
         alanlar = alanlar || v_ekler
   where id = v_doc.id;

  return jsonb_build_object('ok', true, 'document_id', v_doc.id);
exception when invalid_text_representation or datatype_mismatch then
  return jsonb_build_object('ok', false, 'hata', 'gecersiz_veri');
end;
$$;

revoke all on function get_document_for_signing(text) from public;
revoke all on function sign_document(text, text, jsonb, jsonb) from public;
grant execute on function get_document_for_signing(text) to anon, authenticated;
grant execute on function sign_document(text, text, jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Komisyon: satırları broker / takım lideri yazar; kayıt tek işlemde
-- ---------------------------------------------------------------------------
drop policy if exists commission_line_rw on commission_line;
drop policy if exists commission_line_select on commission_line;
drop policy if exists commission_line_write on commission_line;

create policy commission_line_select on commission_line for select
  using (exists (select 1 from deal d where d.id = deal_id and is_member(d.office_id)));
create policy commission_line_write on commission_line for all
  using (exists (select 1 from deal d where d.id = deal_id and member_role_in(d.office_id) in ('broker', 'takim_lideri')))
  with check (exists (select 1 from deal d where d.id = deal_id and member_role_in(d.office_id) in ('broker', 'takim_lideri')));

-- Komisyon satırları ve paylaşım tek işlemde değiştirilir (yarım kayıt kalmaz).
-- p_lines: [{taraf, matrah, kdv}], p_splits: [{alici_rol, user_id, oran, tutar}]
create or replace function save_commission(p_deal uuid, p_lines jsonb, p_splits jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_office uuid;
  v_tahsil jsonb;
begin
  select office_id into v_office from deal where id = p_deal;
  if v_office is null or member_role_in(v_office) is distinct from 'broker' then
    raise exception 'Komisyon ve paylaşımı yalnızca broker kaydedebilir' using errcode = '42501';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_typeof(p_splits) <> 'array' then
    raise exception 'Geçersiz komisyon verisi' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_splits) s
    where (s->>'user_id') is not null
      and not exists (select 1 from office_member m where m.office_id = v_office and m.user_id = (s->>'user_id')::uuid)
  ) then
    raise exception 'Paylaşımdaki kişi ofis üyesi değil' using errcode = '22023';
  end if;

  -- Tahsilat bilgisi taraf bazında korunur
  select coalesce(jsonb_object_agg(taraf, tahsil_edildi), '{}'::jsonb) into v_tahsil
    from commission_line where deal_id = p_deal;

  delete from commission_line where deal_id = p_deal;
  delete from commission_split where deal_id = p_deal;

  insert into commission_line (deal_id, taraf, matrah, kdv, tahsil_edildi)
  select p_deal, l->>'taraf', (l->>'matrah')::numeric, (l->>'kdv')::numeric,
         coalesce((v_tahsil->>(l->>'taraf'))::boolean, false)
    from jsonb_array_elements(p_lines) l;

  insert into commission_split (deal_id, alici_rol, user_id, oran, tutar)
  select p_deal, s->>'alici_rol', nullif(s->>'user_id', '')::uuid, (s->>'oran')::numeric, (s->>'tutar')::numeric
    from jsonb_array_elements(p_splits) s;
end $$;

revoke all on function save_commission(uuid, jsonb, jsonb) from public;
grant execute on function save_commission(uuid, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Bağlantı ve dosya yolu doğrulaması (yalnızca yeni/değişen satırlar)
-- ---------------------------------------------------------------------------
alter table fsbo_listing drop constraint if exists fsbo_kaynak_url_http;
alter table fsbo_listing add constraint fsbo_kaynak_url_http
  check (kaynak_url is null or kaynak_url ~* '^https?://[^\s]+$') not valid;

-- Medya yalnızca ofis deposundaki yola işaret eder (dış adres → takip pikseli riski)
alter table media drop constraint if exists media_storage_path_format;
alter table media add constraint media_storage_path_format
  check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') not valid;

-- ---------------------------------------------------------------------------
-- 4) Bir kullanıcı aynı anda tek ofiste aktif üye olabilir
-- ---------------------------------------------------------------------------
create or replace function office_member_single_office() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.aktif and exists (
    select 1 from office_member m
    where m.user_id = new.user_id and m.aktif and m.office_id <> new.office_id
  ) then
    raise exception 'Kullanıcı zaten başka bir ofisin aktif üyesi' using errcode = '23505';
  end if;
  return new;
end $$;

drop trigger if exists office_member_single_office on office_member;
create trigger office_member_single_office before insert or update on office_member
  for each row execute function office_member_single_office();
revoke all on function office_member_single_office() from public;
