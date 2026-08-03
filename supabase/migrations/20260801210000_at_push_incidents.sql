-- Notifications push (Web Push / VAPID) — alerte la chaîne de commandement même
-- application fermée. Aucun service payant : les relais des navigateurs
-- (Google, Mozilla, Microsoft, Apple) livrent gratuitement.
--
-- Chaîne : incident consigné → déclencheur → net.http_post → edge function
-- push-incident → relais du navigateur → téléphone du HSE / du Directeur.
--
-- L'échec d'une notification ne doit JAMAIS empêcher la consignation : le
-- déclencheur avale ses erreurs, et net.http_post est asynchrone.

-- ============================================================
-- 1. Appareils abonnés
-- ============================================================
create table if not exists public.at_abonnements_push (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  utilisateur_id uuid not null references public.at_utilisateurs(id) on delete cascade,
  -- Adresse de livraison fournie par le navigateur ; identifie l'appareil.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  appareil text,
  actif boolean not null default true,
  derniere_erreur text,
  derniere_notif_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.at_abonnements_push is
  'Atlas Trace — appareils acceptant les alertes push. Un utilisateur peut en avoir plusieurs (téléphone, tablette).';

create index if not exists at_abonnements_push_org_idx on public.at_abonnements_push(organisation_id) where actif;
alter table public.at_abonnements_push enable row level security;

-- Chacun gère ses propres appareils, personne ne voit ceux des autres.
create policy at_abonnements_push_select on public.at_abonnements_push for select to authenticated
  using (utilisateur_id in (select id from public.at_utilisateurs where user_id = auth.uid()));
create policy at_abonnements_push_insert on public.at_abonnements_push for insert to authenticated
  with check (utilisateur_id in (select id from public.at_utilisateurs where user_id = auth.uid()));
create policy at_abonnements_push_delete on public.at_abonnements_push for delete to authenticated
  using (utilisateur_id in (select id from public.at_utilisateurs where user_id = auth.uid()));

-- ============================================================
-- 2. Réglages du hook (jamais exposés : aucune policy = refus total)
-- ============================================================
create table if not exists public.at_reglages_push (
  id boolean primary key default true check (id),
  hook_url text not null,
  hook_secret text not null default replace(gen_random_uuid()::text, '-', ''),
  actif boolean not null default true
);
alter table public.at_reglages_push enable row level security;
comment on table public.at_reglages_push is
  'Atlas Trace — URL et secret partagé du hook push. Aucune policy : lecture réservée aux fonctions SECURITY DEFINER et au service_role.';

insert into public.at_reglages_push (id, hook_url)
values (true, 'https://easoqoswtmvtkdwwkqtc.supabase.co/functions/v1/push-incident')
on conflict (id) do nothing;

-- ============================================================
-- 3. Destinataires : qui doit être alerté d'un incident
-- ============================================================
create or replace function public.at__destinataires_incidents(p_organisation_id uuid)
returns table (id uuid, endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct ap.id, ap.endpoint, ap.p256dh, ap.auth
    from public.at_abonnements_push ap
    join public.at_membres m on m.utilisateur_id = ap.utilisateur_id
    join public.at_roles r on r.id = m.role_id
   where ap.actif
     and ap.organisation_id = p_organisation_id
     and 'SUIVRE_INCIDENTS' = any (r.pouvoirs);
$$;

revoke all on function public.at__destinataires_incidents(uuid) from public;
revoke execute on function public.at__destinataires_incidents(uuid) from anon, authenticated;

-- ============================================================
-- 4. Déclencheur : un incident part immédiatement
-- ============================================================
create or replace function public.at__notifier_incident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_url text; v_secret text;
begin
  -- Les événements de routine (prise de poste, ronde) arrivent en temps réel
  -- dans l'application ; seuls les incidents réveillent un téléphone.
  if new.type <> 'INCIDENT' then
    return new;
  end if;

  select hook_url, hook_secret into v_url, v_secret
    from public.at_reglages_push where id and actif;
  if v_url is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', v_secret)
  );
  return new;
exception when others then
  -- Une alerte qui ne part pas ne doit pas faire échouer la consignation.
  return new;
end;
$$;

drop trigger if exists at_main_courante_notifier on public.at_main_courante;
create trigger at_main_courante_notifier
  after insert on public.at_main_courante
  for each row execute function public.at__notifier_incident();

-- ============================================================
-- 5. Suivi d'envoi (appelé par l'edge function en service_role)
-- ============================================================
create or replace function public.at__marquer_envoi_push(p_id uuid, p_erreur text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.at_abonnements_push
     set derniere_notif_at = case when p_erreur is null then now() else derniere_notif_at end,
         derniere_erreur = p_erreur,
         -- 404/410 : l'appareil a révoqué son abonnement, on cesse d'écrire dessus.
         actif = case when p_erreur in ('404', '410') then false else actif end
   where id = p_id;
$$;

revoke all on function public.at__marquer_envoi_push(uuid, text) from public;
revoke execute on function public.at__marquer_envoi_push(uuid, text) from anon, authenticated;
