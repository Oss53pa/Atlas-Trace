import { useState } from 'react';
import { GitBranch, Check, Flag, Trash2, Save, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { CIRCUITS, type Circuit, type EtapeCircuit } from '../../data/parametrage';

export function Circuits() {
  const [circuits, setCircuits] = useState<Circuit[]>(CIRCUITS);
  const [selId, setSelId] = useState(CIRCUITS[0].id);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const circuit = circuits.find((c) => c.id === selId)!;

  function majEtapes(fn: (e: EtapeCircuit[]) => EtapeCircuit[]) {
    setCircuits((cs) => cs.map((c) => (c.id === selId ? { ...c, etapes: fn(c.etapes) } : c)));
    setErreur(null);
  }
  function toggleEffet(ordre: number) {
    majEtapes((es) => es.map((e) => (e.ordre === ordre ? { ...e, effetFinal: !e.effetFinal } : e)));
  }
  function supprimer(ordre: number) {
    majEtapes((es) => es.filter((e) => e.ordre !== ordre).map((e, i) => ({ ...e, ordre: i + 1 })));
  }

  function enregistrer() {
    // Cas 38 : un circuit sans étape à effet final est invalide.
    if (!circuit.etapes.some((e) => e.effetFinal)) {
      setErreur('Chaîne invalide : aucune étape à effet final. Enregistrement rejeté.');
      return;
    }
    setCircuits((cs) => cs.map((c) => (c.id === selId ? { ...c, version: c.version + 1 } : c)));
    setToast('Circuit enregistré · nouvelle version. Les objets en cours restent régis par la version antérieure.');
    setTimeout(() => setToast(null), 3600);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><GitBranch className="h-3.5 w-3.5" /> M19 · Paramétrage</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Chaînes de validation</h1>
        <p className="mt-1 text-sm text-muted">
          Une séquence ordonnée d'étapes, éditable. Le franchissement de l'étape à effet final génère le code / active l'objet.
        </p>
      </div>

      {/* Sélecteur d'objet */}
      <div className="mb-4 flex flex-wrap gap-2">
        {circuits.map((c) => (
          <button key={c.id} onClick={() => { setSelId(c.id); setErreur(null); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-inset transition-colors ${selId === c.id ? 'bg-forest-500 text-white ring-forest-500' : 'bg-white text-ink ring-sand-300 hover:bg-forest-50'}`}>
            {c.objet} <span className="text-[11px] opacity-70">v{c.version}</span>
          </button>
        ))}
      </div>

      {/* Étapes */}
      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
        <ul className="space-y-2">
          {circuit.etapes.map((e, i) => (
            <li key={e.ordre} className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-500 text-xs font-bold text-white">{e.ordre}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{e.role}</p>
                <p className="text-xs text-muted">{e.nature === 'VISA' ? 'Visa' : 'Approbation'}</p>
              </div>
              <button onClick={() => toggleEffet(e.ordre)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset transition-colors ${e.effetFinal ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-white text-muted ring-sand-300'}`}>
                <Flag className="h-3 w-3" /> Effet final {e.effetFinal && <Check className="h-3 w-3" />}
              </button>
              <button onClick={() => supprimer(e.ordre)} className="text-muted hover:text-danger-500"><Trash2 className="h-4 w-4" /></button>
              {i < circuit.etapes.length - 1 && <ArrowRight className="hidden h-3 w-3 text-muted sm:block" />}
            </li>
          ))}
        </ul>
        {circuit.etapes.length === 0 && <p className="py-4 text-center text-sm text-muted">Aucune étape.</p>}
      </div>

      {erreur && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
          <AlertTriangle className="h-4 w-4" /> {erreur}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted">
          {circuit.etapes.some((e) => e.effetFinal) ? <span className="inline-flex items-center gap-1 text-forest-600"><Check className="h-3.5 w-3.5" /> Étape à effet final présente</span> : <span className="inline-flex items-center gap-1 text-danger-500"><AlertTriangle className="h-3.5 w-3.5" /> Aucune étape à effet final</span>}
        </p>
        <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={enregistrer}>Enregistrer le circuit</Button>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}
