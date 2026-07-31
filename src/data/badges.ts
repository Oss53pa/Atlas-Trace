/** Données mock du module M3 — personnes, inductions et badges. */

export type InductionStatut = 'VALIDE' | 'EXPIREE' | 'EN_ATTENTE';
export type BadgeStatut = 'ACTIF' | 'BLOQUE' | 'SUSPENDU';

export interface CategorieBadge {
  id: string;
  libelle: string;
  /** Couleur de la bande du badge (charte site, chap. 8). */
  hex: string;
  zones: string[];
  zoneLabel: string;
}

export const CATEGORIES: Record<string, CategorieBadge> = {
  chantier: { id: 'chantier', libelle: 'Chantier', hex: '#0F5044', zones: ['circulation', 'travaux'], zoneLabel: 'Travaux · circulation' },
  amenagement: { id: 'amenagement', libelle: 'Aménagement preneur', hex: '#C08A2A', zones: ['circulation', 'galerie'], zoneLabel: 'Galerie · circulation' },
  visiteur: { id: 'visiteur', libelle: 'Visiteur', hex: '#6F7C75', zones: ['circulation'], zoneLabel: 'Circulation accompagnée' },
};

export interface Personne {
  id: string;
  nom: string;
  prenom: string;
  fonction: string;
  entreprise: string;
  categorieId: string;
  induction: InductionStatut;
  inductionEcheance?: string;
  badgeNumero?: string;
  badgeStatut?: BadgeStatut;
}

export const PERSONNEL: Personne[] = [
  { id: 'n1', nom: 'Kouadio', prenom: 'Jean', fonction: 'Chef d’équipe', entreprise: 'Bâti-Sud', categorieId: 'chantier', induction: 'VALIDE', inductionEcheance: '2026-10-15', badgeNumero: 'NOM-00142', badgeStatut: 'ACTIF' },
  { id: 'n2', nom: 'Ouattara', prenom: 'Salimata', fonction: 'Peintre', entreprise: 'Bâti-Sud', categorieId: 'chantier', induction: 'VALIDE', inductionEcheance: '2026-09-30', badgeNumero: 'NOM-00110', badgeStatut: 'ACTIF' },
  { id: 'n3', nom: 'Coulibaly', prenom: 'Fanta', fonction: 'Carreleuse', entreprise: 'Bâti-Sud', categorieId: 'chantier', induction: 'VALIDE', inductionEcheance: '2026-11-05', badgeNumero: 'NOM-00156', badgeStatut: 'ACTIF' },
  { id: 'n4', nom: 'Fofana', prenom: 'Moussa', fonction: 'Maçon', entreprise: 'Bâti-Sud', categorieId: 'chantier', induction: 'VALIDE', inductionEcheance: '2026-10-02', badgeNumero: 'NOM-00161', badgeStatut: 'ACTIF' },
  { id: 'n5', nom: 'N’Dri', prenom: 'Aya', fonction: 'Ferrailleur', entreprise: 'Bâti-Sud', categorieId: 'chantier', induction: 'EXPIREE', inductionEcheance: '2026-07-20', badgeNumero: 'NOM-00164', badgeStatut: 'BLOQUE' },
  { id: 'n6', nom: 'Sylla', prenom: 'Ousmane', fonction: 'Plombier (S-T Élec-Plus)', entreprise: 'Bâti-Sud', categorieId: 'chantier', induction: 'VALIDE', inductionEcheance: '2026-12-01', badgeNumero: 'NOM-00181', badgeStatut: 'ACTIF' },
  { id: 'n7', nom: 'Kablan', prenom: 'Marie', fonction: 'Conductrice de travaux', entreprise: 'Aménag-Preneur K', categorieId: 'amenagement', induction: 'VALIDE', inductionEcheance: '2026-10-20', badgeNumero: 'NOM-00188', badgeStatut: 'ACTIF' },
  { id: 'n8', nom: 'Bakayoko', prenom: 'Ismaël', fonction: 'Frigoriste', entreprise: 'Froid & Clim', categorieId: 'amenagement', induction: 'VALIDE', inductionEcheance: '2026-09-15', badgeNumero: 'NOM-00192', badgeStatut: 'ACTIF' },
];

/** Tournants du jour (issus de la liste M4) — source du lot de badges temporaires. */
export interface Tournant {
  id: string;
  nom: string;
  prenom: string;
  fonction: string;
  entreprise: string;
}

export const TOURNANTS_JOUR: Tournant[] = [
  { id: 't1', nom: 'Bamba', prenom: 'Awa', fonction: 'Aide-maçon', entreprise: 'Bâti-Sud' },
  { id: 't2', nom: 'Koné', prenom: 'Seydou', fonction: 'Manœuvre', entreprise: 'Bâti-Sud' },
  { id: 't3', nom: 'Cissé', prenom: 'Bakary', fonction: 'Grutier', entreprise: 'Bâti-Sud' },
  { id: 't4', nom: 'Diarra', prenom: 'Ibrahim', fonction: 'Coffreur', entreprise: 'VRD Services' },
  { id: 't5', nom: 'Sanogo', prenom: 'Adama', fonction: 'Étancheur', entreprise: 'Toiture Plus' },
];

export type VisiteurStatut = 'SUR_SITE' | 'SORTI';

export interface Visiteur {
  id: string;
  nom: string;
  prenom: string;
  motif: string;
  accompagnateur: string;
  numero: string;
  statut: VisiteurStatut;
  entree: string;
  /** Alerte : présent au-delà de la durée prévue / non sorti en fin de journée. */
  nonSorti?: boolean;
}

export const VISITEURS: Visiteur[] = [
  { id: 'w1', nom: 'Diallo', prenom: 'Amina', motif: 'Visite d’architecte', accompagnateur: 'M. Bance (HSE)', numero: 'VIS-20260729-004', statut: 'SUR_SITE', entree: '07:44' },
  { id: 'w2', nom: 'Touré', prenom: 'Marc', motif: 'Livraison échantillons', accompagnateur: 'Chef magasin', numero: 'VIS-20260729-005', statut: 'SORTI', entree: '08:20' },
  { id: 'w3', nom: 'Koffi', prenom: 'Ange', motif: 'Bureau de contrôle', accompagnateur: 'Pilote OPC', numero: 'VIS-20260729-006', statut: 'SUR_SITE', entree: '09:10', nonSorti: true },
];

export const SITE = {
  organisation: 'New Heaven SA',
  site: 'Cosmos Angré',
  dateLot: '20260729',
};
