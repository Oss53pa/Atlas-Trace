import { useState } from 'react';
import { Check, MapPin, ShieldCheck, ShieldAlert, Building } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import {
  EMPRISES,
  conditionsManquantes,
  donneurBloque,
  type DonneurOrdre,
} from '../../data/entreprises';

const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—');
const emprise = (id: string) => EMPRISES.find((e) => e.id === id);

export function DonneursOrdre({
  donneurs,
  setDonneurs,
}: {
  donneurs: DonneurOrdre[];
  setDonneurs: React.Dispatch<React.SetStateAction<DonneurOrdre[]>>;
}) {
  const [toast, setToast] = useState<string | null>(null);

  function toggle(donneurId: string, condId: string) {
    const etaitBloque = donneurs.find((d) => d.id === donneurId)?.conditions.some((c) => !c.rempli);
    const next = donneurs.map((d) =>
      d.id !== donneurId
        ? d
        : {
            ...d,
            conditions: d.conditions.map((c) =>
              c.id === condId
                ? { ...c, rempli: !c.rempli, date: !c.rempli ? '2026-07-29' : undefined }
                : c,
            ),
          },
    );
    setDonneurs(next);
    const d = next.find((x) => x.id === donneurId)!;
    if (etaitBloque && !donneurBloque(d)) {
      setToast(`${d.libelle} — dernière condition levée · accès autorisé · notifié`);
      setTimeout(() => setToast(null), 3000);
    }
  }

  const autorises = donneurs.filter((d) => !donneurBloque(d)).length;
  const bloques = donneurs.length - autorises;
  const condManquantes = donneurs.reduce((s, d) => s + conditionsManquantes(d).length, 0);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          <Building className="h-3.5 w-3.5" /> M2 · Preneurs
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
          Preneurs &amp; conditions bloquantes
        </h1>
        <p className="mt-1 text-sm text-muted">
          État des baux, encaissements et dossiers par cellule. Statut d'accès calculé, toute bascule
          tracée et notifiée.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard tone="forest" label="Preneurs autorisés" value={autorises} icon={<ShieldCheck className="h-5 w-5" />} />
        <DangerStat label="Preneurs bloqués" value={bloques} />
        <StatCard tone="amber" label="Conditions manquantes" value={condManquantes} icon={<ShieldAlert className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {donneurs.map((d) => (
          <CarteDonneur key={d.id} d={d} onToggle={(condId) => toggle(d.id, condId)} />
        ))}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <ShieldCheck className="h-4 w-4" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function CarteDonneur({ d, onToggle }: { d: DonneurOrdre; onToggle: (condId: string) => void }) {
  const bloque = donneurBloque(d);
  const em = emprise(d.empriseId);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{d.libelle}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3 w-3" /> {em?.libelle} · zone {em?.zone}
          </p>
        </div>
        {bloque ? <Badge tone="danger" dot>Bloqué</Badge> : <Badge tone="forest" dot>Autorisé</Badge>}
      </div>

      <ul className="space-y-1">
        {d.conditions.map((c) => (
          <li key={c.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-sand-50">
            <button
              onClick={() => onToggle(c.id)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                c.rempli ? 'border-forest-500 bg-forest-500 text-white' : 'border-sand-400 bg-white text-transparent'
              }`}
              aria-label={c.rempli ? 'Rempli' : 'Manquant'}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
            <span className={`flex-1 text-xs ${c.rempli ? 'text-ink' : 'font-semibold text-danger-600'}`}>
              {c.libelle}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted">{c.rempli ? fmt(c.date) : 'manquant'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DangerStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <ShieldAlert className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
