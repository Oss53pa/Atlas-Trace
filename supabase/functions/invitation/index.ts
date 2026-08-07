/**
 * invitation — envoi du QR d'invitation, et activation du compte.
 *
 *   { action: 'envoyer', invitation_id, jeton, app_url }  ← base (secret partagé)
 *   { action: 'activer', jeton, mot_de_passe }            ← public, porteur du jeton
 *
 * L'administrateur MOA choisit le rôle ; la personne choisit son mot de passe.
 * Le serveur ne fabrique jamais d'identifiant à la place de quelqu'un.
 *
 * Le jeton n'est stocké qu'en empreinte SHA-256. Il est à usage unique et
 * expirable ; sa consommation est atomique côté base.
 *
 * Secrets : RESEND_API_KEY, RESEND_FROM.
 */
import QRCode from 'npm:qrcode@1.5.4';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (c: unknown, s = 200) =>
  new Response(JSON.stringify(c), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const echappe = (t: string) =>
  String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erreur: 'Methode non supportee' }, 405);

  const corps = await req.json().catch(() => ({}));

  /* ---------------- Envoi du QR ---------------- */
  if (corps.action === 'envoyer') {
    const { data: reglages } = await admin.from('at_reglages_push').select('hook_secret').maybeSingle();
    if (!reglages?.hook_secret || req.headers.get('x-hook-secret') !== reglages.hook_secret) {
      return json({ erreur: 'Non autorise' }, 401);
    }

    const { data: inv } = await admin
      .from('at_invitations')
      .select('id, nom, contact, expire_at, role:at_roles(libelle), site:at_sites(libelle)')
      .eq('id', corps.invitation_id)
      .maybeSingle();
    if (!inv) return json({ erreur: 'Invitation introuvable' }, 404);

    const role = (inv.role as unknown as { libelle: string } | null)?.libelle ?? 'compte interne';
    const site = (inv.site as unknown as { libelle: string } | null)?.libelle ?? '';
    const base = (corps.app_url ?? 'https://atlas-trace.vercel.app').replace(/\/$/, '');
    const lien = `${base}/?invitation=${encodeURIComponent(corps.jeton)}`;

    const dataUrl: string = await QRCode.toDataURL(lien, { width: 640, margin: 2, errorCorrectionLevel: 'M' });
    const png = dataUrl.split(',')[1];

    const echeance = new Date(inv.expire_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
    const cle = Deno.env.get('RESEND_API_KEY');
    const expediteur = Deno.env.get('RESEND_FROM');

    let erreur: string | null = null;
    if (!cle || !expediteur) {
      erreur = 'RESEND_API_KEY ou RESEND_FROM absent — invitation creee mais non envoyee';
    } else {
      const rep = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: expediteur,
          to: [inv.contact],
          subject: `Votre acces Atlas Trace — ${role}`,
          attachments: [{ filename: 'invitation-atlas-trace.png', content: png }],
          html: `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#1b1c1c">
<h2 style="color:#3E4A0C;margin-bottom:4px">Atlas Trace</h2>
<p style="color:#666;margin-top:0;font-size:13px">Controle d'acces et de flux</p>
<p>Bonjour ${echappe(inv.nom)},</p>
<p>Un acces vous est ouvert sur <b>${echappe(site)}</b> avec le role <b>${echappe(role)}</b>.</p>
<p><b>Scannez le QR code joint</b> avec votre telephone, ou utilisez le bouton ci-dessous.
Vous choisirez vous-meme votre mot de passe : personne d'autre ne le connait.</p>
<p style="margin:24px 0">
  <a href="${lien}" style="background:#3E4A0C;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">
    Creer mon compte
  </a>
</p>
<p style="font-size:13px;color:#666">
  Ce lien est <b>personnel</b>, <b>utilisable une seule fois</b> et expire le <b>${echeance}</b>.<br>
  Si vous n'attendiez pas cette invitation, ignorez ce message : sans action de votre part, elle expirera seule.
</p>
<p style="font-size:12px;color:#999;word-break:break-all">${lien}</p>
</div>`,
        }),
      });
      if (!rep.ok) erreur = `Resend ${rep.status} : ${(await rep.text()).slice(0, 200)}`;
    }

    await admin
      .from('at_invitations')
      .update({ envoyee_at: erreur ? null : new Date().toISOString(), erreur_envoi: erreur })
      .eq('id', inv.id);

    return json({ envoye: !erreur, erreur });
  }

  /* ---------------- Activation ---------------- */
  if (corps.action === 'activer') {
    const jeton = String(corps.jeton ?? '');
    const motDePasse = String(corps.mot_de_passe ?? '');
    if (!/^[0-9a-f]{64}$/.test(jeton)) return json({ erreur: 'Lien invalide' }, 400);
    if (motDePasse.length < 10) {
      return json({ erreur: 'Le mot de passe doit faire au moins 10 caracteres' }, 400);
    }

    const { data: apercu } = await admin.rpc('at_invitation_apercu', { p_jeton: jeton });
    const a = apercu as { valide: boolean; motif?: string; contact?: string; nom?: string } | null;
    if (!a?.valide) return json({ erreur: a?.motif ?? 'INVITATION_INVALIDE' }, 400);

    // Le compte est cree avec le mot de passe saisi par la personne elle-meme.
    const { data: cree, error: eCree } = await admin.auth.admin.createUser({
      email: a.contact!,
      password: motDePasse,
      email_confirm: true,
      user_metadata: { nom: a.nom },
    });
    if (eCree || !cree?.user) return json({ erreur: eCree?.message ?? 'Creation impossible' }, 400);

    const { data: conso, error: eConso } = await admin.rpc('at__consommer_invitation', {
      p_jeton: jeton,
      p_user_id: cree.user.id,
    });
    const c = conso as { ok: boolean; motif?: string } | null;
    if (eConso || !c?.ok) {
      // La course a ete perdue : on ne laisse pas de compte orphelin.
      await admin.auth.admin.deleteUser(cree.user.id);
      return json({ erreur: c?.motif ?? eConso?.message ?? 'INVITATION_INVALIDE' }, 409);
    }

    return json({ ok: true, courriel: a.contact });
  }

  return json({ erreur: 'Action inconnue' }, 400);
});
