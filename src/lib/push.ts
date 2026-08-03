import { supabase } from './supabase';

/**
 * Alertes push (Web Push / VAPID).
 *
 * La clé publique est servie par l'edge function `push-incident` : une seule
 * source de vérité, aucune duplication dans le front, rien à reconstruire quand
 * elle change. Rien de payant : les relais des navigateurs livrent gratuitement.
 */

const URL_FONCTION = 'https://easoqoswtmvtkdwwkqtc.supabase.co/functions/v1/push-incident';

export type EtatPush =
  | 'INDISPONIBLE' // navigateur sans Web Push (ou iOS hors écran d'accueil)
  | 'NON_CONFIGURE' // clés VAPID absentes côté serveur
  | 'REFUSE' // l'utilisateur a refusé les notifications
  | 'INACTIF' // possible, pas encore activé sur cet appareil
  | 'ACTIF';

export function pushDisponible(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** base64url (VAPID) → Uint8Array attendu par PushManager. */
function versOctets(base64url: string): Uint8Array {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const brut = atob(base64);
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

async function clePublique(): Promise<string | null> {
  try {
    const r = await fetch(URL_FONCTION, { method: 'GET' });
    if (!r.ok) return null;
    const d = (await r.json()) as { cle_publique?: string; configure?: boolean };
    return d.configure && d.cle_publique ? d.cle_publique : null;
  } catch {
    return null;
  }
}

async function enregistrementSW(): Promise<ServiceWorkerRegistration> {
  const existant = await navigator.serviceWorker.getRegistration();
  return existant ?? navigator.serviceWorker.register('/sw.js');
}

export async function etatPush(): Promise<EtatPush> {
  if (!pushDisponible()) return 'INDISPONIBLE';
  if (Notification.permission === 'denied') return 'REFUSE';
  if (!(await clePublique())) return 'NON_CONFIGURE';
  const reg = await navigator.serviceWorker.getRegistration();
  const abo = await reg?.pushManager.getSubscription();
  return abo ? 'ACTIF' : 'INACTIF';
}

/**
 * Active les alertes sur cet appareil : demande la permission, souscrit auprès
 * du relais du navigateur, puis enregistre l'abonnement en base.
 */
export async function activerPush(): Promise<EtatPush> {
  if (!pushDisponible()) return 'INDISPONIBLE';

  const cle = await clePublique();
  if (!cle) return 'NON_CONFIGURE';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'REFUSE' : 'INACTIF';

  const reg = await enregistrementSW();
  await navigator.serviceWorker.ready;

  const abo =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: versOctets(cle) as BufferSource,
    }));

  const brut = abo.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!brut.endpoint || !brut.keys?.p256dh || !brut.keys.auth) return 'INACTIF';

  const { data: session } = await supabase.auth.getUser();
  const { data: moi } = await supabase
    .from('at_utilisateurs')
    .select('id, organisation_id')
    .eq('user_id', session.user?.id ?? '')
    .maybeSingle();
  if (!moi) throw new Error('Compte non rattaché à une organisation');

  const { error } = await supabase.from('at_abonnements_push').upsert(
    {
      organisation_id: moi.organisation_id,
      utilisateur_id: moi.id,
      endpoint: brut.endpoint,
      p256dh: brut.keys.p256dh,
      auth: brut.keys.auth,
      appareil: navigator.userAgent.slice(0, 160),
      actif: true,
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw new Error(error.message);
  return 'ACTIF';
}

/** Coupe les alertes sur cet appareil (les autres appareils restent abonnés). */
export async function desactiverPush(): Promise<EtatPush> {
  const reg = await navigator.serviceWorker.getRegistration();
  const abo = await reg?.pushManager.getSubscription();
  if (abo) {
    await supabase.from('at_abonnements_push').delete().eq('endpoint', abo.endpoint);
    await abo.unsubscribe();
  }
  return 'INACTIF';
}
