/** Modèle par personas (groupes d'acteurs) — chaque groupe a son espace : dashboard + modules propres.
 *  Le commun est factorisé : les écrans-modules sont partagés, seule la composition (dashboard + sous-ensemble
 *  de modules + mode d'accès) change par persona. L'entité (entreprise, preneur…) est découplée du référent :
 *  changer de référent régénère le lien d'accès, les données de l'entité demeurent. */

export type ModeAcces = 'INTERNE' | 'LIEN';

export interface KpiEspace { label: string; valeur: string; ton: 'forest' | 'amber' | 'danger' | 'plain' }
export interface ModuleEspace { code: string; nom: string; vue: string }

export interface Persona {
  id: string;
  nom: string;
  sousTitre: string;
  hex: string;
  acces: ModeAcces;
  /** Qui crée l'accès de ce groupe. */
  invitePar: string | null;
  fonctionnalites: string[];
  kpis: KpiEspace[];
  modules: ModuleEspace[];
  /** Ce groupe porte-t-il lui-même des sous-groupes (sa propre MOE + entreprises) ? */
  sousGroupes?: string;
}

export const PERSONAS: Persona[] = [
  {
    id: 'moa',
    nom: 'Maîtrise d’ouvrage',
    sousTitre: 'Propriétaire du site et de l’application · administrateur',
    hex: '#0F5044',
    acces: 'INTERNE',
    invitePar: null,
    fonctionnalites: [
      'Administre l’organisation et le site',
      'Invite les référents de chaque groupe',
      'Renseigne les conditions préalables (bail, BEFA, encaissements…)',
      'Approuve en dernier ressort les habilitations',
      'Paramètre le profil du site et les circuits',
      'Consulte le journal d’audit et supervise',
    ],
    kpis: [
      { label: 'Présents sur site', valeur: '342', ton: 'forest' },
      { label: 'Entreprises actives', valeur: '4', ton: 'plain' },
      { label: 'Conditions manquantes', valeur: '3', ton: 'amber' },
      { label: 'Incidents majeurs', valeur: '1', ton: 'danger' },
    ],
    modules: [
      { code: 'M15', nom: 'Tableau de bord', vue: 'tableau' },
      { code: 'M1/M2', nom: 'Entreprises & donneurs d’ordre', vue: 'entreprises' },
      { code: 'M18', nom: 'Administration & invitations', vue: 'admin' },
      { code: 'M19', nom: 'Profil de site', vue: 'parametrage' },
      { code: 'M6', nom: 'Registres & exports', vue: 'registres' },
      { code: 'M20', nom: 'Supervision (éditeur)', vue: 'editeur' },
    ],
  },
  {
    id: 'moe',
    nom: 'Maîtrise d’œuvre',
    sousTitre: 'Autorité opérationnelle · visa et approbation d’exécution',
    hex: '#2E7C68',
    acces: 'INTERNE',
    invitePar: 'Maîtrise d’ouvrage',
    fonctionnalites: [
      'Vise les habilitations d’entreprises',
      'Vise et approuve les sorties de matériel',
      'Suit les effectifs et le rapprochement matière',
      'Coordonne les créneaux de livraison',
    ],
    kpis: [
      { label: 'Habilitations à viser', valeur: '2', ton: 'amber' },
      { label: 'Écart déclaré / entré', valeur: '4', ton: 'amber' },
      { label: 'Sorties en attente', valeur: '4', ton: 'plain' },
      { label: 'Références en écart', valeur: '4', ton: 'danger' },
    ],
    modules: [
      { code: 'M15', nom: 'Tableau de bord', vue: 'tableau' },
      { code: 'M1', nom: 'Habilitations (visa)', vue: 'entreprises' },
      { code: 'M9', nom: 'Sorties matière (visa)', vue: 'materiel' },
      { code: 'M4', nom: 'Listes — suivi', vue: 'listes' },
      { code: 'M6', nom: 'Registres', vue: 'registres' },
    ],
  },
  {
    id: 'securite',
    nom: 'Entreprise de sécurité',
    sousTitre: 'Exploitation des postes · chef de poste et agents',
    hex: '#0A2E28',
    acces: 'INTERNE',
    invitePar: 'Maîtrise d’ouvrage',
    fonctionnalites: [
      'Contrôle des passages au poste (entrée / sortie)',
      'Contrôle des sorties de matière (règle de sortie unique)',
      'Délivre et restitue les badges',
      'Tient la main courante et le registre des clés',
    ],
    kpis: [
      { label: 'Présents sur site', valeur: '342', ton: 'forest' },
      { label: 'Refus (24 h)', valeur: '8', ton: 'danger' },
      { label: 'Forçages (24 h)', valeur: '2', ton: 'amber' },
      { label: 'Badges non restitués', valeur: '5', ton: 'amber' },
    ],
    modules: [
      { code: 'M5/M10', nom: 'Poste de contrôle', vue: 'poste' },
      { code: 'M3', nom: 'Badges', vue: 'badges' },
      { code: 'M16', nom: 'Main courante', vue: 'maincourante' },
      { code: 'M17', nom: 'Clés', vue: 'cles' },
      { code: 'M4', nom: 'Listes — suivi', vue: 'listes' },
      { code: 'M6', nom: 'Registres', vue: 'registres' },
    ],
  },
  {
    id: 'entreprises',
    nom: 'Entreprises tous corps d’état',
    sousTitre: 'Entreprises de construction · accès par lien, sans compte',
    hex: '#C08A2A',
    acces: 'LIEN',
    invitePar: 'Maîtrise d’ouvrage',
    fonctionnalites: [
      'Complète sa fiche entreprise et déclare ses sous-traitants',
      'Déclare son personnel et ses badges',
      'Dépose la liste journalière',
      'Déclare son matériel et demande les sorties',
      'Dépose les préavis de livraison',
    ],
    kpis: [
      { label: 'Personnel déclaré', valeur: '11', ton: 'forest' },
      { label: 'Liste du jour', valeur: 'déposée', ton: 'forest' },
      { label: 'Matériel déclaré', valeur: '3', ton: 'plain' },
      { label: 'Sorties demandées', valeur: '1', ton: 'amber' },
    ],
    modules: [
      { code: 'R5', nom: 'Portail référent', vue: 'referent' },
    ],
  },
  {
    id: 'preneurs',
    nom: 'Preneurs',
    sousTitre: 'Locataires de cellule · avec leur propre MOE et entreprises',
    hex: '#6F7C75',
    acces: 'LIEN',
    invitePar: 'Maîtrise d’ouvrage',
    sousGroupes: 'Chaque preneur porte sa propre maîtrise d’œuvre et ses entreprises d’aménagement.',
    fonctionnalites: [
      'Gère l’aménagement de sa cellule (emprise)',
      'Invite sa propre maîtrise d’œuvre et ses entreprises',
      'Suit ses conditions préalables (bail, BEFA, forfait…)',
      'Voit l’état d’accès de sa cellule',
    ],
    kpis: [
      { label: 'Aménageurs', valeur: '1', ton: 'plain' },
      { label: 'Conditions levées', valeur: '4/6', ton: 'amber' },
      { label: 'Accès cellule', valeur: 'bloqué', ton: 'danger' },
      { label: 'Effectif cellule', valeur: '6', ton: 'forest' },
    ],
    modules: [
      { code: 'R5', nom: 'Portail preneur', vue: 'referent' },
      { code: 'M2', nom: 'Conditions de la cellule', vue: 'entreprises' },
    ],
  },
];

/** Modules communs, factorisés et réutilisés par plusieurs espaces (la même brique, composée différemment). */
export const MODULES_PARTAGES = [
  'Tableau de bord (M15)', 'Registres & exports (M6)', 'Habilitations (M1/M2)',
  'Poste de contrôle (M5/M10)', 'Badges (M3)', 'Listes journalières (M4)', 'Matériel (M7–M14)',
];
