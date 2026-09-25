-- DC Emlak — güvenlik sıkılaştırması (0007)
--
-- Yetki denetiminde bulunan açıklar kapatılır:
--  1) İmza kayıtları sahte oluşturulamaz / değiştirilemez / silinemez
--  2) İmzalanmış ve iptal edilmiş belgeler değiştirilemez, belgeler silinemez
--  3) Gösterim, imzalı yer gösterme belgesi olmadan "tamamlandı" yapılamaz
--     (yalnızca istemci kontrolü vardı)
--  4) Denetim kaydı başka kullanıcı adına yazılamaz
--  5) KVKK rıza kayıtları silinemez, yalnızca geri alınabilir
--  6) Aktivitelerin yazarı / ofisi sonradan değiştirilemez
--  7) Kişi (müşteri) silme yalnızca broker'da (ayrılan danışmanın toplu silmesine karşı)
--  8) Paket, deneme süresi bittikten sonra istemciden değiştirilemez (ödeme atlatma)
--  9) Broker kendi üyeliğini silerek ofisi sahipsiz bırakamaz
-- 10) İmza kanıtı boyutu sınırlı (anonim uç noktada depolama suistimali)
--
-- Tetikleyiciler yalnızca istemci rollerinde (anon, authenticated) devreye girer;
-- SECURITY DEFINER fonksiyonlar (sign_document vb.) ve service_role etkilenmez.

create or replace function _is_client_role() returns boolean
language sql stable as $$
  select current_user in ('anon', 'authenticated')
$$;

-- ---------------------------------------------------------------------------
-- 1) İmzalar: yalnızca ıslak imza kaydı istemciden eklenebilir; değişmez
-- ---------------------------------------------------------------------------
drop policy if exists signature_rw on signature;
drop policy if exists signature_select on signature;
drop policy if exists signature_insert_islak on signature;

create policy signature_select on signature for select
  using (exists (select 1 from document d where d.id = document_id and is_member(d.office_id)));

-- Uzaktan (link) imza yalnızca sign_document() ile yazılır. İstemci yalnızca
-- ofiste kâğıt üzerinde atılmış imzayı, imzası tamamlanmamış belgeye kaydedebilir.
create policy signature_insert_islak on signature for insert
  with check (
    yontem = 'islak'
    and exists (
      select 1 from document d
      where d.id = document_id and is_member(d.office_id) and d.durum in ('taslak', 'imzada')
    )
    and (person_id is null or exists (
      select 1 from person p join document d on d.id = document_id
      where p.id = person_id and p.office_id = d.office_id
    ))
  );
-- UPDATE / DELETE politikası yok → imza kayıtları değiştirilemez ve silinemez.
revoke update, delete on signature from anon, authenticated;

alter table signature drop constraint if exists signature_kanit_boyut;
alter table signature add constraint signature_kanit_boyut check (pg_column_size(kanit) <= 16384);

-- ---------------------------------------------------------------------------
-- 2) Belgeler
-- ---------------------------------------------------------------------------
drop policy if exists document_rw on document;
drop policy if exists document_select on document;
drop policy if exists document_insert on document;
drop policy if exists document_update on document;

create policy document_select on document for select using (is_member(office_id));

-- Yeni belge taslak olarak başlar; tek istisna imza gerektirmeyen kayıt belgeleri
-- (DASK poliçesi kaydı).
create policy document_insert on document for insert
  with check (
    is_member(office_id)
    and created_by = auth.uid()
    and (durum = 'taslak' or (sablon = 'dask-policesi' and durum = 'imzalandi'))
    and imza_token is null
  );

create policy document_update on document for update
  using (is_member(office_id))
  with check (is_member(office_id));
-- DELETE politikası yok: belgeler yasal saklama süresince silinemez (iptal edilir).
revoke delete on document from anon, authenticated;

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
    -- İmzalı belgede yalnızca iptal mümkündür ve yalnızca broker yapabilir.
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
    return new;
  end if;

  -- İmzalandı durumuna yalnızca bir imza kaydı varsa geçilebilir (ıslak imza akışı)
  if new.durum = 'imzalandi' and not exists (select 1 from signature s where s.document_id = old.id) then
    raise exception 'İmza kaydı olmadan belge imzalandı yapılamaz' using errcode = '42501';
  end if;

  -- İmza bağlantısı tahmin edilemez olmalı
  if new.imza_token is not null and new.imza_token is distinct from old.imza_token and length(new.imza_token) < 32 then
    raise exception 'İmza bağlantısı belirteci en az 32 karakter olmalı' using errcode = '22023';
  end if;
  if new.durum <> 'imzada' then
    new.imza_token := null;
  end if;

  -- Saklama süresi kısaltılamaz
  if old.saklama_bitis is not null and (new.saklama_bitis is null or new.saklama_bitis < old.saklama_bitis) then
    new.saklama_bitis := old.saklama_bitis;
  end if;
  return new;
end $$;

drop trigger if exists document_guard on document;
create trigger document_guard before update on document
  for each row execute function document_guard();

-- ---------------------------------------------------------------------------
-- 3) Gösterim: tamamlandı için imzalı yer gösterme belgesi zorunlu
-- ---------------------------------------------------------------------------
create or replace function showing_guard() returns trigger
language plpgsql as $$
begin
  if new.durum = 'tamamlandi'
     and (tg_op = 'INSERT' or old.durum is distinct from 'tamamlandi')
     and not exists (
       select 1 from document d
       where d.id = new.yer_gosterme_belgesi_id
         and d.office_id = new.office_id
         and d.durum = 'imzalandi'
     ) then
    raise exception 'İmzalı yer gösterme belgesi olmadan gösterim tamamlanamaz' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and _is_client_role() and new.office_id is distinct from old.office_id then
    raise exception 'Gösterimin ofisi değiştirilemez' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists showing_guard on showing;
create trigger showing_guard before insert or update on showing
  for each row execute function showing_guard();

-- ---------------------------------------------------------------------------
-- 4) Uyum (denetim) kaydı yalnızca kendi adına yazılır
-- ---------------------------------------------------------------------------
drop policy if exists compliance_insert on compliance_log;
create policy compliance_insert on compliance_log for insert
  with check (is_member(office_id) and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5) KVKK rızaları: silinemez; yalnızca geri alma tarihi işlenebilir
-- ---------------------------------------------------------------------------
drop policy if exists consent_rw on consent;
drop policy if exists consent_select on consent;
drop policy if exists consent_insert on consent;
drop policy if exists consent_update on consent;

create policy consent_select on consent for select
  using (exists (select 1 from person p where p.id = person_id and can_see(p.office_id, p.owner_id)));
create policy consent_insert on consent for insert
  with check (exists (select 1 from person p where p.id = person_id and can_see(p.office_id, p.owner_id)));
create policy consent_update on consent for update
  using (exists (select 1 from person p where p.id = person_id and can_see(p.office_id, p.owner_id)));
revoke delete on consent from anon, authenticated;

create or replace function consent_guard() returns trigger
language plpgsql as $$
begin
  if _is_client_role() and (
       new.person_id is distinct from old.person_id
    or new.amac is distinct from old.amac
    or new.kanal is distinct from old.kanal
    or new.verildi is distinct from old.verildi
    or new.kaynak is distinct from old.kaynak
    or new.belge_id is distinct from old.belge_id
    or new.created_at is distinct from old.created_at
    or (old.geri_alindi_at is not null and new.geri_alindi_at is distinct from old.geri_alindi_at)
  ) then
    raise exception 'Rıza kaydı değiştirilemez; yalnızca geri alınabilir' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists consent_guard on consent;
create trigger consent_guard before update on consent
  for each row execute function consent_guard();

-- ---------------------------------------------------------------------------
-- 6) Aktivite: yazar, ofis ve oluşturulma zamanı değişmez
-- ---------------------------------------------------------------------------
create or replace function activity_guard() returns trigger
language plpgsql as $$
begin
  if _is_client_role() and (
       new.user_id is distinct from old.user_id
    or new.office_id is distinct from old.office_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Aktivitenin yazarı, ofisi ve tarihi değiştirilemez' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists activity_guard on activity;
create trigger activity_guard before update on activity
  for each row execute function activity_guard();

-- ---------------------------------------------------------------------------
-- 7) Kişi silme yalnızca broker (KVKK silme talebi broker tarafından işlenir)
-- ---------------------------------------------------------------------------
drop policy if exists person_delete on person;
create policy person_delete on person for delete
  using (member_role_in(office_id) = 'broker');

-- ---------------------------------------------------------------------------
-- 8) Ofis: paket yalnızca deneme süresinde istemciden değişir
-- ---------------------------------------------------------------------------
create or replace function office_guard() returns trigger
language plpgsql as $$
begin
  if _is_client_role() then
    new.id := old.id;
    new.created_at := old.created_at;
    new.deneme_bitis := old.deneme_bitis;
    if new.plan is distinct from old.plan
       and (old.deneme_bitis is null or old.deneme_bitis < current_date) then
      raise exception 'Deneme süresi bitti; paket değişikliği ödeme adımıyla yapılır' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 9) Broker kendi üyeliğini silemez
-- ---------------------------------------------------------------------------
create or replace function office_member_delete_guard() returns trigger
language plpgsql as $$
begin
  if _is_client_role() and old.user_id = auth.uid() and old.rol = 'broker' then
    raise exception 'Broker kendi üyeliğini silemez' using errcode = '42501';
  end if;
  return old;
end $$;

drop trigger if exists office_member_delete_guard on office_member;
create trigger office_member_delete_guard before delete on office_member
  for each row execute function office_member_delete_guard();

-- ---------------------------------------------------------------------------
-- Yardımcı fonksiyonlar dışarıya RPC olarak açılmaz
-- ---------------------------------------------------------------------------
revoke all on function document_guard() from public;
revoke all on function showing_guard() from public;
revoke all on function consent_guard() from public;
revoke all on function activity_guard() from public;
revoke all on function office_member_delete_guard() from public;
