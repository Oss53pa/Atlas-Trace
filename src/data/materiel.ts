/** Données mock du module M7 — parcs de matériel déclarés et marquage. */

export type StatutMateriel = 'DECLARE' | 'MARQUE' | 'VISE';

export interface MaterielParc {
  id: string;
  entreprise: string;
  designation: string;
  marque?: string;
  modele?: string;
  numeroSerie?: string;
  categorie: string;
  /** Numéro de marquage unique sur le site (M-NNNNN), attribué par le système. */
  numeroMarquage: string;
  statut: StatutMateriel;
  /** Photo montrant le marquage apposé — obligatoire avant visa. */
  photoMarquage: boolean;
  visaPar?: string;
  visaDate?: string;
  /** Contrôlé par échantillon lors du visa. */
  echantillon?: boolean;
  /** Référence du bordereau de déclaration groupant plusieurs matériels (BM-AAAA-NNN). */
  bordereau?: string;
  /** Photo du marquage apposé, capturée dans l'appli (data URL). */
  photo?: string;
}

/** Catégories à déclaration obligatoire (référentiel site, chap. 8). */
export const CATEGORIES_MATERIEL = [
  'Électroportatif',
  'Appareils de mesure',
  'Câbles & cuivre',
  'Échafaudages',
  'Carburants',
];

export const ENTREPRISES_MATERIEL = [
  'Bâti-Sud',
  'Élec-Plus',
  'Toiture Plus',
  'Froid & Clim',
  'VRD Services',
  'Aménag-Preneur K',
];

export const MATERIELS_PARC: MaterielParc[] = [
  { id: 'm1', entreprise: 'Bâti-Sud', designation: 'Perforateur', marque: 'Bosch', modele: 'GBH 5-40', numeroSerie: 'BSH-4471', categorie: 'Électroportatif', numeroMarquage: 'M-00101', statut: 'VISE', photoMarquage: true, visaPar: 'M. Diby (HSE)', visaDate: '2026-07-18', echantillon: true },
  { id: 'm2', entreprise: 'Bâti-Sud', designation: 'Meuleuse d’angle', marque: 'Makita', modele: 'GA9020', numeroSerie: 'MKT-2210', categorie: 'Électroportatif', numeroMarquage: 'M-00102', statut: 'VISE', photoMarquage: true, visaPar: 'M. Diby (HSE)', visaDate: '2026-07-18' },
  { id: 'm3', entreprise: 'Bâti-Sud', designation: 'Niveau laser', marque: 'Leica', modele: 'Lino L2P5', numeroSerie: 'LCA-8890', categorie: 'Appareils de mesure', numeroMarquage: 'M-00103', statut: 'MARQUE', photoMarquage: true },
  { id: 'm4', entreprise: 'Élec-Plus', designation: 'Touret de câble cuivre', marque: '—', modele: '3×2.5mm²', numeroSerie: '—', categorie: 'Câbles & cuivre', numeroMarquage: 'M-00104', statut: 'MARQUE', photoMarquage: true },
  { id: 'm5', entreprise: 'Toiture Plus', designation: 'Échafaudage roulant', marque: 'Layher', modele: 'Uni Standard', numeroSerie: 'LYH-0031', categorie: 'Échafaudages', numeroMarquage: 'M-00105', statut: 'DECLARE', photoMarquage: false },
  { id: 'm6', entreprise: 'Froid & Clim', designation: 'Poste à souder', marque: 'Fronius', modele: 'TransSteel', numeroSerie: 'FRN-1180', categorie: 'Électroportatif', numeroMarquage: 'M-00106', statut: 'DECLARE', photoMarquage: false },
  { id: 'm7', entreprise: 'VRD Services', designation: 'Groupe électrogène', marque: 'SDMO', modele: 'Diesel 6kVA', numeroSerie: 'SDM-4402', categorie: 'Électroportatif', numeroMarquage: 'M-00107', statut: 'VISE', photoMarquage: true, visaPar: 'Mme Aka (HSE)', visaDate: '2026-07-20' },
  { id: 'm8', entreprise: 'Aménag-Preneur K', designation: 'Théodolite', marque: 'Topcon', modele: 'DT-209', numeroSerie: 'TPC-7751', categorie: 'Appareils de mesure', numeroMarquage: 'M-00108', statut: 'MARQUE', photoMarquage: true },
];
