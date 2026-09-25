-- Güvenlik testi: yetki sınırlarını saldırgan gözüyle dener.
-- Her "HATA:" satırı bir açığın geri geldiği anlamına gelir. Sonda her şey geri alınır.
\set ON_ERROR_STOP on

begin;

-- Kullanıcılar: A ofisi broker'ı ve danışmanı, B ofisi broker'ı (başka kiracı)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'a-broker@test.local'),
  ('00000000-0000-4000-8000-0000000000a2', 'a-danisman@test.local'),
  ('00000000-0000-4000-8000-0000000000b1', 'b-broker@test.local');

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated, anon;

create or replace function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true)
$$;

set local role authenticated;

-- A ofisi + danışman daveti
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
insert into ctx values ('officeA', create_office('A Emlak', null, null, '1', '2030-01-01', 'profesyonel', 'A Broker', null)::text);
insert into ctx values ('inviteA', create_invite((select v from ctx where k = 'officeA')::uuid, 'danisman'));

-- B ofisi
select pg_temp.act('00000000-0000-4000-8000-0000000000b1');
insert into ctx values ('officeB', create_office('B Emlak', null, null, '2', '2030-01-01', 'temel', 'B Broker', null)::text);

-- Danışman A'ya katılır
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
select accept_invite((select v from ctx where k = 'inviteA'), 'A Danışman', null);

-- Broker A veri oluşturur
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
insert into person (office_id, owner_id, ad_soyad, telefon)
  values ((select v from ctx where k = 'officeA')::uuid, auth.uid(), 'Broker Müşterisi', '05320000001')
  returning id::text as person_a \gset
insert into ctx values ('personA', :'person_a');
insert into consent (person_id, amac, verildi, kaynak) values (:'person_a', 'ticari_ileti', true, 'otp');
insert into portfolio (office_id, owner_id, ilan_tipi, emlak_tipi, baslik, paylasim_seviyesi)
  values ((select v from ctx where k = 'officeA')::uuid, auth.uid(), 'satilik', 'daire', 'Özel portföy', 'ozel')
  returning id::text as portfolio_a \gset
insert into document (office_id, sablon, sablon_surum, kural_surum, alanlar, durum, created_by)
  values ((select v from ctx where k = 'officeA')::uuid, 'yetki-sozlesmesi', 't', 't', '{"ad":"X"}', 'taslak', auth.uid())
  returning id::text as doc_a \gset
insert into ctx values ('docA', :'doc_a');

-- ============================================================================
-- 1) Kiracılar arası izolasyon: B broker'ı A'nın hiçbir verisini göremez
-- ============================================================================
select pg_temp.act('00000000-0000-4000-8000-0000000000b1');
do $$
begin
  if exists (select 1 from person) then raise exception 'HATA: B, A''nın kişilerini görüyor'; end if;
  if exists (select 1 from portfolio) then raise exception 'HATA: B, A''nın portföylerini görüyor'; end if;
  if exists (select 1 from document) then raise exception 'HATA: B, A''nın belgelerini görüyor'; end if;
  if exists (select 1 from consent) then raise exception 'HATA: B, A''nın rızalarını görüyor'; end if;
  if (select count(*) from office) <> 1 then raise exception 'HATA: B başka ofisi görüyor'; end if;
  update person set ad_soyad = 'hack';
  if found then raise exception 'HATA: B, A''nın kişisini güncelledi'; end if;
  begin
    insert into person (office_id, owner_id, ad_soyad) values ((select v from ctx where k = 'officeA')::uuid, auth.uid(), 'Sızma');
    raise exception 'HATA: B, A ofisine kişi ekledi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform create_invite((select v from ctx where k = 'officeA')::uuid, 'broker');
    raise exception 'HATA: B, A ofisine davet oluşturdu';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ============================================================================
-- 2) Danışman A: yetki yükseltme ve ofis içi sınırlar
-- ============================================================================
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
do $$
declare n int;
begin
  if exists (select 1 from person) then raise exception 'HATA: danışman broker''ın müşterisini görüyor'; end if;
  if exists (select 1 from portfolio) then raise exception 'HATA: danışman özel portföyü görüyor'; end if;

  update office_member set rol = 'broker' where user_id = auth.uid();
  get diagnostics n = row_count;
  if n > 0 then raise exception 'HATA: danışman kendini broker yaptı'; end if;

  update office set unvan = 'hack';
  get diagnostics n = row_count;
  if n > 0 then raise exception 'HATA: danışman ofis bilgisini değiştirdi'; end if;

  begin
    perform create_invite((select v from ctx where k = 'officeA')::uuid, 'broker');
    raise exception 'HATA: danışman davet kodu oluşturdu';
  exception when insufficient_privilege then null;
  end;

  -- Başka kullanıcı adına denetim kaydı yazamaz
  begin
    insert into compliance_log (office_id, user_id, olay, varlik, karar, sonuclar, kural_surum)
    values ((select v from ctx where k = 'officeA')::uuid, '00000000-0000-4000-8000-0000000000a1', 'sahte', 'x', 'GEC', '[]', 't');
    raise exception 'HATA: danışman broker adına denetim kaydı yazdı';
  exception when insufficient_privilege then null;
  end;

  -- Sahte uzaktan imza ekleyemez
  begin
    insert into signature (document_id, yontem, imzalandi_at, kanit)
    values ((select v from ctx where k = 'docA')::uuid, 'link', now(), '{}');
    raise exception 'HATA: istemci link imzası üretebildi';
  exception when insufficient_privilege then null;
  end;

  -- İmza kaydı olmadan belgeyi "imzalandı" yapamaz
  begin
    update document set durum = 'imzalandi' where id = (select v from ctx where k = 'docA')::uuid;
    raise exception 'HATA: imzasız belge imzalandı yapıldı';
  exception when insufficient_privilege then null;
  end;

  -- Belge silinemez (yetki yok ya da 0 satır)
  begin
    delete from document where id = (select v from ctx where k = 'docA')::uuid;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'HATA: belge silindi'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;

-- İstemci imza belirtecini kendisi yazamaz (yalnızca open_for_signing)
do $$
begin
  update document set durum = 'imzada', imza_token = repeat('a', 40) where id = (select v from ctx where k = 'docA')::uuid;
  raise exception 'HATA: istemci kendi imza belirtecini yazdı';
exception when insufficient_privilege then null;
end $$;

-- Danışman komisyon yazamaz
do $$
begin
  begin
    perform save_commission(gen_random_uuid(), '[]', '[]');
    raise exception 'HATA: danışman komisyon kaydetti';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ============================================================================
-- 3) Uzaktan imza: anonim kullanıcı yalnızca belirteçle, bir kez imzalar
-- ============================================================================
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
update document set alanlar = alanlar || '{"_kisi_id":"gizli"}' where id = (select v from ctx where k = 'docA')::uuid;
insert into ctx values ('token', open_for_signing((select v from ctx where k = 'docA')::uuid));
do $$
begin
  if length((select v from ctx where k = 'token')) < 64 then raise exception 'HATA: imza belirteci kısa'; end if;
end $$;

reset role;
set local role anon;
select pg_temp.act('');
do $$
declare r jsonb;
begin
  begin
    if exists (select 1 from document) or exists (select 1 from person) or exists (select 1 from office) then
      raise exception 'HATA: anonim kullanıcı tablo okuyabiliyor';
    end if;
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from get_document_for_signing(repeat('Y', 43))) then raise exception 'HATA: yanlış belirteçle belge okundu'; end if;
  if not exists (select 1 from get_document_for_signing((select v from ctx where k = 'token'))) then raise exception 'HATA: doğru belirteçle belge okunamadı'; end if;
  if (select alanlar ? '_kisi_id' from get_document_for_signing((select v from ctx where k = 'token'))) then raise exception 'HATA: iç alanlar imzalayana gösterildi'; end if;
  r := sign_document((select v from ctx where k = 'token'), 'Müşteri Adı', '{"alanlar":{"zaman_damgasi":"sahte","sahte_alan":"y"},"belge_ozet_degeri":"sahte"}', null);
  if not (r->>'ok')::boolean then raise exception 'HATA: imza başarısız: %', r; end if;
  r := sign_document((select v from ctx where k = 'token'), 'Müşteri Adı', '{}', null);
  if (r->>'ok')::boolean then raise exception 'HATA: aynı bağlantıyla ikinci imza atıldı'; end if;
  begin
    r := sign_document(repeat('Q', 43), 'Müşteri', jsonb_build_object('p', repeat('x', 40000)), null);
  exception when check_violation then null;
  end;
end $$;

reset role;
set local role authenticated;

-- İmzalı belge: izin verilmeyen alan belgeye işlenmedi, içerik değiştirilemez, danışman iptal edemez
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
do $$
begin
  if (select alanlar ? 'sahte_alan' from document where id = (select v from ctx where k = 'docA')::uuid) then
    raise exception 'HATA: izinsiz kanıt alanı belgeye yazıldı';
  end if;
  if (select alanlar->>'zaman_damgasi' = 'sahte' or length(alanlar->>'belge_ozet_degeri') <> 64 from document where id = (select v from ctx where k = 'docA')::uuid) then
    raise exception 'HATA: imza kanıtı istemciden alındı';
  end if;
  begin
    update document set alanlar = '{"ad":"değişti"}' where id = (select v from ctx where k = 'docA')::uuid;
    raise exception 'HATA: imzalı belge değiştirildi';
  exception when insufficient_privilege then null;
  end;
  begin
    update document set durum = 'iptal' where id = (select v from ctx where k = 'docA')::uuid;
    raise exception 'HATA: danışman imzalı belgeyi iptal etti';
  exception when insufficient_privilege then null;
  end;
  begin
    update signature set kanit = '{}';
    delete from signature;
    if found then raise exception 'HATA: imza kaydı silindi'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;

-- ============================================================================
-- 4) Broker: rıza silinemez, gösterim belgesiz kapanmaz, paket deneme sonrası kilitli
-- ============================================================================
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
do $$
declare n int;
begin
  begin
    delete from consent;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'HATA: rıza kaydı silindi'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    update consent set verildi = true, amac = 'arama_kaydi';
    raise exception 'HATA: rıza içeriği değiştirildi';
  exception when insufficient_privilege then null;
  end;
  update consent set geri_alindi_at = now();  -- geri alma serbest
  begin
    insert into showing (office_id, portfolio_id, person_id, agent_id, planlanan, durum)
    values ((select v from ctx where k = 'officeA')::uuid,
            (select id from portfolio limit 1), (select v from ctx where k = 'personA')::uuid,
            auth.uid(), now(), 'tamamlandi');
    raise exception 'HATA: belgesiz gösterim tamamlandı';
  exception when check_violation then null;
  end;
  begin
    delete from office_member where user_id = auth.uid();
    raise exception 'HATA: broker kendi üyeliğini sildi';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Deneme süresi dolunca paket istemciden değiştirilemez
reset role;
update office set deneme_bitis = current_date - 1 where id = (select v from ctx where k = 'officeA')::uuid;
set local role authenticated;
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
do $$
begin
  update office set plan = 'premium';
  raise exception 'HATA: deneme sonrası paket bedelsiz yükseltildi';
exception when insufficient_privilege then null;
end $$;

-- Danışman müşteri silemez (yalnız broker)
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
insert into person (office_id, owner_id, ad_soyad) values ((select v from ctx where k = 'officeA')::uuid, auth.uid(), 'Danışman müşterisi');
do $$
declare n int;
begin
  delete from person;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'HATA: danışman müşteri sildi'; end if;
end $$;

reset role;
select 'Güvenlik testi başarılı' as sonuc;
rollback;
