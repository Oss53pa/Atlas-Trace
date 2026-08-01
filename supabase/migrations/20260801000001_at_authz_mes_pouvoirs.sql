-- Phase 0 — Autorisation : pouvoirs de l'utilisateur courant (+ portée org/site).
-- SECURITY DEFINER, borné à auth.uid() : ne renvoie QUE les pouvoirs du demandeur.
create or replace function public.at_mes_pouvoirs()
returns table(pouvoir text, organisation_id uuid, site_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p as pouvoir, m.organisation_id, m.site_id
  from public.at_utilisateurs u
  join public.at_membres m on m.utilisateur_id = u.id
  join public.at_roles r on r.id = m.role_id
  cross join lateral unnest(r.pouvoirs) as p
  where u.user_id = auth.uid();
$$;

revoke all on function public.at_mes_pouvoirs() from public;
revoke execute on function public.at_mes_pouvoirs() from anon;
grant execute on function public.at_mes_pouvoirs() to authenticated;
