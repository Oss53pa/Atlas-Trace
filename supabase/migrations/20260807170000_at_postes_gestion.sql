-- Gestion de plusieurs portes d'accès (postes de contrôle).
-- La table at_postes et le poste_id des mouvements existaient déjà ; il manquait
-- la traçabilité des postes et une création dérivant org + site côté serveur.

-- 1) Traçabilité : trigger d'audit générique (comme les référentiels/emprises).
drop trigger if exists at_audit_at_postes on public.at_postes;
create trigger at_audit_at_postes
  after insert or delete or update on public.at_postes
  for each row execute function public.at_audit_generique();

-- 2) Création d'un poste : dérive l'organisation et le site de l'utilisateur,
-- gated ADMINISTRER_ORGANISATION (imparable côté serveur). Le libellé est requis.
create or replace function public.at_creer_poste(
  p_libelle text,
  p_zone text default 'circulation',
  p_emprise text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_site uuid;
  v_id uuid;
  v_lib text := btrim(coalesce(p_libelle, ''));
begin
  if not public.at_a_pouvoir('ADMINISTRER_ORGANISATION') then
    raise exception 'Pouvoir ADMINISTRER_ORGANISATION requis';
  end if;
  if v_lib = '' then raise exception 'Libellé du poste obligatoire'; end if;

  select u into v_org from public.at_user_orgs() u limit 1;
  if v_org is null then raise exception 'Aucune organisation pour l''utilisateur'; end if;

  select id into v_site from public.at_sites
   where organisation_id = v_org order by created_at limit 1;
  if v_site is null then raise exception 'Aucun site pour l''organisation'; end if;

  insert into public.at_postes (organisation_id, site_id, libelle, zone_controlee, emprise_controlee, statut)
  values (v_org, v_site, v_lib,
          nullif(btrim(coalesce(p_zone, '')), ''),
          nullif(btrim(coalesce(p_emprise, '')), ''),
          'ACTIF')
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'libelle', v_lib);
end;
$$;

revoke all on function public.at_creer_poste(text, text, text) from public, anon;
grant execute on function public.at_creer_poste(text, text, text) to authenticated;
