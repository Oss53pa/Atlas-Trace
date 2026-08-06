-- Stockage des photos de contrôle (coffres, sacs, chargements) : bucket privé,
-- cloisonné par organisation via le préfixe de chemin <organisation_id>/...
insert into storage.buckets (id, name, public)
values ('at-photos', 'at-photos', false)
on conflict (id) do nothing;

drop policy if exists at_photos_select on storage.objects;
drop policy if exists at_photos_insert on storage.objects;
drop policy if exists at_photos_update on storage.objects;

create policy at_photos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'at-photos'
    and (storage.foldername(name))[1] in (select public.at_user_orgs()::text)
  );

create policy at_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'at-photos'
    and (storage.foldername(name))[1] in (select public.at_user_orgs()::text)
  );

create policy at_photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'at-photos'
    and (storage.foldername(name))[1] in (select public.at_user_orgs()::text)
  );
