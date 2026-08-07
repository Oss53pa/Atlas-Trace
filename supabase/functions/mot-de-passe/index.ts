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

// Polices de marque : Dosis (interface Atlas Trace) + Grand Hotel (signature
// Atlas Studio). Les clients qui ne chargent pas les webfonts retombent sur une
// pile sûre. Couleurs : tokens officiels (vert pin #5C6B12, crème, encre).
const gabarit = (lien: string) => `<style>@import url('https://fonts.googleapis.com/css2?family=Grand+Hotel&family=Dosis:wght@400;500;600;700&display=swap');</style>
<div style="font-family:'Dosis','Segoe UI',system-ui,sans-serif;max-width:520px;margin:0 auto;color:#16170F;background:#FFFDF8;border:1px solid #E0E0D3;border-radius:16px;overflow:hidden">
  <div style="background:#5C6B12;padding:22px 24px">
    <div style="font-family:'Grand Hotel',cursive;font-size:28px;line-height:1;color:#FFFDF8">Atlas Studio</div>
    <div style="font-size:12px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#AEBE6A;margin-top:4px">Atlas Trace · Contrôle d'accès et de flux</div>
  </div>
  <div style="padding:24px">
    <p style="font-size:16px;margin:0 0 12px">Bonjour,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 12px">Vous avez demandé la réinitialisation de votre mot de passe Atlas Trace.</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 20px"><b>Cliquez sur le bouton ci-dessous</b> pour choisir un nouveau mot de passe. Vous seul le connaîtrez : personne d'autre, pas même un administrateur.</p>
    <p style="margin:24px 0">
      <a href="${lien}" style="background:#D2FF00;color:#16170F;padding:13px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Réinitialiser mon mot de passe</a>
    </p>
    <p style="font-size:13px;color:#6A6B5F;line-height:1.7;margin:0 0 16px">Ce lien est <b>personnel</b> et <b>temporaire</b>.<br>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>
    <p style="font-size:12px;color:#9AA39E;word-break:break-all;margin:0">${lien}</p>
  </div>
  <div style="border-top:1px solid #E0E0D3;background:#F4F4ED;padding:14px 24px">
    <span style="font-size:12px;color:#6A6B5F">Une application </span><span style="font-family:'Grand Hotel',cursive;font-size:18px;color:#5C6B12;vertical-align:-2px">Atlas Studio</span>
  </div>
</div>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erreur: 'Methode non supportee' }, 405);

  const corps = await req.json().catch(() => ({}));
  const email = String(corps.email ?? '').trim().toLowerCase();
  const base = (corps.app_url ?? 'https://trace.atlas-studio.org').replace(/\/$/, '');

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
