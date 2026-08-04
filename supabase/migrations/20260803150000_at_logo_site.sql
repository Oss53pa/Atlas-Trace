-- Logo du site pour l'en-tête des rapports / exports imprimables. Stocké en
-- data URL (image compressée côté client) directement sur le site : embarqué
-- dans le document à l'impression, sans dépendance à un bucket ni à un lien
-- signé. Écriture réservée à l'administration (pouvoir ADMINISTRER_ORGANISATION).
alter table public.at_sites add column if not exists logo_url text;

create or replace function public.at_definir_logo_site(p_site_id uuid, p_data_url text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_site public.at_sites%rowtype;
begin
  if not public.at_a_pouvoir('ADMINISTRER_ORGANISATION') then
    raise exception 'Pouvoir ADMINISTRER_ORGANISATION requis';
  end if;
  select * into v_site from public.at_sites where id = p_site_id;
  if not found or v_site.organisation_id not in (select public.at_user_orgs()) then
    raise exception 'Site hors périmètre';
  end if;
  -- data URL image, ou null pour retirer. Borne défensive (~200 Ko encodés).
  if p_data_url is not null and length(p_data_url) > 300000 then
    raise exception 'Logo trop volumineux : compressez l''image (viser < 150 Ko)';
  end if;
  update public.at_sites set logo_url = p_data_url where id = p_site_id;
  return jsonb_build_object('id', p_site_id, 'ok', true);
end;
$$;

revoke all on function public.at_definir_logo_site(uuid, text) from public;
revoke execute on function public.at_definir_logo_site(uuid, text) from anon;
grant execute on function public.at_definir_logo_site(uuid, text) to authenticated;
