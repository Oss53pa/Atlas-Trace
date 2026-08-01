-- Correction : le rattachement au Preneur vit sur l'ENTITÉ (at_entites.parent_id),
-- pas sur la fiche entreprise. On retire le doublon et on relie la fiche à son entité.
alter table public.at_entreprises drop column if exists parent_entite_id;
alter table public.at_entreprises add column if not exists entite_id uuid references public.at_entites(id) on delete set null;
create index if not exists at_entreprises_entite_idx on public.at_entreprises(entite_id);
