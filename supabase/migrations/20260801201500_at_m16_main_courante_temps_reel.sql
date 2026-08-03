-- M16 — Main courante & incidents, diffusés en temps réel à la chaîne de commandement.
--
-- Une entrée consignée au poste doit parvenir immédiatement au HSE Officer et au
-- Directeur de la Construction : la table est publiée sur Realtime, et la lecture
-- est ouverte au nouveau pouvoir SUIVRE_INCIDENTS.
--
-- Séparation : l'agent consigne (CONTROLER_AU_POSTE), la chaîne de commandement
-- complète le rapport et clôt (SUIVRE_INCIDENTS). Un agent ne clôt pas son
-- propre incident.

-- ============================================================
-- 1. Le pouvoir de suivi, attribué à la chaîne de commandement
-- ============================================================
update public.at_roles
   set pouvoirs = array_append(pouvoirs, 'SUIVRE_INCIDENTS')
 where libelle in ('HSE Officer', 'Directeur de la Construction', 'Direction du site', 'Chef de poste')
   and not ('SUIVRE_INCIDENTS' = any (pouvoirs));

-- ============================================================
-- 2. Journal
-- ============================================================
create table if not exists public.at_main_courante (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  -- INC-AAAA-NNNNN pour les incidents ; nul pour un simple événement.
  numero text,
  type text not null check (type in ('EVENEMENT', 'INCIDENT')),
  categorie text not null,
  titre text not null,
  description text not null,
  gravite text check (gravite in ('MINEUR', 'MAJEUR')),
  statut text check (statut in ('OUVERT', 'CLOS')),
  circonstances text,
  mesures text,
  suites text,
  photo_url text,
  agent text not null,
  horodatage timestamptz not null default now(),
  clos_par text,
  clos_at timestamptz
);
comment on table public.at_main_courante is
  'Atlas Trace — main courante et incidents (M16). Publiée sur Realtime : la chaîne de commandement reçoit les entrées à la seconde.';

create index if not exists at_main_courante_site_idx on public.at_main_courante(site_id, horodatage desc);
create index if not exists at_main_courante_ouverts_idx on public.at_main_courante(site_id, statut) where statut = 'OUVERT';
alter table public.at_main_courante enable row level security;

-- Lecture : le poste qui saisit, et la chaîne de commandement qui reçoit.
create policy at_main_courante_select on public.at_main_courante for select to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('SUIVRE_INCIDENTS'))
  );

-- Diffusion temps réel (Realtime filtre selon la policy de lecture ci-dessus).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'at_main_courante'
  ) then
    alter publication supabase_realtime add table public.at_main_courante;
  end if;
end $$;

-- ============================================================
-- 3. Consignation (agent au poste)
-- ============================================================
create or replace function public.at_consigner_entree(
  p_type text,
  p_categorie text,
  p_titre text,
  p_description text,
  p_gravite text default null,
  p_photo_url text default null,
  p_circonstances text default null,
  p_mesures text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid; v_site uuid; v_agent text; v_num text; v_seq int;
  v_annee text := to_char(now(), 'YYYY'); v_id uuid; v_incident boolean;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if p_type not in ('EVENEMENT', 'INCIDENT') then
    raise exception 'Type inconnu : %', p_type;
  end if;
  if coalesce(btrim(coalesce(p_titre, '')), '') = '' or coalesce(btrim(coalesce(p_description, '')), '') = '' then
    raise exception 'Titre et description obligatoires';
  end if;

  select m.organisation_id, m.site_id, coalesce(u.nom, auth.uid()::text)
    into v_org, v_site, v_agent
    from public.at_membres m
    join public.at_utilisateurs u on u.id = m.utilisateur_id
   where u.user_id = auth.uid()
   limit 1;
  if v_site is null then
    raise exception 'Aucune affectation de site pour ce compte';
  end if;

  v_incident := p_type = 'INCIDENT';

  -- I1 : un incident majeur n'est pas consignable sans photo ni rapport.
  if v_incident and p_gravite = 'MAJEUR' then
    if coalesce(btrim(coalesce(p_photo_url, '')), '') = '' then
      raise exception 'Incident majeur : photo obligatoire';
    end if;
    if coalesce(btrim(coalesce(p_circonstances, '')), '') = ''
       or coalesce(btrim(coalesce(p_mesures, '')), '') = '' then
      raise exception 'Incident majeur : circonstances et mesures prises obligatoires';
    end if;
  end if;

  if v_incident then
    perform pg_advisory_xact_lock(hashtext('at_main_courante:' || v_site::text));
    select coalesce(max((substring(numero from 'INC-\d{4}-(\d+)'))::int), 0) + 1
      into v_seq
      from public.at_main_courante
     where site_id = v_site and numero like 'INC-' || v_annee || '-%';
    v_num := 'INC-' || v_annee || '-' || lpad(v_seq::text, 5, '0');
  end if;

  insert into public.at_main_courante (
    organisation_id, site_id, numero, type, categorie, titre, description,
    gravite, statut, circonstances, mesures, photo_url, agent
  ) values (
    v_org, v_site, v_num, p_type, p_categorie, btrim(p_titre), btrim(p_description),
    case when v_incident then coalesce(p_gravite, 'MINEUR') end,
    case when v_incident then 'OUVERT' end,
    nullif(btrim(coalesce(p_circonstances, '')), ''),
    nullif(btrim(coalesce(p_mesures, '')), ''),
    nullif(btrim(coalesce(p_photo_url, '')), ''),
    v_agent
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres)
  values (v_org, v_site, v_agent,
          case when v_incident then 'INCIDENT_CONSIGNE' else 'MAIN_COURANTE_ENTREE' end,
          'at_main_courante:' || coalesce(v_num, v_id::text), btrim(p_titre));

  return jsonb_build_object('id', v_id, 'numero', v_num, 'type', p_type);
end;
$$;

revoke all on function public.at_consigner_entree(text, text, text, text, text, text, text, text) from public;
revoke execute on function public.at_consigner_entree(text, text, text, text, text, text, text, text) from anon;
grant execute on function public.at_consigner_entree(text, text, text, text, text, text, text, text) to authenticated;

-- ============================================================
-- 4. Rapport et clôture (chaîne de commandement)
-- ============================================================
create or replace function public.at_maj_rapport_incident(
  p_id uuid,
  p_circonstances text,
  p_mesures text,
  p_suites text,
  p_clore boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_e public.at_main_courante%rowtype; v_agent text;
begin
  select * into v_e from public.at_main_courante where id = p_id;
  if not found or v_e.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Entrée hors périmètre';
  end if;
  if v_e.type <> 'INCIDENT' then
    raise exception 'Seul un incident porte un rapport';
  end if;
  if v_e.statut = 'CLOS' then
    raise exception 'Incident déjà clos — le journal est inaltérable';
  end if;

  -- Renseigner le rapport : le poste ou la chaîne. Clore : la chaîne seulement.
  if p_clore then
    if not public.at_a_pouvoir('SUIVRE_INCIDENTS') then
      raise exception 'Pouvoir SUIVRE_INCIDENTS requis pour clore un incident';
    end if;
    if coalesce(btrim(coalesce(p_circonstances, '')), '') = ''
       or coalesce(btrim(coalesce(p_mesures, '')), '') = ''
       or coalesce(btrim(coalesce(p_suites, '')), '') = '' then
      raise exception 'Clôture : circonstances, mesures prises et suites sont exigées';
    end if;
  elsif not (public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('SUIVRE_INCIDENTS')) then
    raise exception 'Pouvoir CONTROLER_AU_POSTE ou SUIVRE_INCIDENTS requis';
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  update public.at_main_courante
     set circonstances = nullif(btrim(coalesce(p_circonstances, '')), ''),
         mesures = nullif(btrim(coalesce(p_mesures, '')), ''),
         suites = nullif(btrim(coalesce(p_suites, '')), ''),
         statut = case when p_clore then 'CLOS' else statut end,
         clos_par = case when p_clore then v_agent else clos_par end,
         clos_at = case when p_clore then now() else clos_at end
   where id = p_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite)
  values (v_e.organisation_id, v_e.site_id, v_agent,
          case when p_clore then 'INCIDENT_CLOS' else 'INCIDENT_RAPPORT' end,
          'at_main_courante:' || coalesce(v_e.numero, p_id::text));

  return jsonb_build_object('id', p_id, 'statut', case when p_clore then 'CLOS' else v_e.statut end);
end;
$$;

revoke all on function public.at_maj_rapport_incident(uuid, text, text, text, boolean) from public;
revoke execute on function public.at_maj_rapport_incident(uuid, text, text, text, boolean) from anon;
grant execute on function public.at_maj_rapport_incident(uuid, text, text, text, boolean) to authenticated;
