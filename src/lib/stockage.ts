import { supabase } from './supabase';

/** Photos de contrôle (coffres, sacs, chargements) — bucket privé, cloisonné par
 *  organisation via le préfixe de chemin <organisation_id>/... */

function dataUrlVersBlob(dataUrl: string): Blob {
  const [entete, b64] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(entete)?.[1] ?? 'image/jpeg';
  const bin = atob(b64 ?? '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Téléverse une photo et renvoie son chemin de stockage (à conserver en base). */
export async function televerserPhoto(dataUrl: string, organisationId: string, dossier: string): Promise<string> {
  const id = (crypto as { randomUUID?: () => string }).randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2);
  const chemin = `${organisationId}/${dossier}/${id}.jpg`;
  const { error } = await supabase.storage.from('at-photos').upload(chemin, dataUrlVersBlob(dataUrl), {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return chemin;
}

/** URL signée courte durée pour afficher une photo privée. */
export async function urlPhotoSignee(chemin: string, secondes = 600): Promise<string | null> {
  const { data, error } = await supabase.storage.from('at-photos').createSignedUrl(chemin, secondes);
  if (error) return null;
  return data?.signedUrl ?? null;
}
