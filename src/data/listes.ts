/** Données mock du module M4 — registre de présence vivant. */

export type StatutListe = 'ATTENDUE' | 'DEPOSEE' | 'HORS_DELAI' | 'MANQUANTE';

/** Personne de la liste de la veille, point de départ du dépôt du jour. */
export interface PersonneVeille {
  id: string;
  nom: string;
  prenom: string;
  fonction: string;
  regime: 'STABLE' | 'TOURNANT';
  /** Ligne relevant d'un sous-traitant de l'entreprise. */
  sousTraitant?: string;
  /** Présent la veille — coché par défaut au départ. */
  presentVeille: boolean;
}

export const LISTE_CONFIG = {
  entreprise: 'Bâti-Sud',
  referent: 'M. Traoré',
  dateLabel: 'Mardi 29 juillet 2026',
  heureLimite: '07:30',
  /** Heure simulée d'ouverture du lien par le référent. */
  heureCourante: '06:58',
};

/** Liste de la veille pour Bâti-Sud (stables + tournants + sous-traitant). */
export const PERSONNEL_VEILLE: PersonneVeille[] = [
  { id: 'v1', nom: 'Kouadio', prenom: 'Jean', fonction: 'Chef d’équipe', regime: 'STABLE', presentVeille: true },
  { id: 'v2', nom: 'Koffi', prenom: 'Yao', fonction: 'Électricien', regime: 'STABLE', presentVeille: true },
  { id: 'v3', nom: 'Ouattara', prenom: 'Salimata', fonction: 'Peintre', regime: 'STABLE', presentVeille: true },
  { id: 'v4', nom: 'Coulibaly', prenom: 'Fanta', fonction: 'Carreleuse', regime: 'STABLE', presentVeille: true },
  { id: 'v5', nom: 'Fofana', prenom: 'Moussa', fonction: 'Maçon', regime: 'STABLE', presentVeille: true },
  { id: 'v6', nom: 'N’Dri', prenom: 'Aya', fonction: 'Ferrailleur', regime: 'STABLE', presentVeille: true },
  { id: 'v7', nom: 'Diarra', prenom: 'Ibrahim', fonction: 'Coffreur', regime: 'STABLE', presentVeille: false },
  { id: 'v8', nom: 'Cissé', prenom: 'Bakary', fonction: 'Grutier', regime: 'STABLE', presentVeille: true },
  { id: 'v9', nom: 'Bamba', prenom: 'Awa', fonction: 'Aide-maçon', regime: 'TOURNANT', presentVeille: true },
  { id: 'v10', nom: 'Sylla', prenom: 'Ousmane', fonction: 'Plombier', regime: 'STABLE', sousTraitant: 'Élec-Plus', presentVeille: true },
  { id: 'v11', nom: 'Bance', prenom: 'Karim', fonction: 'Électricien', regime: 'STABLE', sousTraitant: 'Élec-Plus', presentVeille: true },
];

/** Suivi des dépôts, côté encadrement — état constaté à 07:45 (après l'heure limite). */
export interface DepotEntreprise {
  entreprise: string;
  statut: StatutListe;
  effectif: number | null;
  heureDepot: string | null;
  auteur: string | null;
}

export const DEPOTS: DepotEntreprise[] = [
  { entreprise: 'Bâti-Sud', statut: 'DEPOSEE', effectif: 14, heureDepot: '07:12', auteur: 'M. Traoré' },
  { entreprise: 'Aménag-Preneur K', statut: 'DEPOSEE', effectif: 6, heureDepot: '07:05', auteur: 'Mme Kablan' },
  { entreprise: 'Toiture Plus', statut: 'DEPOSEE', effectif: 9, heureDepot: '06:58', auteur: 'M. Sanogo' },
  { entreprise: 'VRD Services', statut: 'DEPOSEE', effectif: 11, heureDepot: '07:20', auteur: 'M. Ouédraogo' },
  { entreprise: 'Froid & Clim', statut: 'HORS_DELAI', effectif: 4, heureDepot: '07:41', auteur: 'M. Bakayoko' },
  { entreprise: 'Peinture Déco', statut: 'HORS_DELAI', effectif: 3, heureDepot: '07:38', auteur: 'Mme Yao' },
  { entreprise: 'Électro-CI', statut: 'MANQUANTE', effectif: null, heureDepot: null, auteur: null },
  { entreprise: 'Sécurité Feu', statut: 'MANQUANTE', effectif: null, heureDepot: null, auteur: null },
];
