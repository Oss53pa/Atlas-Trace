-- M9 — Circuit d'autorisation de sortie : demande → visa → approbation.
--
-- Trois garanties portées par le serveur :
--   1. le numéro AS-AAAA-NNNNN est attribué sous verrou de site (pas de doublon) ;
--   2. le code du QR est aléatoire, pas dérivé du numéro — l'ancien code de
--      maquette était un hachage du numéro, donc devinable hors ligne ;
--   3. visa ≠ approbation : celui qui a visé ne peut pas approuver.

-- Champs manquants du circuit.
alter table public.at_autorisations_sortie add column if not exists demandeur text;
alter table public.at_autorisations_sortie add column if not exists motif text;
alter table public.at_autorisations_sortie add column if not exists vehicule text;
alter table public.at_autorisations_sortie add column if not exists motif_refus text;

-- Les lignes portent quantité/unité/marquage : jsonb plutôt qu'un tableau de texte.
alter table public.at_autorisations_sortie
  alter column lignes drop default,
  alter column lignes type jsonb using to_jsonb(lignes),
  alter column lignes set default '[]'::jsonb;

-- SOUMISE remplace BROUILLON. EXPIREE et CONSOMMEE ne sont pas des statuts :
-- ils se déduisent de validite_fin et consommee_at.
alter table public.at_autorisations_sortie drop constraint if exists at_autorisations_sortie_statut_check;
alter table public.at_autorisations_sortie
  alter column statut set default 'SOUMISE',
  add constraint at_autorisations_sortie_statut_check
    check (statut in ('SOUMISE', 'VISEE', 'APPROUVEE', 'REFUSEE', 'ANNULEE'));

-- Écritures réservées aux fonctions du circuit.
drop policy if exists at_autorisations_insert on public.at_autorisations_sortie;
drop policy if exists at_autorisations_update on public.at_autorisations_sortie;

-- ============================================================
-- 1. Demande (référent d'entreprise)
-- ============================================================
create or replace function public.at_demander_sortie(
  p_entreprise_id uuid,
  p_type text,
  p_motif text,
  p_destination text,
  p_lignes jsonb,
  p_vehicule text default null,
  p_validite_fin timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid; v_site uuid; v_num text; v_seq int; v_annee text := to_char(now(), 'YYYY');
  v_id uuid; v_agent text;
begin
  if not public.at_a_pouvoir('DEMANDER_SORTIE') then
    raise exception 'Pouvoir DEMANDER_SORTIE requis';
  end if;
  if coalesce(btrim(coalesce(p_destination, '')), '') = '' then
    raise exception 'Destination obligatoire';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Au moins une ligne est requise';
  end if;

  select organisation_id, site_id into v_org, v_site
    from public.at_entreprises where id = p_entreprise_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then
    raise exception 'Entreprise hors périmètre';
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  perform pg_advisory_xact_lock(hashtext('at_autorisations:' || v_site::text));

  select coalesce(max((substring(numero from 'AS-\d{4}-(\d+)'))::int), 0) + 1
    into v_seq
    from public.at_autorisations_sortie
   where site_id = v_site and numero like 'AS-' || v_annee || '-%';
  v_num := 'AS-' || v_annee || '-' || lpad(v_seq::text, 5, '0');

  insert into public.at_autorisations_sortie (
    organisation_id, site_id, entreprise_id, numero, code, type, motif, destination,
    lignes, vehicule, validite_fin, statut, demandeur
  ) values (
    v_org, v_site, p_entreprise_id, v_num,
    -- Code provisoire, remplacé par un code aléatoire à l'approbation.
    'EN-ATTENTE-' || replace(gen_random_uuid()::text, '-', ''),
    p_type, nullif(btrim(coalesce(p_motif, '')), ''), btrim(p_destination),
    p_lignes, nullif(btrim(coalesce(p_vehicule, '')), ''),
    coalesce(p_validite_fin, now() + interval '7 days'),
    'SOUMISE', v_agent
  ) returning id into v_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite)
  values (v_org, v_site, v_agent, 'SORTIE_DEMANDEE', 'at_autorisations_sortie:' || v_num);

  return jsonb_build_object('id', v_id, 'numero', v_num, 'statut', 'SOUMISE');
end;
$$;

revoke all on function public.at_demander_sortie(uuid, text, text, text, jsonb, text, timestamptz) from public;
revoke execute on function public.at_demander_sortie(uuid, text, text, text, jsonb, text, timestamptz) from anon;
grant execute on function public.at_demander_sortie(uuid, text, text, text, jsonb, text, timestamptz) to authenticated;

-- ============================================================
-- 2. Visa (HSE Officer)
-- ============================================================
create or replace function public.at_viser_sortie(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_a public.at_autorisations_sortie%rowtype; v_agent text;
begin
  if not public.at_a_pouvoir('VISER_SORTIE') then
    raise exception 'Pouvoir VISER_SORTIE requis';
  end if;
  select * into v_a from public.at_autorisations_sortie where id = p_id;
  if not found or v_a.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Autorisation hors périmètre';
  end if;
  if v_a.statut <> 'SOUMISE' then
    raise exception 'Visa impossible depuis le statut %', v_a.statut;
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  update public.at_autorisations_sortie
     set statut = 'VISEE', visa_par = v_agent, visa_at = now()
   where id = p_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite)
  values (v_a.organisation_id, v_a.site_id, v_agent, 'SORTIE_VISEE', 'at_autorisations_sortie:' || v_a.numero);

  return jsonb_build_object('id', p_id, 'statut', 'VISEE', 'visa_par', v_agent);
end;
$$;

revoke all on function public.at_viser_sortie(uuid) from public;
revoke execute on function public.at_viser_sortie(uuid) from anon;
grant execute on function public.at_viser_sortie(uuid) to authenticated;

-- ============================================================
-- 3. Approbation — c'est elle qui rend l'autorisation opposable au poste
-- ============================================================
create or replace function public.at_approuver_sortie(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_a public.at_autorisations_sortie%rowtype; v_agent text; v_code text;
begin
  if not public.at_a_pouvoir('APPROUVER_SORTIE') then
    raise exception 'Pouvoir APPROUVER_SORTIE requis';
  end if;
  select * into v_a from public.at_autorisations_sortie where id = p_id;
  if not found or v_a.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Autorisation hors périmètre';
  end if;
  if v_a.statut <> 'VISEE' then
    raise exception 'Approbation impossible depuis le statut % — le visa HSE est requis', v_a.statut;
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  -- Séparation des tâches : viser puis approuver soi-même n'est pas un circuit.
  if v_a.visa_par is not null and v_a.visa_par = v_agent then
    raise exception 'Séparation des tâches : le visa et l''approbation ne peuvent pas être du même agent';
  end if;

  -- Code aléatoire : il n'est pas déductible du numéro d'autorisation.
  v_code := 'ATS-' || v_a.numero || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));

  update public.at_autorisations_sortie
     set statut = 'APPROUVEE', approuve_par = v_agent, approuve_at = now(), code = v_code
   where id = p_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite)
  values (v_a.organisation_id, v_a.site_id, v_agent, 'SORTIE_APPROUVEE', 'at_autorisations_sortie:' || v_a.numero);

  return jsonb_build_object('id', p_id, 'statut', 'APPROUVEE', 'code', v_code, 'approuve_par', v_agent);
end;
$$;

revoke all on function public.at_approuver_sortie(uuid) from public;
revoke execute on function public.at_approuver_sortie(uuid) from anon;
grant execute on function public.at_approuver_sortie(uuid) to authenticated;

-- ============================================================
-- 4. Refus (visa ou approbation), motif obligatoire
-- ============================================================
create or replace function public.at_refuser_sortie(p_id uuid, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_a public.at_autorisations_sortie%rowtype; v_agent text;
begin
  if not (public.at_a_pouvoir('VISER_SORTIE') or public.at_a_pouvoir('APPROUVER_SORTIE')) then
    raise exception 'Pouvoir VISER_SORTIE ou APPROUVER_SORTIE requis';
  end if;
  if coalesce(btrim(coalesce(p_motif, '')), '') = '' then
    raise exception 'Motif de refus obligatoire';
  end if;
  select * into v_a from public.at_autorisations_sortie where id = p_id;
  if not found or v_a.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Autorisation hors périmètre';
  end if;
  if v_a.statut not in ('SOUMISE', 'VISEE') then
    raise exception 'Refus impossible depuis le statut %', v_a.statut;
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  update public.at_autorisations_sortie
     set statut = 'REFUSEE', motif_refus = btrim(p_motif)
   where id = p_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres)
  values (v_a.organisation_id, v_a.site_id, v_agent, 'SORTIE_REFUSEE',
          'at_autorisations_sortie:' || v_a.numero, btrim(p_motif));

  return jsonb_build_object('id', p_id, 'statut', 'REFUSEE');
end;
$$;

revoke all on function public.at_refuser_sortie(uuid, text) from public;
revoke execute on function public.at_refuser_sortie(uuid, text) from anon;
grant execute on function public.at_refuser_sortie(uuid, text) to authenticated;
