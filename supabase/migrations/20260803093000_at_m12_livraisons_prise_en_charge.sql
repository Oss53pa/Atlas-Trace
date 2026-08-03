-- M12 / M13 — Préavis de livraison, créneaux sous quota, prise en charge oui/non.
-- Le préavis réserve un créneau (quota opposé par le serveur). Levage ou matières
-- dangereuses ⇒ visa conditionnel avant validation. La prise en charge est un
-- OUI/NON par l'entité destinataire : aucune quantité, aucun écart (CDC V2).
--
--   at_creneaux_livraison  — créneaux du site et leur quota
--   at_preavis_livraison   — les préavis et leur cycle de vie
-- Écriture réservée aux RPC ; aucune policy d'insert/update côté client.

-- ============================================================
-- 1. Créneaux & quotas
-- ============================================================
create table if not exists public.at_creneaux_livraison (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  libelle text not null,
  quota int not null check (quota > 0),
  utilises int not null default 0,
  ordre int not null default 0,
  actif boolean not null default true
);
comment on table public.at_creneaux_livraison is
  'Atlas Trace — créneaux de livraison et quota (M12). Le compteur utilises est tenu par at_deposer_preavis.';

create index if not exists at_creneaux_site_idx on public.at_creneaux_livraison(site_id, ordre);
alter table public.at_creneaux_livraison enable row level security;

create policy at_creneaux_select on public.at_creneaux_livraison for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

-- Créneaux par défaut pour les sites qui n'en ont pas encore.
insert into public.at_creneaux_livraison (organisation_id, site_id, libelle, quota, ordre)
select s.organisation_id, s.id, v.libelle, v.quota, v.ordre
from public.at_sites s
cross join (values
  ('07h – 09h', 3, 1),
  ('09h – 11h', 4, 2),
  ('13h – 15h', 4, 3),
  ('15h – 17h', 3, 4)
) as v(libelle, quota, ordre)
where not exists (select 1 from public.at_creneaux_livraison c where c.site_id = s.id);

-- ============================================================
-- 2. Préavis de livraison
-- ============================================================
create table if not exists public.at_preavis_livraison (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  site_id uuid not null references public.at_sites(id) on delete cascade,
  entreprise_id uuid not null references public.at_entreprises(id) on delete restrict,
  creneau_id uuid not null references public.at_creneaux_livraison(id) on delete restrict,
  numero text not null,
  fournisseur text not null,
  nature text not null,
  quantite_prevue numeric(12,2) not null default 0,
  unite text not null default 'u',
  levage boolean not null default false,
  matieres_dangereuses boolean not null default false,
  derogation text,
  statut text not null default 'SOUMIS'
    check (statut in ('SOUMIS', 'VALIDE', 'PRIS_EN_CHARGE', 'REFUSE', 'EXPIRE')),
  code text,
  visa_par text,
  visa_at timestamptz,
  -- Prise en charge (M13) : oui/non, jamais de quantité.
  pec_responsable text,
  pec_at timestamptz,
  pec_reserve text,
  pec_photo boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.at_preavis_livraison is
  'Atlas Trace — préavis de livraison et prise en charge (M12/M13). Écriture réservée aux RPC.';

create unique index if not exists at_preavis_numero_uk on public.at_preavis_livraison(numero);
create index if not exists at_preavis_site_idx on public.at_preavis_livraison(site_id, statut);
alter table public.at_preavis_livraison enable row level security;

create policy at_preavis_select on public.at_preavis_livraison for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

-- ============================================================
-- 3. Déposer un préavis — quota opposé atomiquement
-- ============================================================
create or replace function public.at_deposer_preavis(
  p_entreprise_id uuid,
  p_creneau_id uuid,
  p_fournisseur text,
  p_nature text,
  p_quantite numeric,
  p_unite text,
  p_levage boolean default false,
  p_matieres_dangereuses boolean default false,
  p_derogation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ent public.at_entreprises%rowtype;
  v_cr public.at_creneaux_livraison%rowtype;
  v_seq int;
  v_numero text;
  v_conditionne boolean := coalesce(p_levage, false) or coalesce(p_matieres_dangereuses, false);
  v_statut text;
  v_code text;
  v_id uuid;
  v_maj int;
begin
  if not public.at_a_pouvoir('DEMANDER_LIVRAISON') then
    raise exception 'Pouvoir DEMANDER_LIVRAISON requis';
  end if;

  select * into v_ent from public.at_entreprises where id = p_entreprise_id;
  if not found or v_ent.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Entreprise hors périmètre';
  end if;

  select * into v_cr from public.at_creneaux_livraison
   where id = p_creneau_id and site_id = v_ent.site_id and actif for update;
  if not found then
    raise exception 'Créneau inconnu pour ce site';
  end if;

  -- Quota opposé : la réservation ne réussit que si le créneau n'est pas saturé.
  update public.at_creneaux_livraison
     set utilises = utilises + 1
   where id = v_cr.id and utilises < quota;
  get diagnostics v_maj = row_count;
  if v_maj = 0 then
    raise exception 'Créneau saturé : quota % atteint', v_cr.quota;
  end if;

  v_statut := case when v_conditionne then 'SOUMIS' else 'VALIDE' end;

  select count(*) + 1 into v_seq
    from public.at_preavis_livraison
   where organisation_id = v_ent.organisation_id
     and date_part('year', created_at) = date_part('year', now());
  v_numero := 'PL-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 5, '0');
  v_code := case when v_conditionne then null else v_numero || '-OK' end;

  insert into public.at_preavis_livraison (
    organisation_id, site_id, entreprise_id, creneau_id, numero, fournisseur, nature,
    quantite_prevue, unite, levage, matieres_dangereuses, derogation, statut, code
  ) values (
    v_ent.organisation_id, v_ent.site_id, v_ent.id, v_cr.id, v_numero,
    btrim(p_fournisseur), btrim(p_nature), coalesce(p_quantite, 0), coalesce(nullif(btrim(p_unite), ''), 'u'),
    coalesce(p_levage, false), coalesce(p_matieres_dangereuses, false),
    nullif(btrim(coalesce(p_derogation, '')), ''), v_statut, v_code
  ) returning id into v_id;

  return jsonb_build_object('id', v_id, 'numero', v_numero, 'statut', v_statut);
end;
$$;

revoke all on function public.at_deposer_preavis(uuid, uuid, text, text, numeric, text, boolean, boolean, text) from public;
revoke execute on function public.at_deposer_preavis(uuid, uuid, text, text, numeric, text, boolean, boolean, text) from anon;
grant execute on function public.at_deposer_preavis(uuid, uuid, text, text, numeric, text, boolean, boolean, text) to authenticated;

-- ============================================================
-- 4. Viser un préavis conditionnel (levage / matières dangereuses)
-- ============================================================
create or replace function public.at_viser_preavis(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.at_preavis_livraison%rowtype;
  v_agent text;
  v_code text;
begin
  if not public.at_a_pouvoir('VALIDER_CRENEAU') then
    raise exception 'Pouvoir VALIDER_CRENEAU requis';
  end if;

  select * into v_p from public.at_preavis_livraison where id = p_id for update;
  if not found or v_p.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Préavis hors périmètre';
  end if;
  if v_p.statut <> 'SOUMIS' then
    raise exception 'Préavis non visable (statut %)', v_p.statut;
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  v_code := v_p.numero || '-VISA';

  update public.at_preavis_livraison
     set statut = 'VALIDE', code = v_code, visa_par = v_agent, visa_at = now()
   where id = v_p.id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (v_p.organisation_id, v_p.site_id, v_agent, 'PREAVIS_VISE',
    'at_preavis_livraison:' || v_p.id::text, jsonb_build_object('numero', v_p.numero)::text, 'Web');

  return jsonb_build_object('id', v_p.id, 'code', v_code);
end;
$$;

revoke all on function public.at_viser_preavis(uuid) from public;
revoke execute on function public.at_viser_preavis(uuid) from anon;
grant execute on function public.at_viser_preavis(uuid) to authenticated;

-- ============================================================
-- 5. Prise en charge oui/non (M13) — photo exigée, aucune quantité
-- ============================================================
create or replace function public.at_prendre_en_charge(
  p_id uuid,
  p_reserve text default null,
  p_photo boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.at_preavis_livraison%rowtype;
  v_agent text;
begin
  if not public.at_a_pouvoir('RECEPTIONNER') then
    raise exception 'Pouvoir RECEPTIONNER requis';
  end if;
  if not coalesce(p_photo, false) then
    raise exception 'La photo de la livraison est exigée pour accuser la prise en charge';
  end if;

  select * into v_p from public.at_preavis_livraison where id = p_id for update;
  if not found or v_p.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Préavis hors périmètre';
  end if;
  if v_p.statut <> 'VALIDE' then
    raise exception 'Préavis non prenable en charge (statut %)', v_p.statut;
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  update public.at_preavis_livraison
     set statut = 'PRIS_EN_CHARGE', pec_responsable = v_agent, pec_at = now(),
         pec_reserve = nullif(btrim(coalesce(p_reserve, '')), ''), pec_photo = true
   where id = v_p.id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  values (v_p.organisation_id, v_p.site_id, v_agent, 'PREAVIS_PRIS_EN_CHARGE',
    'at_preavis_livraison:' || v_p.id::text,
    jsonb_build_object('numero', v_p.numero, 'reserve', nullif(btrim(coalesce(p_reserve, '')), ''))::text, 'Poste');

  return jsonb_build_object('id', v_p.id, 'statut', 'PRIS_EN_CHARGE');
end;
$$;

revoke all on function public.at_prendre_en_charge(uuid, text, boolean) from public;
revoke execute on function public.at_prendre_en_charge(uuid, text, boolean) from anon;
grant execute on function public.at_prendre_en_charge(uuid, text, boolean) to authenticated;
