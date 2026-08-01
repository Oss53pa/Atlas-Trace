import { useState } from 'react';
import { LogIn, PackageOpen } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { PosteControle } from './PosteControle';
import { ControleSortie } from './ControleSortie';

type SousVue = 'acces' | 'sorties';

export function PosteHub() {
  const [sousVue, setSousVue] = useState<SousVue>('acces');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-200 via-sand-100 to-forest-50">
      <div className="flex min-h-screen flex-col items-center px-4 py-8">
        <Logo size="md" className="mb-3" />

        <div className="mb-4 flex gap-1 rounded-full bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('acces', 'Accès (M5)', <LogIn className="h-3.5 w-3.5" />)}
          {onglet('sorties', 'Sorties matière (M10)', <PackageOpen className="h-3.5 w-3.5" />)}
        </div>

        {/* Cadre téléphone — l'application vit sur le téléphone du poste (R1) */}
        <div className="h-[min(760px,calc(100dvh-9rem))] w-full max-w-[400px] overflow-hidden rounded-[2.5rem] border-8 border-forest-900 bg-sand-100 shadow-card-lg">
          {sousVue === 'acces' ? <PosteControle /> : <ControleSortie />}
        </div>

        <p className="mt-4 max-w-md text-center text-xs text-muted">
          {sousVue === 'acces'
            ? 'Contrôle des passages. Le bandeau « Simulation » remplace le scan caméra.'
            : 'Contrôle des sorties matière — trois chemins : autorisation approuvée, marquage opposable, ou refus (R1).'}
        </p>
      </div>
    </div>
  );

  function onglet(v: SousVue, label: string, icon: React.ReactNode) {
    return (
      <button
        onClick={() => setSousVue(v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
          sousVue === v ? 'bg-forest-500 text-white' : 'text-muted'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }
}
