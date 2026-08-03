import { useState } from 'react';
import { Boxes, FileOutput, Truck, Trash2, CalendarClock } from 'lucide-react';
import { useAuthz } from '../../lib/authz';
import { ParcsMateriel } from './ParcsMateriel';
import { AutorisationsSortie } from './AutorisationsSortie';
import { VehiculesMouvements } from './VehiculesMouvements';
import { EvacuationsControle } from './EvacuationsControle';
import { Livraisons } from './Livraisons';

type SousVue = 'parcs' | 'sorties' | 'vehicules' | 'evacuations' | 'livraisons';

/**
 * Chaque sous-onglet ne s'affiche que si le rôle porte l'un des pouvoirs qui le
 * concernent (les mêmes qui gardent les actions du sous-écran). Un Chef de poste
 * (RECEPTIONNER) ne voit ainsi que Livraisons et le contrôle véhicules/
 * évacuations au poste, pas les parcs ni les sorties.
 */
interface OngletDef {
  v: SousVue;
  label: string;
  icon: React.ReactNode;
  pouvoirs: string[];
}

const ONGLETS: OngletDef[] = [
  { v: 'parcs', label: 'Entrée & dotation', icon: <Boxes className="h-4 w-4" />, pouvoirs: ['DECLARER_MATERIEL'] },
  { v: 'sorties', label: 'Sorties', icon: <FileOutput className="h-4 w-4" />, pouvoirs: ['DEMANDER_SORTIE', 'VISER_SORTIE', 'APPROUVER_SORTIE'] },
  { v: 'vehicules', label: 'Véhicules', icon: <Truck className="h-4 w-4" />, pouvoirs: ['CONTROLER_AU_POSTE', 'GERER_VEHICULE'] },
  { v: 'evacuations', label: 'Évacuations', icon: <Trash2 className="h-4 w-4" />, pouvoirs: ['AUTORISER_EVACUATION', 'CONTROLER_AU_POSTE'] },
  { v: 'livraisons', label: 'Livraisons', icon: <CalendarClock className="h-4 w-4" />, pouvoirs: ['DEMANDER_LIVRAISON', 'VALIDER_CRENEAU', 'RECEPTIONNER'] },
];

export function Materiel() {
  const { connecte, aUn } = useAuthz();
  const [sousVue, setSousVue] = useState<SousVue>('parcs');

  // Hors session (démo) on montre tout ; connecté, seulement les onglets du rôle.
  const visibles = ONGLETS.filter((o) => !connecte || aUn(o.pouvoirs));
  // Onglet affiché : le choisi s'il reste autorisé, sinon le premier disponible.
  const actif: SousVue = visibles.some((o) => o.v === sousVue) ? sousVue : (visibles[0]?.v ?? 'parcs');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="sticky top-14 z-20 overflow-x-auto bg-sand-100/85 px-4 py-3 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max gap-1.5 rounded-full bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {visibles.map((o) => onglet(o.v, o.label, o.icon))}
        </div>
      </div>

      {actif === 'parcs' && <ParcsMateriel />}
      {actif === 'sorties' && <AutorisationsSortie />}
      {actif === 'vehicules' && <VehiculesMouvements />}
      {actif === 'evacuations' && <EvacuationsControle />}
      {actif === 'livraisons' && <Livraisons />}
    </div>
  );

  function onglet(v: SousVue, label: string, icon: React.ReactNode) {
    return (
      <button
        key={v}
        onClick={() => setSousVue(v)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-150 ease-premium ${
          actif === v ? 'bg-forest-500 text-white shadow-soft' : 'text-muted hover:text-ink'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }
}
