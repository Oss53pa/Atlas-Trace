-- CDC V2 M21 — vivier de personnes par entité. Référentiel réutilisable des personnes
-- déjà venues, enrichi du nombre de passages (30 j / 7 j) et de la date de premier
-- passage (calculés depuis at_mouvements_acces). Le système propose la bascule en
-- badge nominatif au-delà du seuil (3 passages sur 7 jours glissants) ; décision humaine.

create or replace function public.at_vivier(p_entreprise_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_org uuid; v_site uuid; v_fuseau text; v_res jsonb;
begin
  if not (public.at_a_pouvoir('DECLARER_PERSONNEL') or public.at_a_pouvoir('DEPOSER_LISTE')
          or public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('DELIVRER_BADGE')) then
    raise exception 'Pouvoir insuffisant pour consulter le vivier';
  end if;
  select organisation_id, site_id into v_org, v_site from public.at_entreprises where id = p_entreprise_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Entreprise hors périmètre'; end if;
  select coalesce(fuseau, 'UTC') into v_fuseau from public.at_sites where id = v_site;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'nom', p.nom, 'prenom', p.prenom, 'fonction', p.fonction,
    'photo_url', p.photo_url, 'induction_statut', p.induction_statut, 'regime', p.regime, 'statut', p.statut,
    'nb_30j', coalesce(s.nb30, 0), 'nb_7j', coalesce(s.nb7, 0),
    'premier_passage', s.premier,
    'propose_nominatif', (coalesce(s.nb7, 0) >= 3 and p.regime <> 'STABLE' and p.statut = 'ACTIVE')
  ) order by p.nom, p.prenom), '[]'::jsonb)
  into v_res
  from public.at_personnes p
  left join lateral (
    select
      count(*) filter (where m.horodatage >= now() - interval '30 days') as nb30,
      count(*) filter (where m.horodatage >= now() - interval '7 days') as nb7,
      min(m.horodatage) as premier
    from public.at_mouvements_acces m
    where m.personne_id = p.id and m.sens = 'ENTREE' and m.resultat in ('AUTORISE', 'FORCE')
  ) s on true
  where p.entreprise_id = p_entreprise_id and p.statut <> 'CLOTUREE';

  return v_res;
end; $$;
revoke all on function public.at_vivier(uuid) from public;
revoke execute on function public.at_vivier(uuid) from anon;
grant execute on function public.at_vivier(uuid) to authenticated;
