-- DC Emlak — Portföy medyası için Supabase Storage (0005)
--
-- Özel (private) `media` kovası. Nesne yolu: <office_id>/<portfolio_id>/<uuid>.jpg
-- Bir kullanıcı yalnızca aktif üyesi olduğu ofisin klasöründeki nesneleri
-- okuyabilir / yazabilir (ilk yol parçası = office_id). Görseller istemcide
-- imzalı URL (createSignedUrl) ile gösterilir; kova herkese açık değildir.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- İlk yol parçası geçerli bir UUID değilse (ör. hatalı yükleme) erişim reddedilir.
create or replace function public.media_office_of(object_name text) returns uuid
language plpgsql stable as $$
declare
  seg text := (storage.foldername(object_name))[1];
begin
  return seg::uuid;
exception when others then
  return null;
end
$$;

drop policy if exists media_objects_select on storage.objects;
drop policy if exists media_objects_insert on storage.objects;
drop policy if exists media_objects_update on storage.objects;
drop policy if exists media_objects_delete on storage.objects;

create policy media_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and is_member(public.media_office_of(name)));

create policy media_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and is_member(public.media_office_of(name)));

create policy media_objects_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and is_member(public.media_office_of(name)))
  with check (bucket_id = 'media' and is_member(public.media_office_of(name)));

create policy media_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and is_member(public.media_office_of(name)));

-- ---------------------------------------------------------------------------
-- Portföy modülünün ihtiyaç duyduğu tablo politikaları (0001'de eksik olanlar)
-- ---------------------------------------------------------------------------

-- 0001 yalnızca okuma politikası tanımlıyor; fiyat değişikliği geçmişe
-- eklenebilmeli (portföyü düzenleyebilen kullanıcı ekler).
drop policy if exists price_hist_insert on portfolio_price_history;
create policy price_hist_insert on portfolio_price_history for insert
  with check (exists (select 1 from portfolio p where p.id = portfolio_id and can_see(p.office_id, p.owner_id)));
