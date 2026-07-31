/** Référentiel local du poste (mode hors ligne) pour le contrôle des sorties matière — M10. */
import { MATERIELS_PARC } from './materiel';

export interface AutoPoste {
  code: string;
  numero: string;
  entreprise: string;
  type: string;
  destination: string;
  lignes: string[];
  validiteFin: string;
  expiree: boolean;
}

export interface MarquagePoste {
  numero: string;
  designation: string;
  entreprise: string;
  marque?: string;
  modele?: string;
  opposable: boolean;
}

/** Autorisations de sortie approuvées, chargées localement au poste. */
export const AUTOS_POSTE: AutoPoste[] = [
  {
    code: 'ATS-AS-2026-00186-7F3A21', numero: 'AS-2026-00186', entreprise: 'VRD Services',
    type: 'Déchets & emballages', destination: 'Déchetterie Akouédo',
    lignes: ['Palettes + cartons · 1 benne'], validiteFin: '30/07/2026 08:00', expiree: false,
  },
  {
    code: 'ATS-AS-2026-00179-B21C90', numero: 'AS-2026-00179', entreprise: 'Bâti-Sud',
    type: 'Matériel du site', destination: 'Dépôt Yopougon',
    lignes: ['Étais métalliques · 20 u'], validiteFin: '28/07/2026 18:00', expiree: true,
  },
];

/** Marquages du site (opposables = visés). */
export const MARQUAGES_POSTE: MarquagePoste[] = MATERIELS_PARC.map((m) => ({
  numero: m.numeroMarquage,
  designation: m.designation,
  entreprise: m.entreprise,
  marque: m.marque,
  modele: m.modele,
  opposable: m.statut === 'VISE',
}));

export type KindScan = 'AUTO' | 'MARQ' | 'INCONNU';
export interface DemoScanSortie {
  label: string;
  kind: KindScan;
  ref: string | null;
}

/** Jeux d'essai (remplacent la caméra). */
export const DEMO_SCANS_SORTIE: DemoScanSortie[] = [
  { label: 'Autorisation valide', kind: 'AUTO', ref: 'ATS-AS-2026-00186-7F3A21' },
  { label: 'Autorisation expirée', kind: 'AUTO', ref: 'ATS-AS-2026-00179-B21C90' },
  { label: 'Marquage opposable', kind: 'MARQ', ref: 'M-00101' },
  { label: 'Marquage non visé', kind: 'MARQ', ref: 'M-00105' },
  { label: 'Non couvert', kind: 'INCONNU', ref: null },
];
