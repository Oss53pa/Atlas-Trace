-- M10 — Contrôle des sorties matière : « rien ne sort sans autorisation approuvée
-- ou matériel marqué opposable » (R1), appliqué par le serveur.
--
-- Deux sources, alimentées par M7 (parc marqué) et M9 (autorisations) :
--   at_materiels             — le matériel déclaré, marqué, puis visé
--   at_autorisations_sortie  — les autorisations, opposables une fois approuvées
-- Un journal append-only : at_mouvements_sortie.
--
-- L'usage unique d'une autorisation est garanti par un UPDATE conditionnel dans
-- la même transaction que l'écriture du mouvement : deux postes qui scannent le
-- même code au même instant ne peuvent pas le consommer deux fois.

-- ============================================================
-- 1. Parc matériel (M7)
-- ============================================================
create table if not exists public.at_materiels (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  entreprise_id uuid not null references public.at_entreprises(id) on delete restrict,
  designation text not null,
  marque text,
  modele text,
  numero_serie text,
  categorie text not null,
  -- Numéro de marquage unique sur le site.
  numero_marquage text not null,
  statut text not null default 'DECLARE' check (statut in ('DECLARE', 'MARQUE', 'VISE')),
  photo_marquage boolean not null default false,
  visa_par text,
  visa_at timestamptz,
  echantillon boolean not null default false,
  bordereau text,
  created_at timestamptz not null default now()
);
comment on table public.at_materiels is
  'Atlas Trace — parc matériel déclaré/marqué/visé (M7). Seul le statut VISE rend le marquage opposable au poste.';

create unique index if not exists at_materiels_marquage_uk on public.at_materiels(site_id, numero_marquage);
create index if not exists at_materiels_entreprise_idx on public.at_materiels(entreprise_id);
alter table public.at_materiels enable row level security;

create policy at_materiels_select on public.at_materiels for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
create policy at_materiels_insert on public.at_materiels for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('DECLARER_MATERIEL'));
create policy at_materiels_update on public.at_materiels for update to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('VISER_MATERIEL') or public.at_a_pouvoir('DECLARER_MATERIEL'))
  )
  with check (organisation_id in (select public.at_user_orgs()));

-- ============================================================
-- 2. Autorisations de sortie (M9)
-- ============================================================
create table if not exists public.at_autorisations_sortie (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  entreprise_id uuid not null references public.at_entreprises(id) on delete restrict,
  numero text not null,
  -- Contenu du QR imprimé sur l'autorisation.
  code text not null,
  type text not null,
  destination text not null,
  lignes text[] not null default '{}',
  validite_debut timestamptz,
  validite_fin timestamptz not null,
  statut text not null default 'BROUILLON'
    check (statut in ('BROUILLON', 'VISEE', 'APPROUVEE', 'REFUSEE', 'ANNULEE')),
  visa_par text,
  visa_at timestamptz,
  approuve_par text,
  approuve_at timestamptz,
  -- Usage unique : renseigné par at_enregistrer_sortie, jamais par un client.
  consommee_at timestamptz,
  consommee_par text,
  created_at timestamptz not null default now()
);
comment on table public.at_autorisations_sortie is
  'Atlas Trace — autorisations de sortie (M9). Opposable au poste seulement si APPROUVEE, non expirée et non consommée.';

create unique index if not exists at_autorisations_code_uk on public.at_autorisations_sortie(code);
create index if not exists at_autorisations_site_idx on public.at_autorisations_sortie(site_id, statut);
alter table public.at_autorisations_sortie enable row level security;

create policy at_autorisations_select on public.at_autorisations_sortie for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
create policy at_autorisations_insert on public.at_autorisations_sortie for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('DEMANDER_SORTIE'));
create policy at_autorisations_update on public.at_autorisations_sortie for update to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('VISER_SORTIE') or public.at_a_pouvoir('APPROUVER_SORTIE') or public.at_a_pouvoir('DEMANDER_SORTIE'))
  )
  with check (organisation_id in (select public.at_user_orgs()));

-- ============================================================
-- 3. Journal des contrôles de sortie (append-only)
-- ============================================================
create table if not exists public.at_mouvements_sortie (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  poste_id uuid not null references public.at_postes(id) on delete restrict,
  voie text not null check (voie in ('AUTORISATION', 'MARQUAGE', 'AUCUNE')),
  reference text not null,
  libelle text not null,
  autorisation_id uuid references public.at_autorisations_sortie(id) on delete set null,
  materiel_id uuid references public.at_materiels(id) on delete set null,
  resultat text not null check (resultat in ('AUTORISE', 'REFUSE')),
  motif text,
  mode text not null default 'EN_LIGNE' check (mode in ('EN_LIGNE', 'HORS_LIGNE')),
  agent text not null,
  commentaire text,
  photo boolean not null default false,
  horodatage timestamptz not null default now()
);
comment on table public.at_mouvements_sortie is
  'Atlas Trace — contrôles de sortie matière (M10). Écriture réservée à at_enregistrer_sortie().';

create index if not exists at_mouvements_sortie_site_idx on public.at_mouvements_sortie(site_id, horodatage desc);
alter table public.at_mouvements_sortie enable row level security;

create policy at_mouvements_sortie_select on public.at_mouvements_sortie for select to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('CONSULTER_TABLEAU'))
  );

-- ============================================================
-- 4. Décision de sortie (R1)
-- ============================================================
create or replace function public.at__decision_sortie(p_poste_id uuid, p_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_poste public.at_postes%rowtype;
  v_auto public.at_autorisations_sortie%rowtype;
  v_mat public.at_materiels%rowtype;
  v_ent text;
  v_ref text := btrim(coalesce(p_ref, ''));
begin
  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found then
    raise exception 'Poste inconnu ou inactif';
  end if;

  -- Voie 1 : autorisation de sortie.
  select * into v_auto from public.at_autorisations_sortie
   where site_id = v_poste.site_id and code = v_ref;
  if found then
    select raison_sociale into v_ent from public.at_entreprises where id = v_auto.entreprise_id;
    if v_auto.statut <> 'APPROUVEE' then
      return jsonb_build_object(
        'resultat', 'REFUSE', 'voie', 'AUTORISATION', 'motif', 'AUTORISATION_NON_APPROUVEE',
        'reference', v_ref, 'libelle', v_auto.numero, 'statut', v_auto.statut,
        'entreprise_label', coalesce(v_ent, '—')
      );
    end if;
    if v_auto.consommee_at is not null then
      return jsonb_build_object(
        'resultat', 'REFUSE', 'voie', 'AUTORISATION', 'motif', 'AUTORISATION_CONSOMMEE',
        'reference', v_ref, 'libelle', v_auto.numero, 'consommee_at', v_auto.consommee_at,
        'entreprise_label', coalesce(v_ent, '—')
      );
    end if;
    if v_auto.validite_fin < now() then
      return jsonb_build_object(
        'resultat', 'REFUSE', 'voie', 'AUTORISATION', 'motif', 'AUTORISATION_EXPIREE',
        'reference', v_ref, 'libelle', v_auto.numero, 'validite_fin', v_auto.validite_fin,
        'entreprise_label', coalesce(v_ent, '—')
      );
    end if;
    return jsonb_build_object(
      'resultat', 'AUTORISE', 'voie', 'AUTORISATION',
      'reference', v_ref, 'libelle', v_auto.numero,
      'autorisation_id', v_auto.id,
      'sous_titre', coalesce(v_ent, '—') || ' · ' || v_auto.type || ' → ' || v_auto.destination,
      'lignes', to_jsonb(v_auto.lignes),
      'validite_fin', v_auto.validite_fin,
      'entreprise_label', coalesce(v_ent, '—')
    );
  end if;

  -- Voie 2 : marquage du parc.
  select * into v_mat from public.at_materiels
   where site_id = v_poste.site_id and numero_marquage = v_ref;
  if found then
    select raison_sociale into v_ent from public.at_entreprises where id = v_mat.entreprise_id;
    if v_mat.statut <> 'VISE' then
      return jsonb_build_object(
        'resultat', 'REFUSE', 'voie', 'MARQUAGE', 'motif', 'MARQUAGE_NON_OPPOSABLE',
        'reference', v_ref, 'libelle', v_mat.numero_marquage, 'statut', v_mat.statut,
        'entreprise_label', coalesce(v_ent, '—')
      );
    end if;
    return jsonb_build_object(
      'resultat', 'AUTORISE', 'voie', 'MARQUAGE',
      'reference', v_ref, 'libelle', v_mat.numero_marquage,
      'materiel_id', v_mat.id,
      'sous_titre', v_mat.designation
        || case when coalesce(v_mat.marque, '—') <> '—' then ' · ' || v_mat.marque || ' ' || coalesce(v_mat.modele, '') else '' end,
      'lignes', jsonb_build_array(coalesce(v_ent, '—') || ' · matériel déclaré à l''entrée'),
      'entreprise_label', coalesce(v_ent, '—')
    );
  end if;

  -- Ni l'un ni l'autre : règle de sortie unique.
  return jsonb_build_object(
    'resultat', 'REFUSE', 'voie', 'AUCUNE', 'motif', 'NON_COUVERT_R1',
    'reference', v_ref, 'libelle', 'Non couvert', 'entreprise_label', '—'
  );
end;
$$;

revoke all on function public.at__decision_sortie(uuid, text) from public;
revoke execute on function public.at__decision_sortie(uuid, text) from anon, authenticated;

create or replace function public.at_evaluer_sortie(p_poste_id uuid, p_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_org uuid;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  select organisation_id into v_org from public.at_postes where id = p_poste_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then
    raise exception 'Poste hors périmètre';
  end if;
  return public.at__decision_sortie(p_poste_id, p_ref);
end;
$$;

revoke all on function public.at_evaluer_sortie(uuid, text) from public;
revoke execute on function public.at_evaluer_sortie(uuid, text) from anon;
grant execute on function public.at_evaluer_sortie(uuid, text) to authenticated;

-- ============================================================
-- 5. Enregistrement — consommation atomique de l'autorisation
-- ============================================================
create or replace function public.at_enregistrer_sortie(
  p_poste_id uuid,
  p_ref text,
  p_action text,
  p_commentaire text default null,
  p_mode text default 'EN_LIGNE',
  p_photo boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poste public.at_postes%rowtype;
  v_d jsonb;
  v_resultat text;
  v_motif text;
  v_agent text;
  v_id uuid;
  v_auto_id uuid;
  v_consomme integer := 0;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if p_action not in ('VALIDER', 'REFUSER') then
    raise exception 'Action inconnue : %', p_action;
  end if;

  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found or v_poste.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Poste hors périmètre';
  end if;

  v_d := public.at__decision_sortie(p_poste_id, p_ref);
  v_motif := v_d->>'motif';
  v_resultat := case when p_action = 'REFUSER' then 'REFUSE' else v_d->>'resultat' end;

  select coalesce(u.nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs u where u.user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  -- Usage unique : la consommation ne réussit que si personne ne l'a prise avant.
  v_auto_id := nullif(v_d->>'autorisation_id', '')::uuid;
  if v_resultat = 'AUTORISE' and v_auto_id is not null then
    update public.at_autorisations_sortie
       set consommee_at = now(), consommee_par = v_agent
     where id = v_auto_id and consommee_at is null;
    get diagnostics v_consomme = row_count;
    if v_consomme = 0 then
      v_resultat := 'REFUSE';
      v_motif := 'AUTORISATION_CONSOMMEE';
      v_d := v_d || jsonb_build_object('resultat', 'REFUSE', 'motif', 'AUTORISATION_CONSOMMEE');
    end if;
  end if;

  insert into public.at_mouvements_sortie (
    organisation_id, site_id, poste_id, voie, reference, libelle,
    autorisation_id, materiel_id, resultat, motif, mode, agent, commentaire, photo
  ) values (
    v_poste.organisation_id, v_poste.site_id, p_poste_id,
    coalesce(v_d->>'voie', 'AUCUNE'),
    coalesce(v_d->>'reference', p_ref),
    coalesce(v_d->>'libelle', 'Non couvert'),
    nullif(v_d->>'autorisation_id', '')::uuid,
    nullif(v_d->>'materiel_id', '')::uuid,
    v_resultat,
    case when v_resultat = 'AUTORISE' then null else v_motif end,
    p_mode, v_agent,
    nullif(btrim(coalesce(p_commentaire, '')), ''),
    coalesce(p_photo, false)
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (
    v_poste.organisation_id, v_poste.site_id, v_agent,
    'CONTROLE_SORTIE_' || v_resultat, 'at_mouvements_sortie:' || v_id::text,
    (v_d || jsonb_build_object('action', p_action, 'resultat_enregistre', v_resultat))::text,
    v_poste.libelle
  );

  return v_d || jsonb_build_object(
    'mouvement_id', v_id,
    'resultat_enregistre', v_resultat,
    'autorisation_consommee', v_consomme = 1
  );
end;
$$;

revoke all on function public.at_enregistrer_sortie(uuid, text, text, text, text, boolean) from public;
revoke execute on function public.at_enregistrer_sortie(uuid, text, text, text, text, boolean) from anon;
grant execute on function public.at_enregistrer_sortie(uuid, text, text, text, text, boolean) to authenticated;
