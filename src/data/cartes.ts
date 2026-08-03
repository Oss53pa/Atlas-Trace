/** CDC-003 — Modèle à trois axes (Entité / Rôle / Portée) + catalogue de cartes (R16).
 *  Une carte existe en UN seul exemplaire, déclare le pouvoir et la portée qu'elle exige,
 *  et ouvre un écran-module partagé. Un profil = sélection ordonnée de cartes composée à l'exécution.
 *  Ajouter un acteur = composer un profil, jamais du développement (§8.4). */

export type Portee = 'ORGANISATION' | 'SITE' | 'EMPRISE' | 'POSTE' | 'ENTITE';
export type ModeAcces = 'INTERNE' | 'LIEN' | 'AUCUN';

export interface Carte {
  id: string;
  titre: string;
  pouvoir: string;
  portee: Portee | Portee[];
  /** Écran-module partagé ouvert par la carte. */
  vue: string;
}

/** §8.2 — le catalogue. Chaque carte est unique. */
export const CARTES: Carte[] = [
  { id: 'presence', titre: 'Présence en temps réel', pouvoir: 'CONSULTER_TABLEAU', portee: ['SITE', 'EMPRISE'], vue: 'tableau' },
  { id: 'ecarts', titre: 'Écarts effectif déclaré / entré', pouvoir: 'CONSULTER_TABLEAU', portee: ['SITE', 'EMPRISE'], vue: 'tableau' },
  { id: 'registres_jour', titre: 'Registres de présence du jour', pouvoir: 'DEPOSER_LISTE', portee: ['ENTITE', 'SITE', 'EMPRISE'], vue: 'listes' },
  { id: 'lignes_attente', titre: 'Lignes en attente de confirmation', pouvoir: 'DEPOSER_LISTE', portee: 'ENTITE', vue: 'referent' },
  { id: 'vivier', titre: 'Vivier de personnel', pouvoir: 'DECLARER_PERSONNEL', portee: 'ENTITE', vue: 'badges' },
  { id: 'demandes_badges', titre: 'Demandes de badges', pouvoir: 'DELIVRER_BADGE', portee: ['ENTITE', 'SITE'], vue: 'badges' },
  { id: 'poste', titre: 'Poste de contrôle', pouvoir: 'CONTROLER_AU_POSTE', portee: 'POSTE', vue: 'poste' },
  { id: 'badges_temp', titre: 'Badges temporaires & restitutions', pouvoir: 'DELIVRER_BADGE', portee: 'SITE', vue: 'badges' },
  { id: 'hab_visa', titre: 'Habilitations en attente de visa', pouvoir: 'VISER_HABILITATION', portee: ['SITE', 'EMPRISE'], vue: 'entreprises' },
  { id: 'hab_appro', titre: 'Habilitations en attente d’approbation', pouvoir: 'APPROUVER_HABILITATION', portee: ['SITE', 'EMPRISE'], vue: 'entreprises' },
  { id: 'conditions', titre: 'Conditions bloquantes', pouvoir: 'GERER_CONDITIONS_BLOQUANTES', portee: ['EMPRISE', 'SITE'], vue: 'entreprises' },
  { id: 'parc', titre: 'Parc matériel déclaré', pouvoir: 'DECLARER_MATERIEL', portee: ['ENTITE', 'SITE'], vue: 'materiel' },
  { id: 'materiel_retard', titre: 'Matériels ponctuels en retard', pouvoir: 'CONSULTER_TABLEAU', portee: 'SITE', vue: 'materiel' },
  { id: 'sortie_demande', titre: 'Demandes de sortie à créer', pouvoir: 'DEMANDER_SORTIE', portee: 'ENTITE', vue: 'materiel' },
  { id: 'sortie_visa', titre: 'Sorties en attente de visa', pouvoir: 'VISER_SORTIE', portee: ['SITE', 'EMPRISE'], vue: 'materiel' },
  { id: 'sortie_appro', titre: 'Sorties en attente d’approbation', pouvoir: 'APPROUVER_SORTIE', portee: ['SITE', 'EMPRISE'], vue: 'materiel' },
  { id: 'vehicules', titre: 'Véhicules & laissez-passer', pouvoir: 'CONTROLER_AU_POSTE', portee: ['ENTITE', 'SITE'], vue: 'materiel' },
  { id: 'anomalies_veh', titre: 'Anomalies véhicules', pouvoir: 'CONSULTER_TABLEAU', portee: 'SITE', vue: 'materiel' },
  { id: 'preavis', titre: 'Préavis de livraison', pouvoir: 'DEMANDER_LIVRAISON', portee: 'ENTITE', vue: 'materiel' },
  { id: 'creneaux', titre: 'Créneaux à valider', pouvoir: 'VALIDER_CRENEAU', portee: 'SITE', vue: 'materiel' },
  { id: 'prises_en_charge', titre: 'Prises en charge à effectuer', pouvoir: 'RECEPTIONNER', portee: ['SITE', 'EMPRISE'], vue: 'materiel' },
  { id: 'evacuations', titre: 'Autorisations d’évacuation', pouvoir: 'AUTORISER_EVACUATION', portee: 'SITE', vue: 'materiel' },
  { id: 'anomalies_flux', titre: 'Anomalies de flux', pouvoir: 'CONSULTER_TABLEAU', portee: 'SITE', vue: 'tableau' },
  { id: 'refus', titre: 'Refus & forçages', pouvoir: 'CONSULTER_TABLEAU', portee: 'SITE', vue: 'tableau' },
  { id: 'main_courante', titre: 'Main courante & incidents', pouvoir: 'CONSULTER_TABLEAU', portee: 'SITE', vue: 'maincourante' },
  { id: 'cles', titre: 'Clés & zones sensibles', pouvoir: 'DELIVRER_BADGE', portee: 'SITE', vue: 'cles' },
  { id: 'suivi_activations', titre: 'Suivi des activations', pouvoir: 'ADMINISTRER_ORGANISATION', portee: 'ORGANISATION', vue: 'admin' },
  { id: 'entites', titre: 'Entités & rattachements', pouvoir: 'ADMINISTRER_ORGANISATION', portee: 'ORGANISATION', vue: 'admin' },
  { id: 'exports', titre: 'Registres & exports', pouvoir: 'EXPORTER', portee: ['SITE', 'EMPRISE', 'ENTITE'], vue: 'registres' },
  { id: 'audit', titre: 'Journal d’audit', pouvoir: 'CONSULTER_AUDIT', portee: 'ORGANISATION', vue: 'admin' },
  { id: 'parametrage', titre: 'Paramétrage du site', pouvoir: 'ADMINISTRER_ORGANISATION', portee: 'SITE', vue: 'parametrage' },
  { id: 'qualite', titre: 'Indicateurs de qualité de gestion', pouvoir: 'CONSULTER_TABLEAU', portee: 'SITE', vue: 'tableau' },
  { id: 'fiche_entite', titre: 'Fiche de l’entité', pouvoir: 'DECLARER_ENTREPRISE', portee: 'ENTITE', vue: 'entreprises' },
];

export interface Profil {
  id: string;
  nom: string;
  typeEntite: string;
  portee: string;
  acces: ModeAcces;
  invitePar: string | null;
  /** Sélection ordonnée d'identifiants de cartes (§8.3). */
  cartes: string[];
  note?: string;
}

/** §8.3 — compositions par défaut (ajustables par le client). */
export const PROFILS: Profil[] = [
  { id: 'moa', nom: 'Maîtrise d’ouvrage', typeEntite: 'Maître d’ouvrage', portee: 'Organisation & site', acces: 'INTERNE', invitePar: null,
    cartes: ['presence', 'suivi_activations', 'entites', 'conditions', 'anomalies_flux', 'refus', 'qualite', 'exports', 'audit', 'parametrage'],
    note: 'Administratrice de son organisation et de ses sites — pas administratrice racine de l’application (§5.3).' },
  { id: 'moe', nom: 'Maîtrise d’œuvre', typeEntite: 'Maître d’œuvre', portee: 'Site', acces: 'INTERNE', invitePar: 'Maîtrise d’ouvrage',
    cartes: ['presence', 'hab_appro', 'sortie_appro', 'ecarts', 'materiel_retard', 'anomalies_veh', 'exports'] },
  { id: 'hse', nom: 'HSE', typeEntite: 'HSE', portee: 'Site', acces: 'INTERNE', invitePar: 'Maîtrise d’ouvrage',
    cartes: ['hab_visa', 'sortie_visa', 'parc', 'refus', 'main_courante', 'exports'],
    note: 'Rôle attribuable à n’importe quelle entité (salarié MOA, cabinet indépendant, service MOE) — §3.2.' },
  { id: 'gardiennage', nom: 'Prestataire de gardiennage', typeEntite: 'Prestataire de gardiennage', portee: 'Postes affectés', acces: 'INTERNE', invitePar: 'Maîtrise d’ouvrage',
    cartes: ['poste', 'badges_temp', 'registres_jour', 'main_courante', 'cles'],
    note: 'Aucune carte de matière ni d’export consolidé — minimisation des données (§5.1).' },
  { id: 'pilote', nom: 'Pilote de coordination', typeEntite: 'Pilote', portee: 'Site', acces: 'INTERNE', invitePar: 'Maîtrise d’ouvrage',
    cartes: ['creneaux', 'preavis', 'presence'] },
  { id: 'referent', nom: 'Entreprise d’exécution — référent', typeEntite: 'Entreprise d’exécution', portee: 'Entité (site ou lot)', acces: 'LIEN', invitePar: 'Maîtrise d’ouvrage',
    cartes: ['registres_jour', 'lignes_attente', 'vivier', 'demandes_badges', 'parc', 'sortie_demande', 'preavis'] },
  { id: 'representant', nom: 'Entreprise d’exécution — représentant', typeEntite: 'Entreprise d’exécution', portee: 'Entité', acces: 'LIEN', invitePar: 'Maîtrise d’ouvrage',
    cartes: ['fiche_entite', 'sortie_demande', 'exports'],
    note: 'Engage l’entité, désigne/révoque référent et adjoint. Notifications contractuelles bloquantes uniquement (§4.1).' },
  { id: 'donneur_ordre', nom: 'Preneur', typeEntite: 'Preneur', portee: 'Emprise', acces: 'LIEN', invitePar: 'Maîtrise d’ouvrage',
    cartes: ['conditions', 'entites', 'presence', 'sortie_visa', 'exports'],
    note: 'Traité par la portée « emprise », pas par une hiérarchie récursive (§3.3). Invite sa propre chaîne.' },
  { id: 'moe_preneur', nom: 'Maîtrise d’œuvre de preneur', typeEntite: 'Maître d’œuvre', portee: 'Emprise', acces: 'LIEN', invitePar: 'Preneur',
    cartes: ['presence', 'hab_visa', 'sortie_visa', 'ecarts', 'exports'],
    note: 'Mêmes cartes que la MOE, portée réduite à l’emprise — même code, filtré par la portée.' },
];

/** §4 — les trois fonctions d'accès par entité et par site (max, jamais un minimum). */
export const FONCTIONS_ACCES = [
  { code: 'REPRESENTANT', nom: 'Représentant', profil: 'Dirigeant / signataire, rarement sur site', notif: 'Contractuel & bloquant uniquement' },
  { code: 'REFERENT', nom: 'Référent', profil: 'Correspondant sécurité, présent au quotidien', notif: 'Flux quotidien' },
  { code: 'ADJOINT', nom: 'Adjoint', profil: 'Suppléant — pouvoirs identiques, actif en permanence', notif: 'Aucune (escalade seulement)' },
];

/** §3.5 — types d'entité livrés en standard (extensibles sans développement). */
export const TYPES_ENTITE = [
  'Maître d’ouvrage', 'Maître d’œuvre', 'HSE', 'Prestataire de gardiennage', 'Pilote de coordination',
  'Entreprise d’exécution', 'Preneur', 'Bureau de contrôle', 'Fournisseur', 'Visiteur',
];
