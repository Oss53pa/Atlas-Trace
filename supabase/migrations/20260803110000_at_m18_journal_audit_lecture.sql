-- M18 — Journal d'audit : resserrer la lecture sur le pouvoir dédié.
-- Le journal est déjà écrit par les RPC (SECURITY DEFINER) et inaltérable
-- (aucune policy d'insert/update/delete). On restreint la LECTURE à qui a
-- CONSULTER_AUDIT, avec repli ADMINISTRER_ORGANISATION pour ne pas verrouiller
-- l'administrateur du site. La lecture reste bornée à l'organisation.

drop policy if exists at_audit_select on public.at_audit;

create policy at_audit_select on public.at_audit for select to authenticated
  using (
    organisation_id in (select public.at_user_orgs())
    and (public.at_a_pouvoir('CONSULTER_AUDIT') or public.at_a_pouvoir('ADMINISTRER_ORGANISATION'))
  );
