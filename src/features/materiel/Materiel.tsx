import { useState } from 'react';
import { Boxes, PackagePlus, FileOutput, Truck, Trash2, CalendarClock } from 'lucide-react';
import { ParcsMateriel } from './ParcsMateriel';
import { EntreesPonctuel } from './EntreesPonctuel';
import { AutorisationsSortie } from './AutorisationsSortie';
import { VehiculesMouvements } from './VehiculesMouvements';
import { EvacuationsControle } from './EvacuationsControle';
import { Livraisons } from './Livraisons';

type SousVue = 'parcs' | 'entrees' | 'sorties' | 'vehicules' | 'evacuations' | 'livraisons';

export function Materiel() {
  const [sousVue, setSousVue] = useState<SousVue>('parcs');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="sticky top-14 z-20 overflow-x-auto bg-sand-100/85 px-4 py-3 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max gap-1.5 rounded-full bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('parcs', 'Entrée & dotation', <Boxes className="h-4 w-4" />)}
          {onglet('entrees', 'Entrées ponctuelles', <PackagePlus className="h-4 w-4" />)}
          {onglet('sorties', 'Sorties', <FileOutput className="h-4 w-4" />)}
          {onglet('vehicules', 'Véhicules', <Truck className="h-4 w-4" />)}
          {onglet('evacuations', 'Évacuations', <Trash2 className="h-4 w-4" />)}
          {onglet('livraisons', 'Livraisons', <CalendarClock className="h-4 w-4" />)}
        </div>
      </div>

      {sousVue === 'parcs' && <ParcsMateriel />}
      {sousVue === 'entrees' && <EntreesPonctuel />}
      {sousVue === 'sorties' && <AutorisationsSortie />}
      {sousVue === 'vehicules' && <VehiculesMouvements />}
      {sousVue === 'evacuations' && <EvacuationsControle />}
      {sousVue === 'livraisons' && <Livraisons />}
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
