/** Données mock du module M19 — paramétrage & modèles sectoriels. */

/** Pouvoirs atomiques (chap. 6.1). Le code ne connaît que ces droits ; les rôles les composent. */
export const POUVOIRS: { code: string; effet: string }[] = [
  { code: 'DECLARER_ENTREPRISE', effet: 'Créer et modifier une fiche entreprise' },
  { code: 'VISER_HABILITATION', effet: 'Viser un dossier d’entreprise ou de personne' },
  { code: 'APPROUVER_HABILITATION', effet: 'Approuver définitivement une habilitation' },
  { code: 'GERER_CONDITIONS_BLOQUANTES', effet: 'Renseigner les conditions préalables d’un preneur' },
  { code: 'DECLARER_PERSONNEL', effet: 'Déclarer des personnes et leurs photos' },
  { code: 'DEPOSER_LISTE', effet: 'Alimenter le registre de présence' },
  { code: 'DELIVRER_BADGE', effet: 'Imprimer un badge, attribuer un badge temporaire' },
  { code: 'SUSPENDRE_ACCES', effet: 'Suspendre une personne, une entreprise, un véhicule' },
  { code: 'CONTROLER_AU_POSTE', effet: 'Scanner, autoriser, refuser, enregistrer un contrôle physique' },
  { code: 'FORCER_ACCES', effet: 'Autoriser malgré un refus du système' },
  { code: 'CLOTURER_JOURNEE', effet: 'Déclencher ou ajuster la clôture de journée' },
  { code: 'SUIVRE_INCIDENTS', effet: 'Compléter et clôturer un rapport d’incident' },
  { code: 'DECLARER_MATERIEL', effet: 'Déclarer du matériel' },
  { code: 'DEMANDER_SORTIE', effet: 'Créer une demande de sortie de matériel' },
  { code: 'VISER_SORTIE', effet: 'Viser une demande de sortie' },
  { code: 'APPROUVER_SORTIE', effet: 'Approuver une sortie (génère le code)' },
  { code: 'DEMANDER_LIVRAISON', effet: 'Déposer un préavis' },
  { code: 'VALIDER_CRENEAU', effet: 'Attribuer ou refuser un créneau de livraison' },
  { code: 'RECEPTIONNER', effet: 'Accuser la prise en charge d’une livraison' },
  { code: 'AUTORISER_EVACUATION', effet: 'Autoriser une évacuation de déblais' },
  { code: 'CONSULTER_TABLEAU', effet: 'Accéder au tableau de bord du site' },
  { code: 'EXPORTER', effet: 'Produire les registres' },
  { code: 'CONSULTER_AUDIT', effet: 'Accéder au journal d’audit' },
  { code: 'ADMINISTRER_ORGANISATION', effet: 'Créer des sites, des rôles, des utilisateurs' },
];

export type NatureEtape = 'VISA' | 'APPROBATION';
export interface EtapeCircuit {
  ordre: number;
  role: string;
  nature: NatureEtape;
  effetFinal: boolean;
}
export interface Circuit {
  id: string;
  objet: string;
  etapes: EtapeCircuit[];
  version: number;
}

export const CIRCUITS: Circuit[] = [
  { id: 'hab', objet: 'Habilitation entreprise', version: 3, etapes: [
    { ordre: 1, role: 'Référent entreprise', nature: 'VISA', effetFinal: false },
    { ordre: 2, role: 'Responsable HSE', nature: 'VISA', effetFinal: false },
    { ordre: 3, role: 'Directeur de la Construction', nature: 'APPROBATION', effetFinal: true },
  ] },
  { id: 'sortie', objet: 'Sortie de matériel', version: 2, etapes: [
    { ordre: 1, role: 'Référent entreprise', nature: 'VISA', effetFinal: false },
    { ordre: 2, role: 'Responsable HSE', nature: 'VISA', effetFinal: false },
    { ordre: 3, role: 'Directeur de la Construction', nature: 'APPROBATION', effetFinal: true },
  ] },
  { id: 'livraison', objet: 'Préavis de livraison', version: 1, etapes: [
    { ordre: 1, role: 'Référent entreprise', nature: 'VISA', effetFinal: false },
    { ordre: 2, role: 'Pilote de coordination', nature: 'APPROBATION', effetFinal: true },
  ] },
];

export interface Referentiel {
  cle: string;
  libelle: string;
  portee: 'Site' | 'Organisation';
  valeurs: string[];
}

export const REFERENTIELS: Referentiel[] = [
  { cle: 'zones', libelle: 'Zones', portee: 'Site', valeurs: ['Abords & poste', 'Circulation & base vie', 'Travaux', 'Galerie & cellules', 'Magasins & stockage sensible', 'Locaux techniques'] },
  { cle: 'motifs', libelle: 'Motifs de refus', portee: 'Organisation', valeurs: ['Badge inconnu', 'Badge expiré', 'Badge suspendu', 'Entité suspendue', 'Preneur bloqué', 'Personne suspendue', 'Déjà entré', 'Hors nœud autorisé', 'Hors plage horaire', 'Induction expirée', 'Photographie manquante'] },
  { cle: 'materiel', libelle: 'Catégories de matériel à déclaration obligatoire', portee: 'Site', valeurs: ['Électroportatif', 'Appareils de mesure', 'Câbles & cuivre', 'Échafaudages', 'Carburants'] },
  { cle: 'sensibles', libelle: 'Familles sensibles — photo obligatoire & tirage renforcé', portee: 'Site', valeurs: ['Câble cuivre', 'Carrelage', 'Robinetterie', 'Luminaires', 'Outillage électroportatif', 'Carburant', 'Ferraille'] },
];

export interface BadgeCategorieConf {
  libelle: string;
  hex: string;
}
export const BADGE_CATEGORIES_CONF: BadgeCategorieConf[] = [
  { libelle: 'Chantier', hex: '#0F5044' },
  { libelle: 'Aménagement preneur', hex: '#C08A2A' },
  { libelle: 'Visiteur', hex: '#6F7C75' },
  { libelle: 'Personnel propre', hex: '#0A362E' },
];

export const PARAMETRES_SCALAIRES = [
  { cle: 'Plage d’accès', valeur: '06:30 – 18:30' },
  { cle: 'Heure limite dépôt des listes', valeur: '07:30' },
  { cle: 'Validité d’une autorisation de sortie', valeur: '24 heures' },
  { cle: 'Taux de contrôle inopiné des évacuations', valeur: '1 sur 5' },
  { cle: 'Rétention locale hors ligne', valeur: '72 heures' },
];
