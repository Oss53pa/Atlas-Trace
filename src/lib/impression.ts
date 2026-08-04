import { supabase } from './supabase';

/**
 * Impression de registres / exports en PDF prêt à imprimer, via la boîte
 * d'impression du navigateur (« Enregistrer en PDF »). Aucune dépendance : une
 * fenêtre dédiée est composée avec un CSS @page (marges au mm), un en-tête
 * porteur du logo du site, des libellés de colonnes répétés à chaque page et
 * un anti-coupure sur les lignes (pas de saut de page au milieu d'une ligne).
 */

export interface EnteteSite {
  raisonSociale: string;
  site: string;
  adresse: string | null;
  logoDataUrl: string | null;
}

export interface RapportImprimable {
  titre: string;
  /** Préfixe de la référence ATS-… */
  base: string;
  colonnes: string[];
  lignes: (string | number | null)[][];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Identité du site pour l'en-tête. Le logo (data URL) est embarqué tel quel. */
export async function chargerEnteteSite(): Promise<EnteteSite> {
  const [s, o] = await Promise.all([
    supabase.from('at_sites').select('libelle, adresse, logo_url').limit(1).maybeSingle(),
    supabase.from('at_organisations').select('raison_sociale').limit(1).maybeSingle(),
  ]);
  return {
    raisonSociale: o.data?.raison_sociale ?? 'Organisation',
    site: s.data?.libelle ?? 'Site',
    adresse: s.data?.adresse ?? null,
    logoDataUrl: s.data?.logo_url ?? null,
  };
}

function esc(v: string | number | null | undefined): string {
  return String(v ?? '').replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

const CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #14201c; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4; margin: 14mm; }
  .bandeau { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #0F5044; padding-bottom: 10px; margin-bottom: 14px; }
  .logo { height: 46px; width: auto; max-width: 160px; object-fit: contain; }
  .ident { flex: 1; min-width: 0; }
  .org { font-size: 15px; font-weight: 800; color: #0A2E28; line-height: 1.1; }
  .site { font-size: 10px; color: #5b6b64; margin-top: 2px; }
  .meta { text-align: right; white-space: nowrap; }
  .titre { font-size: 13px; font-weight: 700; color: #0F5044; }
  .ref { font-size: 9px; color: #5b6b64; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  thead th { background: #f3f1ea; border-bottom: 1px solid #cfc9ba; text-align: left; padding: 5px 7px; font-size: 9px; text-transform: uppercase; letter-spacing: .03em; color: #3a4742; }
  tbody td { padding: 4px 7px; border-bottom: 1px solid #e7e3d8; vertical-align: top; }
  tbody tr { break-inside: avoid; }
  tbody tr:nth-child(even) { background: #faf9f4; }
  .pied { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e7e3d8; font-size: 8.5px; color: #8a948e; display: flex; justify-content: space-between; }
  .vide { padding: 24px; text-align: center; color: #8a948e; }
  @media screen { body { padding: 22px; background: #eceae3; } .doc { background: #fff; max-width: 820px; margin: 0 auto; padding: 26px; box-shadow: 0 3px 16px rgba(10,46,40,.15); border-radius: 6px; } }
`;

export function imprimerRapport(doc: RapportImprimable, entete: EnteteSite): void {
  const d = new Date();
  const ref = `ATS-${doc.base}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const extraitLe = d.toLocaleString('fr-FR');

  const bandeau = `
    <div class="bandeau">
      ${entete.logoDataUrl ? `<img class="logo" src="${entete.logoDataUrl}" alt="" />` : ''}
      <div class="ident">
        <div class="org">${esc(entete.raisonSociale)}</div>
        <div class="site">${esc(entete.site)}${entete.adresse ? ' · ' + esc(entete.adresse) : ''}</div>
      </div>
      <div class="meta">
        <div class="titre">${esc(doc.titre)}</div>
        <div class="ref">réf ${ref} · extrait le ${extraitLe}</div>
      </div>
    </div>`;

  const thead = `<thead><tr>${doc.colonnes.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`;
  const tbody = doc.lignes.length
    ? `<tbody>${doc.lignes.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
    : `<tbody><tr><td class="vide" colspan="${doc.colonnes.length}">Aucune donnée pour ce registre.</td></tr></tbody>`;

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
    <title>${esc(ref)}</title><style>${CSS}</style></head>
    <body><div class="doc">${bandeau}<table>${thead}${tbody}</table>
    <div class="pied"><span>${esc(entete.raisonSociale)} — ${esc(doc.titre)}</span><span>${doc.lignes.length} ligne(s) · réf ${ref}</span></div>
    </div></body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) throw new Error('Fenêtre d’impression bloquée : autorisez les pop-ups pour ce site.');
  w.document.write(html);
  w.document.close();
  w.focus();
  // Laisser le logo (data URL) et la mise en page se peindre avant d'imprimer.
  const lancer = () => setTimeout(() => w.print(), 250);
  if (w.document.readyState === 'complete') lancer();
  else w.onload = lancer;
}
