-- État de configuration du chantier : compte les composantes déjà paramétrées,
-- pour le hub « Configurer mon chantier ». Lecture seule, bornée à l'organisation.
create or replace function public.at_etat_configuration()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_orgs uuid[] := array(select public.at_user_orgs());
begin
  if not public.at_a_pouvoir('ADMINISTRER_ORGANISATION') then
    raise exception 'Pouvoir ADMINISTRER_ORGANISATION requis';
  end if;
  return jsonb_build_object(
    'postes',      (select count(*) from public.at_postes             where organisation_id = any(v_orgs)),
    'circuits',    (select count(*) from public.at_circuits           where organisation_id = any(v_orgs)),
    'creneaux',    (select count(*) from public.at_creneaux_livraison where organisation_id = any(v_orgs)),
    'familles',    (select count(*) from public.at_familles_materiel  where organisation_id = any(v_orgs)),
    'referentiels',(select count(*) from public.at_referentiels       where organisation_id = any(v_orgs)),
    'emprises',    (select count(*) from public.at_emprises           where organisation_id = any(v_orgs)),
    'entreprises', (select count(*) from public.at_entreprises        where organisation_id = any(v_orgs)),
    'comptes',     (select count(*) from public.at_membres            where organisation_id = any(v_orgs)),
    'plafonds',    (select count(*) from public.at_plafonds           where organisation_id = any(v_orgs))
  );
end;
$function$;

grant execute on function public.at_etat_configuration() to authenticated;
