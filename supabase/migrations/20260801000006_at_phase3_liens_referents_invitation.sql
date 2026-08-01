-- Phase 3 — Invitation référent : rattacher le lien à l'entité entreprise + fonction d'accès,
-- et gouverner les écritures par pouvoir (la révocation devient réelle côté serveur).
alter table public.at_liens_referents add column if not exists entite_id uuid references public.at_entites(id) on delete set null;
alter table public.at_liens_referents add column if not exists fonction_acces text default 'REFERENT';

create policy at_liens_insert on public.at_liens_referents for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and (public.at_a_pouvoir('DECLARER_ENTREPRISE') or public.at_a_pouvoir('ADMINISTRER_ORGANISATION')));
create policy at_liens_update on public.at_liens_referents for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and (public.at_a_pouvoir('DECLARER_ENTREPRISE') or public.at_a_pouvoir('ADMINISTRER_ORGANISATION')))
  with check (organisation_id in (select public.at_user_orgs()));
