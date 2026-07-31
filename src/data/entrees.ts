/** Données mock du module M8 — entrée de matériel ponctuel. */

export type StatutPonctuel = 'SUR_SITE' | 'SORTI' | 'EN_RETARD';

export interface EntreePonctuel {
  id: string;
  entreprise: string;
  designation: string;
  quantite: number;
  unite: string;
  agent: string;
  horodatageEntree: string; // JJ/MM AAAA HH:MM
  dateSortiePrevue: string; // AAAA-MM-JJ
  statut: StatutPonctuel;
}

export const ENTREES_PONCTUEL: EntreePonctuel[] = [
  { id: 'p1', entreprise: 'Bâti-Sud', designation: 'Perceuse-visseuse (prêt)', quantite: 2, unite: 'u', agent: 'M. Koné', horodatageEntree: '29/07 07:12', dateSortiePrevue: '2026-07-29', statut: 'SUR_SITE' },
  { id: 'p2', entreprise: 'Froid & Clim', designation: 'Bouteille de fluide R32', quantite: 1, unite: 'u', agent: 'M. Koné', horodatageEntree: '29/07 07:40', dateSortiePrevue: '2026-07-30', statut: 'SUR_SITE' },
  { id: 'p3', entreprise: 'VRD Services', designation: 'Plaque vibrante (location)', quantite: 1, unite: 'u', agent: 'Mme Aka', horodatageEntree: '27/07 08:05', dateSortiePrevue: '2026-07-28', statut: 'EN_RETARD' },
  { id: 'p4', entreprise: 'Élec-Plus', designation: 'Enrouleur de câble', quantite: 3, unite: 'u', agent: 'M. Koné', horodatageEntree: '26/07 07:55', dateSortiePrevue: '2026-07-27', statut: 'EN_RETARD' },
  { id: 'p5', entreprise: 'Toiture Plus', designation: 'Chalumeau + bouteille', quantite: 1, unite: 'lot', agent: 'M. Diaby', horodatageEntree: '28/07 09:20', dateSortiePrevue: '2026-07-28', statut: 'SORTI' },
  { id: 'p6', entreprise: 'Bâti-Sud', designation: 'Compresseur (prêt journée)', quantite: 1, unite: 'u', agent: 'M. Koné', horodatageEntree: '29/07 06:58', dateSortiePrevue: '2026-07-29', statut: 'SUR_SITE' },
];

export const UNITES = ['u', 'lot', 'm', 'kg', 'L'];
