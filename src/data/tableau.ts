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

export interface SerieFlux {
  serie: string;
  unite: string;
  /** Valeur observée aujourd'hui. */
  jour: number;
  /** Tendance de référence propre au site (moyenne mobile). */
  moyenne: number;
}

/** M15 — anomalies de flux. On ne compte pas les objets, on compte les mouvements.
 *  Le système signale un écart à la tendance propre du site, jamais un seuil absolu (R18). */
export const ANOMALIES_FLUX: SerieFlux[] = [
  { serie: 'Bennes sorties', unite: '/ j', jour: 9, moyenne: 5 },
  { serie: 'Camions entrés / sortis', unite: '/ j', jour: 14, moyenne: 12 },
  { serie: 'Fûts de carburant sortis', unite: '/ j', jour: 4, moyenne: 2 },
  { serie: 'Sorties famille sensible', unite: '/ j', jour: 7, moyenne: 6 },
  { serie: 'Sorties refusées faute de couverture', unite: '/ j', jour: 3, moyenne: 1 },
  { serie: 'Contrôles approfondis (tirage)', unite: '/ j', jour: 11, moyenne: 10 },
];

/** Rôles du pilote pour la vue « temps réel par rôle ». */
export const ROLES = [
  { id: 'direction', libelle: 'Direction' },
  { id: 'poste', libelle: 'Chef de poste' },
  { id: 'hse', libelle: 'HSE' },
] as const;

export type RoleId = (typeof ROLES)[number]['id'];
