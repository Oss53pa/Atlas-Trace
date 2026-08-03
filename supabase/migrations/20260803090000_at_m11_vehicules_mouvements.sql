-- M11 — Véhicules & mouvements : laissez-passer rattaché à l'entreprise, journal
-- des entrées/sorties, et l'anomalie « entré à vide, ressort chargé sans
-- couverture » calculée et opposée par le SERVEUR (jamais par le client).
--
-- Deux tables :
--   at_vehicules            — le laissez-passer et l'état courant du véhicule
--   at_mouvements_vehicule  — le journal append-only des passages au poste
-- Toute écriture passe par une fonction SECURITY DEFINER : les clients n'ont
-- aucune policy d'insert/update, seul le RPC décide.

-- ============================================================
-- 1. Laissez-passer véhicule
-- ============================================================
create table if not exists public.at_vehicules (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  entreprise_id uuid not null references public.at_entreprises(id) on delete restrict,
  immatriculation text not null,
  type text not null default 'Véhicule',
  chauffeur text not null default '',
  laissez_passer text not null,
  statut text not null default 'DEHORS' check (statut in ('DEHORS', 'SUR_SITE')),
  -- État à la dernière entrée : sert de référence à l'anomalie de sortie.
  etat_entree text check (etat_entree in ('VIDE', 'CHARGE')),
  nature_entree text,
  entree_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.at_vehicules is
  'Atlas Trace — laissez-passer véhicule et état courant (M11). Écriture réservée aux RPC at_enregistrer_vehicule / at_enregistrer_mouvement_vehicule.';

create unique index if not exists at_vehicules_immat_uk on public.at_vehicules(site_id, immatriculation);
create unique index if not exists at_vehicules_lp_uk on public.at_vehicules(site_id, laissez_passer);
create index if not exists at_vehicules_entreprise_idx on public.at_vehicules(entreprise_id);
alter table public.at_vehicules enable row level security;

-- Lecture réservée aux membres de l'organisation ; aucune écriture directe.
create policy at_vehicules_select on public.at_vehicules for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

-- ============================================================
-- 2. Journal des mouvements (append-only)
-- ============================================================
create table if not exists public.at_mouvements_vehicule (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  vehicule_id uuid not null references public.at_vehicules(id) on delete restrict,
  immatriculation text not null,
  entreprise text not null,
  sens text not null check (sens in ('ENTREE', 'SORTIE')),
  etat text not null check (etat in ('VIDE', 'CHARGE')),
  nature text,
  controle text not null check (controle in ('COFFRE', 'BENNE', 'LES_DEUX', 'SANS_OBJET')),
  couverture text,
  anomalie boolean not null default false,
  force boolean not null default false,
  agent text not null,
  photo boolean not null default false,
  horodatage timestamptz not null default now()
);
comment on table public.at_mouvements_vehicule is
  'Atlas Trace — journal des passages véhicule (M11). Append-only, écrit par at_enregistrer_mouvement_vehicule().';

create index if not exists at_mouvements_vehicule_site_idx on public.at_mouvements_vehicule(site_id, horodatage desc);
alter table public.at_mouvements_vehicule enable row level security;

create policy at_mouvements_vehicule_select on public.at_mouvements_vehicule for select to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('CONSULTER_TABLEAU'))
  );

-- ============================================================
-- 3. Enregistrer un laissez-passer
-- ============================================================
create or replace function public.at_enregistrer_vehicule(
  p_entreprise_id uuid,
  p_immatriculation text,
  p_type text default 'Véhicule',
  p_chauffeur text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ent public.at_entreprises%rowtype;
  v_immat text := upper(btrim(coalesce(p_immatriculation, '')));
  v_lp text;
  v_seq int;
  v_id uuid;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if v_immat = '' then
    raise exception 'Immatriculation obligatoire';
  end if;

  select * into v_ent from public.at_entreprises where id = p_entreprise_id;
  if not found or v_ent.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Entreprise hors périmètre';
  end if;

  -- Laissez-passer lisible et unique sur le site : LP-<3 lettres entreprise>-<seq>.
  select count(*) + 1 into v_seq from public.at_vehicules where site_id = v_ent.site_id;
  v_lp := 'LP-'
    || upper(coalesce(nullif(regexp_replace(left(v_ent.raison_sociale, 8), '[^A-Za-z]', '', 'g'), ''), 'VEH'))
    || '-' || lpad(v_seq::text, 3, '0');

  insert into public.at_vehicules (
    organisation_id, site_id, entreprise_id, immatriculation, type, chauffeur, laissez_passer
  ) values (
    v_ent.organisation_id, v_ent.site_id, v_ent.id, v_immat,
    coalesce(nullif(btrim(p_type), ''), 'Véhicule'), coalesce(btrim(p_chauffeur), ''), v_lp
  ) returning id into v_id;

  return jsonb_build_object('id', v_id, 'laissez_passer', v_lp, 'immatriculation', v_immat);
end;
$$;

revoke all on function public.at_enregistrer_vehicule(uuid, text, text, text) from public;
revoke execute on function public.at_enregistrer_vehicule(uuid, text, text, text) from anon;
grant execute on function public.at_enregistrer_vehicule(uuid, text, text, text) to authenticated;

-- ============================================================
-- 4. Enregistrer un mouvement — l'anomalie est calculée ici
-- ============================================================
create or replace function public.at_enregistrer_mouvement_vehicule(
  p_vehicule_id uuid,
  p_sens text,
  p_etat text,
  p_controle text,
  p_nature text default null,
  p_couverture text default null,
  p_force boolean default false,
  p_photo boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_veh public.at_vehicules%rowtype;
  v_ent text;
  v_agent text;
  v_couv text := nullif(btrim(coalesce(p_couverture, '')), '');
  v_nature text := nullif(btrim(coalesce(p_nature, '')), '');
  v_anomalie boolean;
  v_id uuid;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if p_sens not in ('ENTREE', 'SORTIE') then
    raise exception 'Sens inconnu : %', p_sens;
  end if;
  if p_etat not in ('VIDE', 'CHARGE') then
    raise exception 'État inconnu : %', p_etat;
  end if;
  if p_controle not in ('COFFRE', 'BENNE', 'LES_DEUX', 'SANS_OBJET') then
    raise exception 'Contrôle inconnu : %', p_controle;
  end if;

  select * into v_veh from public.at_vehicules where id = p_vehicule_id for update;
  if not found or v_veh.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Véhicule hors périmètre';
  end if;

  -- Cohérence du sens avec l'état courant.
  if p_sens = 'ENTREE' and v_veh.statut = 'SUR_SITE' then
    raise exception 'Véhicule déjà sur site';
  end if;
  if p_sens = 'SORTIE' and v_veh.statut = 'DEHORS' then
    raise exception 'Véhicule déjà dehors';
  end if;
  if p_etat = 'CHARGE' and v_nature is null then
    raise exception 'Nature du chargement obligatoire';
  end if;

  -- Anomalie bloquante : entré à vide, ressort chargé, sans couverture documentaire.
  v_anomalie := p_sens = 'SORTIE'
    and v_veh.etat_entree = 'VIDE'
    and p_etat = 'CHARGE'
    and v_couv is null;

  if v_anomalie then
    if not (coalesce(p_force, false) and coalesce(p_photo, false)) then
      raise exception 'Mouvement bloqué : forçage tracé + photo requis (véhicule entré à vide, ressort chargé sans couverture)';
    end if;
    if not public.at_a_pouvoir('FORCER_ACCES') then
      raise exception 'Pouvoir FORCER_ACCES requis pour forcer le mouvement';
    end if;
  end if;

  select coalesce(u.nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs u where u.user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  select raison_sociale into v_ent from public.at_entreprises where id = v_veh.entreprise_id;

  insert into public.at_mouvements_vehicule (
    organisation_id, site_id, vehicule_id, immatriculation, entreprise,
    sens, etat, nature, controle, couverture, anomalie, force, agent, photo
  ) values (
    v_veh.organisation_id, v_veh.site_id, v_veh.id, v_veh.immatriculation, coalesce(v_ent, '—'),
    p_sens, p_etat, v_nature, p_controle, v_couv, v_anomalie,
    v_anomalie and coalesce(p_force, false), v_agent, coalesce(p_photo, false)
  ) returning id into v_id;

  if p_sens = 'ENTREE' then
    update public.at_vehicules
       set statut = 'SUR_SITE', etat_entree = p_etat, nature_entree = v_nature, entree_at = now()
     where id = v_veh.id;
  else
    update public.at_vehicules
       set statut = 'DEHORS', etat_entree = null, nature_entree = null, entree_at = null
     where id = v_veh.id;
  end if;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (
    v_veh.organisation_id, v_veh.site_id, v_agent,
    'MOUVEMENT_VEHICULE_' || p_sens || case when v_anomalie then '_FORCE' else '' end,
    'at_mouvements_vehicule:' || v_id::text,
    jsonb_build_object('immat', v_veh.immatriculation, 'etat', p_etat, 'anomalie', v_anomalie)::text,
    'Poste'
  );

  return jsonb_build_object(
    'mouvement_id', v_id, 'anomalie', v_anomalie,
    'force', v_anomalie and coalesce(p_force, false),
    'statut', case when p_sens = 'ENTREE' then 'SUR_SITE' else 'DEHORS' end
  );
end;
$$;

revoke all on function public.at_enregistrer_mouvement_vehicule(uuid, text, text, text, text, text, boolean, boolean) from public;
revoke execute on function public.at_enregistrer_mouvement_vehicule(uuid, text, text, text, text, text, boolean, boolean) from anon;
grant execute on function public.at_enregistrer_mouvement_vehicule(uuid, text, text, text, text, text, boolean, boolean) to authenticated;
