-- M14 — Autorisations d'évacuation & contrôle inopiné.
-- Une autorisation décrit nature, volume, période, destination et les
-- immatriculations admises. Le contrôle inopiné du fond de benne se fait au
-- taux paramétré ; la photo est EXIGÉE par le serveur pour clore le contrôle.
--
--   at_evacuations           — les autorisations d'évacuation
--   at_controles_evacuation  — le journal append-only des contrôles inopinés
-- Écriture réservée aux RPC : aucune policy d'insert/update côté client.

-- ============================================================
-- 1. Autorisations d'évacuation
-- ============================================================
create table if not exists public.at_evacuations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  entreprise_id uuid not null references public.at_entreprises(id) on delete restrict,
  numero text not null,
  nature text not null,
  volume numeric(10,2) not null check (volume > 0),
  periode text not null,
  destination text not null,
  immatriculations text[] not null default '{}',
  statut text not null default 'ACTIVE' check (statut in ('ACTIVE', 'CLOTUREE')),
  visee boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.at_evacuations is
  'Atlas Trace — autorisations d''évacuation (M14). Écriture réservée au RPC at_creer_evacuation.';

create unique index if not exists at_evacuations_numero_uk on public.at_evacuations(numero);
create index if not exists at_evacuations_site_idx on public.at_evacuations(site_id, statut);
alter table public.at_evacuations enable row level security;

create policy at_evacuations_select on public.at_evacuations for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

-- ============================================================
-- 2. Contrôles inopinés (append-only)
-- ============================================================
create table if not exists public.at_controles_evacuation (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  evacuation_id uuid not null references public.at_evacuations(id) on delete restrict,
  numero_evac text not null,
  immatriculation text not null,
  agent text not null,
  resultat text not null check (resultat in ('CONFORME', 'ANOMALIE')),
  photo boolean not null default false,
  horodatage timestamptz not null default now()
);
comment on table public.at_controles_evacuation is
  'Atlas Trace — contrôles inopinés du fond de benne (M14). Append-only, écrit par at_enregistrer_controle_evac().';

create index if not exists at_controles_evac_site_idx on public.at_controles_evacuation(site_id, horodatage desc);
alter table public.at_controles_evacuation enable row level security;

create policy at_controles_evac_select on public.at_controles_evacuation for select to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('CONSULTER_TABLEAU'))
  );

-- ============================================================
-- 3. Créer une autorisation d'évacuation
-- ============================================================
create or replace function public.at_creer_evacuation(
  p_entreprise_id uuid,
  p_nature text,
  p_volume numeric,
  p_periode text,
  p_destination text,
  p_immatriculations text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ent public.at_entreprises%rowtype;
  v_seq int;
  v_numero text;
  v_id uuid;
  v_immats text[];
begin
  if not public.at_a_pouvoir('AUTORISER_EVACUATION') then
    raise exception 'Pouvoir AUTORISER_EVACUATION requis';
  end if;
  if coalesce(p_volume, 0) <= 0 then
    raise exception 'Volume invalide';
  end if;
  if btrim(coalesce(p_periode, '')) = '' or btrim(coalesce(p_destination, '')) = '' then
    raise exception 'Période et destination obligatoires';
  end if;

  select * into v_ent from public.at_entreprises where id = p_entreprise_id;
  if not found or v_ent.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Entreprise hors périmètre';
  end if;

  -- Immatriculations : nettoyées, mises en majuscules, dédupliquées.
  select coalesce(array_agg(distinct upper(btrim(i))) filter (where btrim(i) <> ''), '{}')
    into v_immats
    from unnest(coalesce(p_immatriculations, '{}')) as i;

  select count(*) + 1 into v_seq
    from public.at_evacuations
   where organisation_id = v_ent.organisation_id
     and date_part('year', created_at) = date_part('year', now());
  v_numero := 'AE-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 5, '0');

  insert into public.at_evacuations (
    organisation_id, site_id, entreprise_id, numero, nature, volume, periode, destination, immatriculations
  ) values (
    v_ent.organisation_id, v_ent.site_id, v_ent.id, v_numero,
    btrim(p_nature), p_volume, btrim(p_periode), btrim(p_destination), v_immats
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  select v_ent.organisation_id, v_ent.site_id,
    coalesce((select nom from public.at_utilisateurs where user_id = auth.uid()), auth.uid()::text),
    'EVACUATION_CREEE', 'at_evacuations:' || v_id::text,
    jsonb_build_object('numero', v_numero, 'volume', p_volume)::text, 'Web';

  return jsonb_build_object('id', v_id, 'numero', v_numero);
end;
$$;

revoke all on function public.at_creer_evacuation(uuid, text, numeric, text, text, text[]) from public;
revoke execute on function public.at_creer_evacuation(uuid, text, numeric, text, text, text[]) from anon;
grant execute on function public.at_creer_evacuation(uuid, text, numeric, text, text, text[]) to authenticated;

-- ============================================================
-- 4. Enregistrer un contrôle inopiné — photo exigée
-- ============================================================
create or replace function public.at_enregistrer_controle_evac(
  p_evacuation_id uuid,
  p_immatriculation text,
  p_resultat text,
  p_photo boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evac public.at_evacuations%rowtype;
  v_agent text;
  v_id uuid;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if p_resultat not in ('CONFORME', 'ANOMALIE') then
    raise exception 'Résultat inconnu : %', p_resultat;
  end if;
  if not coalesce(p_photo, false) then
    raise exception 'La photo du fond de benne est exigée pour clore le contrôle';
  end if;

  select * into v_evac from public.at_evacuations where id = p_evacuation_id;
  if not found or v_evac.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Autorisation hors périmètre';
  end if;

  select coalesce(u.nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs u where u.user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  insert into public.at_controles_evacuation (
    organisation_id, site_id, evacuation_id, numero_evac, immatriculation, agent, resultat, photo
  ) values (
    v_evac.organisation_id, v_evac.site_id, v_evac.id, v_evac.numero,
    upper(btrim(coalesce(p_immatriculation, ''))), v_agent, p_resultat, true
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (
    v_evac.organisation_id, v_evac.site_id, v_agent,
    'CONTROLE_EVAC_' || p_resultat, 'at_controles_evacuation:' || v_id::text,
    jsonb_build_object('numero', v_evac.numero, 'immat', p_immatriculation, 'resultat', p_resultat)::text,
    'Poste'
  );

  return jsonb_build_object('id', v_id, 'resultat', p_resultat);
end;
$$;

revoke all on function public.at_enregistrer_controle_evac(uuid, text, text, boolean) from public;
revoke execute on function public.at_enregistrer_controle_evac(uuid, text, text, boolean) from anon;
grant execute on function public.at_enregistrer_controle_evac(uuid, text, text, boolean) to authenticated;
