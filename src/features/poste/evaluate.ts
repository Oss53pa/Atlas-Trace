import type { Badge, Entreprise, MotifCode, Personne, Sens } from '../../types';

export interface ContexteControle {
  /** Zone gouvernée par ce poste (code). Le badge doit l'autoriser. */
  zoneControlee: string;
  /** Emprise attendue au poste, le cas échéant. */
  empriseControlee?: string;
  /** Date du jour AAAA-MM-JJ (comparaison de validité). */
  dateDuJour: string;
  /** Heure courante en minutes depuis minuit. */
  maintenantMinutes: number;
  /** Personnes présentes sur la liste journalière déposée (ids). */
  listeDuJour: Set<string>;
  /** Personnes actuellement présentes sur site (ids) — appairage entrée/sortie. */
  presents: Set<string>;
}

export interface Decision {
  resultat: 'AUTORISE' | 'REFUSE';
  motif?: MotifCode;
  /** Anomalie signalée SANS bloquer (ex. sortie de quelqu'un jamais entré). */
  alerte?: MotifCode;
}

/**
 * Moteur de décision du poste (M5).
 *
 * Deux régimes selon le sens :
 * - ENTRÉE : chaîne de contrôles complète, premier échec l'emporte, aucun accès
 *   sans passer toute la chaîne.
 * - SORTIE : on laisse **toujours** sortir (impératif de sécurité — ne jamais
 *   piéger une personne sur site parce que son badge a expiré, etc.), mais on
 *   TRACE, et une sortie sans entrée enregistrée est signalée (badge partagé).
 * Un badge non identifiable est refusé dans les deux sens.
 */
export function evaluerAcces(
  badge: Badge | null,
  personne: Personne | null,
  entreprise: Entreprise | null,
  donneurOrdreBloque: boolean,
  sens: Sens,
  ctx: ContexteControle,
): Decision {
  // 1. Badge identifiable — bloquant dans les deux sens
  if (!badge || !personne || !entreprise) {
    return { resultat: 'REFUSE', motif: 'BADGE_INCONNU' };
  }

  // ---- SORTIE : autorisée par principe, tracée, anomalie signalée ----
  if (sens === 'SORTIE') {
    if (ctx.presents.size > 0 && !ctx.presents.has(personne.id)) {
      return { resultat: 'AUTORISE', alerte: 'SORTIE_SANS_ENTREE' };
    }
    return { resultat: 'AUTORISE' };
  }

  // ---- ENTRÉE : chaîne complète ----
  // 2. Badge actif / non expiré
  if (badge.statut === 'SUSPENDU') return refus('BADGE_SUSPENDU');
  if (badge.statut === 'EXPIRE' || badge.validiteFin < ctx.dateDuJour) {
    return refus('BADGE_EXPIRE');
  }

  // 3. Entreprise active
  if (entreprise.statut === 'SUSPENDUE') return refus('ENTREPRISE_SUSPENDUE');

  // 4. Donneur d'ordre autorisé
  if (donneurOrdreBloque) return refus('DONNEUR_ORDRE_BLOQUE');

  // 5. Induction valide (statut d'induction bloquant)
  if (!personne.inductionValide) return refus('INDUCTION_EXPIREE');

  // 6. Présence sur la liste du jour
  if (!ctx.listeDuJour.has(personne.id)) {
    return refus('HORS_LISTE');
  }

  // 7. Zone cohérente
  if (!badge.zonesAutorisees.includes(ctx.zoneControlee)) {
    return refus('HORS_ZONE');
  }

  // 8. Emprise cohérente
  if (ctx.empriseControlee && badge.empriseAutorisee !== ctx.empriseControlee) {
    return refus('HORS_EMPRISE');
  }

  // 9. Plage horaire propre au badge
  if (badge.plageHoraire) {
    const { debut, fin } = badge.plageHoraire;
    if (ctx.maintenantMinutes < debut || ctx.maintenantMinutes > fin) {
      return refus('HORS_PLAGE');
    }
  }

  // 10. Appairage entrée / sortie
  if (ctx.presents.has(personne.id)) {
    return refus('DEJA_ENTRE');
  }

  return { resultat: 'AUTORISE' };
}

function refus(motif: MotifCode): Decision {
  return { resultat: 'REFUSE', motif };
}
