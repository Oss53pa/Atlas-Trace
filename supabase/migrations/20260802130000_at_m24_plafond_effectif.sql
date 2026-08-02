-- CDC V2 M24 — plafond d'effectif par entité (par période). Le référent voit son
-- solde ; un ajout référent au-delà est bloqué (dérogation proposée) ; une inscription
-- portail peut dépasser (autorisée et signalée, jamais bloquante). Plafond non
-- renseigné = absence de plafond.

create table if not exists public.at_plafonds (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  entreprise_id uuid not null references public.at_entreprises(id) on delete cascade,
  valeur int not null check (valeur >= 0),
  date_debut date not null default current_date,
  date_fin date,
  auteur text,
  created_at timestamptz not null default now()
);
comment on table public.at_plafonds is
  'Atlas Trace — plafonds d''effectif par entité et par période (M24). Le plafond courant est la ligne la plus récente couvrant la date.';
create index if not exists at_plafonds_entreprise_idx on public.at_plafonds(entreprise_id, date_debut desc);
alter table public.at_plafonds enable row level security;
create policy at_plafonds_select on public.at_plafonds for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

create or replace function public.at_plafond_actuel(p_entreprise_id uuid, p_date date default current_date)
returns int language sql stable security definer set search_path = public as $$
  select valeur from public.at_plafonds
   where entreprise_id = p_entreprise_id and date_debut <= p_date and (date_fin is null or date_fin >= p_date)
   order by date_debut desc limit 1;
$$;
revoke all on function public.at_plafond_actuel(uuid, date) from public;
grant execute on function public.at_plafond_actuel(uuid, date) to authenticated;

create or replace function public.at_definir_plafond(
  p_entreprise_id uuid, p_valeur int, p_date_debut date default current_date, p_date_fin date default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_site uuid; v_agent text;
begin
  if not public.at_a_pouvoir('ADMINISTRER_ORGANISATION') then raise exception 'Pouvoir ADMINISTRER_ORGANISATION requis'; end if;
  if coalesce(p_valeur, -1) < 0 then raise exception 'Valeur de plafond invalide'; end if;
  select organisation_id, site_id into v_org, v_site from public.at_entreprises where id = p_entreprise_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Entreprise hors périmètre'; end if;
  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  insert into public.at_plafonds (organisation_id, site_id, entreprise_id, valeur, date_debut, date_fin, auteur)
  values (v_org, v_site, p_entreprise_id, p_valeur, coalesce(p_date_debut, current_date), p_date_fin, v_agent);
  return jsonb_build_object('ok', true, 'valeur', p_valeur);
end; $$;
revoke all on function public.at_definir_plafond(uuid, int, date, date) from public;
revoke execute on function public.at_definir_plafond(uuid, int, date, date) from anon;
grant execute on function public.at_definir_plafond(uuid, int, date, date) to authenticated;

-- Ajout registre : bloque le référent au-delà du plafond ; renvoie le solde.
create or replace function public.at_registre_ajouter_ligne(
  p_liste_id uuid, p_nom text, p_prenom text, p_fonction text default null,
  p_tournant boolean default true, p_source text default 'REFERENT'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_l public.at_listes_journalieres%rowtype; v_agent text; v_statut text; v_id uuid;
        v_ent uuid; v_plaf int; v_present int;
begin
  if p_source not in ('REFERENT', 'PORTAIL') then raise exception 'Source inconnue'; end if;
  if p_source = 'PORTAIL' then
    if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then raise exception 'Pouvoir CONTROLER_AU_POSTE requis'; end if;
  else
    if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  end if;
  if coalesce(btrim(coalesce(p_nom, '')), '') = '' or coalesce(btrim(coalesce(p_prenom, '')), '') = '' then
    raise exception 'Nom et prénom requis';
  end if;

  select * into v_l from public.at_listes_journalieres where id = p_liste_id;
  if not found or v_l.organisation_id not in (select public.at_user_orgs()) then raise exception 'Registre hors périmètre'; end if;

  if p_source = 'REFERENT' then
    select id into v_ent from public.at_entreprises where site_id = v_l.site_id and raison_sociale = v_l.entreprise limit 1;
    if v_ent is not null then
      v_plaf := public.at_plafond_actuel(v_ent, v_l.date_liste);
      if v_plaf is not null then
        select count(*) into v_present from public.at_lignes_liste
         where liste_id = p_liste_id and present and statut_confirmation not in ('CONTESTEE', 'REMPLACEE');
        if v_present >= v_plaf then
          return jsonb_build_object('resultat', 'REFUSE', 'motif', 'PLAFOND_DEPASSE', 'plafond', v_plaf, 'effectif', v_present);
        end if;
      end if;
    end if;
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  v_statut := case when p_source = 'PORTAIL' then 'EN_ATTENTE' else 'CONFIRMEE' end;

  insert into public.at_lignes_liste (
    liste_id, organisation_id, nom, prenom, fonction, present, tournant, source, statut_confirmation, ajout_at, ajout_par
  ) values (
    p_liste_id, v_l.organisation_id, btrim(p_nom), btrim(p_prenom),
    nullif(btrim(coalesce(p_fonction, '')), ''), true, coalesce(p_tournant, true),
    p_source, v_statut, now(), v_agent
  ) returning id into v_id;

  return jsonb_build_object('resultat', 'OK', 'id', v_id, 'statut_confirmation', v_statut);
end; $$;
revoke all on function public.at_registre_ajouter_ligne(uuid, text, text, text, boolean, text) from public;
revoke execute on function public.at_registre_ajouter_ligne(uuid, text, text, text, boolean, text) from anon;
grant execute on function public.at_registre_ajouter_ligne(uuid, text, text, text, boolean, text) to authenticated;

-- at_registre_assurer : expose le plafond courant (solde côté référent).
create or replace function public.at_registre_assurer(p_entreprise_id uuid, p_date date default current_date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_site uuid; v_nom text; v_id uuid; v_statut text; v_eff int; v_plaf int;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  select organisation_id, site_id, raison_sociale into v_org, v_site, v_nom
    from public.at_entreprises where id = p_entreprise_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Entreprise hors périmètre'; end if;
  insert into public.at_listes_journalieres (organisation_id, site_id, entreprise, date_liste, statut, effectif)
  values (v_org, v_site, v_nom, p_date, 'NON_DEPOSE', 0)
  on conflict (site_id, entreprise, date_liste) do update set entreprise = excluded.entreprise
  returning id, statut, effectif into v_id, v_statut, v_eff;
  v_plaf := public.at_plafond_actuel(p_entreprise_id, p_date);
  return jsonb_build_object('liste_id', v_id, 'statut', v_statut, 'effectif', coalesce(v_eff, 0),
    'entreprise', v_nom, 'date', p_date, 'plafond', v_plaf);
end; $$;
revoke all on function public.at_registre_assurer(uuid, date) from public;
revoke execute on function public.at_registre_assurer(uuid, date) from anon;
grant execute on function public.at_registre_assurer(uuid, date) to authenticated;
