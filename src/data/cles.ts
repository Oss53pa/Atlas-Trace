/** Données mock du module M17 — clés et zones sensibles. */

export type StatutCle = 'DISPONIBLE' | 'REMISE' | 'NON_RESTITUEE';
export type SensCle = 'REMISE' | 'RESTITUTION';

export interface Cle {
  id: string;
  code: string;
  libelle: string;
  zone: string;
  statut: StatutCle;
  detenteur?: string;
  heureRemise?: string;
  remisePar?: string;
}

export interface MouvementCle {
  id: string;
  code: string;
  sens: SensCle;
  detenteur: string;
  agent: string;
  heure: string;
}

export const CLES: Cle[] = [
  { id: 'k1', code: 'CLE-MAG-01', libelle: 'Magasin stockage sensible', zone: 'Magasins', statut: 'REMISE', detenteur: 'M. Sanou (magasinier)', heureRemise: '31/07 07:15', remisePar: 'M. Koné' },
  { id: 'k2', code: 'CLE-LT-03', libelle: 'Local technique TGBT', zone: 'Locaux techniques', statut: 'NON_RESTITUEE', detenteur: 'M. Bakayoko (Froid & Clim)', heureRemise: '30/07 16:40', remisePar: 'M. Diaby' },
  { id: 'k3', code: 'CLE-COF-01', libelle: 'Coffre bureau de chantier', zone: 'Base vie', statut: 'DISPONIBLE' },
  { id: 'k4', code: 'CLE-GAL-02', libelle: 'Rideau galerie B', zone: 'Galerie', statut: 'DISPONIBLE' },
  { id: 'k5', code: 'CLE-MAG-02', libelle: 'Magasin outillage électroportatif', zone: 'Magasins', statut: 'REMISE', detenteur: 'M. Traoré (Bâti-Sud)', heureRemise: '31/07 08:00', remisePar: 'M. Koné' },
];

export const MOUVEMENTS_CLE_INIT: MouvementCle[] = [
  { id: 'mc0', code: 'CLE-MAG-01', sens: 'REMISE', detenteur: 'M. Sanou (magasinier)', agent: 'M. Koné', heure: '07:15' },
  { id: 'mc1', code: 'CLE-MAG-02', sens: 'REMISE', detenteur: 'M. Traoré (Bâti-Sud)', agent: 'M. Koné', heure: '08:00' },
];

export const DETENTEURS = [
  'M. Sanou (magasinier)',
  'M. Traoré (Bâti-Sud)',
  'M. Bakayoko (Froid & Clim)',
  'M. Sylla (Élec-Plus)',
  'Mme Kablan (Aménag-Preneur K)',
];
