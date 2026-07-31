/** Données mock des modules M1 (entreprises) et M2 (donneurs d'ordre & conditions). */

export type StatutEntreprise = 'BROUILLON' | 'EN_VALIDATION' | 'ACTIVE' | 'SUSPENDUE';

export interface Condition {
  id: string;
  libelle: string;
  rempli: boolean;
  date?: string;
}

export interface DonneurOrdre {
  id: string;
  libelle: string;
  type: string;
  empriseId: string;
  conditions: Condition[];
}

export interface Emprise {
  id: string;
  code: string;
  libelle: string;
  zone: string;
}

export interface CategorieIntervenant {
  id: string;
  libelle: string;
  /** La catégorie relève-t-elle d'un donneur d'ordre (chap. 8.1) ? */
  requiertDonneurOrdre: boolean;
}

export interface Entreprise {
  id: string;
  raisonSociale: string;
  categorieId: string;
  donneurOrdreId?: string;
  empriseId?: string;
  titulaire?: string; // entreprise titulaire si sous-traitant
  referent: string;
  assuranceEcheance: string;
  statut: StatutEntreprise;
  /** Avancement du circuit d'habilitation. */
  visaHSE: boolean;
  approuve: boolean;
}

export const CATEGORIES: CategorieIntervenant[] = [
  { id: 'chantier', libelle: 'Entreprise de chantier', requiertDonneurOrdre: false },
  { id: 'amenagement', libelle: 'Aménagement de preneur', requiertDonneurOrdre: true },
];

export const EMPRISES: Emprise[] = [
  { id: 'b12', code: 'B12', libelle: 'Cellule B12', zone: 'galerie' },
  { id: 'b08', code: 'B08', libelle: 'Cellule B08', zone: 'galerie' },
  { id: 'a03', code: 'A03', libelle: 'Cellule A03', zone: 'galerie' },
];

const cond = (id: string, libelle: string, rempli: boolean, date?: string): Condition => ({ id, libelle, rempli, date });

/** Conditions bloquantes du pilote (annexe 24.1). */
export const DONNEURS_ORDRE: DonneurOrdre[] = [
  {
    id: 'do1',
    libelle: 'Preneur — Enseigne A',
    type: 'Preneur',
    empriseId: 'b12',
    conditions: [
      cond('c1', 'Bail signé et paraphé', true, '2026-05-12'),
      cond('c2', 'BEFA signé', true, '2026-05-12'),
      cond('c3', 'Forfait compte prorata encaissé', true, '2026-06-01'),
      cond('c4', 'Dossier technique d’aménagement validé', true, '2026-06-20'),
      cond('c5', 'Contrat bureau de contrôle signé', true, '2026-06-25'),
      cond('c6', 'Contrat Pilote B signé', true, '2026-07-01'),
    ],
  },
  {
    id: 'do2',
    libelle: 'Preneur — Boutique X',
    type: 'Preneur',
    empriseId: 'b08',
    conditions: [
      cond('c1', 'Bail signé et paraphé', true, '2026-06-02'),
      cond('c2', 'BEFA signé', true, '2026-06-02'),
      cond('c3', 'Forfait compte prorata encaissé', true, '2026-06-30'),
      cond('c4', 'Dossier technique d’aménagement validé', false),
      cond('c5', 'Contrat bureau de contrôle signé', false),
      cond('c6', 'Contrat Pilote B signé', true, '2026-07-10'),
    ],
  },
  {
    id: 'do3',
    libelle: 'Preneur — Resto Y',
    type: 'Preneur',
    empriseId: 'a03',
    conditions: [
      cond('c1', 'Bail signé et paraphé', true, '2026-06-15'),
      cond('c2', 'BEFA signé', true, '2026-06-15'),
      cond('c3', 'Forfait compte prorata encaissé', false),
      cond('c4', 'Dossier technique d’aménagement validé', true, '2026-07-05'),
      cond('c5', 'Contrat bureau de contrôle signé', true, '2026-07-08'),
      cond('c6', 'Contrat Pilote B signé', true, '2026-07-08'),
    ],
  },
];

export const ENTREPRISES: Entreprise[] = [
  { id: 'e1', raisonSociale: 'Bâti-Sud', categorieId: 'chantier', referent: 'M. Traoré', assuranceEcheance: '2026-12-31', statut: 'ACTIVE', visaHSE: true, approuve: true },
  { id: 'e2', raisonSociale: 'Aménag-Preneur K', categorieId: 'amenagement', donneurOrdreId: 'do1', empriseId: 'b12', referent: 'Mme Kablan', assuranceEcheance: '2027-03-15', statut: 'ACTIVE', visaHSE: true, approuve: true },
  { id: 'e3', raisonSociale: 'Élec-Plus', categorieId: 'chantier', titulaire: 'Bâti-Sud', referent: 'M. Sylla', assuranceEcheance: '2026-11-30', statut: 'ACTIVE', visaHSE: true, approuve: true },
  { id: 'e4', raisonSociale: 'Toiture Plus', categorieId: 'chantier', referent: 'M. Sanogo', assuranceEcheance: '2026-10-20', statut: 'EN_VALIDATION', visaHSE: true, approuve: false },
  { id: 'e5', raisonSociale: 'Froid & Clim', categorieId: 'chantier', referent: 'M. Bakayoko', assuranceEcheance: '2026-09-15', statut: 'EN_VALIDATION', visaHSE: false, approuve: false },
  { id: 'e6', raisonSociale: 'Déco Boutique X', categorieId: 'amenagement', donneurOrdreId: 'do2', empriseId: 'b08', referent: 'Mme Yao', assuranceEcheance: '2027-01-10', statut: 'BROUILLON', visaHSE: false, approuve: false },
];

/** Circuit d'habilitation d'entreprise, décrit en données (chap. 7). */
export const CIRCUIT_HABILITATION = [
  { ordre: 1, role: 'Référent entreprise', nature: 'DEMANDE' as const },
  { ordre: 2, role: 'HSE Officer', nature: 'VISA' as const },
  { ordre: 3, role: 'Directeur de la Construction', nature: 'APPROBATION' as const, effetFinal: true },
];

// ——— Helpers ———
export const donneurBloque = (d: DonneurOrdre) => d.conditions.some((c) => !c.rempli);
export const conditionsManquantes = (d: DonneurOrdre) => d.conditions.filter((c) => !c.rempli);
