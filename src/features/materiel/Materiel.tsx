import { useState } from 'react';
import { Tag, PackagePlus, FileOutput, Truck, Trash2, CalendarClock } from 'lucide-react';
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
      <div className="flex justify-center px-4 pt-6">
        <div className="flex gap-1 rounded-full bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('parcs', 'Parcs & marquage', <Tag className="h-3.5 w-3.5" />)}
          {onglet('entrees', 'Entrées ponctuelles', <PackagePlus className="h-3.5 w-3.5" />)}
          {onglet('sorties', 'Sorties', <FileOutput className="h-3.5 w-3.5" />)}
          {onglet('vehicules', 'Véhicules', <Truck className="h-3.5 w-3.5" />)}
          {onglet('evacuations', 'Évacuations', <Trash2 className="h-3.5 w-3.5" />)}
          {onglet('livraisons', 'Livraisons', <CalendarClock className="h-3.5 w-3.5" />)}
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
