/**
 * push-incident — envoie l'alerte Web Push à la chaîne de commandement.
 *
 * Appelée par le déclencheur `at_main_courante_notifier` (net.http_post) avec
 * l'identifiant de l'incident et le secret partagé. Elle relit l'incident en
 * base — le corps de la requête n'est jamais cru sur parole — puis chiffre et
 * pousse la notification vers chaque appareil abonné.
 *
 * Aucun service tiers : les relais des navigateurs (Google, Mozilla, Microsoft,
 * Apple) livrent gratuitement. VAPID sert seulement à signer l'expéditeur.
 *
 * Secrets attendus (Supabase → Edge Functions → Secrets) :
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex. mailto:contact@…)
 *
 * GET renvoie la clé publique : le front n'a pas à la dupliquer.
 */
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const PUBLIQUE = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const PRIVEE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const SUJET = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@atlastudio.ci';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Le front récupère ici la clé publique : une seule source de vérité.
  if (req.method === 'GET') {
    return json({ cle_publique: PUBLIQUE, configure: !!(PUBLIQUE && PRIVEE) });
  }

  if (req.method !== 'POST') return json({ erreur: 'Méthode non supportée' }, 405);

  if (!PUBLIQUE || !PRIVEE) {
    return json({ erreur: 'Clés VAPID non configurées — voir les secrets de la fonction' }, 503);
  }

  // Secret partagé : seul le déclencheur de la base peut déclencher un envoi.
  const { data: reglages } = await admin
    .from('at_reglages_push')
    .select('hook_secret')
    .maybeSingle();
  if (!reglages?.hook_secret || req.headers.get('x-hook-secret') !== reglages.hook_secret) {
    return json({ erreur: 'Non autorisé' }, 401);
  }

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return json({ erreur: 'Identifiant manquant' }, 400);

  // On relit l'incident : le corps de la requête ne fait pas foi.
  const { data: incident, error } = await admin
    .from('at_main_courante')
    .select('id, organisation_id, numero, type, titre, description, gravite, categorie, agent')
    .eq('id', id)
    .maybeSingle();
  if (error || !incident) return json({ erreur: 'Incident introuvable' }, 404);
  if (incident.type !== 'INCIDENT') return json({ ignore: 'Entrée de main courante, pas un incident' });

  const { data: cibles } = await admin.rpc('at__destinataires_incidents', {
    p_organisation_id: incident.organisation_id,
  });
  const destinataires = (cibles ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[];
  if (destinataires.length === 0) return json({ envoyees: 0, motif: 'Aucun appareil abonné' });

  webpush.setVapidDetails(SUJET, PUBLIQUE, PRIVEE);

  const majeur = incident.gravite === 'MAJEUR';
  const charge = JSON.stringify({
    titre: `${majeur ? 'Incident majeur' : 'Incident'} — ${incident.numero ?? ''}`.trim(),
    corps: `${incident.titre}\n${incident.description}`.slice(0, 240),
    urgence: majeur ? 'majeur' : 'mineur',
    id: incident.id,
  });

  const resultats = await Promise.allSettled(
    destinataires.map((d) =>
      webpush.sendNotification(
        { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
        charge,
        // Un incident majeur passe outre l'économiseur de batterie.
        { urgency: majeur ? 'high' : 'normal', TTL: majeur ? 3600 : 900 },
      ),
    ),
  );

  let envoyees = 0;
  await Promise.all(
    resultats.map((r, i) => {
      const cible = destinataires[i];
      if (r.status === 'fulfilled') {
        envoyees += 1;
        return admin.rpc('at__marquer_envoi_push', { p_id: cible.id, p_erreur: null });
      }
      const statut = (r.reason as { statusCode?: number })?.statusCode;
      return admin.rpc('at__marquer_envoi_push', {
        p_id: cible.id,
        p_erreur: statut ? String(statut) : String(r.reason).slice(0, 200),
      });
    }),
  );

  return json({ envoyees, total: destinataires.length });
});
