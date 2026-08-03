-- M5 — Poste de contrôle : la décision d'accès quitte le navigateur.
--
-- Avant : evaluate.ts décidait côté client à partir de données mock → contournable
-- en ouvrant les outils développeur. Après : le serveur seul décide et seul écrit.
-- Le client n'envoie que ce qu'il a scanné (badge, sens) et le geste de l'agent
-- (valider / refuser / forcer) ; il ne fournit JAMAIS le verdict.
--
-- Le journal des passages est en écriture exclusive par fonction SECURITY DEFINER :
-- aucune policy INSERT/UPDATE/DELETE n'existe pour les clients → inaltérable.

-- ============================================================
-- 1. Postes de contrôle (configuration du site)
-- ============================================================
create table if not exists public.at_postes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  libelle text not null,
  -- Zone gouvernée par ce poste : le badge doit l'autoriser.
  zone_controlee text not null,
  -- Emprise attendue au poste, le cas échéant (poste de galerie/cellule).
  emprise_controlee text,
  statut text not null default 'ACTIF' check (statut in ('ACTIF', 'INACTIF')),
  created_at timestamptz not null default now()
);
comment on table public.at_postes is
  'Atlas Trace — postes de contrôle physiques (M5). Zone/emprise gouvernées par le poste.';

create index if not exists at_postes_site_idx on public.at_postes(site_id);
alter table public.at_postes enable row level security;

create policy at_postes_select on public.at_postes for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
create policy at_postes_insert on public.at_postes for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'));
create policy at_postes_update on public.at_postes for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'))
  with check (organisation_id in (select public.at_user_orgs()));

-- ============================================================
-- 2. Journal des passages (append-only)
-- ============================================================
create table if not exists public.at_mouvements_acces (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  poste_id uuid not null references public.at_postes(id) on delete restrict,
  -- Badge nul = badge non identifiable : on garde quand même la trace du scan.
  badge_id uuid references public.at_badges(id) on delete set null,
  badge_numero text not null,
  personne_id uuid references public.at_personnes(id) on delete set null,
  -- Libellés figés au moment du passage : la trace ne doit pas bouger si la fiche change.
  personne_label text not null,
  entreprise_label text not null,
  sens text not null check (sens in ('ENTREE', 'SORTIE')),
  resultat text not null check (resultat in ('AUTORISE', 'REFUSE', 'FORCE')),
  motif text,
  alerte text,
  mode text not null default 'EN_LIGNE' check (mode in ('EN_LIGNE', 'HORS_LIGNE')),
  agent text not null,
  commentaire text,
  photo_forcage boolean not null default false,
  horodatage timestamptz not null default now()
);
comment on table public.at_mouvements_acces is
  'Atlas Trace — passages au poste (M5). Écriture réservée à at_enregistrer_acces() : aucune policy INSERT/UPDATE/DELETE.';

create index if not exists at_mouvements_site_idx on public.at_mouvements_acces(site_id, horodatage desc);
create index if not exists at_mouvements_personne_idx on public.at_mouvements_acces(personne_id, horodatage desc);
alter table public.at_mouvements_acces enable row level security;

-- Lecture seule, réservée à qui contrôle au poste ou consulte le tableau.
create policy at_mouvements_select on public.at_mouvements_acces for select to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('CONSULTER_TABLEAU'))
  );

-- ============================================================
-- 3. Moteur de décision (le cœur — porté depuis evaluate.ts)
-- ============================================================
-- ENTRÉE : chaîne complète, premier échec l'emporte.
-- SORTIE : toujours autorisée (ne jamais piéger quelqu'un sur site), mais tracée ;
--          une sortie sans entrée enregistrée est signalée sans bloquer.
create or replace function public.at__decision_acces(p_poste_id uuid, p_badge_ref text, p_sens text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_poste public.at_postes%rowtype;
  v_badge public.at_badges%rowtype;
  v_personne public.at_personnes%rowtype;
  v_entreprise public.at_entreprises%rowtype;
  v_fuseau text;
  v_jour date;
  v_heure time;
  v_present boolean;
  v_sur_liste boolean;
  v_bloque boolean;
  v_debut time;
  v_fin time;
  v_info jsonb;
begin
  if p_sens not in ('ENTREE', 'SORTIE') then
    raise exception 'Sens inconnu : %', p_sens;
  end if;

  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found then
    raise exception 'Poste inconnu ou inactif';
  end if;

  select fuseau into v_fuseau from public.at_sites where id = v_poste.site_id;
  v_fuseau := coalesce(v_fuseau, 'UTC');
  v_jour := (now() at time zone v_fuseau)::date;
  v_heure := (now() at time zone v_fuseau)::time;

  -- 1. Badge identifiable — bloquant dans les deux sens.
  select * into v_badge from public.at_badges
   where organisation_id = v_poste.organisation_id
     and site_id = v_poste.site_id
     and (numero = p_badge_ref or charge_utile = p_badge_ref);
  if not found then
    return jsonb_build_object(
      'resultat', 'REFUSE', 'motif', 'BADGE_INCONNU',
      'badge_numero', p_badge_ref, 'personne_label', 'Badge inconnu',
      'entreprise_label', '—', 'sens', p_sens, 'poste_id', p_poste_id
    );
  end if;

  select * into v_personne from public.at_personnes where id = v_badge.personne_id;
  select * into v_entreprise from public.at_entreprises where id = v_badge.entreprise_id;

  v_info := jsonb_build_object(
    'badge_id', v_badge.id,
    'badge_numero', v_badge.numero,
    'badge_type', v_badge.type,
    'badge_statut', v_badge.statut,
    'validite_fin', v_badge.validite_fin,
    'zones_autorisees', to_jsonb(v_badge.zones_autorisees),
    'emprise_autorisee', v_badge.emprise_autorisee,
    'accompagnateur', v_badge.accompagnateur,
    'personne_id', v_personne.id,
    'personne_label', coalesce(v_personne.prenom || ' ' || v_personne.nom, 'Porteur inconnu'),
    'fonction', v_personne.fonction,
    'entreprise_label', coalesce(v_entreprise.raison_sociale, '—'),
    'sens', p_sens,
    'poste_id', p_poste_id,
    'poste_label', v_poste.libelle
  );

  -- Porteur ou entreprise manquants : le badge n'est pas exploitable.
  if v_personne.id is null or v_entreprise.id is null then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'BADGE_INCONNU');
  end if;

  -- Présence courante : dernier passage effectif du jour.
  select (m.sens = 'ENTREE') into v_present
    from public.at_mouvements_acces m
   where m.personne_id = v_personne.id
     and m.site_id = v_poste.site_id
     and m.resultat in ('AUTORISE', 'FORCE')
     and (m.horodatage at time zone v_fuseau)::date = v_jour
   order by m.horodatage desc
   limit 1;
  v_present := coalesce(v_present, false);

  -- ---- SORTIE : on laisse toujours sortir, on trace, on signale l'anomalie ----
  if p_sens = 'SORTIE' then
    if not v_present then
      return v_info || jsonb_build_object('resultat', 'AUTORISE', 'alerte', 'SORTIE_SANS_ENTREE');
    end if;
    return v_info || jsonb_build_object('resultat', 'AUTORISE');
  end if;

  -- ---- ENTRÉE : chaîne complète ----
  -- 2. Badge actif / non expiré
  if v_badge.statut = 'SUSPENDU' then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'BADGE_SUSPENDU');
  end if;
  if v_badge.statut = 'EXPIRE' or (v_badge.validite_fin is not null and v_badge.validite_fin < v_jour) then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'BADGE_EXPIRE');
  end if;

  -- 3. Entreprise active
  if v_entreprise.statut = 'SUSPENDUE' then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'ENTREPRISE_SUSPENDUE');
  end if;

  -- 4. Preneur autorisé : condition bloquante non levée sur l'entité ou son parent.
  select exists (
    select 1
      from public.at_conditions_bloquantes c
     where c.levee = false
       and c.entite_id in (
         select e.id from public.at_entites e where e.id = v_entreprise.entite_id
         union
         select e.parent_id from public.at_entites e where e.id = v_entreprise.entite_id and e.parent_id is not null
       )
  ) into v_bloque;
  if v_bloque then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'DONNEUR_ORDRE_BLOQUE');
  end if;

  -- 5. Induction valide (bloquante)
  if v_personne.induction_statut is distinct from 'VALIDE'
     or (v_personne.induction_echeance is not null and v_personne.induction_echeance < v_jour) then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'INDUCTION_EXPIREE');
  end if;

  -- 6. Présence sur la liste journalière déposée
  select exists (
    select 1
      from public.at_lignes_liste g
      join public.at_listes_journalieres l on l.id = g.liste_id
     where l.site_id = v_poste.site_id
       and l.date_liste = v_jour
       and g.personne_id = v_personne.id
       and g.present
  ) into v_sur_liste;
  if not v_sur_liste then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'HORS_LISTE');
  end if;

  -- 7. Zone cohérente
  if not (v_poste.zone_controlee = any (v_badge.zones_autorisees)) then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'HORS_ZONE');
  end if;

  -- 8. Emprise cohérente
  if v_poste.emprise_controlee is not null
     and v_badge.emprise_autorisee is distinct from v_poste.emprise_controlee then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'HORS_EMPRISE');
  end if;

  -- 9. Plage horaire propre au badge ('HH:MM-HH:MM')
  if v_badge.plage_horaire ~ '^\d{2}:\d{2}-\d{2}:\d{2}$' then
    v_debut := split_part(v_badge.plage_horaire, '-', 1)::time;
    v_fin := split_part(v_badge.plage_horaire, '-', 2)::time;
    if v_heure < v_debut or v_heure > v_fin then
      return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'HORS_PLAGE');
    end if;
  end if;

  -- 10. Appairage entrée / sortie
  if v_present then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'DEJA_ENTRE');
  end if;

  return v_info || jsonb_build_object('resultat', 'AUTORISE');
end;
$$;

revoke all on function public.at__decision_acces(uuid, text, text) from public;
revoke execute on function public.at__decision_acces(uuid, text, text) from anon, authenticated;

-- ============================================================
-- 4. Évaluation (lecture seule) — ce que le poste affiche avant le geste de l'agent
-- ============================================================
create or replace function public.at_evaluer_acces(p_poste_id uuid, p_badge_ref text, p_sens text)
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
  return public.at__decision_acces(p_poste_id, p_badge_ref, p_sens);
end;
$$;

revoke all on function public.at_evaluer_acces(uuid, text, text) from public;
revoke execute on function public.at_evaluer_acces(uuid, text, text) from anon;
grant execute on function public.at_evaluer_acces(uuid, text, text) to authenticated;

-- ============================================================
-- 5. Enregistrement — le serveur re-décide, puis scelle le passage
-- ============================================================
-- p_action : VALIDER (le verdict serveur s'applique) · REFUSER · FORCER (pouvoir + motif requis).
-- Le client ne transmet pas le résultat : sur VALIDER, c'est la décision serveur qui est écrite,
-- même si l'interface affichait autre chose.
create or replace function public.at_enregistrer_acces(
  p_poste_id uuid,
  p_badge_ref text,
  p_sens text,
  p_action text,
  p_commentaire text default null,
  p_mode text default 'EN_LIGNE',
  p_photo_forcage boolean default false
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
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if p_action not in ('VALIDER', 'REFUSER', 'FORCER') then
    raise exception 'Action inconnue : %', p_action;
  end if;
  if p_mode not in ('EN_LIGNE', 'HORS_LIGNE') then
    raise exception 'Mode inconnu : %', p_mode;
  end if;

  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found or v_poste.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Poste hors périmètre';
  end if;

  v_d := public.at__decision_acces(p_poste_id, p_badge_ref, p_sens);
  v_motif := v_d->>'motif';

  if p_action = 'FORCER' then
    if not public.at_a_pouvoir('FORCER_ACCES') then
      raise exception 'Pouvoir FORCER_ACCES requis';
    end if;
    if coalesce(btrim(p_commentaire), '') = '' then
      raise exception 'Motif de forçage obligatoire';
    end if;
    v_resultat := 'FORCE';
  elsif p_action = 'REFUSER' then
    v_resultat := 'REFUSE';
  else
    -- VALIDER : le serveur tranche, pas l'interface.
    v_resultat := v_d->>'resultat';
  end if;

  select coalesce(u.nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs u where u.user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  insert into public.at_mouvements_acces (
    organisation_id, site_id, poste_id, badge_id, badge_numero, personne_id,
    personne_label, entreprise_label, sens, resultat, motif, alerte, mode,
    agent, commentaire, photo_forcage
  ) values (
    v_poste.organisation_id, v_poste.site_id, p_poste_id,
    nullif(v_d->>'badge_id', '')::uuid,
    coalesce(v_d->>'badge_numero', p_badge_ref),
    nullif(v_d->>'personne_id', '')::uuid,
    coalesce(v_d->>'personne_label', 'Badge inconnu'),
    coalesce(v_d->>'entreprise_label', '—'),
    p_sens, v_resultat,
    case when v_resultat = 'AUTORISE' then null else v_motif end,
    v_d->>'alerte', p_mode, v_agent,
    nullif(btrim(coalesce(p_commentaire, '')), ''),
    coalesce(p_photo_forcage, false)
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (
    v_poste.organisation_id, v_poste.site_id, v_agent,
    'CONTROLE_ACCES_' || v_resultat, 'at_mouvements_acces:' || v_id::text,
    (v_d || jsonb_build_object('action', p_action, 'resultat_enregistre', v_resultat))::text,
    v_poste.libelle
  );

  return v_d || jsonb_build_object(
    'mouvement_id', v_id,
    'resultat_enregistre', v_resultat,
    'action', p_action
  );
end;
$$;

revoke all on function public.at_enregistrer_acces(uuid, text, text, text, text, text, boolean) from public;
revoke execute on function public.at_enregistrer_acces(uuid, text, text, text, text, text, boolean) from anon;
grant execute on function public.at_enregistrer_acces(uuid, text, text, text, text, text, boolean) to authenticated;

-- ============================================================
-- 6. Correction de données : le lien ligne de liste → personne manquait
-- ============================================================
-- Sans ce lien, la règle « présence sur la liste du jour » ne peut pas s'appliquer.
update public.at_lignes_liste g
   set personne_id = p.id
  from public.at_personnes p
 where g.personne_id is null
   and p.organisation_id = g.organisation_id
   and lower(btrim(p.nom)) = lower(btrim(g.nom))
   and lower(btrim(p.prenom)) = lower(btrim(g.prenom));

-- ============================================================
-- 7. Configuration : le poste d'entrée du site
-- ============================================================
insert into public.at_postes (organisation_id, site_id, libelle, zone_controlee)
select s.organisation_id, s.id, 'Poste — Entrée principale', 'circulation'
  from public.at_sites s
 where not exists (select 1 from public.at_postes p where p.site_id = s.id);
