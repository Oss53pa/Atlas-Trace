-- M17 — Clés & zones sensibles : registre nominatif des remises et restitutions.
-- Remise contre émargement, restitution, journal append-only. Le statut « non
-- restituée » est dérivé (clé remise non rendue le jour même).

create table if not exists public.at_cles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  code text not null,
  libelle text not null,
  zone text not null,
  statut text not null default 'DISPONIBLE' check (statut in ('DISPONIBLE', 'REMISE')),
  detenteur text,
  remise_at timestamptz,
  remise_par text,
  created_at timestamptz not null default now()
);
comment on table public.at_cles is
  'Atlas Trace — trousseau de clés des zones sensibles (M17). Écriture réservée aux RPC de remise/restitution.';

create unique index if not exists at_cles_code_uk on public.at_cles(site_id, code);
alter table public.at_cles enable row level security;

create policy at_cles_select on public.at_cles for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

create table if not exists public.at_mouvements_cle (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  cle_id uuid not null references public.at_cles(id) on delete restrict,
  code text not null,
  sens text not null check (sens in ('REMISE', 'RESTITUTION')),
  detenteur text not null,
  agent text not null,
  horodatage timestamptz not null default now()
);
comment on table public.at_mouvements_cle is
  'Atlas Trace — journal des mouvements de clés (M17). Append-only.';

create index if not exists at_mouvements_cle_site_idx on public.at_mouvements_cle(site_id, horodatage desc);
alter table public.at_mouvements_cle enable row level security;

create policy at_mouvements_cle_select on public.at_mouvements_cle for select to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CONTROLER_AU_POSTE') or public.at_a_pouvoir('CONSULTER_TABLEAU'))
  );

-- Trousseau par défaut pour les sites qui n'en ont pas.
insert into public.at_cles (organisation_id, site_id, code, libelle, zone)
select s.organisation_id, s.id, v.code, v.libelle, v.zone
from public.at_sites s
cross join (values
  ('CLE-MAG-01', 'Magasin stockage sensible', 'Magasins'),
  ('CLE-LT-03', 'Local technique TGBT', 'Locaux techniques'),
  ('CLE-COF-01', 'Coffre bureau de chantier', 'Base vie'),
  ('CLE-GAL-02', 'Rideau galerie B', 'Galerie'),
  ('CLE-MAG-02', 'Magasin outillage électroportatif', 'Magasins')
) as v(code, libelle, zone)
where not exists (select 1 from public.at_cles c where c.site_id = s.id);

-- ============================================================
-- Remise d'une clé (contre émargement)
-- ============================================================
create or replace function public.at_remettre_cle(p_cle_id uuid, p_detenteur text, p_emargement boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_c public.at_cles%rowtype; v_agent text;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if not coalesce(p_emargement, false) then
    raise exception 'Émargement requis pour remettre la clé';
  end if;
  if btrim(coalesce(p_detenteur, '')) = '' then
    raise exception 'Détenteur obligatoire';
  end if;

  select * into v_c from public.at_cles where id = p_cle_id for update;
  if not found or v_c.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Clé hors périmètre';
  end if;
  if v_c.statut <> 'DISPONIBLE' then
    raise exception 'Clé déjà remise';
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  update public.at_cles
     set statut = 'REMISE', detenteur = btrim(p_detenteur), remise_at = now(), remise_par = v_agent
   where id = v_c.id;

  insert into public.at_mouvements_cle (organisation_id, site_id, cle_id, code, sens, detenteur, agent)
  values (v_c.organisation_id, v_c.site_id, v_c.id, v_c.code, 'REMISE', btrim(p_detenteur), v_agent);

  return jsonb_build_object('id', v_c.id, 'statut', 'REMISE');
end;
$$;

revoke all on function public.at_remettre_cle(uuid, text, boolean) from public;
revoke execute on function public.at_remettre_cle(uuid, text, boolean) from anon;
grant execute on function public.at_remettre_cle(uuid, text, boolean) to authenticated;

-- ============================================================
-- Restitution d'une clé
-- ============================================================
create or replace function public.at_restituer_cle(p_cle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_c public.at_cles%rowtype; v_agent text;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;

  select * into v_c from public.at_cles where id = p_cle_id for update;
  if not found or v_c.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Clé hors périmètre';
  end if;
  if v_c.statut <> 'REMISE' then
    raise exception 'Clé déjà disponible';
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  insert into public.at_mouvements_cle (organisation_id, site_id, cle_id, code, sens, detenteur, agent)
  values (v_c.organisation_id, v_c.site_id, v_c.id, v_c.code, 'RESTITUTION', coalesce(v_c.detenteur, '—'), v_agent);

  update public.at_cles
     set statut = 'DISPONIBLE', detenteur = null, remise_at = null, remise_par = null
   where id = v_c.id;

  return jsonb_build_object('id', v_c.id, 'statut', 'DISPONIBLE');
end;
$$;

revoke all on function public.at_restituer_cle(uuid) from public;
revoke execute on function public.at_restituer_cle(uuid) from anon;
grant execute on function public.at_restituer_cle(uuid) to authenticated;
