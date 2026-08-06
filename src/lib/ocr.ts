/**
 * Lecture OCR d'une plaque d'immatriculation depuis une photo (data URL).
 * Tesseract est chargé à la demande — il n'alourdit pas le démarrage de l'app.
 * L'OCR n'est jamais parfait : le champ reste éditable pour correction manuelle.
 */
export async function lirePlaque(image: string): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
    });
    const { data } = await worker.recognize(image);
    return nettoyerPlaque(data.text);
  } finally {
    await worker.terminate();
  }
}

/** Normalise le texte OCR en une plaque plausible (majuscules, alphanumérique + tirets). */
function nettoyerPlaque(brut: string): string {
  const up = (brut || '').toUpperCase().replace(/[^A-Z0-9-\s]/g, ' ');
  // On retient le plus long groupe alphanumérique (la plaque), tirets conservés.
  const groupes = up.split(/\s+/).map((t) => t.trim()).filter((t) => t.replace(/-/g, '').length >= 4);
  const meilleur = groupes.sort((a, b) => b.replace(/-/g, '').length - a.replace(/-/g, '').length)[0] ?? up.trim();
  return meilleur.replace(/\s+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
