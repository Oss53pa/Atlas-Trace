/** Données mock des modules M12 (préavis & créneaux) et M13 (réception). */

export type StatutPreavis = 'SOUMIS' | 'VALIDE' | 'RECEPTIONNE' | 'REFUSE' | 'EXPIRE';

export interface Creneau {
  id: string;
  libelle: string;
  quota: number;
  utilises: number;
}

export interface Reception {
  recu: number;
  ecart: number;
  photo: boolean;
  receptionnaire: string;
  heure: string;
}

export interface Preavis {
  id: string;
  numero: string; // PL-AAAA-NNNNN
  entreprise: string;
  fournisseur: string;
  nature: string;
  quantitePrevue: number;
  unite: string;
  immatriculation?: string;
  chauffeur?: string;
  levage: boolean;
  matieresDangereuses: boolean;
  creneauId: string;
  statut: StatutPreavis;
  code?: string;
  derogation?: string;
  /** Entrée sur site mais non encore réceptionnée (alerte à 24 h). */
  arriveeNonRecue?: boolean;
  reception?: Reception;
}

export const CRENEAUX: Creneau[] = [
  { id: 'c1', libelle: '06:30 – 08:30', quota: 5, utilises: 3 },
  { id: 'c2', libelle: '08:30 – 10:30', quota: 5, utilises: 5 }, // saturé
  { id: 'c3', libelle: '10:30 – 12:30', quota: 5, utilises: 2 },
  { id: 'c4', libelle: '14:00 – 16:00', quota: 4, utilises: 1 },
];

export const PREAVIS: Preavis[] = [
  { id: 'p1', numero: 'PL-2026-00041', entreprise: 'Bâti-Sud', fournisseur: 'Ciments d’Afrique', nature: 'Ciment (sacs 50 kg)', quantitePrevue: 45, unite: 'sacs', immatriculation: 'CI-8841-BC', chauffeur: 'M. Kaboré', levage: false, matieresDangereuses: false, creneauId: 'c1', statut: 'VALIDE', code: 'PL-41-9C2', arriveeNonRecue: true },
  { id: 'p2', numero: 'PL-2026-00042', entreprise: 'Aménag-Preneur K', fournisseur: 'Carrelage Décor', nature: 'Carrelage grès', quantitePrevue: 60, unite: 'm²', levage: true, matieresDangereuses: false, creneauId: 'c3', statut: 'SOUMIS' },
  { id: 'p3', numero: 'PL-2026-00043', entreprise: 'Froid & Clim', fournisseur: 'Clim Import', nature: 'Groupe froid + fluide R32', quantitePrevue: 1, unite: 'lot', levage: true, matieresDangereuses: true, creneauId: 'c4', statut: 'SOUMIS' },
  { id: 'p4', numero: 'PL-2026-00044', entreprise: 'VRD Services', fournisseur: 'Sablière du Sud', nature: 'Sable 0/4', quantitePrevue: 12, unite: 'm³', immatriculation: 'CI-2208-AB', chauffeur: 'M. Koffi', levage: false, matieresDangereuses: false, creneauId: 'c1', statut: 'VALIDE', code: 'PL-44-3A7' },
];

export const FOURNISSEURS = ['Ciments d’Afrique', 'Carrelage Décor', 'Sablière du Sud', 'Quincaillerie Centrale', 'Clim Import'];
export const NATURES_LIVRAISON = ['Ciment (sacs 50 kg)', 'Carrelage grès', 'Sable 0/4', 'Aciers HA', 'Quincaillerie', 'Groupe froid + fluide R32'];

export const creneauSature = (c: Creneau) => c.utilises >= c.quota;
