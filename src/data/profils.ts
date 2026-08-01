/** Profil de site paramétrique (refonte M19) — la configuration se pose par axes, pas par secteur. */

export type RegimeVisiteurs = 'AUCUN' | 'ESCORTE' | 'LIBRE';

/** Configuration structurelle d'un site. Chaque axe est posé explicitement. */
export interface AxesProfil {
  donneurOrdre: boolean;
  /** Libellé de l'entité preneur quand elle existe (maître d'ouvrage, client, exploitant, concédant…). */
  donneurOrdreLabel: string;
  /** 1 à 4 niveaux d'emprise, chacun librement nommé (du plus large au plus fin). */
  niveauxEmprise: string[];
  populationTournante: boolean;
  fluxMatiereSortant: boolean;
  materielEntrant: boolean;
  vehiculesLivraisons: boolean;
  visiteurs: RegimeVisiteurs;
  personnelPropre: boolean;
}

export interface RoleProfil {
  nom: string;
  /** Site entier, une emprise, ou une entreprise. */
  perimetre: 'Site' | 'Emprise' | 'Entreprise';
}

export interface EtapeValidation {
  role: string;
  perimetre: 'Site' | 'Emprise' | 'Entreprise';
}
export interface ChaineValidation {
  objet: string;
  etapes: EtapeValidation[];
}

/** Trois axes indépendants de qualification d'un intervenant (jamais une étiquette composite). */
export interface AxesQualification {
  lienContractuel: string[];
  regimeAcces: string[];
}

export interface Prereglage {
  id: string;
  nom: string;
  description: string;
  axes: AxesProfil;
  qualification: AxesQualification;
  roles: RoleProfil[];
  chaines: ChaineValidation[];
  resteAFaire: string[];
}

export const PROFIL_VIERGE: AxesProfil = {
  donneurOrdre: false,
  donneurOrdreLabel: 'Preneur',
  niveauxEmprise: ['Site'],
  populationTournante: false,
  fluxMatiereSortant: false,
  materielEntrant: false,
  vehiculesLivraisons: false,
  visiteurs: 'AUCUN',
  personnelPropre: false,
};

export const PREREGLAGES: Prereglage[] = [
  {
    id: 'chantier',
    nom: 'Chantier avec preneurs et cellules',
    description: 'Chantier de centre commercial : maître d’ouvrage, preneurs, cellules à aménager, rotation journalière.',
    axes: {
      donneurOrdre: true,
      donneurOrdreLabel: 'Maître d’ouvrage',
      niveauxEmprise: ['Site', 'Bâtiment', 'Cellule commerciale'],
      populationTournante: true,
      fluxMatiereSortant: true,
      materielEntrant: true,
      vehiculesLivraisons: true,
      visiteurs: 'ESCORTE',
      personnelPropre: false,
    },
    qualification: {
      lienContractuel: ['Entreprise contractante', 'Sous-traitant', 'Preneur', 'Entreprise d’aménagement de preneur', 'Prestataire ponctuel'],
      regimeAcces: ['Permanent (badge nominatif)', 'Temporaire journalier', 'Visiteur escorté'],
    },
    roles: [
      { nom: 'Référent entreprise', perimetre: 'Entreprise' },
      { nom: 'HSE Officer', perimetre: 'Site' },
      { nom: 'Directeur de chantier', perimetre: 'Site' },
      { nom: 'Pilote de coordination', perimetre: 'Site' },
      { nom: 'Chef de poste', perimetre: 'Site' },
      { nom: 'Agent de contrôle', perimetre: 'Emprise' },
      { nom: 'Direction du site', perimetre: 'Site' },
    ],
    chaines: [
      { objet: 'Habilitation d’entreprise', etapes: [{ role: 'Référent entreprise', perimetre: 'Entreprise' }, { role: 'HSE Officer', perimetre: 'Site' }, { role: 'Directeur de chantier', perimetre: 'Site' }] },
      { objet: 'Sortie de matériel', etapes: [{ role: 'Référent entreprise', perimetre: 'Entreprise' }, { role: 'HSE Officer', perimetre: 'Site' }, { role: 'Directeur de chantier', perimetre: 'Site' }] },
    ],
    resteAFaire: ['Importer les entreprises intervenantes', 'Désigner les référents et envoyer les liens', 'Créer les cellules réelles du bâtiment', 'Renseigner les conditions du maître d’ouvrage', 'Générer et imprimer le premier lot de badges'],
  },
  {
    id: 'industriel',
    nom: 'Site industriel ou minier en exploitation',
    description: 'Site en exploitation avec magasin central, personnel propre et rotations postées.',
    axes: {
      donneurOrdre: false,
      donneurOrdreLabel: 'Preneur',
      niveauxEmprise: ['Site', 'Secteur'],
      populationTournante: true,
      fluxMatiereSortant: true,
      materielEntrant: true,
      vehiculesLivraisons: true,
      visiteurs: 'ESCORTE',
      personnelPropre: true,
    },
    qualification: {
      lienContractuel: ['Personnel propre', 'Entreprise contractante', 'Sous-traitant', 'Prestataire ponctuel'],
      regimeAcces: ['Permanent (badge nominatif)', 'Temporaire journalier', 'Visiteur escorté'],
    },
    roles: [
      { nom: 'Référent contractant', perimetre: 'Entreprise' },
      { nom: 'Magasinier', perimetre: 'Site' },
      { nom: 'Responsable HSE', perimetre: 'Site' },
      { nom: 'Responsable d’exploitation', perimetre: 'Site' },
      { nom: 'Chef de poste', perimetre: 'Site' },
      { nom: 'Agent de contrôle', perimetre: 'Emprise' },
      { nom: 'Direction du site', perimetre: 'Site' },
    ],
    chaines: [
      { objet: 'Habilitation d’entreprise', etapes: [{ role: 'Référent contractant', perimetre: 'Entreprise' }, { role: 'Magasinier', perimetre: 'Site' }, { role: 'Responsable HSE', perimetre: 'Site' }] },
      { objet: 'Sortie de matériel', etapes: [{ role: 'Référent contractant', perimetre: 'Entreprise' }, { role: 'Magasinier', perimetre: 'Site' }, { role: 'Responsable d’exploitation', perimetre: 'Site' }] },
    ],
    resteAFaire: ['Importer les entreprises contractantes', 'Déclarer le personnel propre', 'Créer les secteurs réels', 'Paramétrer les vacations postées', 'Générer et imprimer les badges'],
  },
  {
    id: 'portuaire',
    nom: 'Plateforme portuaire ou logistique',
    description: 'Terminal concédé : concédant, découpage quai / poste, forte activité véhicules, manutention.',
    axes: {
      donneurOrdre: true,
      donneurOrdreLabel: 'Concédant',
      niveauxEmprise: ['Site', 'Quai', 'Poste'],
      populationTournante: true,
      fluxMatiereSortant: false,
      materielEntrant: false,
      vehiculesLivraisons: true,
      visiteurs: 'ESCORTE',
      personnelPropre: true,
    },
    qualification: {
      lienContractuel: ['Personnel propre', 'Manutentionnaire', 'Transporteur', 'Agent maritime', 'Prestataire ponctuel'],
      regimeAcces: ['Permanent (badge nominatif)', 'Temporaire journalier', 'Visiteur escorté', 'Visiteur libre'],
    },
    roles: [
      { nom: 'Référent transporteur', perimetre: 'Entreprise' },
      { nom: 'Chef de terminal', perimetre: 'Site' },
      { nom: 'Responsable sûreté', perimetre: 'Site' },
      { nom: 'Chef de quai', perimetre: 'Emprise' },
      { nom: 'Chef de poste', perimetre: 'Site' },
      { nom: 'Agent de contrôle', perimetre: 'Emprise' },
      { nom: 'Direction du site', perimetre: 'Site' },
    ],
    chaines: [
      { objet: 'Habilitation d’entreprise', etapes: [{ role: 'Référent transporteur', perimetre: 'Entreprise' }, { role: 'Responsable sûreté', perimetre: 'Site' }, { role: 'Chef de terminal', perimetre: 'Site' }] },
      { objet: 'Laissez-passer véhicule', etapes: [{ role: 'Référent transporteur', perimetre: 'Entreprise' }, { role: 'Chef de quai', perimetre: 'Emprise' }] },
    ],
    resteAFaire: ['Importer les transporteurs et agents maritimes', 'Déclarer le personnel propre', 'Créer les quais et postes réels', 'Renseigner les conditions du concédant', 'Générer et imprimer les badges'],
  },
];

/** Effet affiché en temps réel pour chaque axe de l'assistant. */
export const EFFET_AXE = {
  donneurOrdreOn: 'Entité « preneur » activée, entreprises rattachables, conditions préalables gérées.',
  donneurOrdreOff: 'Pas d’entité intermédiaire : les conditions préalables portent directement sur l’entreprise.',
  tournanteOn: 'Vacations et plages d’accès par vacation activées, badges temporaires journaliers.',
  tournanteOff: 'Population fixe uniquement, badges nominatifs permanents.',
  fluxOn: 'Bons de sortie et leur chaîne de validation activés.',
  fluxOff: 'Aucun flux matière sortant à contrôler.',
  materielOn: 'Déclaration du matériel apporté par les intervenants activée.',
  materielOff: 'Pas de matériel entrant déclaré.',
  vehiculesOn: 'Préavis de livraison et contrôle des véhicules activés.',
  vehiculesOff: 'Pas de contrôle véhicules ni de livraisons.',
  personnelOn: 'Population salariée de l’exploitant gérée.',
  personnelOff: 'Aucun personnel propre.',
};
