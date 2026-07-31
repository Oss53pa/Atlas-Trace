/** Données mock du module M9 — autorisation de sortie de matériel. */

export type TypeSortie = 'SITE' | 'ENTREPRISE' | 'DECHETS';
export type StatutSortie = 'SOUMISE' | 'VISA' | 'APPROUVEE' | 'REFUSEE' | 'EXPIREE' | 'CONSOMMEE';

export const TYPE_LABEL: Record<TypeSortie, string> = {
  SITE: 'Matériel du site',
  ENTREPRISE: 'Matériel de l’entreprise',
  DECHETS: 'Déchets & emballages',
};

export interface LigneSortie {
  designation: string;
  quantite: number;
  unite: string;
  marquage?: string;
}

export interface AutorisationSortie {
  id: string;
  numero: string; // AS-AAAA-NNNNN
  entreprise: string;
  demandeur: string;
  type: TypeSortie;
  motif: string;
  destination: string;
  lignes: LigneSortie[];
  vehicule?: string;
  statut: StatutSortie;
  visaFait: boolean;
  approuve: boolean;
  code?: string;
  validiteFin?: string;
  motifRefus?: string;
}

export const AUTORISATIONS: AutorisationSortie[] = [
  {
    id: 'a1', numero: 'AS-2026-00184', entreprise: 'Bâti-Sud', demandeur: 'M. Traoré', type: 'SITE',
    motif: 'Retour de matériel en dépôt', destination: 'Dépôt Yopougon',
    lignes: [
      { designation: 'Étais métalliques', quantite: 40, unite: 'u' },
      { designation: 'Banches (jeu)', quantite: 2, unite: 'lot' },
    ],
    statut: 'SOUMISE', visaFait: false, approuve: false,
  },
  {
    id: 'a2', numero: 'AS-2026-00185', entreprise: 'Élec-Plus', demandeur: 'M. Sylla', type: 'ENTREPRISE',
    motif: 'Reprise outillage fin de tâche', destination: 'Atelier Marcory', vehicule: 'AB-4471-CI',
    lignes: [{ designation: 'Touret de câble cuivre', quantite: 1, unite: 'u', marquage: 'M-00104' }],
    statut: 'VISA', visaFait: true, approuve: false,
  },
  {
    id: 'a3', numero: 'AS-2026-00186', entreprise: 'VRD Services', demandeur: 'M. Ouédraogo', type: 'DECHETS',
    motif: 'Évacuation emballages', destination: 'Déchetterie Akouédo', vehicule: 'CI-2208-AB',
    lignes: [{ designation: 'Palettes + cartons', quantite: 1, unite: 'benne' }],
    statut: 'APPROUVEE', visaFait: true, approuve: true,
    code: 'ATS-AS-2026-00186-7F3A21', validiteFin: '30/07/2026 08:00',
  },
  {
    id: 'a4', numero: 'AS-2026-00187', entreprise: 'Toiture Plus', demandeur: 'M. Sanogo', type: 'SITE',
    motif: 'Sortie de bacs acier', destination: 'Non précisée',
    lignes: [{ designation: 'Bacs acier', quantite: 12, unite: 'u' }],
    statut: 'REFUSEE', visaFait: false, approuve: false,
    motifRefus: 'Destination non justifiée — matériel appartenant au site',
  },
];

/** Circuit de sortie du pilote (chap. 7.3), décrit en données. */
export const CIRCUIT_SORTIE = [
  { ordre: 1, role: 'Référent entreprise', nature: 'DEMANDE' as const },
  { ordre: 2, role: 'HSE Officer', nature: 'VISA' as const },
  { ordre: 3, role: 'Directeur de la Construction', nature: 'APPROBATION' as const, effetFinal: true },
];

/** Génère un code opaque déterministe (maquette ; en réel : charge signée, chap. 12). */
export function genererCode(numero: string): string {
  let h = 0;
  const s = `ATS|${numero}|signe`;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) & 0xffffff;
  return `ATS-${numero}-${h.toString(16).toUpperCase().padStart(6, '0')}`;
}
