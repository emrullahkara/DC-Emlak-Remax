-- DC Emlak — uzaktan imza (tasarım §5.8, §5.10, §11)
--
-- /imza/<token> sayfası giriş yapmamış (anon) kullanıcıya açılır. RLS gereği
-- anon kullanıcı hiçbir tabloyu okuyamaz; bu yüzden yalnızca belirteçle
-- çalışan iki SECURITY DEFINER fonksiyon açılır:
--   get_document_for_signing(token) → belge içeriği (yalnızca 'imzada' iken)
--   sign_document(token, ad, kanit, konum) → imza kaydı, belge 'imzalandi',
--                                           belirteç iptal (tek kullanımlık)
-- Fonksiyonlar tablo erişimi vermez; belirteci bilmeyen hiçbir belgeye ulaşamaz.

create index if not exists document_imza_token_idx on document (imza_token) where imza_token is not null;

-- İmza anında belgeye işlenebilecek kanıt alanları (şablon yer tutucuları)
create or replace function _signing_evidence_keys() returns text[]
language sql immutable as $$
  select array['zaman_damgasi','belge_ozet_degeri','konum_enlem','konum_boylam','konum_dogruluk_m','cihaz_bilgisi']
$$;

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
  select d.id, d.sablon, d.sablon_surum, d.alanlar, d.durum, o.unvan, d.created_at
  from document d
  join office o on o.id = d.office_id
  where p_token is not null
    and length(p_token) >= 32
    and d.imza_token = p_token
    and d.durum = 'imzada'
  limit 1
$$;

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
  v_ekler jsonb;
  v_konum jsonb;
  v_ip text;
begin
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('ok', false, 'hata', 'gecersiz_baglanti');
  end if;
  if p_ad_soyad is null or length(btrim(p_ad_soyad)) < 3 or length(p_ad_soyad) > 200 then
    return jsonb_build_object('ok', false, 'hata', 'ad_soyad');
  end if;

  select * into v_doc from document where imza_token = p_token and durum = 'imzada' for update;
  if not found then
    return jsonb_build_object('ok', false, 'hata', 'bulunamadi');
  end if;

  -- İmzalayan kişi (belge alanında _kisi_id olarak saklanır; aynı ofise ait olmalı)
  begin
    v_person := nullif(v_doc.alanlar->>'_kisi_id', '')::uuid;
  exception when others then
    v_person := null;
  end;
  if v_person is not null and not exists (select 1 from person p where p.id = v_person and p.office_id = v_doc.office_id) then
    v_person := null;
  end if;

  -- Konum yalnızca {lat, lng} sayılarıyla kabul edilir
  if p_konum is not null and jsonb_typeof(p_konum->'lat') = 'number' and jsonb_typeof(p_konum->'lng') = 'number' then
    v_konum := jsonb_build_object('lat', (p_konum->>'lat')::numeric, 'lng', (p_konum->>'lng')::numeric);
  end if;

  -- İstek IP'si (PostgREST başlıkları; yoksa boş)
  begin
    v_ip := split_part(coalesce(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ''), ',', 1);
  exception when others then
    v_ip := null;
  end;

  -- Belgeye işlenecek kanıt alanları: yalnızca izinli anahtarlar, metin olarak
  select coalesce(jsonb_object_agg(key, left(value #>> '{}', 500)), '{}'::jsonb)
    into v_ekler
    from jsonb_each(coalesce(p_kanit->'alanlar', '{}'::jsonb))
   where key = any(_signing_evidence_keys());

  insert into signature (document_id, person_id, yontem, imzalandi_at, ip, konum, kanit)
  values (
    v_doc.id,
    v_person,
    'link',
    now(),
    nullif(v_ip, ''),
    v_konum,
    (coalesce(p_kanit, '{}'::jsonb) - 'alanlar') || jsonb_build_object('ad_soyad', btrim(p_ad_soyad), 'sunucu_zamani', now())
  );

  update document
     set durum = 'imzalandi',
         imza_token = null,
         alanlar = alanlar || v_ekler
   where id = v_doc.id;

  return jsonb_build_object('ok', true, 'document_id', v_doc.id);
end;
$$;

revoke all on function get_document_for_signing(text) from public;
revoke all on function sign_document(text, text, jsonb, jsonb) from public;
revoke all on function _signing_evidence_keys() from public;
grant execute on function get_document_for_signing(text) to anon, authenticated;
grant execute on function sign_document(text, text, jsonb, jsonb) to anon, authenticated;
