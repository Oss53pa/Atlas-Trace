-- Durcissement de sécurité : retirer l'accès ANONYME aux fonctions SECURITY
-- DEFINER qui n'en ont pas besoin (revue de sécurité avant mise en production).
--
-- Restent volontairement accessibles à anon :
--   - at_invitation_apercu(text) : aperçu d'une invitation par jeton (flux public
--     d'activation de compte, avant connexion) ;
--   - at_user_orgs() : utilisé par les politiques RLS ; renvoie vide pour anon.

-- Tableau de bord : déjà gardé par CONSULTER_TABLEAU, mais inutile en anonyme.
revoke execute on function public.at_tableau_bord(integer) from public, anon;
grant execute on function public.at_tableau_bord(integer) to authenticated;

-- État de configuration : déjà gardé par ADMINISTRER_ORGANISATION, inutile en anonyme.
revoke execute on function public.at_etat_configuration() from public, anon;
grant execute on function public.at_etat_configuration() to authenticated;

-- Plafond courant : aucun garde-fou interne → ne doit pas être exécutable par anon.
-- Reste appelable par les comptes connectés et par les RPC internes (definer).
revoke execute on function public.at_plafond_actuel(uuid, date) from public, anon;
grant execute on function public.at_plafond_actuel(uuid, date) to authenticated;

-- Trigger functions : jamais appelées directement ; on retire toute exécution.
revoke execute on function public.at_audit_generique() from public, anon, authenticated;
revoke execute on function public.at__notifier_incident() from public, anon, authenticated;
