-- CDC V2 M25 — clôture de journée. À l'heure de clôture, les présences restantes
-- basculent en SORTIE NON CONSTATÉE (mouvement à part entière, distingué d'une sortie
-- scannée), l'appairage est soldé (entrée du lendemain possible), jamais bloquant.
-- Le chef de poste peut clôturer manuellement et motiver une présence prolongée.
-- La clôture porte aussi : CONFIRMEE_PAR_SILENCE (M4) et le passage en retard des
-- matériels « repart le soir » non sortis.

alter table public.at_mouvements_acces add column if not exists constatee boolean not null default true;

create table if not exists public.at_clotures (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  date_cloture date not null,
  heure_cloture timestamptz not null default now(),
  mode text not null default 'MANUEL' check (mode in ('AUTO', 'MANUEL')),
  declenchee_par text not null,
  nb_sorties_non_constatees int not null default 0,
  nb_prolongations int not null default 0,
  nb_badges_temp_non_restitues int not null default 0,
  nb_materiels_retard int not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, date_cloture)
);
comment on table public.at_clotures is
  'Atlas Trace — clôtures de journée (M25). Une par site et par date. Écriture réservée à at_cloturer_journee.';
alter table public.at_clotures enable row level security;
create policy at_clotures_select on public.at_clotures for select to authenticated
  using (organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CLOTURER_JOURNEE') or public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('CONSULTER_TABLEAU')));

create or replace function public.at_etat_cloture(p_poste_id uuid, p_date date default current_date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_poste public.at_postes%rowtype; v_fuseau text; v_presents jsonb; v_nb int;
  v_badges int; v_mat int; v_deja boolean;
begin
  if not (public.at_a_pouvoir('CLOTURER_JOURNEE') or public.at_a_pouvoir('CONTROLER_AU_POSTE')) then
    raise exception 'Pouvoir CLOTURER_JOURNEE ou CONTROLER_AU_POSTE requis';
  end if;
  select * into v_poste from public.at_postes where id = p_poste_id;
  if not found or v_poste.organisation_id not in (select public.at_user_orgs()) then raise exception 'Poste hors périmètre'; end if;
  select coalesce(fuseau, 'UTC') into v_fuseau from public.at_sites where id = v_poste.site_id;

  with dernier as (
    select distinct on (m.personne_id)
      m.personne_id, m.sens, m.personne_label, m.entreprise_label, m.horodatage
    from public.at_mouvements_acces m
    where m.site_id = v_poste.site_id and m.personne_id is not null
      and m.resultat in ('AUTORISE', 'FORCE')
      and (m.horodatage at time zone v_fuseau)::date = p_date
    order by m.personne_id, m.horodatage desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'personne_id', personne_id, 'label', personne_label, 'entreprise', entreprise_label,
           'heure', to_char(horodatage at time zone v_fuseau, 'HH24:MI')
         ) order by entreprise_label, personne_label), '[]'::jsonb), count(*)
    into v_presents, v_nb
  from dernier where sens = 'ENTREE';

  select count(*) into v_badges from public.at_badges
   where site_id = v_poste.site_id and type = 'TEMPORAIRE' and statut = 'ACTIF';
  select count(*) into v_mat from public.at_materiels
   where site_id = v_poste.site_id and repart_le_soir = true and statut = 'PRESENT';
  select exists (select 1 from public.at_clotures where site_id = v_poste.site_id and date_cloture = p_date) into v_deja;

  return jsonb_build_object(
    'date', p_date, 'poste_label', v_poste.libelle,
    'presents', v_presents, 'nb_presents', coalesce(v_nb, 0),
    'badges_temp_non_restitues', v_badges, 'materiels_repart_non_sortis', v_mat,
    'deja_cloture', v_deja
  );
end; $$;
revoke all on function public.at_etat_cloture(uuid, date) from public;
revoke execute on function public.at_etat_cloture(uuid, date) from anon;
grant execute on function public.at_etat_cloture(uuid, date) to authenticated;

create or replace function public.at_cloturer_journee(
  p_poste_id uuid, p_date date default current_date, p_mode text default 'MANUEL', p_prolongations jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_poste public.at_postes%rowtype; v_fuseau text; v_agent text; v_exclus uuid[];
  v_nb_sorties int := 0; v_nb_mat int := 0; v_nb_badges int := 0; v_nb_silence int := 0;
  v_nb_prol int := 0; r record;
begin
  if not public.at_a_pouvoir('CLOTURER_JOURNEE') then raise exception 'Pouvoir CLOTURER_JOURNEE requis'; end if;
  if p_mode not in ('AUTO', 'MANUEL') then raise exception 'Mode inconnu'; end if;
  select * into v_poste from public.at_postes where id = p_poste_id;
  if not found or v_poste.organisation_id not in (select public.at_user_orgs()) then raise exception 'Poste hors périmètre'; end if;
  select coalesce(fuseau, 'UTC') into v_fuseau from public.at_sites where id = v_poste.site_id;
  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  select coalesce(array_agg((e->>'personne_id')::uuid), '{}') into v_exclus
    from jsonb_array_elements(coalesce(p_prolongations, '[]'::jsonb)) e where (e->>'personne_id') is not null;
  v_nb_prol := coalesce(array_length(v_exclus, 1), 0);

  for r in
    with dernier as (
      select distinct on (m.personne_id)
        m.personne_id, m.sens, m.badge_id, m.badge_numero, m.personne_label, m.entreprise_label
      from public.at_mouvements_acces m
      where m.site_id = v_poste.site_id and m.personne_id is not null
        and m.resultat in ('AUTORISE', 'FORCE')
        and (m.horodatage at time zone v_fuseau)::date = p_date
      order by m.personne_id, m.horodatage desc
    )
    select * from dernier where sens = 'ENTREE' and personne_id <> all (v_exclus)
  loop
    insert into public.at_mouvements_acces (
      organisation_id, site_id, poste_id, badge_id, badge_numero, personne_id,
      personne_label, entreprise_label, sens, resultat, motif, alerte, mode, agent, constatee, horodatage
    ) values (
      v_poste.organisation_id, v_poste.site_id, p_poste_id, r.badge_id, r.badge_numero, r.personne_id,
      r.personne_label, r.entreprise_label, 'SORTIE', 'AUTORISE', null, 'SORTIE_NON_CONSTATEE',
      'EN_LIGNE', v_agent, false, now()
    );
    v_nb_sorties := v_nb_sorties + 1;
  end loop;

  update public.at_lignes_liste g
     set statut_confirmation = 'CONFIRMEE_PAR_SILENCE', confirmation_at = now()
    from public.at_listes_journalieres l
   where g.liste_id = l.id and l.site_id = v_poste.site_id and l.date_liste = p_date
     and g.statut_confirmation = 'EN_ATTENTE';
  get diagnostics v_nb_silence = row_count;

  update public.at_materiels
     set statut = 'EN_RETARD'
   where site_id = v_poste.site_id and repart_le_soir = true and statut = 'PRESENT';
  get diagnostics v_nb_mat = row_count;

  select count(*) into v_nb_badges from public.at_badges
   where site_id = v_poste.site_id and type = 'TEMPORAIRE' and statut = 'ACTIF';

  insert into public.at_clotures (
    organisation_id, site_id, date_cloture, mode, declenchee_par,
    nb_sorties_non_constatees, nb_prolongations, nb_badges_temp_non_restitues, nb_materiels_retard
  ) values (
    v_poste.organisation_id, v_poste.site_id, p_date, p_mode, v_agent,
    v_nb_sorties, v_nb_prol, v_nb_badges, v_nb_mat
  )
  on conflict (site_id, date_cloture) do update set
    heure_cloture = now(), mode = excluded.mode, declenchee_par = excluded.declenchee_par,
    nb_sorties_non_constatees = public.at_clotures.nb_sorties_non_constatees + excluded.nb_sorties_non_constatees,
    nb_prolongations = excluded.nb_prolongations,
    nb_badges_temp_non_restitues = excluded.nb_badges_temp_non_restitues,
    nb_materiels_retard = excluded.nb_materiels_retard;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (v_poste.organisation_id, v_poste.site_id, v_agent, 'CLOTURE_JOURNEE',
    'at_clotures:' || v_poste.site_id::text || ':' || p_date::text,
    jsonb_build_object('sorties_non_constatees', v_nb_sorties, 'prolongations', v_nb_prol,
      'confirmees_silence', v_nb_silence, 'materiels_retard', v_nb_mat, 'badges_temp', v_nb_badges)::text,
    v_poste.libelle);

  return jsonb_build_object(
    'sorties_non_constatees', v_nb_sorties, 'prolongations', v_nb_prol,
    'confirmees_par_silence', v_nb_silence, 'materiels_retard', v_nb_mat,
    'badges_temp_non_restitues', v_nb_badges
  );
end; $$;
revoke all on function public.at_cloturer_journee(uuid, date, text, jsonb) from public;
revoke execute on function public.at_cloturer_journee(uuid, date, text, jsonb) from anon;
grant execute on function public.at_cloturer_journee(uuid, date, text, jsonb) to authenticated;
