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
      <div className="sticky top-14 z-20 overflow-x-auto bg-sand-100/85 px-4 py-3 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max gap-1.5 rounded-full bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('personnel', 'Personnel', <Users className="h-4 w-4" />)}
          {onglet('nominatifs', 'Nominatifs', <CreditCard className="h-4 w-4" />)}
          {onglet('temporaires', 'Temporaires & visiteurs', <Layers className="h-4 w-4" />)}
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
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-150 ease-premium ${
          sousVue === v ? 'bg-forest-500 text-white shadow-soft' : 'text-muted hover:text-ink'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }
}
