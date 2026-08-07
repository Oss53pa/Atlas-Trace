/**
 * mot-de-passe — courriel de réinitialisation propre à Atlas Trace (via Resend).
 *
 *   { email, app_url? }   ← public (appelé depuis l'écran de connexion)
 *
 * On génère nous-mêmes le lien de récupération (admin.generateLink) puis on
 * l'envoie dans un gabarit Atlas Trace en français : le gabarit par défaut du
 * projet Supabase (partagé avec d'autres applications) n'est jamais touché.
 *
 * Réponse toujours neutre { ok: true } : on ne révèle jamais si l'adresse a un
 * compte (pas d'énumération). Le redirectTo pointe sur Atlas Trace ; il doit
 * figurer dans les « Redirect URLs » autorisées du projet.
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

const gabarit = (lien: string) => `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#1b1c1c">
<h2 style="color:#0C4238;margin-bottom:4px">Atlas Trace</h2>
<p style="color:#666;margin-top:0;font-size:13px">Controle d'acces et de flux</p>
<p>Bonjour,</p>
<p>Vous avez demande la reinitialisation de votre mot de passe Atlas Trace.</p>
<p><b>Cliquez sur le bouton ci-dessous</b> pour choisir un nouveau mot de passe.
Vous seul le connaitrez : personne d'autre, pas meme un administrateur.</p>
<p style="margin:24px 0">
  <a href="${lien}" style="background:#0C4238;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">
    Reinitialiser mon mot de passe
  </a>
</p>
<p style="font-size:13px;color:#666">
  Ce lien est <b>personnel</b> et <b>temporaire</b>.<br>
  Si vous n'etes pas a l'origine de cette demande, ignorez ce message : votre mot de passe reste inchange.
</p>
<p style="font-size:12px;color:#999;word-break:break-all">${lien}</p>
</div>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erreur: 'Methode non supportee' }, 405);

  const corps = await req.json().catch(() => ({}));
  const email = String(corps.email ?? '').trim().toLowerCase();
  const base = (corps.app_url ?? 'https://atlas-trace.vercel.app').replace(/\/$/, '');

  // Validation minimale ; en cas d'échec on reste neutre (pas d'énumération).
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: true });

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${base}/?reset=1` },
    });
    const lien = (data as { properties?: { action_link?: string } } | null)?.properties?.action_link;

    // Compte inexistant → error : on n'envoie rien, mais on répond pareil.
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
            subject: 'Atlas Trace — reinitialisation de votre mot de passe',
            html: gabarit(lien),
          }),
        });
      }
    }
  } catch (_e) {
    // On ne divulgue rien : la réponse reste neutre.
  }

  return json({ ok: true });
});
