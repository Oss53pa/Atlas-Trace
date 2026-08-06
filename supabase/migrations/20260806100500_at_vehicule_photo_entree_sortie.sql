-- Véhicules : photo du coffre/chargement à l'entrée, conservée pour comparaison
-- à la sortie (vérifier que ce qui ressort est identique à ce qui est entré).
alter table public.at_vehicules add column if not exists photo_entree_url text;
alter table public.at_mouvements_vehicule add column if not exists photo_url text;

-- Le RPC reçoit désormais le chemin de la photo (p_photo_url) : à l'entrée il le
-- range sur le véhicule (photo_entree_url), à la sortie il l'efface.
create or replace function public.at_enregistrer_mouvement_vehicule(
  p_vehicule_id uuid,
  p_sens text,
  p_etat text,
  p_controle text,
  p_nature text default null,
  p_couverture text default null,
  p_force boolean default false,
  p_photo boolean default false,
  p_photo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_veh public.at_vehicules%rowtype;
  v_ent text;
  v_agent text;
  v_couv text := nullif(btrim(coalesce(p_couverture, '')), '');
  v_nature text := nullif(btrim(coalesce(p_nature, '')), '');
  v_url text := nullif(btrim(coalesce(p_photo_url, '')), '');
  v_anomalie boolean;
  v_id uuid;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if p_sens not in ('ENTREE', 'SORTIE') then raise exception 'Sens inconnu : %', p_sens; end if;
  if p_etat not in ('VIDE', 'CHARGE') then raise exception 'État inconnu : %', p_etat; end if;
  if p_controle not in ('COFFRE', 'BENNE', 'LES_DEUX', 'SANS_OBJET') then raise exception 'Contrôle inconnu : %', p_controle; end if;

  select * into v_veh from public.at_vehicules where id = p_vehicule_id for update;
  if not found or v_veh.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Véhicule hors périmètre';
  end if;
  if p_sens = 'ENTREE' and v_veh.statut = 'SUR_SITE' then raise exception 'Véhicule déjà sur site'; end if;
  if p_sens = 'SORTIE' and v_veh.statut = 'DEHORS' then raise exception 'Véhicule déjà dehors'; end if;
  if p_etat = 'CHARGE' and v_nature is null then raise exception 'Nature du chargement obligatoire'; end if;

  v_anomalie := p_sens = 'SORTIE' and v_veh.etat_entree = 'VIDE' and p_etat = 'CHARGE' and v_couv is null;
  if v_anomalie then
    if not (coalesce(p_force, false) and coalesce(p_photo, false)) then
      raise exception 'Mouvement bloqué : forçage tracé + photo requis (véhicule entré à vide, ressort chargé sans couverture)';
    end if;
    if not public.at_a_pouvoir('FORCER_ACCES') then
      raise exception 'Pouvoir FORCER_ACCES requis pour forcer le mouvement';
    end if;
  end if;

  select coalesce(u.nom, auth.uid()::text) into v_agent from public.at_utilisateurs u where u.user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  select raison_sociale into v_ent from public.at_entreprises where id = v_veh.entreprise_id;

  insert into public.at_mouvements_vehicule (
    organisation_id, site_id, vehicule_id, immatriculation, entreprise,
    sens, etat, nature, controle, couverture, anomalie, force, agent, photo, photo_url
  ) values (
    v_veh.organisation_id, v_veh.site_id, v_veh.id, v_veh.immatriculation, coalesce(v_ent, '—'),
    p_sens, p_etat, v_nature, p_controle, v_couv, v_anomalie,
    v_anomalie and coalesce(p_force, false), v_agent, coalesce(p_photo, false) or v_url is not null, v_url
  ) returning id into v_id;

  if p_sens = 'ENTREE' then
    update public.at_vehicules
       set statut = 'SUR_SITE', etat_entree = p_etat, nature_entree = v_nature, entree_at = now(), photo_entree_url = v_url
     where id = v_veh.id;
  else
    update public.at_vehicules
       set statut = 'DEHORS', etat_entree = null, nature_entree = null, entree_at = null, photo_entree_url = null
     where id = v_veh.id;
  end if;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (
    v_veh.organisation_id, v_veh.site_id, v_agent,
    'MOUVEMENT_VEHICULE_' || p_sens || case when v_anomalie then '_FORCE' else '' end,
    'at_mouvements_vehicule:' || v_id::text,
    jsonb_build_object('immat', v_veh.immatriculation, 'etat', p_etat, 'anomalie', v_anomalie, 'photo', v_url is not null)::text,
    'Poste'
  );

  return jsonb_build_object(
    'mouvement_id', v_id, 'anomalie', v_anomalie,
    'force', v_anomalie and coalesce(p_force, false),
    'statut', case when p_sens = 'ENTREE' then 'SUR_SITE' else 'DEHORS' end
  );
end;
$$;

-- L'ancienne surcharge (8 paramètres) est retirée au profit de celle-ci.
drop function if exists public.at_enregistrer_mouvement_vehicule(uuid, text, text, text, text, text, boolean, boolean);

revoke all on function public.at_enregistrer_mouvement_vehicule(uuid, text, text, text, text, text, boolean, boolean, text) from public;
revoke execute on function public.at_enregistrer_mouvement_vehicule(uuid, text, text, text, text, text, boolean, boolean, text) from anon;
grant execute on function public.at_enregistrer_mouvement_vehicule(uuid, text, text, text, text, text, boolean, boolean, text) to authenticated;
