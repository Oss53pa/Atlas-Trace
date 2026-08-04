/**
 * Alerte sonore in-app (Web Audio, aucun fichier à charger). Une paire de bips
 * montants ; répétée pour une alerte urgente. Le contexte audio est « débloqué »
 * au premier geste de l'utilisateur (politique d'autoplay des navigateurs).
 */
let ctx: AudioContext | null = null;

function contexte(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** À appeler une fois sur un geste utilisateur pour autoriser le son ensuite. */
export function debloquerAudio(): void {
  contexte();
}

function bip(c: AudioContext, freq: number, debut: number, duree: number, gainMax = 0.18): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, debut);
  gain.gain.exponentialRampToValueAtTime(gainMax, debut + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  osc.connect(gain).connect(c.destination);
  osc.start(debut);
  osc.stop(debut + duree + 0.02);
}

/** Joue l'alerte. `urgent` = motif répété (plus insistant). */
export function jouerAlerte(urgent = false): void {
  const c = contexte();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  const repetitions = urgent ? [0, 0.28, 0.56] : [0];
  for (const d of repetitions) {
    bip(c, 880, t0 + d, 0.12);
    bip(c, 1320, t0 + d + 0.12, 0.14);
  }
}
