-- M19 — Référentiels paramétrables : listes éditables portées par organisation.
-- Une seule table générique ; l'écriture est réservée à ADMINISTRER_ORGANISATION,
-- la lecture aux membres de l'organisation.

create table if not exists public.at_referentiels (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.at_organisations(id) on delete cascade,
  cle text not null,
  libelle text not null,
  portee text not null default 'Site' check (portee in ('Site', 'Organisation')),
  valeurs text[] not null default '{}',
  ordre int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.at_referentiels is
  'Atlas Trace — référentiels paramétrables (M19). Listes éditables par organisation.';

create unique index if not exists at_referentiels_cle_uk on public.at_referentiels(organisation_id, cle);
alter table public.at_referentiels enable row level security;

create policy at_referentiels_select on public.at_referentiels for select to authenticated
  using (organisation_id in (select public.at_user_orgs()));
create policy at_referentiels_insert on public.at_referentiels for insert to authenticated
  with check (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'));
create policy at_referentiels_update on public.at_referentiels for update to authenticated
  using (organisation_id in (select public.at_user_orgs()) and public.at_a_pouvoir('ADMINISTRER_ORGANISATION'))
  with check (organisation_id in (select public.at_user_orgs()));

-- Valeurs par défaut pour les organisations qui n'ont pas encore ce référentiel.
insert into public.at_referentiels (organisation_id, cle, libelle, portee, valeurs, ordre)
select o.id, v.cle, v.libelle, v.portee, v.valeurs, v.ordre
from public.at_organisations o
cross join (values
  ('zones', 'Zones', 'Site',
    array['Abords & poste','Circulation & base vie','Travaux','Galerie & cellules','Magasins & stockage sensible','Locaux techniques'], 1),
  ('motifs', 'Motifs de refus', 'Organisation',
    array['Badge inconnu','Badge expiré','Badge suspendu','Entité suspendue','Preneur bloqué','Personne suspendue','Déjà entré','Hors nœud autorisé','Hors plage horaire','Induction expirée','Photographie manquante'], 2),
  ('materiel', 'Catégories de matériel à déclaration obligatoire', 'Site',
    array['Électroportatif','Appareils de mesure','Câbles & cuivre','Échafaudages','Carburants'], 3),
  ('sensibles', 'Familles sensibles — photo obligatoire & tirage renforcé', 'Site',
    array['Câble cuivre','Carrelage','Robinetterie','Luminaires','Outillage électroportatif','Carburant','Ferraille'], 4)
) as v(cle, libelle, portee, valeurs, ordre)
where not exists (
  select 1 from public.at_referentiels r where r.organisation_id = o.id and r.cle = v.cle
);
