-- Phase 4 — écritures personnes & badges, gouvernées par pouvoir.
create policy at_personnes_insert on public.at_personnes for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('DECLARER_PERSONNEL'));
create policy at_personnes_update on public.at_personnes for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('DECLARER_PERSONNEL'))
  with check (organisation_id in (select public.at_user_orgs()));

create policy at_badges_insert on public.at_badges for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('DELIVRER_BADGE'));
create policy at_badges_update on public.at_badges for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('DELIVRER_BADGE'))
  with check (organisation_id in (select public.at_user_orgs()));
