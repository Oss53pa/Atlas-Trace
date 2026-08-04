-- Profil de site : la configuration structurelle appliquée au site (axes). Un
-- profil par site, écrit par l'assistant. Application non destructive et
-- journalisée ; réservée à ADMINISTRER_ORGANISATION.

create table if not exists public.at_profils_site (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  base_id text not null default 'vierge',
  etiquette text not null,
  axes jsonb not null default '{}',
  applique_at timestamptz not null default now(),
  applique_par text,
  unique (site_id)
);
comment on table public.at_profils_site is
  'Atlas Trace — profil structurel appliqué au site. Écriture réservée au RPC at_appliquer_profil.';

alter table public.at_profils_site enable row level security;

create policy at_profils_site_select on public.at_profils_site for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

create or replace function public.at_appliquer_profil(p_base_id text, p_etiquette text, p_axes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orgs uuid[] := array(select public.at_user_orgs());
  v_org uuid;
  v_site uuid;
  v_agent text;
begin
  if not public.at_a_pouvoir('ADMINISTRER_ORGANISATION') then
    raise exception 'Pouvoir ADMINISTRER_ORGANISATION requis';
  end if;
  if p_axes is null or jsonb_typeof(p_axes) <> 'object' then
    raise exception 'Axes invalides';
  end if;

  v_org := v_orgs[1];
  select id into v_site from public.at_sites where organisation_id = v_org order by created_at limit 1;
  if v_site is null then
    raise exception 'Aucun site pour cette organisation';
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  insert into public.at_profils_site (organisation_id, site_id, base_id, etiquette, axes, applique_at, applique_par)
  values (v_org, v_site, coalesce(nullif(btrim(p_base_id), ''), 'vierge'), btrim(p_etiquette), p_axes, now(), v_agent)
  on conflict (site_id) do update
    set base_id = excluded.base_id, etiquette = excluded.etiquette, axes = excluded.axes,
        applique_at = now(), applique_par = v_agent, organisation_id = excluded.organisation_id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (v_org, v_site, v_agent, 'PROFIL_SITE_APPLIQUE', 'at_profils_site',
    jsonb_build_object('base', p_base_id, 'etiquette', p_etiquette)::text, 'Web');

  return jsonb_build_object('ok', true, 'applique_par', v_agent);
end;
$$;

revoke all on function public.at_appliquer_profil(text, text, jsonb) from public;
revoke execute on function public.at_appliquer_profil(text, text, jsonb) from anon;
grant execute on function public.at_appliquer_profil(text, text, jsonb) to authenticated;
