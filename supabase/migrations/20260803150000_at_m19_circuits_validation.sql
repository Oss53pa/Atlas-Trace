-- M19 — Chaînes de validation : séquences ordonnées d'étapes (visa / approbation)
-- par type d'objet, éditables et versionnées. Règle non négociable : une chaîne
-- valide comporte au moins une étape à effet final — vérifiée par le serveur.

create table if not exists public.at_circuits (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  cle text not null,
  objet text not null,
  -- Étapes : [{ ordre, role, nature: 'VISA'|'APPROBATION', effet_final: bool }, ...]
  etapes jsonb not null default '[]',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.at_circuits is
  'Atlas Trace — chaînes de validation (M19). Étapes en JSONB, versionnées ; l''effet final est garanti par at_enregistrer_circuit.';

create unique index if not exists at_circuits_cle_uk on public.at_circuits(organisation_id, cle);
alter table public.at_circuits enable row level security;

create policy at_circuits_select on public.at_circuits for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));

-- Chaînes par défaut pour les organisations qui n'en ont pas encore.
insert into public.at_circuits (organisation_id, cle, objet, etapes, version)
select o.id, v.cle, v.objet, v.etapes::jsonb, v.version
from public.at_organisations o
cross join (values
  ('hab', 'Habilitation entreprise',
   '[{"ordre":1,"role":"Référent entreprise","nature":"VISA","effet_final":false},{"ordre":2,"role":"Responsable HSE","nature":"VISA","effet_final":false},{"ordre":3,"role":"Directeur de la Construction","nature":"APPROBATION","effet_final":true}]', 3),
  ('sortie', 'Sortie de matériel',
   '[{"ordre":1,"role":"Référent entreprise","nature":"VISA","effet_final":false},{"ordre":2,"role":"Responsable HSE","nature":"VISA","effet_final":false},{"ordre":3,"role":"Directeur de la Construction","nature":"APPROBATION","effet_final":true}]', 2),
  ('livraison', 'Préavis de livraison',
   '[{"ordre":1,"role":"Référent entreprise","nature":"VISA","effet_final":false},{"ordre":2,"role":"Pilote de coordination","nature":"APPROBATION","effet_final":true}]', 1)
) as v(cle, objet, etapes, version)
where not exists (
  select 1 from public.at_circuits c where c.organisation_id = o.id and c.cle = v.cle
);

-- ============================================================
-- Enregistrer une nouvelle version d'une chaîne
-- ============================================================
create or replace function public.at_enregistrer_circuit(p_cle text, p_etapes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orgs uuid[] := array(select public.at_user_orgs());
  v_c public.at_circuits%rowtype;
  v_effet_final int;
begin
  if not public.at_a_pouvoir('ADMINISTRER_ORGANISATION') then
    raise exception 'Pouvoir ADMINISTRER_ORGANISATION requis';
  end if;
  if p_etapes is null or jsonb_typeof(p_etapes) <> 'array' or jsonb_array_length(p_etapes) = 0 then
    raise exception 'Chaîne vide : au moins une étape est requise';
  end if;

  -- Règle : au moins une étape à effet final.
  select count(*) into v_effet_final
    from jsonb_array_elements(p_etapes) e
   where coalesce((e->>'effet_final')::boolean, false);
  if v_effet_final = 0 then
    raise exception 'Chaîne invalide : aucune étape à effet final';
  end if;

  select * into v_c from public.at_circuits
   where cle = p_cle and organisation_id = any(v_orgs) for update;
  if not found then
    raise exception 'Chaîne inconnue : %', p_cle;
  end if;

  update public.at_circuits
     set etapes = p_etapes, version = version + 1, updated_at = now()
   where id = v_c.id;

  insert into public.at_audit (organisation_id, site_id, utilisateur, action, entite, apres, appareil)
  select v_c.organisation_id,
    (select id from public.at_sites where organisation_id = v_c.organisation_id limit 1),
    coalesce((select nom from public.at_utilisateurs where user_id = auth.uid()), auth.uid()::text),
    'CIRCUIT_ENREGISTRE', 'at_circuits:' || v_c.id::text,
    jsonb_build_object('cle', p_cle, 'version', v_c.version + 1)::text, 'Web';

  return jsonb_build_object('cle', p_cle, 'version', v_c.version + 1);
end;
$$;

revoke all on function public.at_enregistrer_circuit(text, jsonb) from public;
revoke execute on function public.at_enregistrer_circuit(text, jsonb) from anon;
grant execute on function public.at_enregistrer_circuit(text, jsonb) to authenticated;
