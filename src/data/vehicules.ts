/** Données mock du module M11 — véhicules et mouvements. */

export type StatutVehicule = 'SUR_SITE' | 'DEHORS';
export type EtatCharge = 'VIDE' | 'CHARGE';
export type ControleEffectue = 'COFFRE' | 'BENNE' | 'LES_DEUX' | 'SANS_OBJET';
export type SensVehicule = 'ENTREE' | 'SORTIE';

export interface Vehicule {
  id: string;
  immatriculation: string;
  entreprise: string;
  type: string;
  chauffeur: string;
  laissezPasser: string;
  validiteLP: string;
  statut: StatutVehicule;
  etatEntree?: EtatCharge;
  natureEntree?: string;
  entreeHeure?: string;
}

export interface MouvementVehicule {
  id: string;
  immatriculation: string;
  entreprise: string;
  sens: SensVehicule;
  etat: EtatCharge;
  nature?: string;
  controle: ControleEffectue;
  couverture?: string;
  anomalie: boolean;
  force?: boolean;
  heure: string;
}

export const VEHICULES: Vehicule[] = [
  { id: 'v1', immatriculation: 'CI-2208-AB', entreprise: 'VRD Services', type: 'Benne', chauffeur: 'M. Koffi', laissezPasser: 'LP-VRD-014', validiteLP: '2026-12-31', statut: 'SUR_SITE', etatEntree: 'VIDE', entreeHeure: '07:30' },
  { id: 'v2', immatriculation: 'AB-4471-CI', entreprise: 'Élec-Plus', type: 'Camion', chauffeur: 'M. Bance', laissezPasser: 'LP-ELP-006', validiteLP: '2026-11-30', statut: 'SUR_SITE', etatEntree: 'CHARGE', natureEntree: 'Matériel électrique', entreeHeure: '06:50' },
  { id: 'v3', immatriculation: 'CI-5590-KL', entreprise: 'Bâti-Sud', type: 'Utilitaire', chauffeur: 'M. Traoré', laissezPasser: 'LP-BS-021', validiteLP: '2026-12-31', statut: 'DEHORS' },
  { id: 'v4', immatriculation: 'CI-3312-MN', entreprise: 'Toiture Plus', type: 'Benne', chauffeur: 'M. Sanogo', laissezPasser: 'LP-TP-009', validiteLP: '2026-10-20', statut: 'DEHORS' },
];

export const CONTROLE_LABEL: Record<ControleEffectue, string> = {
  COFFRE: 'Coffre',
  BENNE: 'Benne',
  LES_DEUX: 'Les deux',
  SANS_OBJET: 'Sans objet',
};

/** Couvertures documentaires possibles pour une sortie chargée. */
export const COUVERTURES = [
  { id: 'as', libelle: 'Autorisation de sortie · AS-2026-00186' },
  { id: 'ae', libelle: 'Autorisation d’évacuation · AE-2026-00012' },
  { id: 'pl', libelle: 'Préavis de livraison · PL-2026-00044' },
];

export const MOUVEMENTS_VEHICULE_INIT: MouvementVehicule[] = [
  { id: 'mv0', immatriculation: 'AB-4471-CI', entreprise: 'Élec-Plus', sens: 'ENTREE', etat: 'CHARGE', nature: 'Matériel électrique', controle: 'SANS_OBJET', anomalie: false, heure: '06:50' },
  { id: 'mv1', immatriculation: 'CI-2208-AB', entreprise: 'VRD Services', sens: 'ENTREE', etat: 'VIDE', controle: 'BENNE', anomalie: false, heure: '07:30' },
];
