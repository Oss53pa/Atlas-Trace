-- CDC V2 M22 — remplacement d'une personne dans le registre. L'effectif ne varie pas,
-- la ligne remplacée est conservée (statut REMPLACEE), aucun motif requis. Le
-- remplacement est impossible si la personne est déjà entrée : il faut d'abord
-- enregistrer sa sortie (les deux présences restent distinctes).

alter table public.at_lignes_liste add column if not exists remplace_ligne_id uuid references public.at_lignes_liste(id) on delete set null;

-- Effectif : exclut aussi les lignes remplacées.
create or replace function public.at_registre_enregistrer(p_liste_id uuid, p_hors_delai boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_l public.at_listes_journalieres%rowtype; v_agent text; v_eff int; v_statut text;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  select * into v_l from public.at_listes_journalieres where id = p_liste_id;
  if not found or v_l.organisation_id not in (select public.at_user_orgs()) then raise exception 'Registre hors périmètre'; end if;
  select count(*) into v_eff from public.at_lignes_liste
   where liste_id = p_liste_id and present and statut_confirmation not in ('CONTESTEE', 'REMPLACEE');
  v_statut := case when p_hors_delai then 'HORS_DELAI' else 'DEPOSEE' end;
  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);
  update public.at_listes_journalieres
     set statut = v_statut, effectif = v_eff, depose_par = v_agent, deposee_at = now()
   where id = p_liste_id;
  return jsonb_build_object('statut', v_statut, 'effectif', v_eff);
end; $$;

create or replace function public.at_registre_remplacer_ligne(
  p_ligne_id uuid, p_nom text, p_prenom text, p_fonction text default null, p_tournant boolean default true
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_old public.at_lignes_liste%rowtype; v_l public.at_listes_journalieres%rowtype;
  v_fuseau text; v_agent text; v_present boolean; v_new uuid;
begin
  if not public.at_a_pouvoir('DEPOSER_LISTE') then raise exception 'Pouvoir DEPOSER_LISTE requis'; end if;
  if coalesce(btrim(coalesce(p_nom, '')), '') = '' or coalesce(btrim(coalesce(p_prenom, '')), '') = '' then
    raise exception 'Nom et prénom du remplaçant requis';
  end if;

  select * into v_old from public.at_lignes_liste where id = p_ligne_id;
  if not found then raise exception 'Ligne introuvable'; end if;
  select * into v_l from public.at_listes_journalieres where id = v_old.liste_id;
  if v_l.organisation_id not in (select public.at_user_orgs()) then raise exception 'Ligne hors périmètre'; end if;
  if v_old.statut_confirmation = 'REMPLACEE' then raise exception 'Ligne déjà remplacée'; end if;

  -- Garde « déjà entré » : dernier passage du jour = ENTREE -> remplacement refusé.
  if v_old.personne_id is not null then
    select coalesce(fuseau, 'UTC') into v_fuseau from public.at_sites where id = v_l.site_id;
    select exists (
      select 1 from (
        select distinct on (m.personne_id) m.sens
        from public.at_mouvements_acces m
        where m.personne_id = v_old.personne_id and m.site_id = v_l.site_id
          and m.resultat in ('AUTORISE', 'FORCE')
          and (m.horodatage at time zone v_fuseau)::date = (now() at time zone v_fuseau)::date
        order by m.personne_id, m.horodatage desc
      ) d where d.sens = 'ENTREE'
    ) into v_present;
    if v_present then
      return jsonb_build_object('resultat', 'REFUSE', 'motif', 'DEJA_ENTRE');
    end if;
  end if;

  select coalesce(nom, auth.uid()::text) into v_agent from public.at_utilisateurs where user_id = auth.uid();
  v_agent := coalesce(v_agent, auth.uid()::text);

  update public.at_lignes_liste set statut_confirmation = 'REMPLACEE', present = false where id = p_ligne_id;

  insert into public.at_lignes_liste (
    liste_id, organisation_id, nom, prenom, fonction, present, tournant, source,
    statut_confirmation, ajout_at, ajout_par, remplace_ligne_id
  ) values (
    v_old.liste_id, v_l.organisation_id, btrim(p_nom), btrim(p_prenom),
    nullif(btrim(coalesce(p_fonction, '')), ''), true, coalesce(p_tournant, true), 'REFERENT',
    'CONFIRMEE', now(), v_agent, p_ligne_id
  ) returning id into v_new;

  return jsonb_build_object('resultat', 'OK', 'nouvelle_ligne_id', v_new);
end; $$;
revoke all on function public.at_registre_remplacer_ligne(uuid, text, text, text, boolean) from public;
revoke execute on function public.at_registre_remplacer_ligne(uuid, text, text, text, boolean) from anon;
grant execute on function public.at_registre_remplacer_ligne(uuid, text, text, text, boolean) to authenticated;
