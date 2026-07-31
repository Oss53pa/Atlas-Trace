import { useState } from 'react';
import { Building, FlaskConical, Cloud } from 'lucide-react';
import { EntreprisesLive } from './EntreprisesLive';
import { Entreprises } from './Entreprises';
import { DonneursOrdre } from './DonneursOrdre';
import { DONNEURS_ORDRE, type DonneurOrdre } from '../../data/entreprises';

type SousVue = 'entreprises' | 'donneurs' | 'demo';

export function Habilitations() {
  const [sousVue, setSousVue] = useState<SousVue>('entreprises');
  // État partagé du volet démo : les conditions saisies en M2 conditionnent la soumission en M1 (cas 20/21).
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>(DONNEURS_ORDRE);

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="flex justify-center px-4 pt-6">
        <div className="flex flex-wrap justify-center gap-1 rounded-3xl bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('entreprises', 'Entreprises', <Cloud className="h-3.5 w-3.5" />)}
          {onglet('donneurs', 'Donneurs d\'ordre', <Building className="h-3.5 w-3.5" />)}
          {onglet('demo', 'Démo cas 20/21', <FlaskConical className="h-3.5 w-3.5" />)}
        </div>
      </div>

      {sousVue === 'entreprises' && <EntreprisesLive />}
      {sousVue === 'donneurs' && <DonneursOrdre donneurs={donneurs} setDonneurs={setDonneurs} />}
      {sousVue === 'demo' && <Entreprises donneurs={donneurs} />}
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
