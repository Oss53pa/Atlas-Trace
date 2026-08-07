-- Poste (M5) : photo du sac / des effets d'une personne, conservée par mouvement
-- d'accès pour comparaison entrée ↔ sortie. Le RPC reçoit p_photo_url et le range
-- sur le mouvement ; la photo d'entrée est relue à la sortie côté client.
alter table public.at_mouvements_acces add column if not exists photo_url text;

create or replace function public.at_enregistrer_acces(
  p_poste_id uuid, p_badge_ref text, p_sens text, p_action text,
  p_commentaire text, p_mode text, p_photo_forcage boolean, p_photo_url text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_poste public.at_postes%rowtype;
  v_d jsonb;
  v_resultat text;
  v_motif text;
  v_agent text;
  v_id uuid;
  v_url text := nullif(btrim(coalesce(p_photo_url, '')), '');
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if p_action not in ('VALIDER', 'REFUSER', 'FORCER') then raise exception 'Action inconnue : %', p_action; end if;
  if p_mode not in ('EN_LIGNE', 'HORS_LIGNE') then raise exception 'Mode inconnu : %', p_mode; end if;

  select * into v_poste from public.at_postes where id = p_poste_id and statut = 'ACTIF';
  if not found or v_poste.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Poste hors périmètre';
  end if;

  v_d := public.at__decision_acces(p_poste_id, p_badge_ref, p_sens);
  v_motif := v_d->>'motif';

  if p_action = 'FORCER' then
    if not public.at_a_pouvoir('FORCER_ACCES') then raise exception 'Pouvoir FORCER_ACCES requis'; end if;
    if coalesce(btrim(p_commentaire), '') = '' then raise exception 'Motif de forçage obligatoire'; end if;
    v_resultat := 'FORCE';
  elsif p_action = 'REFUSER' then
    v_resultat := 'REFUSE';
  else
    v_resultat := v_d->>'resultat';
  end if;

  select coalesce(u.nom, auth.uid()::text) into v_agent from public.at_utilisateurs u where u.user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  insert into public.at_mouvements_acces (
    organisation_id, site_id, poste_id, badge_id, badge_numero, personne_id,
    personne_label, entreprise_label, sens, resultat, motif, alerte, mode,
    agent, commentaire, photo_forcage, photo_url
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
    coalesce(p_photo_forcage, false), v_url
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (
    v_poste.organisation_id, v_poste.site_id, v_agent,
    'CONTROLE_ACCES_' || v_resultat, 'at_mouvements_acces:' || v_id::text,
    (v_d || jsonb_build_object('action', p_action, 'resultat_enregistre', v_resultat))::text,
    v_poste.libelle
  );

  return v_d || jsonb_build_object('mouvement_id', v_id, 'resultat_enregistre', v_resultat, 'action', p_action);
end; $$;

drop function if exists public.at_enregistrer_acces(uuid, text, text, text, text, text, boolean);
revoke all on function public.at_enregistrer_acces(uuid, text, text, text, text, text, boolean, text) from public;
revoke execute on function public.at_enregistrer_acces(uuid, text, text, text, text, text, boolean, text) from anon;
grant execute on function public.at_enregistrer_acces(uuid, text, text, text, text, text, boolean, text) to authenticated;
