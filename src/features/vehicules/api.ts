import { supabase } from '../../lib/supabase';

/**
 * Véhicules autorisés (extension M11) — pré-déclaration d'accès par site.
 * Gestion sous DELIVRER_BADGE ; reconnaissance au poste sous CONTROLER_AU_POSTE.
 * Reste transactionnel : n'ouvre jamais l'accès, accélère le contrôle du passage.
 */

export type StatutVehicule = 'ACTIF' | 'SUSPENDU';
export type EtatVehicule = 'VALIDE' | 'SUSPENDU' | 'EXPIRE';

export interface VehiculeAutorise {
  id: string;
  immatriculation: string;
  type: string | null;
  chauffeur: string | null;
  entreprise: string | null;
  entrepriseId: string | null;
  validiteDebut: string | null;
  validiteFin: string | null;
  statut: StatutVehicule;
  etat: EtatVehicule;
  motif: string | null;
}

function etatDe(statut: StatutVehicule, validiteDebut: string | null, validiteFin: string | null): EtatVehicule {
  if (statut === 'SUSPENDU') return 'SUSPENDU';
  const auj = new Date().toISOString().slice(0, 10);
  if (validiteFin && validiteFin < auj) return 'EXPIRE';
  if (validiteDebut && validiteDebut > auj) return 'EXPIRE';
  return 'VALIDE';
}

export async function chargerVehiculesAutorises(): Promise<VehiculeAutorise[]> {
  const { data, error } = await supabase
    .from('at_vehicules_autorises')
    .select('id, immatriculation, type, chauffeur_habituel, validite_debut, validite_fin, statut, motif, entreprise_id, entreprise:at_entreprises(raison_sociale)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((v) => {
    const statut = (v.statut as StatutVehicule) ?? 'ACTIF';
    return {
      id: v.id,
      immatriculation: v.immatriculation,
      type: v.type,
      chauffeur: v.chauffeur_habituel,
      entreprise: (v.entreprise as unknown as { raison_sociale: string } | null)?.raison_sociale ?? null,
      entrepriseId: v.entreprise_id,
      validiteDebut: v.validite_debut,
      validiteFin: v.validite_fin,
      statut,
      etat: etatDe(statut, v.validite_debut, v.validite_fin),
      motif: v.motif,
    };
  });
}

export interface EntrepriseSimple {
  id: string;
  raisonSociale: string;
}

export async function chargerEntreprisesSimple(): Promise<EntrepriseSimple[]> {
  const { data, error } = await supabase.from('at_entreprises').select('id, raison_sociale').order('raison_sociale');
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({ id: e.id, raisonSociale: e.raison_sociale }));
}

export async function declarerVehiculeAutorise(p: {
  immatriculation: string;
  entrepriseId?: string | null;
  type?: string | null;
  chauffeur?: string | null;
  validiteDebut?: string | null;
  validiteFin?: string | null;
  motif?: string | null;
}): Promise<{ id: string; immatriculation: string }> {
  const { data, error } = await supabase.rpc('at_declarer_vehicule_autorise', {
    p_immatriculation: p.immatriculation,
    p_entreprise_id: p.entrepriseId ?? null,
    p_type: p.type ?? null,
    p_chauffeur: p.chauffeur ?? null,
    p_validite_debut: p.validiteDebut ?? null,
    p_validite_fin: p.validiteFin ?? null,
    p_motif: p.motif ?? null,
  });
  if (error) throw new Error(error.message);
  const d = data as { id: string; immatriculation: string };
  return d;
}

export async function suspendreVehiculeAutorise(id: string, suspendre: boolean, motif?: string): Promise<void> {
  const { error } = await supabase.rpc('at_suspendre_vehicule_autorise', {
    p_id: id,
    p_suspendre: suspendre,
    p_motif: motif ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Reconnaissance au poste — utilisée par le module Véhicules (M11). */
export interface Reconnaissance {
  etat: EtatVehicule | 'INCONNU';
  id?: string;
  immatriculation?: string;
  entreprise?: string | null;
  entrepriseId?: string | null;
  type?: string | null;
  chauffeur?: string | null;
  validiteFin?: string | null;
}

export async function reconnaitreVehicule(immatriculation: string): Promise<Reconnaissance> {
  const { data, error } = await supabase.rpc('at_reconnaitre_vehicule', { p_immatriculation: immatriculation });
  if (error) throw new Error(error.message);
  return data as Reconnaissance;
}
