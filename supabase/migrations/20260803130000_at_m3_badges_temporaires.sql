-- M3 — Badges temporaires : génération par lot depuis le registre de présence,
-- puis cycle de vie (généré → remis contre pièce → restitué). Les badges
-- nominatifs (déclaration Phase 4) restent en écriture RLS directe ; ici on
-- ajoute les RPC serveur du flux temporaire (numéro et périmètre côté serveur).

-- ============================================================
-- 1. Générer le lot de badges temporaires (tournants présents)
-- ============================================================
create or replace function public.at_generer_badges_temporaires()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orgs uuid[] := array(select public.at_user_orgs());
  v_base int;
  v_generes int;
begin
  if not public.at_a_pouvoir('DELIVRER_BADGE') then
    raise exception 'Pouvoir DELIVRER_BADGE requis';
  end if;

  -- Numérotation du jour continue.
  select count(*) into v_base
    from public.at_badges
   where organisation_id = any(v_orgs) and type = 'TEMPORAIRE'
     and created_at::date = current_date;

  with cible as (
    select distinct p.id as personne_id, p.organisation_id, p.site_id, p.entreprise_id
      from public.at_lignes_liste ll
      join public.at_personnes p on p.id = ll.personne_id
     where ll.organisation_id = any(v_orgs) and ll.tournant and ll.present
       and not exists (
         select 1 from public.at_badges b
          where b.personne_id = p.id and b.type = 'TEMPORAIRE' and b.statut in ('GENERE', 'REMIS')
       )
  ),
  numerote as (
    select c.*, row_number() over (order by c.personne_id) + v_base as seq from cible c
  )
  insert into public.at_badges (
    organisation_id, site_id, personne_id, entreprise_id, numero, type, categorie,
    statut, validite_debut, validite_fin
  )
  select organisation_id, site_id, personne_id, entreprise_id,
         'TMP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(seq::text, 3, '0'),
         'TEMPORAIRE', 'Chantier', 'GENERE', current_date, current_date
    from numerote;
  get diagnostics v_generes = row_count;

  if v_generes > 0 then
    insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
    select v_orgs[1],
      (select site_id from public.at_sites where organisation_id = v_orgs[1] limit 1),
      coalesce((select nom from public.at_utilisateurs where user_id = auth.uid()), auth.uid()::text),
      'BADGES_TEMP_GENERES', 'at_badges',
      jsonb_build_object('generes', v_generes)::text, 'Poste';
  end if;

  return jsonb_build_object('generes', v_generes);
end;
$$;

revoke all on function public.at_generer_badges_temporaires() from public;
revoke execute on function public.at_generer_badges_temporaires() from anon;
grant execute on function public.at_generer_badges_temporaires() to authenticated;

-- ============================================================
-- 2. Cycle de vie d'un badge temporaire
-- ============================================================
create or replace function public.at_remettre_badge(p_id uuid, p_piece text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_b public.at_badges%rowtype; v_maj int;
begin
  if not public.at_a_pouvoir('DELIVRER_BADGE') then
    raise exception 'Pouvoir DELIVRER_BADGE requis';
  end if;
  if btrim(coalesce(p_piece, '')) = '' then
    raise exception 'La pièce retenue est obligatoire pour remettre le badge';
  end if;

  select * into v_b from public.at_badges where id = p_id for update;
  if not found or v_b.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Badge hors périmètre';
  end if;
  if v_b.type <> 'TEMPORAIRE' or v_b.statut <> 'GENERE' then
    raise exception 'Badge non remettable (type %, statut %)', v_b.type, v_b.statut;
  end if;

  update public.at_badges
     set statut = 'REMIS', piece_retenue = btrim(p_piece)
   where id = v_b.id;
  get diagnostics v_maj = row_count;
  return jsonb_build_object('id', v_b.id, 'statut', 'REMIS');
end;
$$;

revoke all on function public.at_remettre_badge(uuid, text) from public;
revoke execute on function public.at_remettre_badge(uuid, text) from anon;
grant execute on function public.at_remettre_badge(uuid, text) to authenticated;

create or replace function public.at_restituer_badge(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_b public.at_badges%rowtype;
begin
  if not public.at_a_pouvoir('DELIVRER_BADGE') then
    raise exception 'Pouvoir DELIVRER_BADGE requis';
  end if;

  select * into v_b from public.at_badges where id = p_id for update;
  if not found or v_b.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Badge hors périmètre';
  end if;
  if v_b.type <> 'TEMPORAIRE' or v_b.statut <> 'REMIS' then
    raise exception 'Badge non restituable (type %, statut %)', v_b.type, v_b.statut;
  end if;

  update public.at_badges set statut = 'RESTITUE' where id = v_b.id;
  return jsonb_build_object('id', v_b.id, 'statut', 'RESTITUE');
end;
$$;

revoke all on function public.at_restituer_badge(uuid) from public;
revoke execute on function public.at_restituer_badge(uuid) from anon;
grant execute on function public.at_restituer_badge(uuid) to authenticated;
