-- CDC V2 — Bascule marquage physique (interdit) → dotation par famille (M8).
-- Le contrôle de sortie ne vérifie plus un numéro marqué opposable mais que l'entité
-- ne sort pas plus d'objets d'une famille qu'elle n'en a présents. Appliquée sur base
-- vierge de matériel (0 ligne at_materiels / at_mouvements_sortie).

drop function if exists public.at_declarer_bordereau(uuid, jsonb);
drop function if exists public.at_marquer_materiel(uuid, text);
drop function if exists public.at_viser_materiel(uuid, boolean);
drop function if exists public.at_enregistrer_sortie(uuid, text, text, text, text, boolean);
drop function if exists public.at_evaluer_sortie(uuid, text);
drop function if exists public.at__decision_sortie(uuid, text);
drop table if exists public.at_mouvements_sortie cascade;
drop table if exists public.at_materiels cascade;

-- 1. Familles de matériel (M8) — configuration du site
create table public.at_familles_materiel (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  libelle text not null,
  regime text not null default 'UNITE' check (regime in ('UNITE', 'CONTENANT', 'LOT')),
  sensible boolean not null default false,
  actif boolean not null default true,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, libelle)
);
comment on table public.at_familles_materiel is
  'Atlas Trace — familles de matériel (M8). Régime unité/contenant/lot. Le drapeau sensible impose la photo à l''entrée et un tirage renforcé.';
alter table public.at_familles_materiel enable row level security;
create policy at_familles_select on public.at_familles_materiel for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
create policy at_familles_write on public.at_familles_materiel for all to authenticated
  using (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('PARAMETRER_SITE'))
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('PARAMETRER_SITE'));

-- 2. Dotation par entité et par famille — tenue par les mouvements, jamais saisie
create table public.at_dotations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  entreprise_id uuid not null references public.at_entreprises(id) on delete restrict,
  famille_id uuid not null references public.at_familles_materiel(id) on delete restrict,
  quantite_presente numeric not null default 0 check (quantite_presente >= 0),
  updated_at timestamptz not null default now(),
  unique (entreprise_id, famille_id)
);
comment on table public.at_dotations is
  'Atlas Trace — dotation par famille (M8). Quantité présente d''une entité sur le site, calculée par les entrées/sorties. Écriture réservée aux fonctions serveur.';
create index at_dotations_site_idx on public.at_dotations(site_id, entreprise_id);
alter table public.at_dotations enable row level security;
create policy at_dotations_select on public.at_dotations for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
-- Aucune policy d'écriture : la dotation ne se saisit jamais (SECURITY DEFINER only).

-- 3. Matériel déclaré (M7) — chaque entrée, rattachée à une famille. Aucun marquage.
create table public.at_materiels (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  entreprise_id uuid not null references public.at_entreprises(id) on delete restrict,
  famille_id uuid not null references public.at_familles_materiel(id) on delete restrict,
  designation text not null,
  numero_serie text,
  quantite numeric not null default 1 check (quantite > 0),
  photo_url text,
  statut text not null default 'PRESENT' check (statut in ('PRESENT', 'SORTI', 'EN_RETARD')),
  repart_le_soir boolean not null default false,
  date_entree timestamptz not null default now(),
  date_sortie_prevue date,
  agent_entree text,
  created_at timestamptz not null default now()
);
comment on table public.at_materiels is
  'Atlas Trace — matériel déclaré à l''entrée (M7). Ce qui est déclaré ressort en quelques secondes via la dotation ; aucun marquage physique n''est exigé.';
create index at_materiels_entreprise_idx on public.at_materiels(entreprise_id, famille_id);
alter table public.at_materiels enable row level security;
create policy at_materiels_select on public.at_materiels for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
-- Écriture réservée à at_declarer_entree (SECURITY DEFINER).

-- 4. Journal des contrôles de sortie (M10) — voie DOTATION | AUTORISATION | AUCUNE
create table public.at_mouvements_sortie (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  poste_id uuid not null references public.at_postes(id) on delete restrict,
  voie text not null check (voie in ('AUTORISATION', 'DOTATION', 'AUCUNE')),
  reference text not null,
  libelle text not null,
  autorisation_id uuid references public.at_autorisations_sortie(id) on delete set null,
  entreprise_id uuid references public.at_entreprises(id) on delete set null,
  famille_id uuid references public.at_familles_materiel(id) on delete set null,
  quantite numeric,
  resultat text not null check (resultat in ('AUTORISE', 'REFUSE')),
  motif text,
  mode text not null default 'EN_LIGNE' check (mode in ('EN_LIGNE', 'HORS_LIGNE')),
  agent text not null,
  commentaire text,
  photo boolean not null default false,
  horodatage timestamptz not null default now()
);
comment on table public.at_mouvements_sortie is
  'Atlas Trace — contrôles de sortie matière (M10). Écriture réservée aux fonctions serveur.';
create index at_mouvements_sortie_site_idx on public.at_mouvements_sortie(site_id, horodatage desc);
alter table public.at_mouvements_sortie enable row level security;
create policy at_mouvements_sortie_select on public.at_mouvements_sortie for select to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('CONSULTER_TABLEAU'))
  );

-- 5. Entrée de matériel (M7) — incrémente la dotation de la famille
create function public.at_declarer_entree(
  p_entreprise_id uuid, p_famille_id uuid, p_designation text,
  p_quantite numeric default 1, p_numero_serie text default null, p_photo_url text default null,
  p_repart_le_soir boolean default false, p_date_sortie_prevue date default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid; v_site uuid; v_fam public.at_familles_materiel%rowtype; v_agent text; v_id uuid; v_dispo numeric;
begin
  if not public.at_a_pouvoir('DECLARER_MATERIEL') then raise exception 'Pouvoir DECLARER_MATERIEL requis'; end if;
  if coalesce(p_quantite, 0) <= 0 then raise exception 'Quantité invalide'; end if;
  if coalesce(btrim(coalesce(p_designation, '')), '') = '' then raise exception 'Désignation obligatoire'; end if;

  select organisation_id, site_id into v_org, v_site from public.at_entreprises where id = p_entreprise_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Entreprise hors périmètre'; end if;

  select * into v_fam from public.at_familles_materiel where id = p_famille_id and site_id = v_site;
  if not found then raise exception 'Famille inconnue pour ce site'; end if;
  if not v_fam.actif then raise exception 'Famille désactivée'; end if;
  if v_fam.sensible and coalesce(btrim(coalesce(p_photo_url, '')), '') = '' then
    raise exception 'Photo obligatoire pour une famille sensible';
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  insert into public.at_materiels (
    organisation_id, site_id, entreprise_id, famille_id, designation,
    numero_serie, quantite, photo_url, repart_le_soir, date_sortie_prevue, agent_entree
  ) values (
    v_org, v_site, p_entreprise_id, p_famille_id, btrim(p_designation),
    nullif(btrim(coalesce(p_numero_serie, '')), ''), p_quantite,
    nullif(btrim(coalesce(p_photo_url, '')), ''), coalesce(p_repart_le_soir, false), p_date_sortie_prevue, v_agent
  ) returning id into v_id;

  insert into public.at_dotations (organisation_id, site_id, entreprise_id, famille_id, quantite_presente, updated_at)
  values (v_org, v_site, p_entreprise_id, p_famille_id, p_quantite, now())
  on conflict (entreprise_id, famille_id)
    do update set quantite_presente = public.at_dotations.quantite_presente + excluded.quantite_presente, updated_at = now()
  returning quantite_presente into v_dispo;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres)
  values (v_org, v_site, v_agent, 'MATERIEL_ENTREE', 'at_materiels:' || v_id::text,
    jsonb_build_object('famille', v_fam.libelle, 'quantite', p_quantite, 'dotation', v_dispo)::text);

  return jsonb_build_object('id', v_id, 'famille', v_fam.libelle, 'dotation', v_dispo);
end;
$$;
revoke all on function public.at_declarer_entree(uuid, uuid, text, numeric, text, text, boolean, date) from public;
revoke execute on function public.at_declarer_entree(uuid, uuid, text, numeric, text, text, boolean, date) from anon;
grant execute on function public.at_declarer_entree(uuid, uuid, text, numeric, text, text, boolean, date) to authenticated;

-- 6. Décision de sortie sur code (autorisation) — voie MARQUAGE supprimée
create function public.at__decision_sortie(p_poste_id uuid, p_ref text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_poste public.at_postes%rowtype; v_auto public.at_autorisations_sortie%rowtype; v_ent text; v_ref text := btrim(coalesce(p_ref, ''));
begin
  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found then raise exception 'Poste inconnu ou inactif'; end if;

  select * into v_auto from public.at_autorisations_sortie where site_id = v_poste.site_id and code = v_ref;
  if found then
    select raison_sociale into v_ent from public.at_entreprises where id = v_auto.entreprise_id;
    if v_auto.statut <> 'APPROUVEE' then
      return jsonb_build_object('resultat','REFUSE','voie','AUTORISATION','motif','AUTORISATION_NON_APPROUVEE',
        'reference',v_ref,'libelle',v_auto.numero,'statut',v_auto.statut,'entreprise_label',coalesce(v_ent,'—'));
    end if;
    if v_auto.consommee_at is not null then
      return jsonb_build_object('resultat','REFUSE','voie','AUTORISATION','motif','AUTORISATION_CONSOMMEE',
        'reference',v_ref,'libelle',v_auto.numero,'consommee_at',v_auto.consommee_at,'entreprise_label',coalesce(v_ent,'—'));
    end if;
    if v_auto.validite_fin < now() then
      return jsonb_build_object('resultat','REFUSE','voie','AUTORISATION','motif','AUTORISATION_EXPIREE',
        'reference',v_ref,'libelle',v_auto.numero,'validite_fin',v_auto.validite_fin,'entreprise_label',coalesce(v_ent,'—'));
    end if;
    return jsonb_build_object('resultat','AUTORISE','voie','AUTORISATION',
      'reference',v_ref,'libelle',v_auto.numero,'autorisation_id',v_auto.id,
      'sous_titre',coalesce(v_ent,'—') || ' · ' || v_auto.type || ' → ' || v_auto.destination,
      'lignes',to_jsonb(v_auto.lignes),'validite_fin',v_auto.validite_fin,'entreprise_label',coalesce(v_ent,'—'));
  end if;

  return jsonb_build_object('resultat','REFUSE','voie','AUCUNE','motif','NON_COUVERT_R1',
    'reference',v_ref,'libelle','Non couvert','entreprise_label','—');
end;
$$;
revoke all on function public.at__decision_sortie(uuid, text) from public;
revoke execute on function public.at__decision_sortie(uuid, text) from anon, authenticated;

create function public.at_evaluer_sortie(p_poste_id uuid, p_ref text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_org uuid;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then raise exception 'Pouvoir CONTROLER_AU_POSTE requis'; end if;
  select organisation_id into v_org from public.at_postes where id = p_poste_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Poste hors périmètre'; end if;
  return public.at__decision_sortie(p_poste_id, p_ref);
end;
$$;
revoke all on function public.at_evaluer_sortie(uuid, text) from public;
revoke execute on function public.at_evaluer_sortie(uuid, text) from anon;
grant execute on function public.at_evaluer_sortie(uuid, text) to authenticated;

-- 7. Enregistrement sortie sur code (autorisation, usage unique atomique)
create function public.at_enregistrer_sortie(
  p_poste_id uuid, p_ref text, p_action text,
  p_commentaire text default null, p_mode text default 'EN_LIGNE', p_photo boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_poste public.at_postes%rowtype; v_d jsonb; v_resultat text; v_motif text; v_agent text; v_id uuid; v_auto_id uuid; v_consomme integer := 0;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then raise exception 'Pouvoir CONTROLER_AU_POSTE requis'; end if;
  if p_action not in ('VALIDER', 'REFUSER') then raise exception 'Action inconnue : %', p_action; end if;
  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found or v_poste.organisation_id not in (select public.at_user_orgs()) then raise exception 'Poste hors périmètre'; end if;

  v_d := public.at__decision_sortie(p_poste_id, p_ref);
  v_motif := v_d->>'motif';
  v_resultat := case when p_action = 'REFUSER' then 'REFUSE' else v_d->>'resultat' end;

  select coalesce(u.nom, auth.uid()::text) into v_agent from public.at_utilisateurs u where u.user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  v_auto_id := nullif(v_d->>'autorisation_id', '')::uuid;
  if v_resultat = 'AUTORISE' and v_auto_id is not null then
    update public.at_autorisations_sortie set consommee_at = now(), consommee_par = v_agent
     where id = v_auto_id and consommee_at is null;
    get diagnostics v_consomme = row_count;
    if v_consomme = 0 then
      v_resultat := 'REFUSE'; v_motif := 'AUTORISATION_CONSOMMEE';
      v_d := v_d || jsonb_build_object('resultat','REFUSE','motif','AUTORISATION_CONSOMMEE');
    end if;
  end if;

  insert into public.at_mouvements_sortie (
    organisation_id, site_id, poste_id, voie, reference, libelle, autorisation_id, resultat, motif, mode, agent, commentaire, photo
  ) values (
    v_poste.organisation_id, v_poste.site_id, p_poste_id, coalesce(v_d->>'voie','AUCUNE'),
    coalesce(v_d->>'reference',p_ref), coalesce(v_d->>'libelle','Non couvert'), v_auto_id, v_resultat,
    case when v_resultat = 'AUTORISE' then null else v_motif end,
    p_mode, v_agent, nullif(btrim(coalesce(p_commentaire,'')),''), coalesce(p_photo,false)
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (v_poste.organisation_id, v_poste.site_id, v_agent, 'CONTROLE_SORTIE_' || v_resultat,
    'at_mouvements_sortie:' || v_id::text,
    (v_d || jsonb_build_object('action',p_action,'resultat_enregistre',v_resultat))::text, v_poste.libelle);

  return v_d || jsonb_build_object('mouvement_id',v_id,'resultat_enregistre',v_resultat,'autorisation_consommee',v_consomme = 1);
end;
$$;
revoke all on function public.at_enregistrer_sortie(uuid, text, text, text, text, boolean) from public;
revoke execute on function public.at_enregistrer_sortie(uuid, text, text, text, text, boolean) from anon;
grant execute on function public.at_enregistrer_sortie(uuid, text, text, text, text, boolean) to authenticated;

-- 8. Sortie par dotation (M10 chemin 1) — sélection entité + famille, décrément atomique
create function public.at_sortir_dotation(
  p_poste_id uuid, p_entreprise_id uuid, p_famille_id uuid, p_quantite numeric,
  p_action text default 'VALIDER', p_commentaire text default null, p_mode text default 'EN_LIGNE', p_photo boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_poste public.at_postes%rowtype; v_fam public.at_familles_materiel%rowtype; v_ent text; v_agent text;
  v_id uuid; v_reste numeric; v_ok integer := 0; v_resultat text; v_motif text; v_ref text;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then raise exception 'Pouvoir CONTROLER_AU_POSTE requis'; end if;
  if p_action not in ('VALIDER', 'REFUSER') then raise exception 'Action inconnue : %', p_action; end if;
  if coalesce(p_quantite, 0) <= 0 then raise exception 'Quantité invalide'; end if;

  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found or v_poste.organisation_id not in (select public.at_user_orgs()) then raise exception 'Poste hors périmètre'; end if;
  select * into v_fam from public.at_familles_materiel where id = p_famille_id and site_id = v_poste.site_id;
  if not found then raise exception 'Famille inconnue pour ce site'; end if;
  select raison_sociale into v_ent from public.at_entreprises where id = p_entreprise_id;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  v_ref := coalesce(v_ent, '—') || ' · ' || v_fam.libelle;

  if p_action = 'VALIDER' then
    update public.at_dotations set quantite_presente = quantite_presente - p_quantite, updated_at = now()
     where entreprise_id = p_entreprise_id and famille_id = p_famille_id and quantite_presente >= p_quantite
    returning quantite_presente into v_reste;
    get diagnostics v_ok = row_count;
    if v_ok = 1 then v_resultat := 'AUTORISE'; v_motif := null;
    else v_resultat := 'REFUSE'; v_motif := 'DOTATION_INSUFFISANTE'; end if;
  else
    v_resultat := 'REFUSE'; v_motif := 'REFUS_AGENT';
  end if;

  insert into public.at_mouvements_sortie (
    organisation_id, site_id, poste_id, voie, reference, libelle,
    entreprise_id, famille_id, quantite, resultat, motif, mode, agent, commentaire, photo
  ) values (
    v_poste.organisation_id, v_poste.site_id, p_poste_id, 'DOTATION', v_ref,
    p_quantite || ' × ' || v_fam.libelle || ' (' || coalesce(v_ent, '—') || ')',
    p_entreprise_id, p_famille_id, p_quantite, v_resultat, v_motif,
    p_mode, v_agent, nullif(btrim(coalesce(p_commentaire, '')), ''), coalesce(p_photo, false)
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (v_poste.organisation_id, v_poste.site_id, v_agent, 'SORTIE_DOTATION_' || v_resultat,
    'at_mouvements_sortie:' || v_id::text,
    jsonb_build_object('famille', v_fam.libelle, 'quantite', p_quantite, 'reste', v_reste)::text, v_poste.libelle);

  return jsonb_build_object('resultat', v_resultat, 'voie', 'DOTATION', 'motif', v_motif,
    'reference', v_ref, 'libelle', p_quantite || ' × ' || v_fam.libelle,
    'entreprise_label', coalesce(v_ent, '—'), 'reste', v_reste,
    'mouvement_id', v_id, 'resultat_enregistre', v_resultat);
end;
$$;
revoke all on function public.at_sortir_dotation(uuid, uuid, uuid, numeric, text, text, text, boolean) from public;
revoke execute on function public.at_sortir_dotation(uuid, uuid, uuid, numeric, text, text, text, boolean) from anon;
grant execute on function public.at_sortir_dotation(uuid, uuid, uuid, numeric, text, text, text, boolean) to authenticated;

-- 9. Seed des familles pilote (Annexe A, sous-ensemble) — idempotent
insert into public.at_familles_materiel (organisation_id, site_id, libelle, regime, sensible, ordre)
select s.organisation_id, s.id, f.libelle, f.regime, f.sensible, f.ordre
from (select id, organisation_id from public.at_sites where libelle = 'Chantier Cosmos Angré' limit 1) s
cross join (values
  ('Perforateur, marteau, burineur', 'UNITE', true, 1),
  ('Meuleuse, tronçonneuse', 'UNITE', true, 2),
  ('Perceuse, visseuse', 'UNITE', true, 3),
  ('Groupe électrogène', 'UNITE', true, 4),
  ('Poste à souder et chalumeau', 'UNITE', true, 5),
  ('Appareil de mesure et topographie', 'UNITE', true, 6),
  ('Matériel de levage', 'UNITE', false, 7),
  ('Matériel de manutention', 'UNITE', false, 8),
  ('Caisse, malle et sac à outils', 'CONTENANT', true, 9),
  ('Échafaudage, étai, coffrage', 'LOT', false, 10),
  ('Carburant et lubrifiant', 'LOT', true, 11),
  ('Câble, fil et cuivre', 'LOT', true, 12),
  ('Autre matériel déclaré', 'UNITE', false, 20)
) as f(libelle, regime, sensible, ordre)
on conflict (site_id, libelle) do nothing;
