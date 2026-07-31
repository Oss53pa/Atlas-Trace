import { useState } from 'react';
import { UserCog, Link2, ShieldCheck, FileWarning } from 'lucide-react';
import { Comptes } from './Comptes';
import { LiensExternes } from './LiensExternes';
import { JournalAudit } from './JournalAudit';
import { ModeDegrade } from './ModeDegrade';

type SousVue = 'comptes' | 'liens' | 'audit' | 'degrade';

export function Administration() {
  const [sousVue, setSousVue] = useState<SousVue>('comptes');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="flex justify-center px-4 pt-6">
        <div className="flex flex-wrap justify-center gap-1 rounded-3xl bg-white/90 p-1 shadow-card ring-1 ring-sand-300">
          {onglet('comptes', 'Comptes & rôles', <UserCog className="h-3.5 w-3.5" />)}
          {onglet('liens', 'Liens externes', <Link2 className="h-3.5 w-3.5" />)}
          {onglet('audit', 'Journal d\'audit', <ShieldCheck className="h-3.5 w-3.5" />)}
          {onglet('degrade', 'Mode dégradé', <FileWarning className="h-3.5 w-3.5" />)}
        </div>
      </div>

      {sousVue === 'comptes' && <Comptes />}
      {sousVue === 'liens' && <LiensExternes />}
      {sousVue === 'audit' && <JournalAudit />}
      {sousVue === 'degrade' && <ModeDegrade />}
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
