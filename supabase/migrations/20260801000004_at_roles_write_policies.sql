-- Écriture des rôles gouvernée par pouvoir (imparable côté serveur).
create policy at_roles_insert on public.at_roles for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'));
create policy at_roles_update on public.at_roles for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'))
  with check (organisation_id in (select public.at_user_orgs()));
