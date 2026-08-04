import { useMemo, useRef, useState } from 'react';
import { Key, Check, X, KeyRound, RotateCcw, AlertTriangle, MapPin, ClipboardCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import {
  CLES,
  DETENTEURS,
  MOUVEMENTS_CLE_INIT,
  type Cle,
  type MouvementCle,
  type StatutCle,
} from '../../data/cles';

export function ClesRegistre() {
  const [cles, setCles] = useState<Cle[]>(CLES);
  const [mouvements, setMouvements] = useState<MouvementCle[]>(MOUVEMENTS_CLE_INIT);
  const [remise, setRemise] = useState<Cle | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const horloge = useRef(9 * 60 + 12);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }
  function heure() {
    horloge.current += 4;
    return `${String(Math.floor(horloge.current / 60)).padStart(2, '0')}:${String(horloge.current % 60).padStart(2, '0')}`;
  }

  const stats = useMemo(() => ({
    total: cles.length,
    remises: cles.filter((c) => c.statut === 'REMISE' || c.statut === 'NON_RESTITUEE').length,
    nonRestituees: cles.filter((c) => c.statut === 'NON_RESTITUEE').length,
  }), [cles]);

  const nonRestituees = cles.filter((c) => c.statut === 'NON_RESTITUEE');

  function confirmerRemise(id: string, detenteur: string) {
    const h = heure();
    setCles((cs) => cs.map((c) => (c.id === id ? { ...c, statut: 'REMISE', detenteur, heureRemise: `31/07 ${h}`, remisePar: 'M. Koné' } : c)));
    const code = cles.find((c) => c.id === id)!.code;
    setMouvements((ms) => [{ id: `mc-${ms.length + 2}`, code, sens: 'REMISE', detenteur, agent: 'M. Koné', heure: h }, ...ms]);
    setRemise(null);
    flash('Clé remise · émargement recueilli');
  }

  function restituer(id: string) {
    const h = heure();
    const c = cles.find((x) => x.id === id)!;
    setCles((cs) => cs.map((x) => (x.id === id ? { ...x, statut: 'DISPONIBLE', detenteur: undefined, heureRemise: undefined, remisePar: undefined } : x)));
    setMouvements((ms) => [{ id: `mc-${ms.length + 2}`, code: c.code, sens: 'RESTITUTION', detenteur: c.detenteur ?? '—', agent: 'M. Koné', heure: h }, ...ms]);
    flash('Clé restituée');
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Clés & zones</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Clés &amp; zones sensibles</h1>
          <p className="mt-1 text-sm text-muted">
            Registre nominatif des remises et restitutions. Alerte sur toute clé non restituée.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard tone="forest" label="Clés au registre" value={stats.total} icon={<Key className="h-5 w-5" />} />
          <StatCard tone="amber" label="Remises (en circulation)" value={stats.remises} icon={<KeyRound className="h-5 w-5" />} />
          <DangerStat label="Non restituées" value={stats.nonRestituees} />
        </div>

        {nonRestituees.length > 0 && (
          <div className="mb-5 rounded-2xl bg-danger-50 px-4 py-3 ring-1 ring-danger-100">
            <p className="flex items-center gap-2 text-sm font-bold text-danger-600">
              <AlertTriangle className="h-4 w-4" /> {nonRestituees.length} clé(s) non restituée(s) — à relancer
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {nonRestituees.map((c) => (
                <Badge key={c.id} tone="danger" dot>{c.code} · {c.detenteur}</Badge>
              ))}
            </div>
          </div>
        )}

        <h2 className="mb-2 text-sm font-bold text-ink">Trousseau</h2>
        <ul className="space-y-2">
          {cles.map((c) => (
            <CleRow key={c.id} c={c} onRemettre={() => setRemise(c)} onRestituer={() => restituer(c.id)} />
          ))}
        </ul>

        {mouvements.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-sm font-bold text-ink">Registre des mouvements</h2>
            <ul className="space-y-1.5">
              {mouvements.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm shadow-card ring-1 ring-sand-300/70">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${m.sens === 'REMISE' ? 'bg-amber-500' : 'bg-forest-500'}`} />
                  <span className="font-mono text-xs font-semibold text-ink">{m.code}</span>
                  <span className="text-xs text-muted">{m.sens === 'REMISE' ? 'remise à' : 'restituée par'} {m.detenteur} · {m.agent}</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">{m.heure}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {remise && <RemiseSheet c={remise} onAnnuler={() => setRemise(null)} onConfirmer={confirmerRemise} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

const statutChip: Record<StatutCle, React.ReactNode> = {
  DISPONIBLE: <Badge tone="forest" dot>Disponible</Badge>,
  REMISE: <Badge tone="amber" dot>Remise</Badge>,
  NON_RESTITUEE: <Badge tone="danger" dot>Non restituée</Badge>,
};

function CleRow({ c, onRemettre, onRestituer }: { c: Cle; onRemettre: () => void; onRestituer: () => void }) {
  const remise = c.statut !== 'DISPONIBLE';
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ${c.statut === 'NON_RESTITUEE' ? 'ring-danger-200' : 'ring-sand-300/70'}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-forest-500 ring-1 ring-sand-200">
        <Key className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">
          <span className="font-mono">{c.code}</span> <span className="font-normal text-muted">· {c.libelle}</span>
        </p>
        <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {c.zone}</p>
        {remise && <p className="mt-0.5 text-[11px] text-muted">Détenteur : {c.detenteur} · depuis {c.heureRemise}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {statutChip[c.statut]}
        {remise ? (
          <Button variant="outline" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={onRestituer}>Restituer</Button>
        ) : (
          <Button variant="accent" size="sm" icon={<KeyRound className="h-4 w-4" />} onClick={onRemettre}>Remettre</Button>
        )}
      </div>
    </li>
  );
}

function DangerStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <AlertTriangle className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function RemiseSheet({ c, onAnnuler, onConfirmer }: { c: Cle; onAnnuler: () => void; onConfirmer: (id: string, detenteur: string) => void }) {
  const [detenteur, setDetenteur] = useState(DETENTEURS[0]);
  const [emargement, setEmargement] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Remise de clé</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted"><span className="font-mono font-semibold text-ink">{c.code}</span> · {c.libelle} · {c.zone}</p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Détenteur</span>
          <select value={detenteur} onChange={(e) => setDetenteur(e.target.value)}
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {DETENTEURS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>

        <button onClick={() => setEmargement((v) => !v)}
          className={`mt-3 flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${emargement ? 'border-forest-200 bg-forest-50 text-forest-700' : 'border-sand-300 bg-white text-muted'}`}>
          {emargement ? <Check className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
          Émargement recueilli
        </button>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!emargement} onClick={() => onConfirmer(c.id, detenteur)}>
            Confirmer la remise
          </Button>
        </div>
      </div>
    </div>
  );
}
