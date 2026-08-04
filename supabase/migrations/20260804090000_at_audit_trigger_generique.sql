-- Traçabilité : trigger d'audit générique sur les listes/référentiels écrits en
-- direct (RLS), pour que TOUTE création / modification / suppression laisse une
-- trace horodatée et nominative dans at_audit — impossible à contourner depuis
-- le front. Les écritures déjà auditées par RPC (habilitation visa/appro,
-- sorties, matière, main courante, invitations…) ne sont pas re-déclenchées ici
-- (at_entreprises n'est audité qu'en INSERT : ses visa/appro le sont déjà).

create or replace function public.at_audit_generique()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb := case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end;
  v_old jsonb := case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end;
  v_ref jsonb := coalesce(v_new, v_old);
  v_org uuid := nullif(v_ref->>'organisation_id', '')::uuid;
  v_site uuid := nullif(v_ref->>'site_id', '')::uuid;
  v_agent text;
begin
  -- Sans organisation rattachable, on ne peut pas cloisonner l'audit : on s'abstient.
  if v_org is null then
    return null;
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text, 'système');

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, avant, apres, appareil)
  values (
    v_org, v_site, v_agent,
    TG_TABLE_NAME || '_' || TG_OP,
    TG_TABLE_NAME || ':' || coalesce(v_ref->>'id', ''),
    case when v_old is not null then left(v_old::text, 2000) else null end,
    case when v_new is not null then left(v_new::text, 2000) else null end,
    'Web'
  );
  return null; -- trigger AFTER : valeur ignorée
end;
$$;

-- INSERT / UPDATE / DELETE — listes et référentiels écrits en direct.
do $$
declare t text;
begin
  foreach t in array array[
    'at_referentiels','at_entites','at_emprises','at_conditions_bloquantes',
    'at_roles','at_membres','at_listes_journalieres','at_lignes_liste',
    'at_familles_materiel','at_creneaux_livraison'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'at_audit_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.at_audit_generique()',
      'at_audit_' || t, t
    );
  end loop;
end $$;

-- at_entreprises : INSERT seul (visa / approbation déjà audités par leurs RPC).
drop trigger if exists at_audit_at_entreprises on public.at_entreprises;
create trigger at_audit_at_entreprises after insert on public.at_entreprises
  for each row execute function public.at_audit_generique();
