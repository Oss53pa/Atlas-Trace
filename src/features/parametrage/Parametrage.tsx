import { useState } from 'react';
import { Layers, GitBranch, SlidersHorizontal } from 'lucide-react';
import { ProfilSite } from './ProfilSite';
import { Circuits } from './Circuits';
import { Referentiels } from './Referentiels';

type SousVue = 'profil' | 'circuits' | 'referentiels';

export function Parametrage() {
  const [sousVue, setSousVue] = useState<SousVue>('profil');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="flex justify-center px-4 pt-6">
        <div className="flex flex-wrap justify-center gap-1 rounded-3xl bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('profil', 'Profil de site', <Layers className="h-3.5 w-3.5" />)}
          {onglet('circuits', 'Chaînes de validation', <GitBranch className="h-3.5 w-3.5" />)}
          {onglet('referentiels', 'Référentiels', <SlidersHorizontal className="h-3.5 w-3.5" />)}
        </div>
      </div>

      {sousVue === 'profil' && <ProfilSite />}
      {sousVue === 'circuits' && <Circuits />}
      {sousVue === 'referentiels' && <Referentiels />}
    </div>
  );

  function onglet(v: SousVue, label: string, icon: React.ReactNode) {
    return (
      <button onClick={() => setSousVue(v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${sousVue === v ? 'bg-forest-500 text-white' : 'text-muted'}`}>
        {icon}{label}
      </button>
    );
  }
}
