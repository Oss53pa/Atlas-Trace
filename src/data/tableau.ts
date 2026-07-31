/** Données agrégées du module M15 — tableau de bord. */

export interface PresenceEntreprise {
  entreprise: string;
  categorie: 'Chantier' | 'Aménagement';
  declare: number;
  entre: number;
}

/** Effectif déclaré (listes M4) vs réellement entré (mouvements M5). */
export const PRESENCE_ENTREPRISE: PresenceEntreprise[] = [
  { entreprise: 'Bâti-Sud', categorie: 'Chantier', declare: 14, entre: 13 },
  { entreprise: 'VRD Services', categorie: 'Chantier', declare: 11, entre: 11 },
  { entreprise: 'Toiture Plus', categorie: 'Chantier', declare: 9, entre: 8 },
  { entreprise: 'Aménag-Preneur K', categorie: 'Aménagement', declare: 6, entre: 6 },
  { entreprise: 'Froid & Clim', categorie: 'Aménagement', declare: 4, entre: 3 },
  { entreprise: 'Peinture Déco', categorie: 'Aménagement', declare: 3, entre: 2 },
];

export interface PassageHeure {
  heure: string;
  entrees: number;
  sorties: number;
}

export const PASSAGES_HEURE: PassageHeure[] = [
  { heure: '06', entrees: 12, sorties: 0 },
  { heure: '07', entrees: 20, sorties: 1 },
  { heure: '08', entrees: 9, sorties: 3 },
  { heure: '09', entrees: 4, sorties: 5 },
  { heure: '10', entrees: 2, sorties: 2 },
  { heure: '11', entrees: 1, sorties: 4 },
  { heure: '12', entrees: 0, sorties: 8 },
];

export interface Alerte {
  cle: string;
  libelle: string;
  valeur: number;
  ton: 'amber' | 'danger' | 'forest';
}

/** File d'alertes du jour (badges, matériel, autorisations, préavis, listes). */
export const ALERTES: Alerte[] = [
  { cle: 'listes', libelle: 'Entreprises sans liste', valeur: 2, ton: 'danger' },
  { cle: 'badges', libelle: 'Badges temp. non restitués', valeur: 5, ton: 'amber' },
  { cle: 'materiel', libelle: 'Matériels ponctuels en retard', valeur: 3, ton: 'amber' },
  { cle: 'sorties', libelle: 'Autorisations de sortie en attente', valeur: 4, ton: 'amber' },
  { cle: 'preavis', libelle: 'Préavis de livraison du jour', valeur: 7, ton: 'forest' },
];

export interface ReferenceSensible {
  reference: string;
  unite: string;
  entrees: number;
  sorties: number;
  comptage: number;
  /** Écart = comptage − stock théorique. Négatif = manquant. */
  ecart: number;
}

/** Rapprochement matière sur les références sensibles (chap. 24.1). */
export const MATIERE_SENSIBLE: ReferenceSensible[] = [
  { reference: 'Câble cuivre', unite: 'm', entrees: 1200, sorties: 180, comptage: 990, ecart: -30 },
  { reference: 'Carburant', unite: 'L', entrees: 400, sorties: 320, comptage: 70, ecart: -10 },
  { reference: 'Outillage électroportatif', unite: 'u', entrees: 45, sorties: 12, comptage: 33, ecart: 0 },
  { reference: 'Carrelage', unite: 'm²', entrees: 800, sorties: 60, comptage: 738, ecart: -2 },
  { reference: 'Ferraille', unite: 'kg', entrees: 5000, sorties: 210, comptage: 4785, ecart: -5 },
  { reference: 'Quincaillerie de porte', unite: 'u', entrees: 300, sorties: 20, comptage: 280, ecart: 0 },
];

/** Rôles du pilote pour la vue « temps réel par rôle ». */
export const ROLES = [
  { id: 'direction', libelle: 'Direction' },
  { id: 'poste', libelle: 'Chef de poste' },
  { id: 'hse', libelle: 'HSE' },
] as const;

export type RoleId = (typeof ROLES)[number]['id'];
