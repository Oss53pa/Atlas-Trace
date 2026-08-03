-- Le poste affichait le code brut du type de sortie (« DECHETS ») au lieu de son
-- libellé. Le vocabulaire est contrôlé (3 valeurs) : la traduction se fait ici,
-- pour que l'agent lise du français sans que le front ait à recomposer le titre.
create or replace function public.at__libelle_type_sortie(p_type text)
returns text language sql immutable as $$
  select case p_type
    when 'SITE' then 'Matériel du site'
    when 'ENTREPRISE' then 'Matériel de l''entreprise'
    when 'DECHETS' then 'Déchets & emballages'
    else coalesce(p_type, '—')
  end;
$$;

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
      'sous_titre', coalesce(v_ent, '—') || ' · ' || public.at__libelle_type_sortie(v_auto.type)
                    || ' → ' || v_auto.destination,
      'lignes', (
        select coalesce(jsonb_agg(
          trim(both ' ' from coalesce(l->>'designation', '')
            || case when (l->>'quantite') is not null
                 then ' · ' || (l->>'quantite') || ' ' || coalesce(l->>'unite', 'u') else '' end
            || case when (l->>'marquage') is not null then ' · ' || (l->>'marquage') else '' end)
        ), '[]'::jsonb)
        from jsonb_array_elements(v_auto.lignes) l
      ),
      'validite_fin', v_auto.validite_fin,
      'entreprise_label', coalesce(v_ent, '—')
    );
  end if;

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
        || case when v_mat.marque is not null then ' · ' || v_mat.marque || ' ' || coalesce(v_mat.modele, '') else '' end,
      'lignes', jsonb_build_array(coalesce(v_ent, '—') || ' · matériel déclaré à l''entrée'),
      'entreprise_label', coalesce(v_ent, '—')
    );
  end if;

  return jsonb_build_object(
    'resultat', 'REFUSE', 'voie', 'AUCUNE', 'motif', 'NON_COUVERT_R1',
    'reference', v_ref, 'libelle', 'Non couvert', 'entreprise_label', '—'
  );
end;
$$;

revoke all on function public.at__decision_sortie(uuid, text) from public;
revoke execute on function public.at__decision_sortie(uuid, text) from anon, authenticated;
