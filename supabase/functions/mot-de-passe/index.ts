/**
 * mot-de-passe — courriel de réinitialisation mutualisé pour les applis mobiles
 * Atlas Studio (via Resend).
 *
 *   { email, app_url?, app_name?, app_tagline?, theme? }  ← public (connexion)
 *     app_url     : domaine de l'appli. Le lien pointe sur app_url/?reset=1 avec
 *                   le token de récupération (verifyOtp côté page) — aucune
 *                   redirection GoTrue, donc AUCUN besoin d'allowlist/Site URL.
 *     app_name    : nom affiché dans le courriel (défaut « Atlas Trace »).
 *     app_tagline : accroche sous le nom (défaut « Contrôle d'accès et de flux »).
 *     theme       : couleurs de marque { marque, marqueTexte, sousTitre,
 *                   accent, accentTexte } (hex ; défaut Volt & Olive). Toute
 *                   valeur non-hex retombe sur le défaut (anti-injection).
 *
 * On génère nous-mêmes le lien de récupération (admin.generateLink) puis on
 * l'envoie dans un gabarit de marque : signature « Atlas Studio » constante
 * (Grand Hotel, palette Volt & Olive), nom d'appli personnalisé. Le gabarit par
 * défaut du projet Supabase (partagé) n'est jamais touché.
 *
 * Réponse toujours neutre { ok: true } : on ne révèle jamais si l'adresse a un
 * compte (pas d'énumération).
 *
 * Secrets : RESEND_API_KEY, RESEND_FROM.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (c: unknown, s = 200) =>
  new Response(JSON.stringify(c), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const echappe = (t: string) =>
  String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Thème de marque. Défaut = Atlas Studio « Vert Volt & Olive ». Chaque appli
// peut surcharger tout ou partie via body.theme. Les neutres (texte, fond,
// bordure) restent constants pour l'unité de la suite.
interface Theme {
  marque: string; // en-tête + signature (fond)
  marqueTexte: string; // texte sur l'en-tête
  sousTitre: string; // ligne nom d'appli sous « Atlas Studio »
  accent: string; // bouton CTA (fond)
  accentTexte: string; // texte du CTA
}
const THEME_DEFAUT: Theme = {
  marque: '#5C6B12',
  marqueTexte: '#FFFDF8',
  sousTitre: '#AEBE6A',
  accent: '#D2FF00',
  accentTexte: '#16170F',
};
// Sécurité : les couleurs vont dans des style="" ; on n'accepte que du hex
// (#rgb/#rrggbb/#rrggbbaa), sinon on retombe sur le défaut (pas d'injection).
const couleur = (v: unknown, defaut: string) =>
  typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.trim()) ? v.trim() : defaut;

// Gabarit mutualisé pour toutes les applis mobiles Atlas Studio.
// Constant : signature « Atlas Studio » (Grand Hotel), police Dosis, neutres.
// Personnalisé par appli : nom, accroche et couleurs (thème).
const gabarit = (lien: string, appNom: string, accroche: string, t: Theme) => `<style>@import url('https://fonts.googleapis.com/css2?family=Grand+Hotel&family=Dosis:wght@400;500;600;700&display=swap');</style>
<div style="font-family:'Dosis','Segoe UI',system-ui,sans-serif;max-width:520px;margin:0 auto;color:#16170F;background:#FFFDF8;border:1px solid #E0E0D3;border-radius:16px;overflow:hidden">
  <div style="background:${t.marque};padding:22px 24px">
    <div style="font-family:'Grand Hotel',cursive;font-size:28px;line-height:1;color:${t.marqueTexte}">Atlas Studio</div>
    <div style="font-size:12px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${t.sousTitre};margin-top:4px">${echappe(appNom)}${accroche ? ' · ' + echappe(accroche) : ''}</div>
  </div>
  <div style="padding:24px">
    <p style="font-size:16px;margin:0 0 12px">Bonjour,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 12px">Vous avez demandé la réinitialisation de votre mot de passe ${echappe(appNom)}.</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 20px"><b>Cliquez sur le bouton ci-dessous</b> pour choisir un nouveau mot de passe. Vous seul le connaîtrez : personne d'autre, pas même un administrateur.</p>
    <p style="margin:24px 0">
      <a href="${lien}" style="background:${t.accent};color:${t.accentTexte};padding:13px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Réinitialiser mon mot de passe</a>
    </p>
    <p style="font-size:13px;color:#6A6B5F;line-height:1.7;margin:0 0 16px">Ce lien est <b>personnel</b> et <b>temporaire</b>.<br>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>
    <p style="font-size:12px;color:#9AA39E;word-break:break-all;margin:0">${lien}</p>
  </div>
  <div style="border-top:1px solid #E0E0D3;background:#F4F4ED;padding:14px 24px">
    <span style="font-size:12px;color:#6A6B5F">Une application </span><span style="font-family:'Grand Hotel',cursive;font-size:18px;color:${t.marque};vertical-align:-2px">Atlas Studio</span>
  </div>
</div>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erreur: 'Methode non supportee' }, 405);

  const corps = await req.json().catch(() => ({}));
  const email = String(corps.email ?? '').trim().toLowerCase();
  const base = (corps.app_url ?? 'https://trace.atlas-studio.org').replace(/\/$/, '');
  // Personnalisation par appli mobile Atlas Studio (défaut : Atlas Trace).
  const appNom = String(corps.app_name ?? 'Atlas Trace').slice(0, 60);
  const accroche = String(corps.app_tagline ?? "Contrôle d'accès et de flux").slice(0, 80);
  // Thème par appli : chaque couleur validée en hex, sinon repli sur le défaut.
  const th = (corps.theme ?? {}) as Partial<Theme>;
  const theme: Theme = {
    marque: couleur(th.marque, THEME_DEFAUT.marque),
    marqueTexte: couleur(th.marqueTexte, THEME_DEFAUT.marqueTexte),
    sousTitre: couleur(th.sousTitre, THEME_DEFAUT.sousTitre),
    accent: couleur(th.accent, THEME_DEFAUT.accent),
    accentTexte: couleur(th.accentTexte, THEME_DEFAUT.accentTexte),
  };

  // Validation minimale ; en cas d'échec on reste neutre (pas d'énumération).
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: true });

  // Limite de débit (anti email-bombing) : par adresse (3 / h) et par IP (15 / 10 min).
  // En cas de dépassement, réponse neutre — aucun courriel n'est envoyé.
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'ip-inconnue';
  const [okMail, okIp] = await Promise.all([
    admin.rpc('at_reset_debit_ok', { p_cle: 'e:' + email, p_fenetre: 3600, p_max: 3 }),
    admin.rpc('at_reset_debit_ok', { p_cle: 'ip:' + ip, p_fenetre: 600, p_max: 15 }),
  ]);
  if (okMail.data === false || okIp.data === false) return json({ ok: true });

  try {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
    const hashed = (data as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token;
    // Lien DIRECT vers l'appli avec le token de récupération : la page appelle
    // verifyOtp(token_hash). Aucune redirection GoTrue → indépendant du Site URL
    // et des « Redirect URLs » du projet partagé (plus de renvoi vers une autre appli).
    const lien = hashed ? `${base}/?reset=1&token_hash=${encodeURIComponent(hashed)}&type=recovery` : null;

    // Compte inexistant / token absent → on n'envoie rien, mais réponse neutre.
    if (!error && lien) {
      const cle = Deno.env.get('RESEND_API_KEY');
      const expediteur = Deno.env.get('RESEND_FROM');
      if (cle && expediteur) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: expediteur,
            to: [email],
            subject: `${appNom} — réinitialisation de votre mot de passe`,
            html: gabarit(lien, appNom, accroche, theme),
          }),
        });
      }
    }
  } catch (_e) {
    // On ne divulgue rien : la réponse reste neutre.
  }

  return json({ ok: true });
});
