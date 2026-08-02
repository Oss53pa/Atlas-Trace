/** Données mock du module M18 — administration, audit & mode dégradé. */

export type StatutUtilisateur = 'ACTIF' | 'SUSPENDU';
export type StatutLien = 'ACTIF' | 'REVOQUE';

export interface Utilisateur {
  id: string;
  nom: string;
  contact: string;
  role: string;
  suppleant?: string;
  statut: StatutUtilisateur;
  dernierAcces: string;
}

export interface LienExterne {
  id: string;
  entreprise: string;
  referent: string;
  jeton: string;
  statut: StatutLien;
  cree: string;
}

export interface EvenementAudit {
  id: string;
  horodatage: string;
  utilisateur: string;
  action: string;
  entite: string;
  avant?: string;
  apres?: string;
  appareil: string;
}

export interface Rattrapage {
  id: string;
  horodatage: string;
  description: string;
  agent: string;
  valide: boolean;
}

export const UTILISATEURS: Utilisateur[] = [
  { id: 'u1', nom: 'Mme Aka', contact: 'aka@newheaven.ci', role: 'Direction du site', statut: 'ACTIF', dernierAcces: '31/07 09:20' },
  { id: 'u2', nom: 'M. Bamba', contact: 'bamba@newheaven.ci', role: 'Directeur de la Construction', suppleant: 'M. Koffi', statut: 'ACTIF', dernierAcces: '31/07 09:32' },
  { id: 'u3', nom: 'M. Diby', contact: 'diby@hse.ci', role: 'HSE Officer', statut: 'ACTIF', dernierAcces: '31/07 08:14' },
  { id: 'u4', nom: 'M. Yao', contact: 'yao@opc.ci', role: 'Pilote OPC', statut: 'ACTIF', dernierAcces: '30/07 17:40' },
  { id: 'u5', nom: 'M. Koné', contact: '+225 07 00 00 01', role: 'Chef de poste', statut: 'ACTIF', dernierAcces: '31/07 09:50' },
  { id: 'u6', nom: 'M. Diaby', contact: '+225 07 00 00 02', role: 'Agent de contrôle', statut: 'ACTIF', dernierAcces: '31/07 09:22' },
  { id: 'u7', nom: 'Mme Sow', contact: '+225 07 00 00 03', role: 'Agent de contrôle', statut: 'SUSPENDU', dernierAcces: '24/07 18:10' },
];

export const LIENS_EXTERNES: LienExterne[] = [
  { id: 'l1', entreprise: 'Bâti-Sud', referent: 'M. Traoré', jeton: 'a1b2c3d4e5', statut: 'ACTIF', cree: '12/06/2026' },
  { id: 'l2', entreprise: 'Aménag-Preneur K', referent: 'Mme Kablan', jeton: 'f6g7h8i9j0', statut: 'ACTIF', cree: '20/06/2026' },
  { id: 'l3', entreprise: 'Élec-Plus', referent: 'M. Sylla', jeton: 'k1l2m3n4o5', statut: 'ACTIF', cree: '01/07/2026' },
  { id: 'l4', entreprise: 'Froid & Clim', referent: 'M. Bakayoko', jeton: 'p6q7r8s9t0', statut: 'ACTIF', cree: '05/07/2026' },
];

export const AUDIT: EvenementAudit[] = [
  { id: 'a1', horodatage: '31/07 09:32', utilisateur: 'M. Bamba', action: 'APPROBATION', entite: 'Habilitation · Toiture Plus', avant: 'EN_VALIDATION', apres: 'ACTIVE', appareil: 'Tablette poste · 10.0.2.15' },
  { id: 'a2', horodatage: '31/07 09:20', utilisateur: 'Mme Aka', action: 'LEVÉE CONDITION', entite: 'Preneur · Boutique X', avant: 'Bloqué', apres: 'Autorisé', appareil: 'Poste direction · 10.0.2.4' },
  { id: 'a3', horodatage: '31/07 08:50', utilisateur: 'M. Bamba', action: 'MODIFICATION', entite: 'Fiche entreprise · Bâti-Sud', avant: 'Assurance éch. 31/12/2026', apres: 'Assurance éch. 15/01/2027', appareil: 'Poste direction · 10.0.2.4' },
  { id: 'a4', horodatage: '31/07 08:14', utilisateur: 'M. Bamba', action: 'APPROBATION SORTIE', entite: 'AS-2026-00185', avant: 'VISA', apres: 'APPROUVÉE · code généré', appareil: 'Mobile · 10.0.2.31' },
  { id: 'a5', horodatage: '31/07 07:08', utilisateur: 'M. Koné', action: 'FORÇAGE ACCÈS', entite: 'Personne · Kouadio I.', avant: 'REFUSÉ (hors plage)', apres: 'FORCÉ', appareil: 'Tablette poste · 10.0.2.15' },
  { id: 'a6', horodatage: '31/07 07:03', utilisateur: 'M. Diby', action: 'SUSPENSION BADGE', entite: 'Badge · NOM-00110', avant: 'ACTIF', apres: 'SUSPENDU', appareil: 'Poste HSE · 10.0.2.9' },
];

export const ACTIONS_AUDIT = ['Toutes', 'APPROBATION', 'MODIFICATION', 'FORÇAGE ACCÈS', 'SUSPENSION BADGE', 'LEVÉE CONDITION', 'APPROBATION SORTIE', 'RÉVOCATION LIEN'];

export const PROCEDURE_DEGRADE = [
  'Basculer sur le registre papier de secours affiché au poste.',
  'Vérifier chaque badge visuellement : photo, nom, entreprise.',
  'Consigner chaque passage sur le registre : nom, entreprise, sens, heure.',
  'Retenir les pièces d’identité pour les badges temporaires comme en temps normal.',
  'Prévenir le chef de poste et noter l’heure de début de panne.',
  'À la reprise, saisir les mouvements papier en « rattrapage » (non modifiable après validation).',
];
