-- CDC V2 M4 — registre de présence vivant, incrémental et gouverné.
-- Le référent ajoute/retire/bascule/confirme à tout moment ; l'écriture passe par
-- des fonctions SECURITY DEFINER (les tables restent en select-only côté app).
-- Confirmation différée : une ligne inscrite au portail naît EN_ATTENTE, le référent
-- confirme ou conteste ; l'échéance (silence) la bascule en CONFIRMEE_PAR_SILENCE.

alter table public.at_lignes_liste
  add column if not exists source text not null default 'REFERENT' check (source in ('REFERENT', 'PORTAIL')),
  add column if not exists statut_confirmation text not null default 'CONFIRMEE'
    check (statut_confirmation in ('CONFIRMEE', 'EN_ATTENTE', 'CONFIRMEE_PAR_SILENCE', 'CONTESTEE', 'REMPLACEE')),
  add column if not exists fonction text,
  add column if not exists ajout_at timestamptz not null default now(),
  add column if not exists ajout_par text,
  add column if not exists confirmation_at timestamptz,
  add column if not exists motif_contestation text;

create unique index if not exists at_listes_uk on public.at_listes_journalieres(site_id, entreprise, date_liste);

create or replace function public.at_registre_assurer(p_entreprise_id uuid, p_date date default current_date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_site uuid; v_nom text; v_id uuid; v_statut text; v_eff int;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  select organisation_id, site_id, raison_sociale into v_org, v_site, v_nom
    from public.at_entreprises where id = p_entreprise_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Entreprise hors périmètre'; end if;
  insert into public.at_listes_journalieres (organisation_id, site_id, entreprise, date_liste, statut, effectif)
  values (v_org, v_site, v_nom, p_date, 'NON_DEPOSE', 0)
  on conflict (site_id, entreprise, date_liste) do update set entreprise = excluded.entreprise
  returning id, statut, effectif into v_id, v_statut, v_eff;
  return jsonb_build_object('liste_id', v_id, 'statut', v_statut, 'effectif', coalesce(v_eff, 0), 'entreprise', v_nom, 'date', p_date);
end; $$;
revoke all on function public.at_registre_assurer(uuid, date) from public;
revoke execute on function public.at_registre_assurer(uuid, date) from anon;
grant execute on function public.at_registre_assurer(uuid, date) to authenticated;

create or replace function public.at_registre_ajouter_ligne(
  p_liste_id uuid, p_nom text, p_prenom text, p_fonction text default null,
  p_tournant boolean default true, p_source text default 'REFERENT'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_l public.at_listes_journalieres%rowtype; v_agent text; v_statut text; v_id uuid;
begin
  if p_source not in ('REFERENT', 'PORTAIL') then raise exception 'Source inconnue'; end if;
  if p_source = 'PORTAIL' then
    if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then raise exception 'Pouvoir CONTROLER_AU_POSTE requis'; end if;
  else
    if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  end if;
  if coalesce(btrim(coalesce(p_nom, '')), '') = '' or coalesce(btrim(coalesce(p_prenom, '')), '') = '' then
    raise exception 'Nom et prénom requis';
  end if;
  select * into v_l from public.at_listes_journalieres where id = p_liste_id;
  if not found or v_l.organisation_id not in (select public.at_user_orgs()) then raise exception 'Registre hors périmètre'; end if;
  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  v_statut := case when p_source = 'PORTAIL' then 'EN_ATTENTE' else 'CONFIRMEE' end;
  insert into public.at_lignes_liste (
    liste_id, organisation_id, nom, prenom, fonction, present, tournant, source, statut_confirmation, ajout_at, ajout_par
  ) values (
    p_liste_id, v_l.organisation_id, btrim(p_nom), btrim(p_prenom),
    nullif(btrim(coalesce(p_fonction, '')), ''), true, coalesce(p_tournant, true),
    p_source, v_statut, now(), v_agent
  ) returning id into v_id;
  return jsonb_build_object('id', v_id, 'statut_confirmation', v_statut);
end; $$;
revoke all on function public.at_registre_ajouter_ligne(uuid, text, text, text, boolean, text) from public;
revoke execute on function public.at_registre_ajouter_ligne(uuid, text, text, text, boolean, text) from anon;
grant execute on function public.at_registre_ajouter_ligne(uuid, text, text, text, boolean, text) to authenticated;

create or replace function public.at_registre_basculer_present(p_ligne_id uuid, p_present boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  select l.organisation_id into v_org
    from public.at_lignes_liste g join public.at_listes_journalieres l on l.id = g.liste_id where g.id = p_ligne_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Ligne hors périmètre'; end if;
  update public.at_lignes_liste set present = coalesce(p_present, false) where id = p_ligne_id;
end; $$;
revoke all on function public.at_registre_basculer_present(uuid, boolean) from public;
revoke execute on function public.at_registre_basculer_present(uuid, boolean) from anon;
grant execute on function public.at_registre_basculer_present(uuid, boolean) to authenticated;

create or replace function public.at_registre_retirer_ligne(p_ligne_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  select l.organisation_id into v_org
    from public.at_lignes_liste g join public.at_listes_journalieres l on l.id = g.liste_id where g.id = p_ligne_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Ligne hors périmètre'; end if;
  delete from public.at_lignes_liste where id = p_ligne_id;
end; $$;
revoke all on function public.at_registre_retirer_ligne(uuid) from public;
revoke execute on function public.at_registre_retirer_ligne(uuid) from anon;
grant execute on function public.at_registre_retirer_ligne(uuid) to authenticated;

create or replace function public.at_registre_confirmer_ligne(p_ligne_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  select l.organisation_id into v_org
    from public.at_lignes_liste g join public.at_listes_journalieres l on l.id = g.liste_id where g.id = p_ligne_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Ligne hors périmètre'; end if;
  update public.at_lignes_liste
     set statut_confirmation = 'CONFIRMEE', confirmation_at = now()
   where id = p_ligne_id and statut_confirmation in ('EN_ATTENTE', 'CONFIRMEE_PAR_SILENCE');
end; $$;
revoke all on function public.at_registre_confirmer_ligne(uuid) from public;
revoke execute on function public.at_registre_confirmer_ligne(uuid) from anon;
grant execute on function public.at_registre_confirmer_ligne(uuid) to authenticated;

create or replace function public.at_registre_contester_ligne(p_ligne_id uuid, p_motif text)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  if coalesce(btrim(coalesce(p_motif, '')), '') = '' then raise exception 'Motif de contestation requis'; end if;
  select l.organisation_id into v_org
    from public.at_lignes_liste g join public.at_listes_journalieres l on l.id = g.liste_id where g.id = p_ligne_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Ligne hors périmètre'; end if;
  update public.at_lignes_liste
     set statut_confirmation = 'CONTESTEE', motif_contestation = btrim(p_motif), confirmation_at = now()
   where id = p_ligne_id and statut_confirmation in ('EN_ATTENTE', 'CONFIRMEE_PAR_SILENCE');
end; $$;
revoke all on function public.at_registre_contester_ligne(uuid, text) from public;
revoke execute on function public.at_registre_contester_ligne(uuid, text) from anon;
grant execute on function public.at_registre_contester_ligne(uuid, text) to authenticated;

create or replace function public.at_registre_enregistrer(p_liste_id uuid, p_hors_delai boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_l public.at_listes_journalieres%rowtype; v_agent text; v_eff int; v_statut text;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  select * into v_l from public.at_listes_journalieres where id = p_liste_id;
  if not found or v_l.organisation_id not in (select public.at_user_orgs()) then raise exception 'Registre hors périmètre'; end if;
  select count(*) into v_eff from public.at_lignes_liste
   where liste_id = p_liste_id and present and statut_confirmation <> 'CONTESTEE';
  v_statut := case when p_hors_delai then 'HORS_DELAI' else 'DEPOSEE' end;
  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  update public.at_listes_journalieres
     set statut = v_statut, effectif = v_eff, depose_par = v_agent, deposee_at = now()
   where id = p_liste_id;
  return jsonb_build_object('statut', v_statut, 'effectif', v_eff);
end; $$;
revoke all on function public.at_registre_enregistrer(uuid, boolean) from public;
revoke execute on function public.at_registre_enregistrer(uuid, boolean) from anon;
grant execute on function public.at_registre_enregistrer(uuid, boolean) to authenticated;
