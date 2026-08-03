import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square, Wand2 } from 'lucide-react';
import { concatener, mettreAuPropre } from '../../lib/dictee';

/** Le type n'est pas dans les définitions standard de TypeScript. */
interface ReconnaissanceVocale extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Constructeur = new () => ReconnaissanceVocale;

function moteur(): Constructeur | null {
  const w = window as unknown as { SpeechRecognition?: Constructeur; webkitSpeechRecognition?: Constructeur };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERREURS: Record<string, string> = {
  'not-allowed': 'Micro refusé — autorisez-le dans le navigateur.',
  'service-not-allowed': 'Micro refusé — autorisez-le dans le navigateur.',
  'audio-capture': 'Aucun micro détecté sur cet appareil.',
  network: 'Réseau indisponible — la dictée nécessite une connexion sur cet appareil.',
  'no-speech': 'Rien n’a été entendu.',
};

interface DicteeVocaleProps {
  valeur: string;
  onChange: (v: string) => void;
  /** Désactive la dictée (champ en lecture seule). */
  desactive?: boolean;
  label?: string;
}

/**
 * Dictée vocale : reconnaissance native du navigateur (celle du clavier
 * Android / de Chrome), puis mise au propre locale du texte. Rien ne sort de
 * l'appareil hormis ce que le moteur vocal du navigateur traite lui-même.
 */
export function DicteeVocale({ valeur, onChange, desactive, label = 'Dicter' }: DicteeVocaleProps) {
  const [ecoute, setEcoute] = useState(false);
  const [partiel, setPartiel] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const recRef = useRef<ReconnaissanceVocale | null>(null);
  const baseRef = useRef('');
  const dispo = !!moteur();

  // On coupe le micro si le composant disparaît (fermeture de la feuille).
  useEffect(() => {
    return () => recRef.current?.stop();
  }, []);

  function demarrer() {
    const M = moteur();
    if (!M) return;
    setErreur(null);
    baseRef.current = valeur;
    const rec = new M();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let fige = '';
      let encours = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fige += r[0].transcript;
        else encours += r[0].transcript;
      }
      setPartiel(encours);
      if (fige) {
        baseRef.current = concatener(baseRef.current, mettreAuPropre(fige));
        onChange(baseRef.current);
      }
    };
    rec.onerror = (e) => {
      if (e.error !== 'no-speech') setEcoute(false);
      setErreur(ERREURS[e.error] ?? `Dictée interrompue (${e.error}).`);
    };
    rec.onend = () => {
      setEcoute(false);
      setPartiel('');
    };

    recRef.current = rec;
    rec.start();
    setEcoute(true);
  }

  function arreter() {
    recRef.current?.stop();
    setEcoute(false);
    setPartiel('');
  }

  if (!dispo) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
        <MicOff className="h-3.5 w-3.5" /> Dictée indisponible sur ce navigateur — saisie au clavier.
      </p>
    );
  }

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={desactive}
          onClick={ecoute ? arreter : demarrer}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            ecoute
              ? 'bg-danger-500 text-white shadow-soft'
              : 'bg-forest-50 text-forest-700 ring-1 ring-inset ring-forest-200 hover:bg-forest-100'
          }`}
        >
          {ecoute ? (
            <>
              <Square className="h-3.5 w-3.5" fill="currentColor" /> Arrêter
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" /> {label}
            </>
          )}
        </button>

        <button
          type="button"
          disabled={desactive || !valeur.trim()}
          onClick={() => onChange(mettreAuPropre(valeur))}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted ring-1 ring-inset ring-sand-300 transition-colors hover:bg-sand-100 hover:text-ink disabled:opacity-50"
          title="Ponctuation, majuscules, espaces"
        >
          <Wand2 className="h-3.5 w-3.5" /> Mettre au propre
        </button>

        {ecoute && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-danger-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger-500" /> À l’écoute…
          </span>
        )}
      </div>

      {partiel && <p className="mt-1 text-[11px] italic text-muted">« {partiel} »</p>}
      {erreur && <p className="mt-1 text-[11px] font-semibold text-amber-700">{erreur}</p>}
      {!erreur && !partiel && (
        <p className="mt-1 text-[11px] text-muted">
          Dites « virgule », « point », « à la ligne » — la ponctuation est écrite pour vous.
        </p>
      )}
    </div>
  );
}
