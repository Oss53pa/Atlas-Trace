-- Test de la décision de SORTIE MATIÈRE (at__decision_sortie) — règle R1.
--
-- La décision est côté serveur : ce script crée une autorisation de sortie
-- éphémère et vérifie les issues, puis ANNULE tout (rollback).
--
-- Lancer :  psql "$DATABASE_URL" -f supabase/tests/decision_sortie.sql
--   • succès → NOTICE « SORTIE_OK: 5/5 »   • échec → ERROR détaillé (CI)

begin;

do $$
declare
  v_org uuid; v_site uuid; v_poste uuid;
  v_entite uuid; v_ent uuid; r jsonb; echecs text := '';
begin
  select id, organisation_id, site_id into v_poste, v_org, v_site
    from public.at_postes where statut = 'ACTIF' order by created_at limit 1;
  if v_poste is null then raise exception 'Aucun poste actif : test impossible'; end if;

  insert into public.at_entites(organisation_id, type, raison_sociale)
    values (v_org, 'ENTREPRISE', 'Test Sortie SARL') returning id into v_entite;
  insert into public.at_entreprises(organisation_id, site_id, raison_sociale, categorie, entite_id, statut)
    values (v_org, v_site, 'Test Sortie SARL', 'GENERALE', v_entite, 'ACTIVE') returning id into v_ent;
  insert into public.at_autorisations_sortie(organisation_id, site_id, entreprise_id, numero, code, type, destination, validite_fin, statut)
    values (v_org, v_site, v_ent, 'BS-2026-TEST', 'AUT-TEST', 'EVACUATION', 'Decharge Nord', now() + interval '1 day', 'APPROUVEE');

  -- 1. Code inconnu → REFUSE / NON_COUVERT_R1 (rien ne sort sans pièce : règle R1)
  r := public.at__decision_sortie(v_poste, 'RIEN');
  if coalesce(r->>'motif','') <> 'NON_COUVERT_R1' then echecs := echecs || format(' [1 inconnu: %s/%s]', r->>'resultat', r->>'motif'); end if;

  -- 2. Autorisation approuvée, non consommée, valide → AUTORISE
  r := public.at__decision_sortie(v_poste, 'AUT-TEST');
  if coalesce(r->>'resultat','') <> 'AUTORISE' then echecs := echecs || format(' [2 valide: %s/%s]', r->>'resultat', r->>'motif'); end if;

  -- 3. Non approuvée → REFUSE / AUTORISATION_NON_APPROUVEE
  update public.at_autorisations_sortie set statut='SOUMISE' where code='AUT-TEST';
  r := public.at__decision_sortie(v_poste, 'AUT-TEST');
  if coalesce(r->>'motif','') <> 'AUTORISATION_NON_APPROUVEE' then echecs := echecs || format(' [3 non_approuvee: %s]', r->>'motif'); end if;
  update public.at_autorisations_sortie set statut='APPROUVEE' where code='AUT-TEST';

  -- 4. Déjà consommée → REFUSE / AUTORISATION_CONSOMMEE (usage unique)
  update public.at_autorisations_sortie set consommee_at=now() where code='AUT-TEST';
  r := public.at__decision_sortie(v_poste, 'AUT-TEST');
  if coalesce(r->>'motif','') <> 'AUTORISATION_CONSOMMEE' then echecs := echecs || format(' [4 consommee: %s]', r->>'motif'); end if;
  update public.at_autorisations_sortie set consommee_at=null where code='AUT-TEST';

  -- 5. Expirée → REFUSE / AUTORISATION_EXPIREE
  update public.at_autorisations_sortie set validite_fin=now()-interval '1 day' where code='AUT-TEST';
  r := public.at__decision_sortie(v_poste, 'AUT-TEST');
  if coalesce(r->>'motif','') <> 'AUTORISATION_EXPIREE' then echecs := echecs || format(' [5 expiree: %s]', r->>'motif'); end if;

  if echecs <> '' then raise exception 'SORTIE_ECHEC:%', echecs; end if;
  raise notice 'SORTIE_OK: 5/5 cas passent';
end $$;

rollback;
