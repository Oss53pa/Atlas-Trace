import { EntreprisesLive } from './EntreprisesLive';

/**
 * Habilitations des entreprises (M1, live). La gestion des preneurs et de leurs
 * conditions bloquantes vit dans l'écran « Preneurs » (PreneursLive) — on ne
 * duplique pas ici. Terminologie imposée : « Preneur », jamais « donneur d'ordre ».
 */
export function Habilitations() {
  return <EntreprisesLive />;
}
