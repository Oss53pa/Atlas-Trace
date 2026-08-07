-- Tableau de bord enrichi : période paramétrable (1/7/30 j), tendances vs période
-- précédente, série temporelle (sparkline) et panneaux incidents/dotations/clés.
-- Rétro-compatible : tous les champs de l'ancienne version sont conservés.
drop function if exists public.at_tableau_bord();

create or replace function public.at_tableau_bord(p_jours int default 1)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_orgs uuid[] := array(select public.at_user_orgs());
  v_jours int := greatest(1, coalesce(p_jours, 1));
  v_debut timestamptz := now() - (v_jours || ' days')::interval;
  v_debut_prec timestamptz := now() - ((2*v_jours) || ' days')::interval;
  v_present int; v_declare int;
  v_sorties_attente int; v_preavis_jour int;
  v_autorises int; v_refus int; v_forcages int; v_entrees int;
  v_ano_veh int; v_ano_evac int; v_ano_refus int;
  v_badges_actifs int; v_entreprises_sans_liste int;
  v_presence jsonb; v_passages jsonb; v_serie jsonb;
  v_p_autorises int; v_p_refus int; v_p_forcages int;
  v_p_ano int; v_p_entrees int; v_p_incidents int;
  v_incidents_total int; v_incidents_ouverts int; v_incidents_majeurs int;
  v_dot_ent int; v_dot_qte numeric; v_cles_sorties int; v_cles_total int;
  v_trunc text := case when v_jours = 1 then 'hour' else 'day' end;
  v_bucket interval := case when v_jours = 1 then interval '1 hour' else interval '1 day' end;
  v_span int := case when v_jours = 1 then 24 else v_jours end;
  v_fmt text := case when v_jours = 1 then 'HH24"h"' else 'DD/MM' end;
begin
  if not public.at_a_pouvoir('CONSULTER_TABLEAU') then
    raise exception 'Pouvoir CONSULTER_TABLEAU requis';
  end if;

  select count(*), count(*) filter (where present)
    into v_declare, v_present
    from public.at_lignes_liste where organisation_id = any(v_orgs);

  select coalesce(jsonb_agg(jsonb_build_object(
           'entreprise', entreprise, 'declare', declare, 'entre', entre) order by declare desc), '[]'::jsonb)
    into v_presence
    from (
      select lj.entreprise, count(*) as declare, count(*) filter (where ll.present) as entre
        from public.at_lignes_liste ll
        join public.at_listes_journalieres lj on lj.id = ll.liste_id
       where ll.organisation_id = any(v_orgs)
       group by lj.entreprise
    ) p;

  select count(*) into v_sorties_attente from public.at_autorisations_sortie
   where organisation_id = any(v_orgs) and statut in ('SOUMISE', 'VISEE', 'BROUILLON');

  select count(*) into v_preavis_jour from public.at_preavis_livraison
   where organisation_id = any(v_orgs) and created_at::date = current_date;

  -- Contrôles fenêtre courante
  select count(*) filter (where resultat = 'AUTORISE'),
         count(*) filter (where resultat = 'REFUSE'),
         count(*) filter (where resultat = 'FORCE'),
         count(*) filter (where sens = 'ENTREE' and resultat in ('AUTORISE','FORCE'))
    into v_autorises, v_refus, v_forcages, v_entrees
    from public.at_mouvements_acces
   where organisation_id = any(v_orgs) and horodatage > v_debut;

  -- Contrôles fenêtre précédente (tendances)
  select count(*) filter (where resultat = 'AUTORISE'),
         count(*) filter (where resultat = 'REFUSE'),
         count(*) filter (where resultat = 'FORCE'),
         count(*) filter (where sens = 'ENTREE' and resultat in ('AUTORISE','FORCE'))
    into v_p_autorises, v_p_refus, v_p_forcages, v_p_entrees
    from public.at_mouvements_acces
   where organisation_id = any(v_orgs) and horodatage > v_debut_prec and horodatage <= v_debut;

  -- Série (sparkline) : 24 buckets horaires (24 h) ou v_jours buckets journaliers
  select coalesce(jsonb_agg(jsonb_build_object(
           'label', to_char(b, v_fmt), 'entrees', e, 'sorties', s, 'refus', r) order by b), '[]'::jsonb)
    into v_serie
    from (
      select b,
             count(*) filter (where m.sens='ENTREE' and m.resultat in ('AUTORISE','FORCE')) as e,
             count(*) filter (where m.sens='SORTIE' and m.resultat in ('AUTORISE','FORCE')) as s,
             count(*) filter (where m.resultat='REFUSE') as r
        from generate_series(date_trunc(v_trunc, now()) - ((v_span-1) * v_bucket),
                             date_trunc(v_trunc, now()), v_bucket) b
        left join public.at_mouvements_acces m
               on m.organisation_id = any(v_orgs) and date_trunc(v_trunc, m.horodatage) = b
       group by b
    ) q;

  -- Passages horaires (conservé pour compat, toujours 24 h)
  select coalesce(jsonb_agg(jsonb_build_object('heure', h, 'entrees', e, 'sorties', s) order by h), '[]'::jsonb)
    into v_passages
    from (
      select to_char(horodatage, 'HH24') as h,
             count(*) filter (where sens = 'ENTREE' and resultat in ('AUTORISE', 'FORCE')) as e,
             count(*) filter (where sens = 'SORTIE' and resultat in ('AUTORISE', 'FORCE')) as s
        from public.at_mouvements_acces
       where organisation_id = any(v_orgs) and horodatage > now() - interval '24 hours'
       group by 1
    ) t;

  -- Anomalies fenêtre courante
  select count(*) into v_ano_veh from public.at_mouvements_vehicule
   where organisation_id = any(v_orgs) and anomalie and horodatage > v_debut;
  select count(*) into v_ano_evac from public.at_controles_evacuation
   where organisation_id = any(v_orgs) and resultat = 'ANOMALIE' and horodatage > v_debut;
  select count(*) into v_ano_refus from public.at_mouvements_sortie
   where organisation_id = any(v_orgs) and resultat = 'REFUSE' and horodatage > v_debut;

  -- Anomalies fenêtre précédente (total, pour tendance)
  select
      (select count(*) from public.at_mouvements_vehicule where organisation_id=any(v_orgs) and anomalie and horodatage>v_debut_prec and horodatage<=v_debut)
    + (select count(*) from public.at_controles_evacuation where organisation_id=any(v_orgs) and resultat='ANOMALIE' and horodatage>v_debut_prec and horodatage<=v_debut)
    + (select count(*) from public.at_mouvements_sortie where organisation_id=any(v_orgs) and resultat='REFUSE' and horodatage>v_debut_prec and horodatage<=v_debut)
    into v_p_ano;

  -- Incidents (main courante)
  select count(*) filter (where horodatage > v_debut),
         count(*) filter (where type='INCIDENT' and statut='OUVERT'),
         count(*) filter (where type='INCIDENT' and statut='OUVERT' and gravite='MAJEUR')
    into v_incidents_total, v_incidents_ouverts, v_incidents_majeurs
    from public.at_main_courante where organisation_id = any(v_orgs);
  select count(*) into v_p_incidents from public.at_main_courante
   where organisation_id=any(v_orgs) and horodatage>v_debut_prec and horodatage<=v_debut;

  -- Dotations (matière présente) et clés
  select count(distinct entreprise_id) filter (where quantite_presente > 0), coalesce(sum(quantite_presente),0)
    into v_dot_ent, v_dot_qte
    from public.at_dotations where organisation_id = any(v_orgs);
  select count(*) filter (where statut='REMISE'), count(*)
    into v_cles_sorties, v_cles_total
    from public.at_cles where organisation_id = any(v_orgs);

  select count(*) into v_badges_actifs
    from public.at_badges where organisation_id = any(v_orgs) and statut = 'ACTIF';

  select count(*) into v_entreprises_sans_liste
    from public.at_entreprises e
   where e.organisation_id = any(v_orgs) and e.statut = 'ACTIVE'
     and not exists (
       select 1 from public.at_listes_journalieres lj
        where lj.organisation_id = e.organisation_id and lj.entreprise = e.raison_sociale);

  return jsonb_build_object(
    'periode_jours', v_jours,
    'present', v_present, 'declare', v_declare, 'ecart', v_declare - v_present,
    'entrees', v_entrees,
    'sorties_attente', v_sorties_attente,
    'preavis_jour', v_preavis_jour,
    'badges_actifs', v_badges_actifs,
    'controles', jsonb_build_object('autorises', v_autorises, 'refus', v_refus, 'forcages', v_forcages),
    'anomalies', jsonb_build_object('total', v_ano_veh + v_ano_evac + v_ano_refus,
      'vehicules', v_ano_veh, 'evacuations', v_ano_evac, 'sorties_refusees', v_ano_refus),
    'incidents', jsonb_build_object('total', v_incidents_total, 'ouverts', v_incidents_ouverts, 'majeurs', v_incidents_majeurs),
    'dotations', jsonb_build_object('entreprises', v_dot_ent, 'quantite', v_dot_qte),
    'cles', jsonb_build_object('sorties', v_cles_sorties, 'total', v_cles_total),
    'precedent', jsonb_build_object('autorises', v_p_autorises, 'refus', v_p_refus,
      'forcages', v_p_forcages, 'anomalies', v_p_ano, 'entrees', v_p_entrees, 'incidents', v_p_incidents),
    'presence', v_presence,
    'passages', v_passages,
    'serie', v_serie,
    'entreprises_sans_liste', v_entreprises_sans_liste);
end;
$function$;

grant execute on function public.at_tableau_bord(int) to authenticated;
