-- Test de la décision d'accès (cœur sécurité, §17.3) — at__decision_acces.
--
-- La décision est 100 % côté serveur : ce script crée des fixtures ÉPHÉMÈRES
-- (entité → entreprise → personne → badge), exécute la fonction sur plusieurs
-- scénarios, puis ANNULE tout (rollback) — rien n'est laissé en base.
--
-- Lancer :  psql "$DATABASE_URL" -f supabase/tests/decision_acces.sql
--   • succès  → NOTICE « DECISION_ACCES_OK: 6/6 »  (psql sort en 0)
--   • échec   → ERROR détaillant le(s) cas          (psql sort en non-0, utile en CI)

begin;

do $$
declare
  v_org uuid; v_site uuid; v_poste uuid; v_zone text;
  v_entite uuid; v_ent uuid; v_pers uuid; v_badge uuid;
  r jsonb; echecs text := '';
begin
  -- Poste actif existant (tout déploiement réel en a au moins un).
  select id, organisation_id, site_id, zone_controlee
    into v_poste, v_org, v_site, v_zone
    from public.at_postes where statut = 'ACTIF' order by created_at limit 1;
  if v_poste is null then
    raise exception 'Aucun poste actif : impossible de tester la décision d''accès';
  end if;
  v_zone := coalesce(v_zone, 'circulation');

  -- Fixtures éphémères.
  insert into public.at_entites(organisation_id, type, raison_sociale)
    values (v_org, 'ENTREPRISE', 'Test Decision SARL') returning id into v_entite;
  insert into public.at_entreprises(organisation_id, site_id, raison_sociale, categorie, entite_id, statut)
    values (v_org, v_site, 'Test Decision SARL', 'GENERALE', v_entite, 'ACTIVE') returning id into v_ent;
  insert into public.at_personnes(organisation_id, site_id, entreprise_id, nom, prenom, induction_statut)
    values (v_org, v_site, v_ent, 'Ouvrier', 'Test', 'VALIDE') returning id into v_pers;
  insert into public.at_badges(organisation_id, site_id, numero, type, entreprise_id, personne_id, statut, zones_autorisees)
    values (v_org, v_site, 'TEST-BADGE-001', 'NOMINATIF', v_ent, v_pers, 'ACTIF', array[v_zone]) returning id into v_badge;

  -- 1. Badge inconnu → REFUSE / BADGE_INCONNU
  r := public.at__decision_acces(v_poste, 'NEXISTE-PAS', 'ENTREE');
  if coalesce(r->>'motif','') <> 'BADGE_INCONNU' then
    echecs := echecs || format(' [1 inconnu: %s/%s]', r->>'resultat', r->>'motif'); end if;

  -- 2. Badge valide → AUTORISE
  r := public.at__decision_acces(v_poste, 'TEST-BADGE-001', 'ENTREE');
  if coalesce(r->>'resultat','') <> 'AUTORISE' then
    echecs := echecs || format(' [2 valide: %s/%s]', r->>'resultat', r->>'motif'); end if;

  -- 3. Badge suspendu → REFUSE / BADGE_SUSPENDU
  update public.at_badges set statut='SUSPENDU' where id=v_badge;
  r := public.at__decision_acces(v_poste, 'TEST-BADGE-001', 'ENTREE');
  if coalesce(r->>'motif','') <> 'BADGE_SUSPENDU' then echecs := echecs || format(' [3 suspendu: %s]', r->>'motif'); end if;
  update public.at_badges set statut='ACTIF' where id=v_badge;

  -- 4. Entreprise suspendue → REFUSE / ENTREPRISE_SUSPENDUE
  update public.at_entreprises set statut='SUSPENDUE' where id=v_ent;
  r := public.at__decision_acces(v_poste, 'TEST-BADGE-001', 'ENTREE');
  if coalesce(r->>'motif','') <> 'ENTREPRISE_SUSPENDUE' then echecs := echecs || format(' [4 entreprise: %s]', r->>'motif'); end if;
  update public.at_entreprises set statut='ACTIVE' where id=v_ent;

  -- 5. Hors zone → REFUSE / HORS_ZONE
  update public.at_badges set zones_autorisees=array['zone_incompatible'] where id=v_badge;
  r := public.at__decision_acces(v_poste, 'TEST-BADGE-001', 'ENTREE');
  if coalesce(r->>'motif','') <> 'HORS_ZONE' then echecs := echecs || format(' [5 hors_zone: %s]', r->>'motif'); end if;
  update public.at_badges set zones_autorisees=array[v_zone] where id=v_badge;

  -- 6. Sortie sans entrée → AUTORISE + alerte SORTIE_SANS_ENTREE (on laisse toujours sortir)
  r := public.at__decision_acces(v_poste, 'TEST-BADGE-001', 'SORTIE');
  if coalesce(r->>'resultat','')<>'AUTORISE' or coalesce(r->>'alerte','')<>'SORTIE_SANS_ENTREE' then
    echecs := echecs || format(' [6 sortie: %s/%s]', r->>'resultat', r->>'alerte'); end if;

  if echecs <> '' then
    raise exception 'DECISION_ACCES_ECHEC:%', echecs;
  end if;
  raise notice 'DECISION_ACCES_OK: 6/6 cas passent';
end $$;

rollback;
