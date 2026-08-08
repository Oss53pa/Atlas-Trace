-- Durcissements d'audit sécurité (8 août 2026).
-- Fix #4 : l'aperçu d'activation est appelé par un visiteur non connecté (anon).
-- La fonction est en lecture seule et protégée par le jeton (64 hex) — sûre pour anon.
grant execute on function public.at_invitation_apercu(text) to anon;

-- Fix #1 : limite de débit du courriel de réinitialisation (anti email-bombing).
create table if not exists public.at_reset_debit (
  cle text primary key,
  fenetre_debut timestamptz not null default now(),
  nb int not null default 0
);
alter table public.at_reset_debit enable row level security;  -- aucune policy : service role uniquement

create or replace function public.at_reset_debit_ok(p_cle text, p_fenetre int, p_max int)
 returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare v_nb int;
begin
  insert into public.at_reset_debit (cle, fenetre_debut, nb)
    values (p_cle, now(), 1)
  on conflict (cle) do update set
    fenetre_debut = case when public.at_reset_debit.fenetre_debut < now() - make_interval(secs => p_fenetre)
                         then now() else public.at_reset_debit.fenetre_debut end,
    nb = case when public.at_reset_debit.fenetre_debut < now() - make_interval(secs => p_fenetre)
              then 1 else public.at_reset_debit.nb + 1 end
  returning nb into v_nb;
  return v_nb <= p_max;
end;
$function$;
