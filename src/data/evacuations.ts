/** Données mock du module M14 — autorisation d'évacuation & contrôle inopiné. */

export type StatutEvac = 'ACTIVE' | 'CLOTUREE';
export type ResultatControle = 'CONFORME' | 'ANOMALIE';

export interface AutorisationEvac {
  id: string;
  numero: string; // AE-AAAA-NNNNN
  entreprise: string;
  nature: string;
  volume: number; // m³
  periode: string;
  destination: string;
  immatriculations: string[];
  statut: StatutEvac;
  visee: boolean;
}

export interface ControleInopine {
  id: string;
  numeroEvac: string;
  immatriculation: string;
  agent: string;
  date: string;
  resultat: ResultatControle;
  photo: boolean;
}

/** Taux de contrôle inopiné (référentiel site, chap. 8) : 1 sur 5 par défaut. */
export const TAUX_CONTROLE = { sur: 5, libelle: '1 sur 5' };

export const AUTORISATIONS_EVAC: AutorisationEvac[] = [
  { id: 'e1', numero: 'AE-2026-00012', entreprise: 'VRD Services', nature: 'Déblais de terrassement', volume: 120, periode: '26/07 → 15/08', destination: 'Décharge Akouédo', immatriculations: ['CI-2208-AB', 'CI-3312-MN'], statut: 'ACTIVE', visee: true },
  { id: 'e2', numero: 'AE-2026-00013', entreprise: 'Bâti-Sud', nature: 'Gravats de démolition', volume: 60, periode: '01/07 → 30/07', destination: 'Décharge Akouédo', immatriculations: ['CI-5590-KL'], statut: 'ACTIVE', visee: true },
  { id: 'e3', numero: 'AE-2026-00009', entreprise: 'Toiture Plus', nature: 'Chutes de couverture', volume: 15, periode: '10/06 → 05/07', destination: 'Centre de tri Yopougon', immatriculations: ['CI-3312-MN'], statut: 'CLOTUREE', visee: true },
];

export const CONTROLES_INOPINES_INIT: ControleInopine[] = [
  { id: 'ci0', numeroEvac: 'AE-2026-00012', immatriculation: 'CI-2208-AB', agent: 'M. Koné', date: '28/07 14:20', resultat: 'CONFORME', photo: true },
];

export const NATURES_DEBLAIS = [
  'Déblais de terrassement',
  'Gravats de démolition',
  'Chutes de couverture',
  'Terre végétale',
  'Bétons de démolition',
];
