import { useState } from 'react';
import {
  Landmark, Compass, ShieldCheck, HardHat, Store, ArrowRight, ArrowLeft, Link2, UserCog,
  Layers, KeyRound, ArrowUpRight, Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { MODULES_PARTAGES, PERSONAS, type Persona } from '../../data/espaces';

const ICONE: Record<string, React.ReactNode> = {
  moa: <Landmark className="h-6 w-6" />, moe: <Compass className="h-6 w-6" />,
  securite: <ShieldCheck className="h-6 w-6" />, entreprises: <HardHat className="h-6 w-6" />,
  preneurs: <Store className="h-6 w-6" />,
};

export function Espaces({ onOpen }: { onOpen: (vue: string) => void }) {
  const [sel, setSel] = useState<Persona | null>(null);
  if (sel) return <Atelier persona={sel} onRetour={() => setSel(null)} onOpen={onOpen} />;
  return <Selecteur onChoisir={setSel} />;
}

function Selecteur({ onChoisir }: { onChoisir: (p: Persona) => void }) {
  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700 ring-1 ring-forest-100"><Users className="h-3.5 w-3.5" /> Un espace par groupe d’acteurs</span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Espaces Atlas Trace</h1>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted">Chaque groupe a son interface, son tableau de bord et ses fonctions propres. Les briques métier sont communes et factorisées — seule leur composition change.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <button key={p.id} onClick={() => onChoisir(p)} className="group flex items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-sand-300/70 transition-all hover:-translate-y-0.5 hover:ring-forest-300">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: p.hex }}>{ICONE[p.id]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold text-ink">{p.nom}</p>
                  {p.acces === 'LIEN' ? <Badge tone="amber"><Link2 className="h-3 w-3" /> Accès par lien</Badge> : <Badge tone="forest">Compte interne</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">{p.sousTitre}</p>
                {p.invitePar && <p className="mt-1 text-[11px] text-muted">Invité par la {p.invitePar}</p>}
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest-600">Ouvrir l’espace <ArrowRight className="h-3.5 w-3.5" /></span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <p className="flex items-center gap-2 text-sm font-bold text-ink"><Layers className="h-4 w-4 text-forest-500" /> Briques communes (factorisées)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{MODULES_PARTAGES.map((m) => <span key={m} className="rounded-full bg-forest-50 px-2.5 py-0.5 text-[11px] font-semibold text-forest-700">{m}</span>)}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <p className="flex items-center gap-2 text-sm font-bold text-ink"><UserCog className="h-4 w-4 text-amber-500" /> Entité vs référent</p>
            <p className="mt-1 text-xs text-muted">La <b className="text-ink">MOA invite</b> le référent de chaque groupe. Un changement de référent régénère le lien d’accès — <b className="text-ink">les données de l’entité demeurent</b>, jamais recréées.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const tonBg: Record<string, string> = { forest: 'bg-forest-500 text-white', amber: 'bg-amber-500 text-white', danger: 'bg-danger-500 text-white', plain: 'bg-white text-ink' };

function Atelier({ persona, onRetour, onOpen }: { persona: Persona; onRetour: () => void; onOpen: (vue: string) => void }) {
  return (
    <div className="min-h-screen bg-sand-100">
      {/* En-tête de l'espace (shell partagé) */}
      <div className="px-5 py-5 text-white" style={{ background: persona.hex }}>
        <div className="mx-auto max-w-5xl">
          <button onClick={onRetour} className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Tous les espaces</button>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">{ICONE[persona.id]}</span>
            <div>
              <p className="text-lg font-extrabold">Espace {persona.nom}</p>
              <p className="text-xs text-white/85">{persona.sousTitre}</p>
            </div>
            <span className="ml-auto">{persona.acces === 'LIEN' ? <Badge tone="amber"><Link2 className="h-3 w-3" /> Accès par lien</Badge> : <Badge tone="forest">Compte interne</Badge>}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-8">
        {/* Tableau de bord propre */}
        <h2 className="mb-2 text-sm font-bold text-ink">Tableau de bord</h2>
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {persona.kpis.map((k) => (
            <div key={k.label} className={`rounded-2xl border border-sand-300/50 p-4 shadow-card ${tonBg[k.ton]}`}>
              <p className={`text-xs font-medium ${k.ton === 'plain' ? 'text-muted' : 'text-white/85'}`}>{k.label}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">{k.valeur}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
          {/* Modules propres */}
          <div>
            <h2 className="mb-2 text-sm font-bold text-ink">Ses modules</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {persona.modules.map((m) => (
                <button key={m.code} onClick={() => onOpen(m.vue)} className="group flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card ring-1 ring-sand-300/70 transition-all hover:-translate-y-0.5 hover:ring-forest-300">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: persona.hex }}><ArrowUpRight className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{m.code}</p>
                    <p className="truncate text-sm font-bold text-ink">{m.nom}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-sand-400 group-hover:text-forest-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Fonctions propres + accès */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink"><KeyRound className="h-4 w-4 text-forest-500" /> Fonctions propres</p>
              <ul className="space-y-1.5">{persona.fonctionnalites.map((f) => <li key={f} className="flex items-start gap-2 text-xs text-ink"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: persona.hex }} />{f}</li>)}</ul>
            </div>
            <div className="rounded-2xl bg-forest-50 p-4 ring-1 ring-forest-100">
              <p className="text-xs font-bold text-forest-700">{persona.acces === 'LIEN' ? 'Accès par lien unique' : 'Compte interne'}</p>
              <p className="mt-1 text-[11px] text-muted">{persona.invitePar ? `Invité par la ${persona.invitePar}. ` : 'Administrateur racine. '}{persona.acces === 'LIEN' ? 'Sans compte ni mot de passe ; le lien est révocable et régénérable, sans perte de l’entité.' : 'Rôles composés de pouvoirs atomiques, périmètre par site ou emprise.'}</p>
            </div>
            {persona.sousGroupes && (
              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-xs font-bold text-amber-800">Sous-groupes</p>
                <p className="mt-1 text-[11px] text-amber-800">{persona.sousGroupes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
