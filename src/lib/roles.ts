/**
 * Famille d'usage d'un rôle, dérivée de ses pouvoirs. Sert à composer une
 * interface par rôle : l'accueil et la barre du bas s'adaptent, plutôt que de
 * masquer des onglets dans une coque unique. Une seule source de vérité,
 * partagée entre la navigation (App) et l'accueil.
 */
export type Famille = 'DIRECTION' | 'TERRAIN' | 'VALIDATION' | 'REFERENT' | 'BASE';

const VALIDATION = [
  'CONSULTER_TABLEAU', 'VISER_HABILITATION', 'APPROUVER_HABILITATION', 'VISER_SORTIE',
  'APPROUVER_SORTIE', 'VALIDER_CRENEAU', 'AUTORISER_EVACUATION',
  'GERER_CONDITIONS_BLOQUANTES',
];
const REFERENT = [
  'DECLARER_ENTREPRISE', 'DECLARER_PERSONNEL', 'DECLARER_MATERIEL', 'DEMANDER_SORTIE',
  'DEMANDER_LIVRAISON', 'DEPOSER_LISTE', 'DELIVRER_BADGE',
];

/** Classe l'utilisateur dans une seule famille, par priorité décroissante. */
export function familleDe(pouvoirs: Set<string>): Famille {
  if (pouvoirs.has('ADMINISTRER_ORGANISATION') || pouvoirs.has('CONSULTER_AUDIT') || pouvoirs.has('EXPORTER'))
    return 'DIRECTION';
  if (pouvoirs.has('CONTROLER_AU_POSTE')) return 'TERRAIN';
  if (VALIDATION.some((p) => pouvoirs.has(p))) return 'VALIDATION';
  if (REFERENT.some((p) => pouvoirs.has(p))) return 'REFERENT';
  return 'BASE';
}

/**
 * Ordre de préférence des destinations « au pouce » (barre du bas) par famille.
 * 'accueil' est toujours en tête. La liste est plus longue que la barre : à
 * l'affichage on retire les entrées non autorisées PUIS on garde les premières
 * (voir LONGUEUR_BARRE). Ainsi la barre se complète toujours avec la
 * destination suivante autorisée au lieu de rétrécir quand un rôle n'a pas le
 * pouvoir d'une entrée par défaut.
 */
export const LONGUEUR_BARRE = 4;
export const PRIMAIRES_PAR_FAMILLE: Record<Famille, string[]> = {
  DIRECTION: ['accueil', 'tableau', 'registres', 'admin', 'entreprises', 'preneurs', 'espaces'],
  TERRAIN: ['accueil', 'poste', 'materiel', 'maincourante', 'inscription', 'cloture'],
  VALIDATION: ['accueil', 'materiel', 'entreprises', 'tableau', 'maincourante', 'listes'],
  REFERENT: ['accueil', 'entreprises', 'materiel', 'listes', 'personnes', 'badges'],
  BASE: ['accueil', 'referent'],
};

/**
 * Barre du bas hors session (démo) : on présente l'interface de la Direction /
 * Admin — c'est elle qui donne accès à l'application aux autres utilisateurs,
 * donc l'interface par défaut de référence.
 */
export const PRIMAIRES_DEMO = PRIMAIRES_PAR_FAMILLE.DIRECTION;

/** Vues primaires pour un utilisateur donné (ordre conservé, avant filtrage d'accès). */
export function primairesPour(pouvoirs: Set<string>, connecte: boolean): string[] {
  return connecte ? PRIMAIRES_PAR_FAMILLE[familleDe(pouvoirs)] : PRIMAIRES_DEMO;
}
