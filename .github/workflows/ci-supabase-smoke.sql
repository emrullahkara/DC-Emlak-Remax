-- Migration sonrası duman testi: ofis kurulumu, davet ve RLS korumaları.
-- Tüm değişiklikler en sonda geri alınır.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000b001', 'broker@test.local'),
  ('00000000-0000-4000-8000-00000000b002', 'danisman@test.local'),
  ('00000000-0000-4000-8000-00000000b003', 'yabanci@test.local');

set local role authenticated;

-- 1) Broker: doğrudan ofis ekleyemez, RPC ile oluşturur
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000b001', true);

do $$
begin
  begin
    insert into office (unvan) values ('Doğrudan ekleme');
    raise exception 'HATA: office tablosuna doğrudan ekleme engellenmeliydi';
  exception when insufficient_privilege then null;
  end;
end $$;

select create_office('Test Emlak', '1234567890', null, '3401-0001', '2029-01-01', 'profesyonel', 'Ali Broker', '0532 000 00 00') as office_id \gset

do $$
begin
  if (select count(*) from office) <> 1 then raise exception 'HATA: broker ofisini görmeli'; end if;
  if (select rol from office_member where user_id = auth.uid()) <> 'broker' then raise exception 'HATA: kurucu broker olmalı'; end if;
  if (select deneme_bitis from office) <> current_date + 14 then raise exception 'HATA: 14 günlük deneme'; end if;
end $$;

-- İkinci ofis açılamaz
do $$
begin
  begin
    perform create_office('İkinci', null, null, null, null, 'temel', 'Ali', null);
    raise exception 'HATA: ikinci ofis engellenmeliydi';
  exception when unique_violation then null;
  end;
end $$;

-- Deneme bitişi istemciden uzatılamaz, paket değişebilir
update office set deneme_bitis = current_date + 365, plan = 'premium';
do $$
begin
  if (select deneme_bitis from office) <> current_date + 14 then raise exception 'HATA: deneme_bitis korunmalı'; end if;
  if (select plan from office) <> 'premium' then raise exception 'HATA: paket güncellenebilmeli'; end if;
end $$;

-- Broker kendini düşüremez
do $$
begin
  begin
    update office_member set rol = 'danisman' where user_id = auth.uid();
    raise exception 'HATA: broker kendi rolünü düşürememeli';
  exception when insufficient_privilege then null;
  end;
end $$;

select create_invite(:'office_id'::uuid, 'danisman') as code \gset
select set_config('smoke.code', :'code', true);
do $$
begin
  if current_setting('smoke.code') !~ '^[A-HJKMNP-Z2-9]{10}$' then raise exception 'HATA: davet kodu biçimi'; end if;
end $$;
do $$
begin
  if (select count(*) from office_invite) <> 1 then raise exception 'HATA: broker davetleri görmeli'; end if;
end $$;

-- 2) Yeni kullanıcı: ofisi göremez, davetle katılır
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000b002', true);

do $$
begin
  if (select count(*) from office) <> 0 then raise exception 'HATA: üye olmayan ofisi görmemeli'; end if;
  if (select count(*) from office_invite) <> 0 then raise exception 'HATA: üye olmayan davetleri görmemeli'; end if;
end $$;

select accept_invite(lower(:'code'), 'Ayşe Danışman', '0533 000 00 00') = :'office_id'::uuid as katildi \gset
\if :katildi
\else
  \echo 'HATA: davet ofis kimliği döndürmeli'
  select 1/0;
\endif

do $$
begin
  if (select rol from office_member where user_id = auth.uid()) <> 'danisman' then raise exception 'HATA: davet rolü uygulanmalı'; end if;
  if (select count(*) from office) <> 1 then raise exception 'HATA: katılan üye ofisi görmeli'; end if;
  begin
    perform create_invite((select id from office), 'broker');
    raise exception 'HATA: danışman davet oluşturamamalı';
  exception when insufficient_privilege then null;
  end;
  begin
    update office set unvan = 'Değişti';
    if (select unvan from office) = 'Değişti' then raise exception 'HATA: danışman ofisi güncelleyememeli'; end if;
  end;
end $$;

-- 3) Kullanılmış kod ikinci kez kullanılamaz
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000b003', true);
do $$
begin
  begin
    perform accept_invite(current_setting('smoke.code'), 'Yabancı', null);
    raise exception 'HATA: kullanılmış kod reddedilmeli';
  exception when invalid_parameter_value or no_data_found then null;
  end;
end $$;

-- 4) Oturumsuz çağrı reddedilir
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  begin
    perform create_office('Anonim', null, null, null, null, 'temel', 'X', null);
    raise exception 'HATA: oturumsuz ofis oluşturulamamalı';
  exception when invalid_authorization_specification then null;
  end;
end $$;

rollback;

\echo 'Duman testi başarılı'
