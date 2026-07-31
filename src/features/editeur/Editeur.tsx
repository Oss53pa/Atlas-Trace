import { useState } from 'react';
import { Building, CreditCard, ShieldCheck, Boxes } from 'lucide-react';
import { OrganisationsEditeur } from './OrganisationsEditeur';
import { Abonnements } from './Abonnements';
import { AccesSupport } from './AccesSupport';

type SousVue = 'organisations' | 'abonnements' | 'support';

export function Editeur() {
  const [sousVue, setSousVue] = useState<SousVue>('organisations');

  return (
    <div className="min-h-screen bg-forest-900">
      {/* Bandeau contexte éditeur — niveau au-dessus des clients */}
      <div className="border-b border-forest-700 bg-forest-800 px-5 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-forest-500 text-white"><Boxes className="h-4 w-4" /></span>
          <div>
            <p className="brand-wordmark text-lg text-white">Atlas Studio</p>
            <p className="-mt-1 text-[11px] text-forest-200">Back office éditeur · supervision multi-organisations</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center px-4 pt-5">
        <div className="flex flex-wrap justify-center gap-1 rounded-3xl bg-white/95 p-1 shadow-card-lg ring-1 ring-forest-700">
          {onglet('organisations', 'Organisations', <Building className="h-3.5 w-3.5" />)}
          {onglet('abonnements', 'Abonnements', <CreditCard className="h-3.5 w-3.5" />)}
          {onglet('support', 'Accès support', <ShieldCheck className="h-3.5 w-3.5" />)}
        </div>
      </div>

      <div className="mt-2 rounded-t-[2rem] bg-sand-100 pt-2">
        {sousVue === 'organisations' && <OrganisationsEditeur />}
        {sousVue === 'abonnements' && <Abonnements />}
        {sousVue === 'support' && <AccesSupport />}
      </div>
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
