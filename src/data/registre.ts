import type { MouvementAcces } from '../types';

let seq = 0;
function m(
  horodatage: string,
  personneLabel: string,
  entrepriseLabel: string,
  sens: MouvementAcces['sens'],
  resultat: MouvementAcces['resultat'],
  motif?: MouvementAcces['motif'],
  photoForcage?: boolean,
  mode: MouvementAcces['mode'] = 'EN_LIGNE',
): MouvementAcces {
  seq += 1;
  return {
    id: `reg-${seq}`,
    badgeNumero: '—',
    personneLabel,
    entrepriseLabel,
    sens,
    resultat,
    motif,
    mode,
    posteLabel: 'Entrée principale',
    agentLabel: 'M. Koné',
    horodatage,
    photoForcage,
    commentaire: resultat === 'FORCE' ? 'Autorisation verbale chef de poste' : undefined,
  };
}

/**
 * Jeu de mouvements d'une matinée au poste — matière du registre M6.
 * Statique : représente ce que la synchronisation aurait remonté (chap. 14.2).
 */
export const MOUVEMENTS_JOUR: MouvementAcces[] = [
  m('06:34', 'Kouadio Jean', 'Bâti-Sud', 'ENTREE', 'AUTORISE'),
  m('06:36', 'Yao Koffi', 'Bâti-Sud', 'ENTREE', 'AUTORISE'),
  m('06:41', 'Fanta Coulibaly', 'Bâti-Sud', 'ENTREE', 'AUTORISE'),
  m('06:48', 'Modou Sarr', 'Aménag-Preneur K', 'ENTREE', 'REFUSE', 'DONNEUR_ORDRE_BLOQUE'),
  m('06:52', 'Awa Bamba', 'Bâti-Sud', 'ENTREE', 'REFUSE', 'INDUCTION_EXPIREE'),
  m('06:59', 'Paul Mensah', 'Électro-CI', 'ENTREE', 'REFUSE', 'ENTREPRISE_SUSPENDUE'),
  m('07:03', 'Salimata Ouattara', 'Bâti-Sud', 'ENTREE', 'REFUSE', 'BADGE_SUSPENDU'),
  m('07:08', 'Issouf Traoré', 'Bâti-Sud', 'ENTREE', 'FORCE', 'HORS_PLAGE', true),
  m('07:15', 'Karim Zerbo', 'Aménag-Preneur K', 'ENTREE', 'REFUSE', 'HORS_ZONE'),
  m('07:22', 'Aya N’Dri', 'Bâti-Sud', 'ENTREE', 'AUTORISE'),
  m('07:29', 'Bakary Cissé', 'Bâti-Sud', 'ENTREE', 'AUTORISE', undefined, false, 'HORS_LIGNE'),
  m('07:31', 'Ibrahim Diarra', 'Bâti-Sud', 'ENTREE', 'AUTORISE', undefined, false, 'HORS_LIGNE'),
  m('07:44', 'Amina Diallo', 'Visiteurs', 'ENTREE', 'AUTORISE'),
  m('07:58', 'Yao Koffi', 'Bâti-Sud', 'SORTIE', 'AUTORISE'),
  m('08:05', 'Yao Koffi', 'Bâti-Sud', 'ENTREE', 'REFUSE', 'BADGE_EXPIRE'),
  m('08:12', 'Grace Kouamé', 'Aménag-Preneur K', 'ENTREE', 'AUTORISE'),
  m('08:24', 'Fanta Coulibaly', 'Bâti-Sud', 'ENTREE', 'REFUSE', 'DEJA_ENTRE'),
  m('08:37', 'Éric N’Guessan', 'Bâti-Sud', 'ENTREE', 'REFUSE', 'HORS_PLAGE'),
  m('08:41', 'Amina Diallo', 'Visiteurs', 'SORTIE', 'AUTORISE'),
  m('08:53', 'Moussa Fofana', 'Bâti-Sud', 'ENTREE', 'AUTORISE'),
  m('09:06', 'Marie Kablan', 'Aménag-Preneur K', 'ENTREE', 'AUTORISE'),
  m('09:18', 'Bakary Cissé', 'Bâti-Sud', 'SORTIE', 'AUTORISE'),
  m('09:32', 'Seydou Koné', 'Bâti-Sud', 'ENTREE', 'FORCE', 'HORS_PLAGE', true),
  m('09:47', 'Aya N’Dri', 'Bâti-Sud', 'SORTIE', 'AUTORISE'),
];

export const ENTREPRISES_REGISTRE = [
  'Bâti-Sud',
  'Aménag-Preneur K',
  'Électro-CI',
  'Visiteurs',
];

/** Catalogue des registres exportables (chap. 18). Seul le premier est peuplé ici. */
export const CATALOGUE_REGISTRES = [
  { id: 'acces', libelle: 'Entrées & sorties de personnes', actif: true },
  { id: 'refus', libelle: 'Refus & forçages', actif: false },
  { id: 'materiel', libelle: 'Sorties de matériel', actif: false },
  { id: 'livraisons', libelle: 'Livraisons', actif: false },
  { id: 'vehicules', libelle: 'Mouvements de véhicules', actif: false },
  { id: 'listes', libelle: 'Listes journalières archivées', actif: false },
  { id: 'audit', libelle: 'Journal d’audit', actif: false },
];
