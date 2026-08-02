/** Données mock du module M16 — main courante et incidents. */

export type TypeEntree = 'EVENEMENT' | 'INCIDENT';
export type Gravite = 'MINEUR' | 'MAJEUR';
export type StatutIncident = 'OUVERT' | 'CLOS';
export type Categorie = 'PRISE_POSTE' | 'RONDE' | 'FORCAGE' | 'REFUS' | 'RETENUE' | 'VISITEUR' | 'CLE' | 'AUTRE';

export interface Entree {
  id: string;
  numero?: string; // INC-2026-0NN pour les incidents
  horodatage: string;
  agent: string;
  type: TypeEntree;
  categorie: Categorie;
  titre: string;
  description: string;
  photo: boolean;
  gravite?: Gravite;
  statut?: StatutIncident;
  /** Rapport détaillé. */
  circonstances?: string;
  mesures?: string;
  suites?: string;
}

export const CATEGORIE_LABEL: Record<Categorie, string> = {
  PRISE_POSTE: 'Prise de poste',
  RONDE: 'Ronde',
  FORCAGE: 'Forçage d’accès',
  REFUS: 'Refus consigné',
  RETENUE: 'Retenue de matériel',
  VISITEUR: 'Visiteur',
  CLE: 'Clé',
  AUTRE: 'Autre',
};

export const MAIN_COURANTE_INIT: Entree[] = [
  { id: 'e1', horodatage: '31/07 06:30', agent: 'M. Koné', type: 'EVENEMENT', categorie: 'PRISE_POSTE', titre: 'Prise de poste', description: 'Relève effectuée. Matériel du poste vérifié (tablette, batterie, radio). RAS.', photo: false },
  { id: 'e2', numero: 'INC-2026-014', horodatage: '31/07 07:08', agent: 'M. Koné', type: 'INCIDENT', categorie: 'FORCAGE', titre: 'Forçage d’accès — hors liste', description: 'KOUADIO I. (Bâti-Sud) forcé à l’entrée, absent de la liste du jour.', photo: true, gravite: 'MINEUR', statut: 'CLOS', circonstances: 'Ouvrier présenté à 07:08, non déclaré sur la liste journalière de Bâti-Sud.', mesures: 'Accès forcé sur autorisation verbale du chef de poste, photo prise.', suites: 'Référent Bâti-Sud informé, régularisation de la liste demandée.' },
  { id: 'e3', horodatage: '31/07 07:22', agent: 'M. Diaby', type: 'EVENEMENT', categorie: 'RONDE', titre: 'Ronde galerie & magasins', description: 'Périmètre galerie et magasins de stockage contrôlé. RAS.', photo: false },
  { id: 'e4', numero: 'INC-2026-015', horodatage: '31/07 08:15', agent: 'M. Koné', type: 'INCIDENT', categorie: 'RETENUE', titre: 'Sortie matériel non couverte — retenue', description: 'Tentative de sortie de 12 bacs acier sans autorisation ni dotation. Matériel retenu.', photo: true, gravite: 'MAJEUR', statut: 'OUVERT', circonstances: 'Toiture Plus présente 12 bacs acier à la sortie, ni autorisation approuvée ni dotation présente pour la famille (règle R1).', mesures: 'Sortie refusée, matériel retenu au poste, photos prises, chef de poste alerté.', suites: 'Consignation en attente d’arbitrage direction / entreprise.' },
  { id: 'e5', numero: 'INC-2026-016', horodatage: '31/07 09:10', agent: 'M. Diaby', type: 'INCIDENT', categorie: 'VISITEUR', titre: 'Visiteur non accompagné', description: 'Visiteur bureau de contrôle circulant seul en galerie.', photo: false, gravite: 'MINEUR', statut: 'OUVERT', circonstances: 'Visiteur VIS-...006 aperçu sans son accompagnateur désigné.', mesures: 'Visiteur raccompagné, accompagnateur (Pilote OPC) rappelé à ses obligations.', suites: 'Surveillance renforcée jusqu’à sortie.' },
  { id: 'e6', horodatage: '31/07 09:40', agent: 'M. Koné', type: 'EVENEMENT', categorie: 'CLE', titre: 'Remise clé magasin sensible', description: 'Clé magasin stockage sensible remise à M. Sanou (magasinier) contre émargement.', photo: false },
];
