-- M5 — Le verdict porte l'identité nécessaire au contrôle visuel de l'agent.
-- Seul changement par rapport à 20260801000005 : v_info gagne personne_nom,
-- personne_prenom, photo_url et zone_label. Les règles sont inchangées.
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
    'zone_label', array_to_string(v_badge.zones_autorisees, ' · '),
    'emprise_autorisee', v_badge.emprise_autorisee,
    'accompagnateur', v_badge.accompagnateur,
    'personne_id', v_personne.id,
    'personne_nom', v_personne.nom,
    'personne_prenom', v_personne.prenom,
    'photo_url', v_personne.photo_url,
    'personne_label', coalesce(v_personne.prenom || ' ' || v_personne.nom, 'Porteur inconnu'),
    'fonction', v_personne.fonction,
    'entreprise_label', coalesce(v_entreprise.raison_sociale, '—'),
    'sens', p_sens,
    'poste_id', p_poste_id,
    'poste_label', v_poste.libelle
  );

  if v_personne.id is null or v_entreprise.id is null then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'BADGE_INCONNU');
  end if;

  select (m.sens = 'ENTREE') into v_present
    from public.at_mouvements_acces m
   where m.personne_id = v_personne.id
     and m.site_id = v_poste.site_id
     and m.resultat in ('AUTORISE', 'FORCE')
     and (m.horodatage at time zone v_fuseau)::date = v_jour
   order by m.horodatage desc
   limit 1;
  v_present := coalesce(v_present, false);

  if p_sens = 'SORTIE' then
    if not v_present then
      return v_info || jsonb_build_object('resultat', 'AUTORISE', 'alerte', 'SORTIE_SANS_ENTREE');
    end if;
    return v_info || jsonb_build_object('resultat', 'AUTORISE');
  end if;

  if v_badge.statut = 'SUSPENDU' then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'BADGE_SUSPENDU');
  end if;
  if v_badge.statut = 'EXPIRE' or (v_badge.validite_fin is not null and v_badge.validite_fin < v_jour) then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'BADGE_EXPIRE');
  end if;

  if v_entreprise.statut = 'SUSPENDUE' then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'ENTREPRISE_SUSPENDUE');
  end if;

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

  if v_personne.induction_statut is distinct from 'VALIDE'
     or (v_personne.induction_echeance is not null and v_personne.induction_echeance < v_jour) then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'INDUCTION_EXPIREE');
  end if;

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

  if not (v_poste.zone_controlee = any (v_badge.zones_autorisees)) then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'HORS_ZONE');
  end if;

  if v_poste.emprise_controlee is not null
     and v_badge.emprise_autorisee is distinct from v_poste.emprise_controlee then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'HORS_EMPRISE');
  end if;

  if v_badge.plage_horaire ~ '^\d{2}:\d{2}-\d{2}:\d{2}$' then
    v_debut := split_part(v_badge.plage_horaire, '-', 1)::time;
    v_fin := split_part(v_badge.plage_horaire, '-', 2)::time;
    if v_heure < v_debut or v_heure > v_fin then
      return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'HORS_PLAGE');
    end if;
  end if;

  if v_present then
    return v_info || jsonb_build_object('resultat', 'REFUSE', 'motif', 'DEJA_ENTRE');
  end if;

  return v_info || jsonb_build_object('resultat', 'AUTORISE');
end;
$$;
