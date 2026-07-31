/** Données mock du module M20 — back office éditeur (Atlas Studio). */

export type StatutSite = 'ACTIF' | 'EN_SERVICE' | 'CONFIGURATION';
export type StatutAbonnement = 'ACTIF' | 'ESSAI' | 'IMPAYE';
export type Hebergement = 'Mutualisé' | 'Dédié';

export interface SiteEditeur {
  nom: string;
  statut: StatutSite;
}

export interface Organisation {
  id: string;
  nom: string;
  pays: string;
  hebergement: Hebergement;
  sites: SiteEditeur[];
  badgesActifs: number;
  controles30j: number;
}

export interface Abonnement {
  organisationId: string;
  organisation: string;
  palier: string;
  badgesQuota: number;
  badgesActifs: number;
  statut: StatutAbonnement;
  prochaineEcheance: string;
  mrr: number; // en milliers de FCFA / mois
}

export interface AccesSupport {
  id: string;
  collaborateur: string;
  organisation: string;
  motif: string;
  date: string;
  duree: string;
}

export const ORGANISATIONS: Organisation[] = [
  { id: 'o1', nom: 'New Heaven SA', pays: 'Côte d’Ivoire', hebergement: 'Mutualisé', sites: [{ nom: 'Chantier Cosmos Angré', statut: 'ACTIF' }], badgesActifs: 342, controles30j: 12480 },
  { id: 'o2', nom: 'Sahel Mines SA', pays: 'Burkina Faso', hebergement: 'Dédié', sites: [{ nom: 'Mine de Kalsaka', statut: 'ACTIF' }, { nom: 'Base logistique Ouaga', statut: 'EN_SERVICE' }], badgesActifs: 890, controles30j: 41200 },
  { id: 'o3', nom: 'Port Atlantique CI', pays: 'Côte d’Ivoire', hebergement: 'Mutualisé', sites: [{ nom: 'Terminal 3', statut: 'EN_SERVICE' }, { nom: 'Zone logistique Sud', statut: 'CONFIGURATION' }], badgesActifs: 210, controles30j: 6050 },
];

export const ABONNEMENTS: Abonnement[] = [
  { organisationId: 'o1', organisation: 'New Heaven SA', palier: '500 badges', badgesQuota: 500, badgesActifs: 342, statut: 'ACTIF', prochaineEcheance: '01/08/2026', mrr: 850 },
  { organisationId: 'o2', organisation: 'Sahel Mines SA', palier: '1000 badges · dédié', badgesQuota: 1000, badgesActifs: 890, statut: 'ACTIF', prochaineEcheance: '15/08/2026', mrr: 2400 },
  { organisationId: 'o3', organisation: 'Port Atlantique CI', palier: '250 badges', badgesQuota: 250, badgesActifs: 210, statut: 'ESSAI', prochaineEcheance: '10/08/2026', mrr: 0 },
];

export const ACCES_SUPPORT_INIT: AccesSupport[] = [
  { id: 's0', collaborateur: 'A. Koffi (support Atlas Studio)', organisation: 'New Heaven SA', motif: 'Assistance impression du premier lot de badges', date: '28/07 14:05', duree: '22 min' },
  { id: 's1', collaborateur: 'M. Diallo (support Atlas Studio)', organisation: 'Sahel Mines SA', motif: 'Diagnostic synchronisation hors ligne poste 2', date: '29/07 09:30', duree: '38 min' },
];

export const COLLABORATEURS_EDITEUR = [
  'A. Koffi (support Atlas Studio)',
  'M. Diallo (support Atlas Studio)',
  'S. Bamba (intégration Atlas Studio)',
];
