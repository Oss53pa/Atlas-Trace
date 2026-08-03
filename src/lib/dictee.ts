/**
 * Mise au propre d'un texte dicté — entièrement local, aucun service externe.
 *
 * La reconnaissance vocale rend un flux brut : pas de majuscules, pas de
 * ponctuation (ou dictée en toutes lettres), des hésitations. Un agent qui
 * consigne un incident ne doit pas avoir à repasser derrière au clavier.
 */

/**
 * Attention : `\b` de JavaScript est ASCII. Devant un mot accentué (« à la
 * ligne »), il ne matche jamais. Les motifs concernés utilisent donc une
 * frontière explicite sur les lettres Unicode, avec le groupe 1 restitué.
 */
const AVANT = '(^|[^\\p{L}])';
const APRES = '(?=[^\\p{L}]|$)';

/** Ponctuation dictée à voix haute → signe. L'ordre compte : le plus long d'abord. */
const PONCTUATION: [RegExp, string][] = [
  [new RegExp(`${AVANT}(?:à\\s+la\\s+ligne|nouvelle\\s+ligne|retour\\s+(?:à\\s+la\\s+)?ligne)${APRES}`, 'giu'), '$1\n'],
  [new RegExp(`${AVANT}(?:nouveau\\s+paragraphe|paragraphe)${APRES}`, 'giu'), '$1\n\n'],
  [/\b(?:ouvre[zr]?|ouvrir)\s+(?:la\s+)?parenthèses?\b/gi, ' ('],
  [/\b(?:ferme[zr]?|fermer)\s+(?:la\s+)?parenthèses?\b/gi, ') '],
  [/\b(?:ouvre[zr]?|ouvrir)\s+(?:les\s+)?guillemets?\b/gi, ' «'],
  [/\b(?:ferme[zr]?|fermer)\s+(?:les\s+)?guillemets?\b/gi, '» '],
  [/\bpoints?\s+d['’]\s*interrogation\b/gi, '?'],
  [/\bpoints?\s+d['’]\s*exclamation\b/gi, '!'],
  [/\bpoints?\s+de\s+suspension\b/gi, '…'],
  [/\bpoint\s*-?\s*virgule\b/gi, ';'],
  [/\bdeux\s+points\b/gi, ':'],
  [/\bvirgules?\b/gi, ','],
  [/\bpoints?\b/gi, '.'],
  [/\btirets?\b/gi, '-'],
  [/\bapostrophes?\b/gi, '’'],
];

/** Hésitations et tics de dictée, supprimés seulement s'ils sont isolés. */
const HESITATIONS = /\b(?:euh+|heu+|hum+|hein|bah|ben|voilà quoi)\b/gi;

/** Sigles du métier : la reconnaissance vocale les rend en minuscules. */
const SIGLES: Record<string, string> = {
  ras: 'RAS',
  hse: 'HSE',
  epi: 'EPI',
  ppsps: 'PPSPS',
  moa: 'MOA',
  moe: 'MOE',
  qr: 'QR',
  pv: 'PV',
  caces: 'CACES',
  vrd: 'VRD',
  sst: 'SST',
};

/** Espace insécable avant la ponctuation double (typographie française). */
const INSECABLE = ' ';

function majusculeDebutDePhrase(texte: string): string {
  return texte.replace(/(^|[.!?…]\s+|\n\s*)([a-zà-ÿ])/g, (_, avant: string, lettre: string) =>
    avant + lettre.toUpperCase(),
  );
}

/**
 * Nettoie un texte dicté : ponctuation prononcée, hésitations, espaces,
 * typographie française, majuscules, point final.
 */
export function mettreAuPropre(brut: string): string {
  if (!brut.trim()) return '';
  let t = brut;

  for (const [motif, signe] of PONCTUATION) t = t.replace(motif, signe);
  t = t.replace(HESITATIONS, ' ');

  // Sigles (hors mots composés), avant la mise en majuscule des phrases.
  t = t.replace(/\b[a-zà-ÿ]+\b/gi, (mot) => SIGLES[mot.toLowerCase()] ?? mot);

  t = t
    // Espaces multiples, mais on préserve les sauts de ligne.
    .replace(/[^\S\n]+/g, ' ')
    // Pas d'espace avant la ponctuation simple, un espace après.
    .replace(/\s+([,.…])/g, '$1')
    .replace(/([,.…])(?=[^\s\n.…)»])/g, '$1 ')
    // Ponctuation double : espace insécable avant, espace après.
    .replace(/\s*([;:!?])\s*/g, `${INSECABLE}$1 `)
    // Parenthèses et guillemets collés au contenu.
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/«\s*/g, `«${INSECABLE}`)
    .replace(/\s*»/g, `${INSECABLE}»`)
    // Apostrophe typographique, sans espace autour.
    .replace(/\s*['’]\s*/g, '’')
    // Répétitions de ponctuation issues de la dictée.
    .replace(/([.,;:!?])\1+/g, '$1')
    .replace(/[^\S\n]*\n[^\S\n]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  t = majusculeDebutDePhrase(t);

  // Point final si la phrase n'est pas déjà ponctuée.
  if (t && !/[.!?…»)]$/.test(t)) t += '.';

  return t;
}

/** Ajoute un fragment dicté à un texte existant, en gérant l'espace de jonction. */
export function concatener(existant: string, fragment: string): string {
  const a = existant.trimEnd();
  const b = fragment.trim();
  if (!a) return b;
  if (!b) return a;
  return /[.!?…\n]$/.test(a) ? `${a} ${b}` : `${a} ${b}`;
}
