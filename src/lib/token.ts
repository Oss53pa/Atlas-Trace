/** Jeton d'accès Atlas Trace (démonstration).
 *
 *  Structure inviolable en production : `AT1.<charge>.<signature>` où la
 *  SIGNATURE est apposée CÔTÉ SERVEUR (Edge Function, secret jamais exposé au
 *  navigateur) en HMAC-SHA256 — voie d'évolution : Ed25519 asymétrique. Ici, on
 *  illustre la STRUCTURE avec une empreinte FNV-1a : ⚠️ ce N'EST PAS une signature
 *  (hash public, sans clé → forgeable trivialement), et l'usage unique / l'expiration
 *  ne sont PAS encore vérifiés. À NE PAS utiliser comme preuve d'authenticité :
 *  toute vérification doit se faire côté serveur avant mise en production. */

export interface ChargeAcces {
  v: 1;
  t: 'ACCES';
  /** N° de badge / carte. */
  badge: string;
  /** Personne (label court). */
  pers: string;
  /** Zone autorisée. */
  zone: string;
  /** Fin de validité AAAA-MM-JJ. */
  exp: string;
  /** Identifiant unique (usage unique / anti-rejeu). */
  jti: string;
}

function b64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function deB64url(s: string): string {
  return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
}

/** Empreinte de démonstration (FNV-1a) — remplacée par HMAC-SHA256 serveur. */
function empreinte(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Émet un jeton d'accès signé (démo) pour un QR de carte d'accès. */
export function jetonAcces(charge: Omit<ChargeAcces, 'v' | 't' | 'jti'> & { jti?: string }): string {
  const c: ChargeAcces = {
    v: 1,
    t: 'ACCES',
    jti: charge.jti ?? `${charge.badge}-${charge.exp}`,
    badge: charge.badge,
    pers: charge.pers,
    zone: charge.zone,
    exp: charge.exp,
  };
  const p = b64url(JSON.stringify(c));
  return `AT1.${p}.${empreinte(p)}`;
}

/** Vérifie la signature et lit la charge. Retourne null si falsifié / illisible. */
export function litJeton(jeton: string): ChargeAcces | null {
  const parts = jeton.split('.');
  if (parts.length !== 3 || parts[0] !== 'AT1') return null;
  if (empreinte(parts[1]) !== parts[2]) return null; // signature invalide → rejeté
  try {
    return JSON.parse(deB64url(parts[1])) as ChargeAcces;
  } catch {
    return null;
  }
}

/** Jeton d'ACTIVATION (invitation référent) : usage unique + expiration réels,
 *  signature serveur en production. Encodé dans le QR d'activation. */
export function jetonActivation(charge: { ent: string; ref: string; jeton: string; exp: string }): string {
  const c = { v: 1, t: 'ACTIV', jti: `${charge.jeton}-${charge.exp}`, ...charge };
  const p = b64url(JSON.stringify(c));
  return `AT1.${p}.${empreinte(p)}`;
}
