-- M15 — Tableau de bord : un agrégat serveur, lecture seule, borné à l'organisation.
-- Tout est calculé à partir des tables live (registre M4, accès M5, sorties M9/M10,
-- véhicules M11, évacuations M14, livraisons M12). Aucune donnée n'est inventée :
-- si le site n'a rien journalisé, le tableau montre des zéros réels.

create or replace function public.at_tableau_bord()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_orgs uuid[] := array(select public.at_user_orgs());
  v_present int; v_declare int;
  v_sorties_attente int; v_preavis_jour int;
  v_autorises int; v_refus int; v_forcages int;
  v_ano_veh int; v_ano_evac int; v_ano_refus int;
  v_badges_actifs int; v_entreprises_sans_liste int;
  v_presence jsonb; v_passages jsonb;
begin
  if not public.at_a_pouvoir('CONSULTER_TABLEAU') then
    raise exception 'Pouvoir CONSULTER_TABLEAU requis';
  end if;

  -- Registre de présence (M4) : déclarés = lignes, entrés = présents.
  select count(*), count(*) filter (where present)
    into v_declare, v_present
    from public.at_lignes_liste
   where organisation_id = any(v_orgs);

  -- Présence par entreprise (via la liste porteuse).
  select coalesce(jsonb_agg(jsonb_build_object(
           'entreprise', entreprise, 'declare', declare, 'entre', entre
         ) order by declare desc), '[]'::jsonb)
    into v_presence
    from (
      select lj.entreprise,
             count(*) as declare,
             count(*) filter (where ll.present) as entre
        from public.at_lignes_liste ll
        join public.at_listes_journalieres lj on lj.id = ll.liste_id
       where ll.organisation_id = any(v_orgs)
       group by lj.entreprise
    ) p;

  -- Sorties matière en attente (M9) et préavis du jour (M12).
  select count(*) into v_sorties_attente
    from public.at_autorisations_sortie
   where organisation_id = any(v_orgs) and statut in ('SOUMISE', 'VISEE', 'BROUILLON');

  select count(*) into v_preavis_jour
    from public.at_preavis_livraison
   where organisation_id = any(v_orgs) and created_at::date = current_date;

  -- Contrôles d'accès (M5), 24 h glissantes.
  select count(*) filter (where resultat = 'AUTORISE'),
         count(*) filter (where resultat = 'REFUSE'),
         count(*) filter (where resultat = 'FORCE')
    into v_autorises, v_refus, v_forcages
    from public.at_mouvements_acces
   where organisation_id = any(v_orgs) and horodatage > now() - interval '24 hours';

  -- Passages par heure (accès autorisés / forcés), 24 h.
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

  -- Anomalies des 24 h (mouvements, pas objets) : véhicules, évacuations, sorties refusées.
  select count(*) into v_ano_veh from public.at_mouvements_vehicule
   where organisation_id = any(v_orgs) and anomalie and horodatage > now() - interval '24 hours';
  select count(*) into v_ano_evac from public.at_controles_evacuation
   where organisation_id = any(v_orgs) and resultat = 'ANOMALIE' and horodatage > now() - interval '24 hours';
  select count(*) into v_ano_refus from public.at_mouvements_sortie
   where organisation_id = any(v_orgs) and resultat = 'REFUSE' and horodatage > now() - interval '24 hours';

  select count(*) into v_badges_actifs
    from public.at_badges where organisation_id = any(v_orgs) and statut = 'ACTIF';

  select count(*) into v_entreprises_sans_liste
    from public.at_entreprises e
   where e.organisation_id = any(v_orgs) and e.statut = 'ACTIVE'
     and not exists (
       select 1 from public.at_listes_journalieres lj
        where lj.organisation_id = e.organisation_id and lj.entreprise = e.raison_sociale
     );

  return jsonb_build_object(
    'present', v_present,
    'declare', v_declare,
    'ecart', v_declare - v_present,
    'sorties_attente', v_sorties_attente,
    'preavis_jour', v_preavis_jour,
    'badges_actifs', v_badges_actifs,
    'controles', jsonb_build_object('autorises', v_autorises, 'refus', v_refus, 'forcages', v_forcages),
    'anomalies', jsonb_build_object(
      'total', v_ano_veh + v_ano_evac + v_ano_refus,
      'vehicules', v_ano_veh, 'evacuations', v_ano_evac, 'sorties_refusees', v_ano_refus
    ),
    'presence', v_presence,
    'passages', v_passages,
    'entreprises_sans_liste', v_entreprises_sans_liste
  );
end;
$$;

revoke all on function public.at_tableau_bord() from public;
revoke execute on function public.at_tableau_bord() from anon;
grant execute on function public.at_tableau_bord() to authenticated;
