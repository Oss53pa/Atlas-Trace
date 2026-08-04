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
  { code: 'SUSPENDRE_ACCES', effet: 'Suspendre une personne ou une entreprise' },
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

// Les chaînes de validation vivent désormais en base (table at_circuits, M19),
// servies par features/parametrage/api.ts.

// Les référentiels paramétrables, la charte des catégories de badges et les
// paramètres du site vivent désormais en base (table at_referentiels, M19) et
// sont servis par features/parametrage/api.ts.
