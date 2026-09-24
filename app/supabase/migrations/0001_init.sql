-- DC Emlak — başlangıç şeması (tasarım §8)
-- Konum alanları {lat, lng} jsonb olarak tutulur; ileride PostGIS'e geçilebilir.
-- Çok kiracılı yapı: her kayıt bir ofise (office_id) aittir; erişim RLS ile
-- ofis üyeliğine göre sınırlanır. Danışman kendi kayıtlarını, broker/asistan
-- tüm ofis kayıtlarını görür.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Ofis, üyelik, abonelik
-- ---------------------------------------------------------------------------
create type plan_id as enum ('temel', 'profesyonel', 'premium');
create type member_role as enum ('broker', 'takim_lideri', 'danisman', 'asistan');

create table office (
  id uuid primary key default gen_random_uuid(),
  unvan text not null,
  vergi_no text,
  mersis_no text,
  yetki_belgesi_no text,
  yetki_belgesi_gecerlilik date,
  plan plan_id not null default 'temel',
  deneme_bitis date default (current_date + 14),
  varsayilan_ofis_payi numeric(5,2) not null default 50,
  created_at timestamptz not null default now()
);

create table office_member (
  office_id uuid not null references office(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol member_role not null default 'danisman',
  ad_soyad text not null,
  telefon text,
  yetki_belgesi_no text, -- sorumlu kişi belgesi
  aktif boolean not null default true,
  primary key (office_id, user_id)
);

-- Ücretli servis anahtarları (Supabase Vault ile şifrelenmesi önerilir)
create table office_integration (
  office_id uuid not null references office(id) on delete cascade,
  servis text not null check (servis in ('sms','whatsapp_api','yapay_zeka','e_imza','e_fatura')),
  saglayici text not null,
  anahtar_ref text not null, -- vault secret id, düz anahtar değil
  aktif boolean not null default true,
  primary key (office_id, servis)
);

-- ---------------------------------------------------------------------------
-- Kişiler, rıza (KVKK / İYS)
-- ---------------------------------------------------------------------------
create table person (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references office(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  ad_soyad text not null,
  telefon text,
  eposta text,
  tckn_sifreli bytea, -- alan düzeyinde şifreleme
  tipler text[] not null default '{}', -- alici, satici, kiraci, kiraya_veren, yatirimci...
  kaynak text,
  isi_skoru int,
  son_temas timestamptz,
  sonraki_adim text,
  sonraki_adim_tarihi timestamptz,
  created_at timestamptz not null default now()
);
create index person_office_idx on person(office_id);
create index person_ad_trgm on person using gin (ad_soyad gin_trgm_ops);
create index person_tel_idx on person(office_id, telefon);

create table consent (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references person(id) on delete cascade,
  amac text not null check (amac in ('aydinlatma','ticari_ileti','arama_kaydi','yurt_disi_aktarim','gorsel')),
  kanal text,
  verildi boolean not null,
  kaynak text not null, -- form, otp, islak_imza
  belge_id uuid,
  created_at timestamptz not null default now(),
  geri_alindi_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Portföy
-- ---------------------------------------------------------------------------
create type listing_type as enum ('satilik', 'kiralik', 'devren');
create type portfolio_stage as enum ('aday','degerleme','yetki','yayinda','teklif','kapora','tapu','tamamlandi','arsiv');

create table portfolio (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references office(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  asama portfolio_stage not null default 'aday',
  ilan_tipi listing_type not null,
  emlak_tipi text not null, -- daire, villa, arsa, dukkan...
  baslik text,
  aciklama text,
  fiyat numeric(14,2),
  para_birimi char(3) not null default 'TRY',
  brut_m2 numeric(8,2),
  net_m2 numeric(8,2),
  oda numeric(3,1),
  salon int,
  kat int,
  toplam_kat int,
  bina_yasi int,
  isinma text,
  aidat numeric(10,2),
  il text, ilce text, mahalle text, adres text,
  ada text, parsel text, bagimsiz_bolum text,
  tapu_turu text, -- kat_mulkiyeti, kat_irtifaki, hisseli, arsa
  iskan_var boolean,
  takyidat jsonb not null default '{}',
  imar jsonb not null default '{}',
  krediye_uygun boolean,
  ozellikler text[] not null default '{}',
  konum jsonb, -- {lat, lng}
  paylasim_seviyesi text not null default 'ofis' check (paylasim_seviyesi in ('ozel','ofis','ag')),
  saglik_skoru int,
  eids_durum text not null default 'yok' check (eids_durum in ('yok','talep_edildi','onaylandi','reddedildi')),
  eids_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index portfolio_office_stage_idx on portfolio(office_id, asama);

create table portfolio_owner (
  portfolio_id uuid not null references portfolio(id) on delete cascade,
  person_id uuid not null references person(id),
  hisse text,
  vekil boolean not null default false,
  primary key (portfolio_id, person_id)
);

create table portfolio_price_history (
  id bigserial primary key,
  portfolio_id uuid not null references portfolio(id) on delete cascade,
  fiyat numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table media (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolio(id) on delete cascade,
  tur text not null check (tur in ('foto','video','tur360','kat_plani','sanal_mobilya')),
  storage_path text not null,
  sira int not null default 0,
  temsili boolean not null default false -- sanal düzenleme ise ilanda "temsilidir"
);

-- ---------------------------------------------------------------------------
-- Belgeler ve sözleşmeler
-- ---------------------------------------------------------------------------
create table document (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references office(id) on delete cascade,
  sablon text not null, -- yetki-sozlesmesi, yer-gosterme-belgesi...
  sablon_surum text not null,
  kural_surum text not null, -- işlem anındaki parametre seti
  portfolio_id uuid references portfolio(id),
  alanlar jsonb not null default '{}',
  durum text not null default 'taslak' check (durum in ('taslak','imzada','imzalandi','iptal')),
  pdf_path text,
  saklama_bitis date, -- silme koruması
  imza_token text unique, -- uzaktan imza bağlantısı
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table signature (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references document(id) on delete cascade,
  person_id uuid references person(id),
  yontem text not null check (yontem in ('otp','e_imza','islak','link')),
  imzalandi_at timestamptz,
  ip text,
  konum jsonb,
  kanit jsonb not null default '{}'
);

create table authorization_contract (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolio(id) on delete cascade,
  document_id uuid references document(id),
  munhasir boolean not null default false,
  hizmet_bedeli_orani numeric(5,2),
  baslangic date not null,
  bitis date not null,
  imza_tarihi date,
  check (bitis > baslangic)
);

-- ---------------------------------------------------------------------------
-- Talep, eşleşme, gösterim, teklif, işlem
-- ---------------------------------------------------------------------------
create table search_profile (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references person(id) on delete cascade,
  ilan_tipi listing_type not null,
  butce_min numeric(14,2),
  butce_max numeric(14,2) not null,
  butce_tolerans numeric(5,2) default 5,
  ilceler text[] not null default '{}',
  mahalleler text[] not null default '{}',
  oda_min numeric(3,1),
  m2_min numeric(8,2),
  kredi_kullanacak boolean not null default false,
  kredi_on_onay boolean not null default false,
  zorunlu text[] not null default '{}',
  tercih text[] not null default '{}',
  aktif boolean not null default true
);

create table showing (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references office(id) on delete cascade,
  portfolio_id uuid not null references portfolio(id),
  person_id uuid not null references person(id),
  agent_id uuid not null references auth.users(id),
  planlanan timestamptz not null,
  durum text not null default 'planli' check (durum in ('planli','tamamlandi','iptal')),
  yer_gosterme_belgesi_id uuid references document(id),
  geri_bildirim jsonb,
  -- Uyum motoru: belge olmadan tamamlanamaz (uygulama katmanında da kontrol edilir)
  constraint showing_belge_zorunlu check (durum <> 'tamamlandi' or yer_gosterme_belgesi_id is not null)
);

create table offer (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolio(id) on delete cascade,
  person_id uuid not null references person(id),
  tutar numeric(14,2) not null,
  kosullar jsonb not null default '{}',
  gecerlilik timestamptz,
  durum text not null default 'acik' check (durum in ('acik','karsi_teklif','kabul','red','suresi_doldu')),
  onceki_teklif_id uuid references offer(id),
  created_at timestamptz not null default now()
);

create table deal (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references office(id) on delete cascade,
  portfolio_id uuid not null references portfolio(id),
  alici_id uuid references person(id),
  bedel numeric(14,2) not null,
  kapora numeric(14,2),
  tapu_tarihi date,
  kontrol_listesi jsonb not null default '[]',
  kural_surum text not null,
  created_at timestamptz not null default now()
);

create table commission_line (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deal(id) on delete cascade,
  taraf text not null,
  matrah numeric(14,2) not null,
  kdv numeric(14,2) not null,
  tahsil_edildi boolean not null default false
);

create table commission_split (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deal(id) on delete cascade,
  alici_rol text not null, -- ofis, danisman, portfoy_getiren, musteri_getiren, referans
  user_id uuid references auth.users(id),
  oran numeric(6,3) not null,
  tutar numeric(14,2) not null
);

-- ---------------------------------------------------------------------------
-- FSBO Radar
-- ---------------------------------------------------------------------------
create table fsbo_listing (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references office(id) on delete cascade,
  kaynak text not null, -- manuel, danisman_linki, is_ortagi_feed
  kaynak_url text,
  baslik text,
  fiyat numeric(14,2),
  ilce text, mahalle text,
  ilk_gorulme date not null default current_date,
  fiyat_dusum_sayisi int not null default 0,
  skor int,
  sinyaller text[] not null default '{}',
  atanan_id uuid references auth.users(id),
  durum text not null default 'yeni' check (durum in ('yeni','arandi','gorusuldu','degerleme','yetki_alindi','vazgecildi')),
  portfolio_id uuid references portfolio(id),
  aciklama text,
  foto_sayisi int,
  piyasaya_gore_fark numeric(6,2),
  malik_ad text,
  malik_telefon text
);

-- ---------------------------------------------------------------------------
-- Aktivite ve denetim izi
-- ---------------------------------------------------------------------------
create table activity (
  id bigserial primary key,
  office_id uuid not null references office(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  person_id uuid references person(id),
  portfolio_id uuid references portfolio(id),
  tur text not null, -- arama, mesaj, not, sesli_not, gosterim, eposta, gorev
  icerik text,
  vade timestamptz,
  tamamlandi boolean,
  created_at timestamptz not null default now()
);

create table compliance_log (
  id bigserial primary key,
  office_id uuid not null references office(id) on delete cascade,
  user_id uuid references auth.users(id),
  olay text not null,
  varlik text not null,
  varlik_id uuid,
  karar text not null check (karar in ('ENGELLE','UYAR','GEC')),
  sonuclar jsonb not null,
  kural_surum text not null,
  gerekce text, -- UYAR onaylandıysa kullanıcının gerekçesi
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigserial primary key,
  office_id uuid,
  user_id uuid,
  tablo text not null,
  kayit_id text,
  islem text not null,
  eski jsonb,
  yeni jsonb,
  created_at timestamptz not null default now()
);
-- Denetim izi değişmezdir
revoke update, delete on audit_log from authenticated, anon;
revoke update, delete on compliance_log from authenticated, anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
create or replace function is_member(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from office_member m where m.office_id = o and m.user_id = auth.uid() and m.aktif)
$$;

create or replace function member_role_in(o uuid) returns member_role
language sql stable security definer set search_path = public as $$
  select rol from office_member m where m.office_id = o and m.user_id = auth.uid() and m.aktif
$$;

-- Ofis geneli görünürlük: broker, takım lideri, asistan tüm kayıtları görür;
-- danışman kendi kayıtlarını ve 'ofis'/'ag' paylaşımlı portföyleri görür.
create or replace function can_see(o uuid, owner uuid) returns boolean
language sql stable as $$
  select is_member(o) and (owner = auth.uid() or member_role_in(o) in ('broker','takim_lideri','asistan'))
$$;

alter table office enable row level security;
alter table office_member enable row level security;
alter table office_integration enable row level security;
alter table person enable row level security;
alter table consent enable row level security;
alter table portfolio enable row level security;
alter table portfolio_owner enable row level security;
alter table portfolio_price_history enable row level security;
alter table media enable row level security;
alter table document enable row level security;
alter table signature enable row level security;
alter table authorization_contract enable row level security;
alter table search_profile enable row level security;
alter table showing enable row level security;
alter table offer enable row level security;
alter table deal enable row level security;
alter table commission_line enable row level security;
alter table commission_split enable row level security;
alter table fsbo_listing enable row level security;
alter table activity enable row level security;
alter table compliance_log enable row level security;
alter table audit_log enable row level security;

create policy office_read on office for select using (is_member(id));
create policy office_update on office for update using (member_role_in(id) = 'broker');
create policy member_read on office_member for select using (is_member(office_id));
create policy member_admin on office_member for all using (member_role_in(office_id) = 'broker');
create policy integration_admin on office_integration for all using (member_role_in(office_id) = 'broker');

create policy person_rw on person for all
  using (can_see(office_id, owner_id))
  with check (is_member(office_id) and owner_id = auth.uid());

create policy consent_rw on consent for all
  using (exists (select 1 from person p where p.id = person_id and can_see(p.office_id, p.owner_id)));

create policy portfolio_read on portfolio for select
  using (can_see(office_id, owner_id) or (is_member(office_id) and paylasim_seviyesi in ('ofis','ag')));
create policy portfolio_write on portfolio for insert with check (is_member(office_id) and owner_id = auth.uid());
create policy portfolio_update on portfolio for update using (can_see(office_id, owner_id));

-- Paylaşımlı portföyde malik iletişimi yalnızca sahibine/yöneticiye açıktır
create policy portfolio_owner_rw on portfolio_owner for all
  using (exists (select 1 from portfolio p where p.id = portfolio_id and can_see(p.office_id, p.owner_id)));

create policy price_hist_read on portfolio_price_history for select
  using (exists (select 1 from portfolio p where p.id = portfolio_id and is_member(p.office_id)));
create policy media_read on media for select
  using (exists (select 1 from portfolio p where p.id = portfolio_id and is_member(p.office_id)));
create policy media_write on media for all
  using (exists (select 1 from portfolio p where p.id = portfolio_id and can_see(p.office_id, p.owner_id)));

create policy document_rw on document for all using (is_member(office_id)) with check (is_member(office_id));
create policy signature_rw on signature for all
  using (exists (select 1 from document d where d.id = document_id and is_member(d.office_id)));
create policy auth_contract_rw on authorization_contract for all
  using (exists (select 1 from portfolio p where p.id = portfolio_id and can_see(p.office_id, p.owner_id)));
create policy search_profile_rw on search_profile for all
  using (exists (select 1 from person p where p.id = person_id and can_see(p.office_id, p.owner_id)));
create policy showing_rw on showing for all using (can_see(office_id, agent_id)) with check (is_member(office_id));
create policy offer_rw on offer for all
  using (exists (select 1 from portfolio p where p.id = portfolio_id and is_member(p.office_id)));
create policy deal_rw on deal for all using (is_member(office_id)) with check (is_member(office_id));
create policy commission_line_rw on commission_line for all
  using (exists (select 1 from deal d where d.id = deal_id and is_member(d.office_id)));
create policy commission_split_read on commission_split for select
  using (exists (select 1 from deal d where d.id = deal_id and (user_id = auth.uid() or member_role_in(d.office_id) = 'broker')));
create policy commission_split_admin on commission_split for all
  using (exists (select 1 from deal d where d.id = deal_id and member_role_in(d.office_id) = 'broker'));
create policy fsbo_rw on fsbo_listing for all using (is_member(office_id)) with check (is_member(office_id));
create policy activity_rw on activity for all using (can_see(office_id, user_id)) with check (is_member(office_id) and user_id = auth.uid());
create policy compliance_insert on compliance_log for insert with check (is_member(office_id));
create policy compliance_read on compliance_log for select using (member_role_in(office_id) in ('broker','takim_lideri'));
create policy audit_read on audit_log for select using (member_role_in(office_id) = 'broker');
