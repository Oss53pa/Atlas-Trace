-- M24 × M23 — l'inscription au portail peut dépasser le plafond : autorisée, mais
-- le dépassement est signalé (jamais bloquant). Recrée at_inscrire_portail avec le
-- calcul du dépassement.
create or replace function public.at_inscrire_portail(
  p_poste_id uuid, p_entreprise_id uuid, p_nom text, p_prenom text,
  p_fonction text default null, p_photo_url text default null,
  p_piece_type text default null, p_piece_numero text default null,
  p_mode text default 'EN_LIGNE'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_poste public.at_postes%rowtype; v_org uuid; v_site uuid; v_ent text;
  v_agent text; v_pers uuid; v_liste uuid; v_ligne uuid; v_mvt uuid; v_label text;
  v_plaf int; v_present int; v_depasse boolean := false;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then raise exception 'Pouvoir CONTROLER_AU_POSTE requis'; end if;
  if coalesce(btrim(coalesce(p_nom, '')), '') = '' or coalesce(btrim(coalesce(p_prenom, '')), '') = '' then
    raise exception 'Nom et prénom requis';
  end if;
  if coalesce(btrim(coalesce(p_photo_url, '')), '') = '' then
    return jsonb_build_object('resultat', 'REFUSE', 'motif', 'PHOTO_MANQUANTE');
  end if;

  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found or v_poste.organisation_id not in (select public.at_user_orgs()) then raise exception 'Poste hors périmètre'; end if;
  v_org := v_poste.organisation_id; v_site := v_poste.site_id;

  select raison_sociale into v_ent from public.at_entreprises where id = p_entreprise_id and site_id = v_site;
  if v_ent is null then raise exception 'Entreprise hors périmètre'; end if;

  if exists (
    select 1 from public.at_personnes
     where organisation_id = v_org and statut = 'SUSPENDUE'
       and lower(btrim(nom)) = lower(btrim(p_nom)) and lower(btrim(prenom)) = lower(btrim(p_prenom))
  ) then
    return jsonb_build_object('resultat', 'REFUSE', 'motif', 'PERSONNE_SUSPENDUE');
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  v_label := btrim(p_prenom) || ' ' || btrim(p_nom);

  insert into public.at_personnes (
    organisation_id, site_id, entreprise_id, nom, prenom, fonction, regime,
    piece_type, piece_numero_chiffre, photo_url, statut
  ) values (
    v_org, v_site, p_entreprise_id, btrim(p_nom), btrim(p_prenom),
    nullif(btrim(coalesce(p_fonction, '')), ''), 'TOURNANT',
    nullif(btrim(coalesce(p_piece_type, '')), ''), nullif(btrim(coalesce(p_piece_numero, '')), ''),
    p_photo_url, 'ACTIVE'
  ) returning id into v_pers;

  select id into v_liste from public.at_listes_journalieres
   where site_id = v_site and entreprise = v_ent and date_liste = (now() at time zone coalesce((select fuseau from public.at_sites where id = v_site), 'UTC'))::date;
  if v_liste is null then
    insert into public.at_listes_journalieres (organisation_id, site_id, entreprise, date_liste, statut, effectif)
    values (v_org, v_site, v_ent, (now() at time zone coalesce((select fuseau from public.at_sites where id = v_site), 'UTC'))::date, 'NON_DEPOSE', 0)
    returning id into v_liste;
  end if;

  insert into public.at_lignes_liste (
    liste_id, organisation_id, personne_id, nom, prenom, fonction, present, tournant,
    source, statut_confirmation, ajout_at, ajout_par
  ) values (
    v_liste, v_org, v_pers, btrim(p_nom), btrim(p_prenom), nullif(btrim(coalesce(p_fonction, '')), ''),
    true, true, 'PORTAIL', 'EN_ATTENTE', now(), v_agent
  ) returning id into v_ligne;

  insert into public.at_mouvements_acces (
    organisation_id, site_id, poste_id, badge_numero, personne_id, personne_label,
    entreprise_label, sens, resultat, mode, agent, constatee
  ) values (
    v_org, v_site, p_poste_id, 'PORTAIL', v_pers, v_label, v_ent,
    'ENTREE', 'AUTORISE', p_mode, v_agent, true
  ) returning id into v_mvt;

  v_plaf := public.at_plafond_actuel(p_entreprise_id, (now() at time zone coalesce((select fuseau from public.at_sites where id = v_site), 'UTC'))::date);
  if v_plaf is not null then
    select count(*) into v_present from public.at_lignes_liste
     where liste_id = v_liste and present and statut_confirmation not in ('CONTESTEE', 'REMPLACEE');
    v_depasse := v_present > v_plaf;
  end if;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (v_org, v_site, v_agent, 'INSCRIPTION_PORTAIL', 'at_personnes:' || v_pers::text,
    jsonb_build_object('entreprise', v_ent, 'ligne', v_ligne, 'mouvement', v_mvt, 'depassement_plafond', v_depasse)::text, v_poste.libelle);

  return jsonb_build_object(
    'resultat', 'AUTORISE', 'personne_id', v_pers, 'ligne_id', v_ligne, 'mouvement_id', v_mvt,
    'label', v_label, 'entreprise', v_ent, 'depassement_plafond', v_depasse
  );
end; $$;
revoke all on function public.at_inscrire_portail(uuid, uuid, text, text, text, text, text, text, text) from public;
revoke execute on function public.at_inscrire_portail(uuid, uuid, text, text, text, text, text, text, text) from anon;
grant execute on function public.at_inscrire_portail(uuid, uuid, text, text, text, text, text, text, text) to authenticated;
