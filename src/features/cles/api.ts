import { supabase } from '../../lib/supabase';

/** Clés & zones sensibles (M17). Remise contre émargement, restitution, journal. */
export type StatutCle = 'DISPONIBLE' | 'REMISE';
export type SensCle = 'REMISE' | 'RESTITUTION';

export interface Cle {
  id: string;
  code: string;
  libelle: string;
  zone: string;
  statut: StatutCle;
  detenteur?: string | null;
  remiseAt?: string | null;
  remisePar?: string | null;
}

export interface MouvementCle {
  id: string;
  code: string;
  sens: SensCle;
  detenteur: string;
  agent: string;
  horodatage: string;
}

export async function chargerCles(): Promise<Cle[]> {
  const { data, error } = await supabase
    .from('at_cles')
    .select('id, code, libelle, zone, statut, detenteur, remise_at, remise_par')
    .order('code');
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id, code: c.code, libelle: c.libelle, zone: c.zone,
    statut: c.statut as StatutCle, detenteur: c.detenteur, remiseAt: c.remise_at, remisePar: c.remise_par,
  }));
}

export async function chargerMouvementsCle(limite = 12): Promise<MouvementCle[]> {
  const { data, error } = await supabase
    .from('at_mouvements_cle')
    .select('id, code, sens, detenteur, agent, horodatage')
    .order('horodatage', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id, code: m.code, sens: m.sens as SensCle, detenteur: m.detenteur, agent: m.agent, horodatage: m.horodatage,
  }));
}

export async function remettreCle(id: string, detenteur: string, emargement: boolean): Promise<void> {
  const { error } = await supabase.rpc('at_remettre_cle', { p_cle_id: id, p_detenteur: detenteur, p_emargement: emargement });
  if (error) throw new Error(error.message);
}

export async function restituerCle(id: string): Promise<void> {
  const { error } = await supabase.rpc('at_restituer_cle', { p_cle_id: id });
  if (error) throw new Error(error.message);
}
