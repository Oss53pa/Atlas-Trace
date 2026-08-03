-- Suspension d'accès d'une personne (invariant I4 : une personne suspendue
-- reste dehors). L'enforcement au poste ne lit pas at_personnes.statut : il
-- refuse sur le BADGE (motif BADGE_SUSPENDU) et sur l'entreprise. Suspendre une
-- personne suspend donc ses badges actifs ; la réactivation ne relève que les
-- badges non expirés. Pouvoir SUSPENDRE_ACCES exigé, motif obligatoire.
create or replace function public.at_suspendre_personne(
  p_id uuid,
  p_suspendre boolean,
  p_motif text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.at_personnes%rowtype;
  v_agent text;
  v_statut text;
  v_n int;
begin
  if not public.at_a_pouvoir('SUSPENDRE_ACCES') then
    raise exception 'Pouvoir SUSPENDRE_ACCES requis';
  end if;

  select * into v_p from public.at_personnes where id = p_id;
  if not found or v_p.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Personne hors périmètre';
  end if;

  if p_suspendre and coalesce(btrim(coalesce(p_motif, '')), '') = '' then
    raise exception 'Motif obligatoire pour suspendre';
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent
    from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  v_statut := case when p_suspendre then 'SUSPENDU' else 'ACTIVE' end;
  update public.at_personnes set statut = v_statut where id = p_id;

  -- I4 mord au poste par le badge.
  if p_suspendre then
    update public.at_badges set statut = 'SUSPENDU'
     where personne_id = p_id and statut = 'ACTIF';
  else
    update public.at_badges set statut = 'ACTIF'
     where personne_id = p_id and statut = 'SUSPENDU'
       and (validite_fin is null or validite_fin >= current_date);
  end if;
  get diagnostics v_n = row_count;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres)
  values (
    v_p.organisation_id, v_p.site_id, v_agent,
    case when p_suspendre then 'PERSONNE_SUSPENDUE' else 'PERSONNE_REACTIVEE' end,
    'at_personnes:' || coalesce(v_p.prenom || ' ' || v_p.nom, p_id::text),
    case when p_suspendre then btrim(p_motif) else null end
  );

  return jsonb_build_object('id', p_id, 'statut', v_statut, 'badges_touches', v_n);
end;
$$;

revoke all on function public.at_suspendre_personne(uuid, boolean, text) from public;
revoke execute on function public.at_suspendre_personne(uuid, boolean, text) from anon;
grant execute on function public.at_suspendre_personne(uuid, boolean, text) to authenticated;
