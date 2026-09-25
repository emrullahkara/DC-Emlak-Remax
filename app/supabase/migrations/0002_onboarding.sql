-- DC Emlak — ofis kurulumu (onboarding), davet kodları, entegrasyon anahtarları
--
-- `office` tablosunda RLS açık ve INSERT politikası yok: istemci doğrudan ofis
-- oluşturamaz. Ofis yalnızca aşağıdaki SECURITY DEFINER fonksiyonlarla,
-- oturumdaki kullanıcı (auth.uid()) broker olarak eklenerek oluşturulur.

-- ---------------------------------------------------------------------------
-- Ofis: doğrudan ekleme yok, korumalı alanlar
-- ---------------------------------------------------------------------------
revoke insert on office from anon, authenticated;
revoke insert on office_member from anon;

-- Deneme bitişi ve oluşturulma tarihi istemciden değiştirilemez
-- (paket/ödeme akışı sunucu tarafında, service_role ile güncellenir).
create or replace function office_guard() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.id := old.id;
    new.created_at := old.created_at;
    new.deneme_bitis := old.deneme_bitis;
  end if;
  return new;
end $$;

drop trigger if exists office_guard on office;
create trigger office_guard before update on office
  for each row execute function office_guard();

-- Broker kendi rolünü düşüremez / kendini pasifleştiremez (ofis sahipsiz kalmasın)
create or replace function office_member_guard() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated')
     and old.user_id = auth.uid()
     and old.rol = 'broker'
     and (new.rol <> 'broker' or not new.aktif) then
    raise exception 'Broker kendi rolünü değiştiremez veya kendini pasifleştiremez'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists office_member_guard on office_member;
create trigger office_member_guard before update on office_member
  for each row execute function office_member_guard();

-- ---------------------------------------------------------------------------
-- Ofis oluşturma
-- ---------------------------------------------------------------------------
create or replace function create_office(
  p_unvan text,
  p_vergi_no text,
  p_mersis_no text,
  p_yetki_belgesi_no text,
  p_yetki_gecerlilik date,
  p_plan plan_id,
  p_ad_soyad text,
  p_telefon text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_office uuid;
begin
  if v_uid is null then
    raise exception 'Oturum açmanız gerekiyor' using errcode = '28000';
  end if;
  if coalesce(btrim(p_unvan), '') = '' then
    raise exception 'Ofis unvanı zorunludur' using errcode = '22023';
  end if;
  if coalesce(btrim(p_ad_soyad), '') = '' then
    raise exception 'Ad soyad zorunludur' using errcode = '22023';
  end if;
  if exists (select 1 from office_member where user_id = v_uid and aktif) then
    raise exception 'Zaten bir ofise üyesiniz' using errcode = '23505';
  end if;

  insert into office (unvan, vergi_no, mersis_no, yetki_belgesi_no, yetki_belgesi_gecerlilik, plan, deneme_bitis)
  values (
    btrim(p_unvan),
    nullif(btrim(p_vergi_no), ''),
    nullif(btrim(p_mersis_no), ''),
    nullif(btrim(p_yetki_belgesi_no), ''),
    p_yetki_gecerlilik,
    coalesce(p_plan, 'temel'),
    current_date + 14
  )
  returning id into v_office;

  insert into office_member (office_id, user_id, rol, ad_soyad, telefon, aktif)
  values (v_office, v_uid, 'broker', btrim(p_ad_soyad), nullif(btrim(p_telefon), ''), true);

  return v_office;
end $$;

revoke all on function create_office(text, text, text, text, date, plan_id, text, text) from public;
grant execute on function create_office(text, text, text, text, date, plan_id, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Davet kodları
-- ---------------------------------------------------------------------------
create table if not exists office_invite (
  code text primary key,
  office_id uuid not null references office(id) on delete cascade,
  rol member_role not null default 'danisman',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);
create index if not exists office_invite_office_idx on office_invite(office_id);

alter table office_invite enable row level security;

drop policy if exists invite_broker on office_invite;
create policy invite_broker on office_invite for all
  using (member_role_in(office_id) = 'broker')
  with check (member_role_in(office_id) = 'broker');

-- Davet kodu: 10 karakter, karışabilen harfler (0/O, 1/I/L) hariç.
-- gen_random_uuid() kriptografik rastgelelik kullanır (PostgreSQL 13+).
create or replace function create_invite(p_office uuid, p_rol member_role default 'danisman')
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_alfabe constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_hex text;
  i int;
begin
  if auth.uid() is null then
    raise exception 'Oturum açmanız gerekiyor' using errcode = '28000';
  end if;
  if member_role_in(p_office) is distinct from 'broker' then
    raise exception 'Davet kodunu yalnızca broker oluşturabilir' using errcode = '42501';
  end if;

  loop
    -- Her UUID'nin ilk 12 hex hanesi tamamen rastgeledir (sürüm hanesinden önce)
    v_hex := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
          || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    v_code := '';
    for i in 0..9 loop
      -- 2 hex hane → 0..255 → alfabe indeksi
      v_code := v_code || substr(v_alfabe, 1 + (('x' || substr(v_hex, 1 + i * 2, 2))::bit(8)::int % length(v_alfabe)), 1);
    end loop;
    exit when not exists (select 1 from office_invite where code = v_code);
  end loop;

  insert into office_invite (code, office_id, rol, created_by)
  values (v_code, p_office, coalesce(p_rol, 'danisman'), auth.uid());
  return v_code;
end $$;

revoke all on function create_invite(uuid, member_role) from public;
grant execute on function create_invite(uuid, member_role) to authenticated;

create or replace function accept_invite(p_code text, p_ad_soyad text, p_telefon text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_inv office_invite%rowtype;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_uid is null then
    raise exception 'Oturum açmanız gerekiyor' using errcode = '28000';
  end if;
  if coalesce(btrim(p_ad_soyad), '') = '' then
    raise exception 'Ad soyad zorunludur' using errcode = '22023';
  end if;

  select * into v_inv from office_invite where code = v_code for update;
  if not found then
    raise exception 'Davet kodu bulunamadı' using errcode = 'P0002';
  end if;
  if v_inv.used_by is not null then
    raise exception 'Bu davet kodu daha önce kullanılmış' using errcode = '22023';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Davet kodunun süresi dolmuş' using errcode = '22023';
  end if;
  if exists (select 1 from office_member where user_id = v_uid and aktif) then
    raise exception 'Zaten bir ofise üyesiniz' using errcode = '23505';
  end if;

  insert into office_member (office_id, user_id, rol, ad_soyad, telefon, aktif)
  values (v_inv.office_id, v_uid, v_inv.rol, btrim(p_ad_soyad), nullif(btrim(p_telefon), ''), true)
  on conflict (office_id, user_id) do update
    set rol = excluded.rol, ad_soyad = excluded.ad_soyad, telefon = excluded.telefon, aktif = true;

  update office_invite set used_by = v_uid, used_at = now() where code = v_code;
  return v_inv.office_id;
end $$;

revoke all on function accept_invite(text, text, text) from public;
grant execute on function accept_invite(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Entegrasyon anahtarları (Supabase Vault)
-- ---------------------------------------------------------------------------
-- Düz anahtar tabloya yazılmaz: Vault'ta şifrelenir, office_integration.anahtar_ref
-- yalnızca Vault gizli kaydının kimliğini tutar. Sunucu tarafı (Edge Function,
-- service_role) anahtarı vault.decrypted_secrets üzerinden okur.
create or replace function set_integration_secret(p_office uuid, p_servis text, p_saglayici text, p_anahtar text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ref uuid;
  v_eski text;
begin
  if member_role_in(p_office) is distinct from 'broker' then
    raise exception 'Entegrasyonları yalnızca broker yönetebilir' using errcode = '42501';
  end if;
  if coalesce(btrim(p_anahtar), '') = '' or coalesce(btrim(p_saglayici), '') = '' then
    raise exception 'Sağlayıcı ve anahtar zorunludur' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_namespace where nspname = 'vault') then
    raise exception 'Supabase Vault etkin değil (Database → Extensions → supabase_vault)' using errcode = '0A000';
  end if;

  select anahtar_ref into v_eski from office_integration where office_id = p_office and servis = p_servis;
  v_ref := vault.create_secret(btrim(p_anahtar), 'office:' || p_office || ':' || p_servis || ':' || gen_random_uuid(), 'DC Emlak entegrasyon anahtarı');

  insert into office_integration (office_id, servis, saglayici, anahtar_ref, aktif)
  values (p_office, p_servis, btrim(p_saglayici), v_ref::text, true)
  on conflict (office_id, servis) do update
    set saglayici = excluded.saglayici, anahtar_ref = excluded.anahtar_ref, aktif = true;

  if v_eski is not null and v_eski ~ '^[0-9a-f-]{36}$' then
    delete from vault.secrets where id = v_eski::uuid;
  end if;
end $$;

create or replace function clear_integration_secret(p_office uuid, p_servis text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_eski text;
begin
  if member_role_in(p_office) is distinct from 'broker' then
    raise exception 'Entegrasyonları yalnızca broker yönetebilir' using errcode = '42501';
  end if;
  delete from office_integration where office_id = p_office and servis = p_servis
    returning anahtar_ref into v_eski;
  if v_eski is not null and v_eski ~ '^[0-9a-f-]{36}$' and exists (select 1 from pg_namespace where nspname = 'vault') then
    delete from vault.secrets where id = v_eski::uuid;
  end if;
end $$;

revoke all on function set_integration_secret(uuid, text, text, text) from public;
revoke all on function clear_integration_secret(uuid, text) from public;
grant execute on function set_integration_secret(uuid, text, text, text) to authenticated;
grant execute on function clear_integration_secret(uuid, text) to authenticated;
