-- Occupants badgés d'un véhicule : rattache le conducteur et les passagers
-- (par leur badge) au mouvement du véhicule → traçabilité « qui était à bord ».
create table if not exists public.at_occupants_vehicule (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid,
  mouvement_vehicule_id uuid not null references public.at_mouvements_vehicule(id) on delete cascade,
  personne_id uuid references public.at_personnes(id) on delete set null,
  badge_numero text not null,
  personne_label text not null,
  role text not null default 'PASSAGER' check (role in ('CONDUCTEUR', 'PASSAGER')),
  created_at timestamptz not null default now()
);
comment on table public.at_occupants_vehicule is
  'Atlas Trace — occupants badgés rattachés à un mouvement véhicule. Écriture via at_lier_occupant_vehicule.';

create index if not exists at_occupants_vehicule_mvt_idx on public.at_occupants_vehicule(mouvement_vehicule_id);
alter table public.at_occupants_vehicule enable row level security;

create policy at_occupants_vehicule_select on public.at_occupants_vehicule for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

-- Rattache un occupant (par son badge) au mouvement. Le serveur résout le badge.
create or replace function public.at_lier_occupant_vehicule(
  p_mouvement_id uuid,
  p_badge_numero text,
  p_role text default 'PASSAGER'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mvt public.at_mouvements_vehicule%rowtype;
  v_badge text := btrim(coalesce(p_badge_numero, ''));
  v_role text := case when upper(coalesce(p_role, '')) = 'CONDUCTEUR' then 'CONDUCTEUR' else 'PASSAGER' end;
  v_personne_id uuid;
  v_label text;
  v_id uuid;
begin
  if not public.at_a_pouvoir('CONTROLER_AU_POSTE') then
    raise exception 'Pouvoir CONTROLER_AU_POSTE requis';
  end if;
  if v_badge = '' then raise exception 'Badge obligatoire'; end if;

  select * into v_mvt from public.at_mouvements_vehicule where id = p_mouvement_id;
  if not found or v_mvt.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Mouvement hors périmètre';
  end if;

  -- Résolution du badge → personne (dans l'organisation).
  select b.personne_id, nullif(btrim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), '')
    into v_personne_id, v_label
    from public.at_badges b
    left join public.at_personnes p on p.id = b.personne_id
   where b.numero = v_badge and b.organisation_id = v_mvt.organisation_id
   limit 1;

  insert into public.at_occupants_vehicule (
    organisation_id, site_id, mouvement_vehicule_id, personne_id, badge_numero, personne_label, role
  ) values (
    v_mvt.organisation_id, v_mvt.site_id, v_mvt.id, v_personne_id, v_badge, coalesce(v_label, v_badge), v_role
  ) returning id into v_id;

  return jsonb_build_object('id', v_id, 'personne_label', coalesce(v_label, v_badge), 'connu', v_personne_id is not null);
end;
$$;

revoke all on function public.at_lier_occupant_vehicule(uuid, text, text) from public;
revoke execute on function public.at_lier_occupant_vehicule(uuid, text, text) from anon;
grant execute on function public.at_lier_occupant_vehicule(uuid, text, text) to authenticated;
