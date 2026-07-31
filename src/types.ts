/**
 * Types du domaine Atlas Trace — sous-ensemble nécessaire au poste de contrôle (M5).
 * Aligné sur le chapitre 9 du cahier des charges. Toutes les entités portent en
 * pratique organisation_id / site_id ; omis ici car la maquette est mono-site.
 */

export type Sens = 'ENTREE' | 'SORTIE';

export type Resultat = 'AUTORISE' | 'REFUSE' | 'FORCE';

export type Mode = 'EN_LIGNE' | 'HORS_LIGNE';

export type StatutBadge = 'ACTIF' | 'SUSPENDU' | 'EXPIRE' | 'PERDU' | 'RESTITUE';

export type StatutEntreprise = 'ACTIVE' | 'SUSPENDUE' | 'EN_VALIDATION' | 'CLOTUREE';

export type TypeBadge = 'NOMINATIF' | 'TEMPORAIRE' | 'VISITEUR';

/** Codes de motif de refus par défaut (chap. 9.3). */
export type MotifCode =
  | 'BADGE_INCONNU'
  | 'BADGE_EXPIRE'
  | 'BADGE_SUSPENDU'
  | 'ENTREPRISE_SUSPENDUE'
  | 'DONNEUR_ORDRE_BLOQUE'
  | 'HORS_LISTE'
  | 'HORS_ZONE'
  | 'HORS_EMPRISE'
  | 'HORS_PLAGE'
  | 'DEJA_ENTRE'
  | 'INDUCTION_EXPIREE'
  | 'PHOTO_NON_CONCORDANTE';

export interface DonneurOrdre {
  id: string;
  libelle: string;
  /** Statut d'accès calculé à partir des conditions bloquantes (M2). */
  bloque: boolean;
}

export interface Entreprise {
  id: string;
  raisonSociale: string;
  statut: StatutEntreprise;
  donneurOrdreId?: string;
}

export interface Personne {
  id: string;
  nom: string;
  prenom: string;
  fonction?: string;
  entrepriseId: string;
  /** Régime stable (personnel propre déclaré) ou tournant (liste journalière). */
  regime: 'STABLE' | 'TOURNANT';
  inductionValide: boolean;
  /** Initiales de repli tant que la photo n'est pas branchée (R2). */
  photoUrl?: string;
}

/** Plage horaire en minutes depuis minuit (ex. 06:30 → 390). */
export interface PlageHoraire {
  debut: number;
  fin: number;
}

export interface Badge {
  id: string;
  numero: string;
  type: TypeBadge;
  personneId: string;
  entrepriseId: string;
  statut: StatutBadge;
  /** Zones autorisées (codes). Doit contenir la zone contrôlée par le poste. */
  zonesAutorisees: string[];
  /** Emprise autorisée le cas échéant (cellule, secteur…). */
  empriseAutorisee?: string;
  zoneLabel: string;
  empriseLabel?: string;
  /** Fin de validité au format AAAA-MM-JJ. */
  validiteFin: string;
  /** Restriction horaire propre au badge (poste, vacation). */
  plageHoraire?: PlageHoraire;
  /** Visiteur : accompagnateur nommé obligatoire. */
  accompagnateur?: string;
}

/** Mouvement d'accès enregistré (chap. 9.3). */
export interface MouvementAcces {
  id: string;
  badgeNumero: string;
  personneLabel: string;
  entrepriseLabel: string;
  sens: Sens;
  resultat: Resultat;
  motif?: MotifCode;
  mode: Mode;
  posteLabel: string;
  agentLabel: string;
  horodatage: string;
  /** Forçage : commentaire + photo obligatoires (R2, chap. 12). */
  commentaire?: string;
  photoForcage?: boolean;
}
