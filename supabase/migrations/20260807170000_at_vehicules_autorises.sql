-- Véhicules autorisés (pré-déclaration d'accès, extension M11). Portée par site,
-- géré sous DELIVRER_BADGE, reconnu au poste sous CONTROLER_AU_POSTE. Reste
-- transactionnel : n'ouvre jamais l'accès, accélère le contrôle du passage.
create table if not exists public.at_vehicules_autorises (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  site_id uuid,
  immatriculation text not null,
  entreprise_id uuid,
  type text,
  chauffeur_habituel text,
  validite_debut date default current_date,
  validite_fin date,
  plage_horaire text,
  emprise_autorisee text,
  statut text not null default 'ACTIF',
  motif text,
  auteur text,
  created_at timestamptz default now()
);

alter table public.at_vehicules_autorises enable row level security;

drop policy if exists at_vehicules_autorises_select on public.at_vehicules_autorises;
create policy at_vehicules_autorises_select on public.at_vehicules_autorises
  for select using (organisation_id in (select public.at_user_orgs()));

create index if not exists at_veh_autorises_imm
  on public.at_vehicules_autorises (organisation_id, immatriculation);

drop trigger if exists at_audit_at_vehicules_autorises on public.at_vehicules_autorises;
create trigger at_audit_at_vehicules_autorises
  after insert or delete or update on public.at_vehicules_autorises
  for each row execute function public.at_audit_generique();

create or replace function public.at__norm_immat(p text)
 returns text language sql immutable set search_path to 'public'
as $$ select upper(regexp_replace(coalesce(p,''), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function public.at_declarer_vehicule_autorise(
  p_immatriculation text,
  p_entreprise_id uuid default null,
  p_type text default null,
  p_chauffeur text default null,
  p_validite_debut date default current_date,
  p_validite_fin date default null,
  p_plage_horaire text default null,
  p_emprise text default null,
  p_motif text default null
) returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_site uuid; v_agent text; v_imm text; v_id uuid;
begin
  if not public.at_a_pouvoir('DELIVRER_BADGE') then raise exception 'Pouvoir DELIVRER_BADGE requis'; end if;
  v_imm := public.at__norm_immat(p_immatriculation);
  if length(v_imm) < 3 then raise exception 'Immatriculation invalide'; end if;
  if p_entreprise_id is not null then
    select organisation_id, site_id into v_org, v_site from public.at_entreprises where id = p_entreprise_id;
    if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Entreprise hors périmètre'; end if;
  else
    select m.organisation_id, m.site_id into v_org, v_site
      from public.at_membres m
      join public.at_utilisateurs u on u.id = m.utilisateur_id
     where u.user_id = auth.uid()
     limit 1;
  end if;
  if v_org is null then raise exception 'Organisation introuvable'; end if;
  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  insert into public.at_vehicules_autorises
    (organisation_id, site_id, immatriculation, entreprise_id, type, chauffeur_habituel,
     validite_debut, validite_fin, plage_horaire, emprise_autorisee, statut, motif, auteur)
  values
    (v_org, v_site, v_imm, p_entreprise_id, p_type, p_chauffeur,
     coalesce(p_validite_debut, current_date), p_validite_fin, p_plage_horaire, p_emprise, 'ACTIF', p_motif, v_agent)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'immatriculation', v_imm);
end;
$function$;

create or replace function public.at_suspendre_vehicule_autorise(
  p_id uuid, p_suspendre boolean default true, p_motif text default null
) returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid;
begin
  if not public.at_a_pouvoir('DELIVRER_BADGE') then raise exception 'Pouvoir DELIVRER_BADGE requis'; end if;
  select organisation_id into v_org from public.at_vehicules_autorises where id = p_id;
  if v_org is null or v_org not in (select public.at_user_orgs()) then raise exception 'Véhicule hors périmètre'; end if;
  update public.at_vehicules_autorises
     set statut = case when p_suspendre then 'SUSPENDU' else 'ACTIF' end,
         motif = coalesce(p_motif, motif)
   where id = p_id;
  return jsonb_build_object('ok', true, 'statut', case when p_suspendre then 'SUSPENDU' else 'ACTIF' end);
end;
$function$;

create or replace function public.at_reconnaitre_vehicule(p_immatriculation text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_imm text; r record; v_etat text;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then raise exception 'Pouvoir CONTROLER_AU_POSTE requis'; end if;
  v_imm := public.at__norm_immat(p_immatriculation);
  if length(v_imm) < 3 then return jsonb_build_object('etat', 'INCONNU'); end if;
  select va.id, va.immatriculation, va.entreprise_id, va.type, va.chauffeur_habituel,
         va.validite_debut, va.validite_fin, va.statut, e.raison_sociale as entreprise
    into r
    from public.at_vehicules_autorises va
    left join public.at_entreprises e on e.id = va.entreprise_id
   where va.organisation_id in (select public.at_user_orgs())
     and va.immatriculation = v_imm
   order by va.created_at desc
   limit 1;
  if not found then return jsonb_build_object('etat', 'INCONNU'); end if;
  if r.statut = 'SUSPENDU' then v_etat := 'SUSPENDU';
  elsif (r.validite_fin is not null and r.validite_fin < current_date)
     or (r.validite_debut is not null and r.validite_debut > current_date) then v_etat := 'EXPIRE';
  else v_etat := 'VALIDE';
  end if;
  return jsonb_build_object(
    'etat', v_etat, 'id', r.id, 'immatriculation', r.immatriculation,
    'entreprise', r.entreprise, 'entreprise_id', r.entreprise_id,
    'type', r.type, 'chauffeur', r.chauffeur_habituel, 'validite_fin', r.validite_fin
  );
end;
$function$;

grant execute on function public.at_declarer_vehicule_autorise(text,uuid,text,text,date,date,text,text,text) to authenticated;
grant execute on function public.at_suspendre_vehicule_autorise(uuid,boolean,text) to authenticated;
grant execute on function public.at_reconnaitre_vehicule(text) to authenticated;
