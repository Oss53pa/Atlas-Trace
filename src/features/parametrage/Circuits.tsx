import { useCallback, useEffect, useState } from 'react';
import { GitBranch, Check, Flag, Trash2, Save, AlertTriangle, ArrowRight, Loader2, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuthz } from '../../lib/authz';
import { chargerCircuits, enregistrerCircuit, type Circuit, type EtapeCircuit } from './api';

export function Circuits() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutEditer = a('ADMINISTRER_ORGANISATION');

  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [selCle, setSelCle] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    try {
      const cs = await chargerCircuits();
      setCircuits(cs);
      setSelCle((cur) => cur ?? cs[0]?.cle ?? null);
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (!connecte) {
      setChargement(false);
      return;
    }
    rafraichir();
  }, [connecte, rafraichir]);

  const circuit = circuits.find((c) => c.cle === selCle) ?? null;

  function majEtapes(fn: (e: EtapeCircuit[]) => EtapeCircuit[]) {
    setCircuits((cs) => cs.map((c) => (c.cle === selCle ? { ...c, etapes: fn(c.etapes) } : c)));
    setErreur(null);
  }
  function toggleEffet(ordre: number) {
    majEtapes((es) => es.map((e) => (e.ordre === ordre ? { ...e, effetFinal: !e.effetFinal } : e)));
  }
  function supprimer(ordre: number) {
    majEtapes((es) => es.filter((e) => e.ordre !== ordre).map((e, i) => ({ ...e, ordre: i + 1 })));
  }

  async function enregistrer() {
    if (!circuit) return;
    if (!circuit.etapes.some((e) => e.effetFinal)) {
      setErreur('Chaîne invalide : aucune étape à effet final. Enregistrement rejeté.');
      return;
    }
    try {
      const res = await enregistrerCircuit(circuit.cle, circuit.etapes);
      setCircuits((cs) => cs.map((c) => (c.cle === circuit.cle ? { ...c, version: res.version } : c)));
      setToast(`Circuit enregistré · version ${res.version}. Les objets en cours restent régis par la version antérieure.`);
      setTimeout(() => setToast(null), 3600);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  if (authEnCours || chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!connecte) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60">
          <LogIn className="h-7 w-7" />
        </span>
        <p className="text-base font-bold text-ink">Connexion requise</p>
        <p className="text-sm">Les chaînes de validation sont une donnée de configuration du site.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><GitBranch className="h-3.5 w-3.5" /> Paramétrage</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Chaînes de validation</h1>
        <p className="mt-1 text-sm text-muted">
          Une séquence ordonnée d'étapes, éditable et versionnée en base. Le franchissement de l'étape à effet final génère le code / active l'objet.
        </p>
      </div>

      {erreur && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
          <AlertTriangle className="h-4 w-4" /> {erreur}
        </div>
      )}
      {!peutEditer && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          Lecture seule — l'édition des chaînes requiert le pouvoir ADMINISTRER_ORGANISATION.
        </p>
      )}

      {circuit && (
        <>
          {/* Sélecteur d'objet */}
          <div className="mb-4 flex flex-wrap gap-2">
            {circuits.map((c) => (
              <button key={c.cle} onClick={() => { setSelCle(c.cle); setErreur(null); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-inset transition-colors ${selCle === c.cle ? 'bg-forest-500 text-white ring-forest-500' : 'bg-white text-ink ring-sand-300 hover:bg-forest-50'}`}>
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
                  <button onClick={() => peutEditer && toggleEffet(e.ordre)} disabled={!peutEditer}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset transition-colors disabled:opacity-60 ${e.effetFinal ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-white text-muted ring-sand-300'}`}>
                    <Flag className="h-3 w-3" /> Effet final {e.effetFinal && <Check className="h-3 w-3" />}
                  </button>
                  {peutEditer && (
                    <button onClick={() => supprimer(e.ordre)} className="text-muted hover:text-danger-500" aria-label="Supprimer l'étape"><Trash2 className="h-4 w-4" /></button>
                  )}
                  {i < circuit.etapes.length - 1 && <ArrowRight className="hidden h-3 w-3 text-muted sm:block" />}
                </li>
              ))}
            </ul>
            {circuit.etapes.length === 0 && <p className="py-4 text-center text-sm text-muted">Aucune étape.</p>}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted">
              {circuit.etapes.some((e) => e.effetFinal)
                ? <span className="inline-flex items-center gap-1 text-forest-600"><Check className="h-3.5 w-3.5" /> Étape à effet final présente</span>
                : <span className="inline-flex items-center gap-1 text-danger-500"><AlertTriangle className="h-3.5 w-3.5" /> Aucune étape à effet final</span>}
            </p>
            {peutEditer && (
              <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={enregistrer}>Enregistrer le circuit</Button>
            )}
          </div>
        </>
      )}

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
