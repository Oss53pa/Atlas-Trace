-- Phase 1 — Registre d'acteurs : entités durables, emprises, conditions bloquantes.
-- Périmètre = contrôle d'accès (administré par la MOA). Types : MOA / PRENEUR / ENTREPRISE
-- (le MOE, la construction, le gardiennage = catégories d'ENTREPRISE, aucun statut spécial).
-- Écritures gouvernées par pouvoir côté serveur (imparable), en plus du cloisonnement d'org.

-- Helper : l'utilisateur courant détient-il ce pouvoir ?
create or replace function public.at_a_pouvoir(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.at_utilisateurs u
    join public.at_membres m on m.utilisateur_id = u.id
    join public.at_roles r on r.id = m.role_id
    where u.user_id = auth.uid() and p = any (r.pouvoirs)
  );
$$;
revoke all on function public.at_a_pouvoir(text) from public;
revoke execute on function public.at_a_pouvoir(text) from anon;
grant execute on function public.at_a_pouvoir(text) to authenticated;

-- Entités durables
create table if not exists public.at_entites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid references public.at_sites(id) on delete set null,
  type text not null check (type in ('MOA','PRENEUR','ENTREPRISE')),
  categorie text,
  raison_sociale text not null,
  interne boolean not null default false,
  parent_id uuid references public.at_entites(id) on delete set null,
  statut text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);
create index if not exists at_entites_org_idx on public.at_entites(organisation_id);
create index if not exists at_entites_parent_idx on public.at_entites(parent_id);
alter table public.at_entites enable row level security;
create policy at_entites_select on public.at_entites for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
create policy at_entites_insert on public.at_entites for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'));
create policy at_entites_update on public.at_entites for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'))
  with check (organisation_id in (select public.at_user_orgs()));

-- Emprises d'un Preneur (1..n)
create table if not exists public.at_emprises (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid references public.at_sites(id) on delete set null,
  entite_id uuid not null references public.at_entites(id) on delete cascade,
  libelle text not null,
  code text,
  statut text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);
create index if not exists at_emprises_entite_idx on public.at_emprises(entite_id);
alter table public.at_emprises enable row level security;
create policy at_emprises_select on public.at_emprises for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
create policy at_emprises_insert on public.at_emprises for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'));
create policy at_emprises_update on public.at_emprises for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'))
  with check (organisation_id in (select public.at_user_orgs()));

-- Conditions bloquantes d'une entité (surtout Preneur)
create table if not exists public.at_conditions_bloquantes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  entite_id uuid not null references public.at_entites(id) on delete cascade,
  libelle text not null,
  levee boolean not null default false,
  levee_par text,
  levee_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists at_conditions_entite_idx on public.at_conditions_bloquantes(entite_id);
alter table public.at_conditions_bloquantes enable row level security;
create policy at_conditions_select on public.at_conditions_bloquantes for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
create policy at_conditions_insert on public.at_conditions_bloquantes for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and (public.at_a_pouvoir('GERER_CONDITIONS_BLOQUANTES') or public.at_a_pouvoir('ADMINISTRER_ORGANISATION')));
create policy at_conditions_update on public.at_conditions_bloquantes for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and (public.at_a_pouvoir('GERER_CONDITIONS_BLOQUANTES') or public.at_a_pouvoir('ADMINISTRER_ORGANISATION')))
  with check (organisation_id in (select public.at_user_orgs()));

-- Rattachement d'une entreprise à son coordinateur (Preneur) ; null = travaux du site
alter table public.at_entreprises add column if not exists parent_entite_id uuid references public.at_entites(id) on delete set null;
