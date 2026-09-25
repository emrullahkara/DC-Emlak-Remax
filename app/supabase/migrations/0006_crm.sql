-- ---------------------------------------------------------------------------
-- 0006 CRM: kişi ve aktivite erişim politikalarının inceltilmesi
--
-- 1) person_rw tek "for all" politikasıydı ve WITH CHECK owner_id = auth.uid()
--    istiyordu; bu yüzden broker/takım lideri/asistan başka danışmanın
--    müşterisini (ör. ısı skoru, sonraki adım) GÜNCELLEYEMİYORDU. Ekleme ile
--    güncelleme ayrılır: ekleyen kendi adına ekler; güncelleyen kaydı görebilen
--    ve sahipliği ofis içinde tutan kişidir.
-- 2) activity_rw yalnızca aktiviteyi yazan kullanıcıya/yöneticiye açıktı; kişi
--    kartındaki zaman tüneli, o kişiyi görebilen herkese (kişinin sahibi dahil)
--    tüm aktiviteleri göstermelidir.
-- 3) Mükerrer kayıt kontrolünde telefon karşılaştırması için rakam indeksi.
-- ---------------------------------------------------------------------------

drop policy if exists person_rw on person;

create policy person_select on person for select
  using (can_see(office_id, owner_id));

create policy person_insert on person for insert
  with check (is_member(office_id) and owner_id = auth.uid());

create policy person_update on person for update
  using (can_see(office_id, owner_id))
  with check (can_see(office_id, owner_id));

create policy person_delete on person for delete
  using (can_see(office_id, owner_id));

-- Kişiyi görebilen, o kişiye ait tüm aktiviteleri görür (politikalar OR ile birleşir)
create policy activity_person_read on activity for select
  using (
    person_id is not null
    and exists (select 1 from person p where p.id = person_id and can_see(p.office_id, p.owner_id))
  );

-- Görev tamamlama: kişiyi görebilen, o kişinin görevini güncelleyebilir
create policy activity_person_update on activity for update
  using (
    person_id is not null
    and exists (select 1 from person p where p.id = person_id and can_see(p.office_id, p.owner_id))
  );

-- Telefon rakamları üzerinden hızlı arama (mükerrer kayıt tespiti)
create index if not exists person_tel_digits_idx
  on person (office_id, (regexp_replace(coalesce(telefon, ''), '\D', '', 'g')));
