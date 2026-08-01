import { useState } from 'react';
import { LogIn, PackageOpen } from 'lucide-react';
import { PosteControle } from './PosteControle';
import { ControleSortie } from './ControleSortie';

type SousVue = 'acces' | 'sorties';

/**
 * Hauteur utile : l'écran occupe tout ce que le shell laisse (barre d'app 3.5rem
 * en haut, barre d'onglets 5.5rem en bas, safe-areas) — comme une page d'app.
 */
const HAUTEUR_UTILE =
  'h-[calc(100dvh_-_3.5rem_-_5.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))]';

export function PosteHub() {
  const [sousVue, setSousVue] = useState<SousVue>('acces');

  return (
    <div className={`flex flex-col ${HAUTEUR_UTILE}`}>
      {/* Sous-navigation M5 / M10 */}
      <div className="shrink-0 border-b border-sand-300/60 bg-sand-50 px-3 py-2">
        <div className="mx-auto flex max-w-md gap-1 rounded-2xl bg-sand-200 p-1">
          {onglet('acces', 'Accès (M5)', <LogIn className="h-3.5 w-3.5" />)}
          {onglet('sorties', 'Sorties matière (M10)', <PackageOpen className="h-3.5 w-3.5" />)}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-sand-100">
        {sousVue === 'acces' ? <PosteControle /> : <ControleSortie />}
      </div>
    </div>
  );

  function onglet(v: SousVue, label: string, icon: React.ReactNode) {
    return (
      <button
        onClick={() => setSousVue(v)}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
          sousVue === v ? 'bg-forest-500 text-white shadow-card' : 'text-muted'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }
}
