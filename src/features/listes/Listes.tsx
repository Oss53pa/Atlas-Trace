import { useState } from 'react';
import { Smartphone, ClipboardList } from 'lucide-react';
import { ListeReferent } from './ListeReferent';
import { SuiviDepots } from './SuiviDepots';

type SousVue = 'referent' | 'suivi';

export function Listes() {
  const [sousVue, setSousVue] = useState<SousVue>('referent');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-200 via-sand-100 to-forest-50">
      {/* Sous-navigation M4 */}
      <div className="flex justify-center px-4 pt-6">
        <div className="flex gap-1 rounded-full bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('referent', 'Référent', <Smartphone className="h-3.5 w-3.5" />)}
          {onglet('suivi', 'Suivi encadrement', <ClipboardList className="h-3.5 w-3.5" />)}
        </div>
      </div>

      {sousVue === 'referent' ? (
        <div className="flex flex-col items-center px-4 pb-10 pt-4">
          <p className="mb-4 text-sm font-medium text-muted">M4 · Dépôt de la liste journalière</p>
          <div className="h-[780px] w-full max-w-[400px] overflow-hidden rounded-[2.5rem] border-[10px] border-forest-900 bg-sand-100 shadow-card-lg">
            <ListeReferent />
          </div>
          <p className="mt-5 max-w-md text-center text-xs text-muted">
            Écran du référent, ouvert depuis son lien unique. Basculez « Après 07:30 » (en haut) pour
            voir le verrouillage et l'ajout exceptionnel.
          </p>
        </div>
      ) : (
        <SuiviDepots />
      )}
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
