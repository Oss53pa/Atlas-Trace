-- M7 — Parc matériel : déclaration (bordereau), marquage, visa.
--
-- Les trois transitions passent par des fonctions SECURITY DEFINER, pas par des
-- UPDATE libres : sinon un compte qui a seulement DECLARER_MATERIEL pourrait
-- écrire statut = 'VISE' lui-même et rendre son matériel opposable au poste.
--
-- L'attribution du numéro de marquage est sérialisée par un verrou de site :
-- deux bordereaux déposés simultanément ne peuvent pas recevoir le même numéro.

-- La photo du marquage est conservée avec le matériel (obligatoire avant visa).
alter table public.at_materiels add column if not exists photo_url text;

-- Écritures réservées aux fonctions ci-dessous.
drop policy if exists at_materiels_insert on public.at_materiels;
drop policy if exists at_materiels_update on public.at_materiels;

-- ============================================================
-- 1. Déclaration d'un bordereau
-- ============================================================
create or replace function public.at_declarer_bordereau(p_entreprise_id uuid, p_lignes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_site uuid;
  v_base int;
  v_ref text;
  v_annee text := to_char(now(), 'YYYY');
  v_cree jsonb;
begin
  if not public.at_a_pouvoir('DECLARER_MATERIEL') then
    raise exception 'Pouvoir DECLARER_MATERIEL requis';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Bordereau vide';
  end if;

  select organisation_id, site_id into v_org, v_site
    from public.at_entreprises where id = p_entreprise_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then
    raise exception 'Entreprise hors périmètre';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_lignes) l
     where coalesce(btrim(l->>'designation'), '') = ''
        or coalesce(btrim(l->>'categorie'), '') = ''
  ) then
    raise exception 'Chaque ligne exige une désignation et une catégorie';
  end if;

  -- Sérialise l'attribution des numéros pour ce site, le temps de la transaction.
  perform pg_advisory_xact_lock(hashtext('at_materiels:' || v_site::text));

  select coalesce(max((substring(numero_marquage from '[0-9]+'))::int), 100)
    into v_base
    from public.at_materiels
   where site_id = v_site and numero_marquage ~ '^M-[0-9]+$';

  select 'BM-' || v_annee || '-' || lpad((count(distinct bordereau) + 1)::text, 3, '0')
    into v_ref
    from public.at_materiels
   where site_id = v_site and bordereau like 'BM-' || v_annee || '-%';

  with insere as (
    insert into public.at_materiels (
      organisation_id, site_id, entreprise_id, designation, marque, modele,
      numero_serie, categorie, numero_marquage, statut, photo_marquage, bordereau
    )
    select
      v_org, v_site, p_entreprise_id,
      btrim(t.l->>'designation'),
      nullif(btrim(coalesce(t.l->>'marque', '')), ''),
      nullif(btrim(coalesce(t.l->>'modele', '')), ''),
      nullif(btrim(coalesce(t.l->>'numeroSerie', '')), ''),
      btrim(t.l->>'categorie'),
      'M-' || lpad((v_base + t.i)::text, 5, '0'),
      'DECLARE', false, v_ref
    from jsonb_array_elements(p_lignes) with ordinality as t(l, i)
    returning numero_marquage, designation
  )
  select jsonb_agg(jsonb_build_object('numero_marquage', numero_marquage, 'designation', designation))
    into v_cree from insere;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres)
  values (
    v_org, v_site,
    coalesce((select nom from public.at_utilisateurs where user_id = auth.uid()), auth.uid()::text),
    'MATERIEL_DECLARE', 'at_materiels:' || v_ref, v_cree::text
  );

  return jsonb_build_object('bordereau', v_ref, 'materiels', coalesce(v_cree, '[]'::jsonb));
end;
$$;

revoke all on function public.at_declarer_bordereau(uuid, jsonb) from public;
revoke execute on function public.at_declarer_bordereau(uuid, jsonb) from anon;
grant execute on function public.at_declarer_bordereau(uuid, jsonb) to authenticated;

-- ============================================================
-- 2. Marquage apposé (photo obligatoire)
-- ============================================================
create or replace function public.at_marquer_materiel(p_id uuid, p_photo_url text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_m public.at_materiels%rowtype;
begin
  if not public.at_a_pouvoir('DECLARER_MATERIEL') then
    raise exception 'Pouvoir DECLARER_MATERIEL requis';
  end if;
  if coalesce(btrim(coalesce(p_photo_url, '')), '') = '' then
    raise exception 'Photo du marquage obligatoire';
  end if;

  select * into v_m from public.at_materiels where id = p_id;
  if not found or v_m.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Matériel hors périmètre';
  end if;
  if v_m.statut <> 'DECLARE' then
    raise exception 'Marquage impossible depuis le statut %', v_m.statut;
  end if;

  update public.at_materiels
     set statut = 'MARQUE', photo_marquage = true, photo_url = p_photo_url
   where id = p_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite)
  values (
    v_m.organisation_id, v_m.site_id,
    coalesce((select nom from public.at_utilisateurs where user_id = auth.uid()), auth.uid()::text),
    'MATERIEL_MARQUE', 'at_materiels:' || v_m.numero_marquage
  );

  return jsonb_build_object('id', p_id, 'statut', 'MARQUE');
end;
$$;

revoke all on function public.at_marquer_materiel(uuid, text) from public;
revoke execute on function public.at_marquer_materiel(uuid, text) from anon;
grant execute on function public.at_marquer_materiel(uuid, text) to authenticated;

-- ============================================================
-- 3. Visa — c'est lui qui rend la déclaration opposable au poste
-- ============================================================
create or replace function public.at_viser_materiel(p_id uuid, p_echantillon boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.at_materiels%rowtype;
  v_agent text;
begin
  if not public.at_a_pouvoir('VISER_MATERIEL') then
    raise exception 'Pouvoir VISER_MATERIEL requis';
  end if;

  select * into v_m from public.at_materiels where id = p_id;
  if not found or v_m.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Matériel hors périmètre';
  end if;
  if v_m.statut <> 'MARQUE' then
    raise exception 'Visa impossible depuis le statut % — le marquage doit être apposé et photographié', v_m.statut;
  end if;
  if not v_m.photo_marquage then
    raise exception 'Photo du marquage manquante';
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  update public.at_materiels
     set statut = 'VISE', visa_par = v_agent, visa_at = now(),
         echantillon = coalesce(p_echantillon, false)
   where id = p_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres)
  values (
    v_m.organisation_id, v_m.site_id, v_agent,
    'MATERIEL_VISE', 'at_materiels:' || v_m.numero_marquage,
    jsonb_build_object('echantillon', coalesce(p_echantillon, false))::text
  );

  return jsonb_build_object('id', p_id, 'statut', 'VISE', 'visa_par', v_agent);
end;
$$;

revoke all on function public.at_viser_materiel(uuid, boolean) from public;
revoke execute on function public.at_viser_materiel(uuid, boolean) from anon;
grant execute on function public.at_viser_materiel(uuid, boolean) to authenticated;
