import { useState } from 'react';
import { Users, CreditCard, Layers } from 'lucide-react';
import { Personnel } from './Personnel';
import { BadgesNominatifs } from './BadgesNominatifs';
import { Temporaires } from './Temporaires';

type SousVue = 'personnel' | 'nominatifs' | 'temporaires';

export function Badges() {
  const [sousVue, setSousVue] = useState<SousVue>('personnel');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="flex justify-center px-4 pt-6">
        <div className="flex gap-1 rounded-full bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('personnel', 'Personnel', <Users className="h-3.5 w-3.5" />)}
          {onglet('nominatifs', 'Nominatifs', <CreditCard className="h-3.5 w-3.5" />)}
          {onglet('temporaires', 'Temporaires & visiteurs', <Layers className="h-3.5 w-3.5" />)}
        </div>
      </div>

      {sousVue === 'personnel' && <Personnel />}
      {sousVue === 'nominatifs' && <BadgesNominatifs />}
      {sousVue === 'temporaires' && <Temporaires />}
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
