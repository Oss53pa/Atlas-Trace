import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Calendar, Loader2, LogIn } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthz } from '../../lib/authz';
import { chargerRegistres, type DepotEntreprise, type StatutListe } from './api';

const CFG: Record<StatutListe, { tone: 'forest' | 'amber' | 'danger' | 'neutral'; label: string }> = {
  DEPOSEE: { tone: 'forest', label: 'Enregistré' },
  HORS_DELAI: { tone: 'amber', label: 'Après l’heure' },
  MANQUANTE: { tone: 'danger', label: 'Non déposé' },
  ATTENDUE: { tone: 'neutral', label: 'Attendu' },
};

export function SuiviDepots() {
  const { connecte } = useAuthz();
  const [depots, setDepots] = useState<DepotEntreprise[]>([]);
  const [dateLabel, setDateLabel] = useState<string>('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!connecte) { setChargement(false); return; }
    let annule = false;
    setChargement(true);
    chargerRegistres()
      .then((r) => { if (annule) return; setDepots(r.depots); setDateLabel(r.dateLabel); setErreur(null); })
      .catch((e) => { if (!annule) setErreur((e as Error).message); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [connecte]);

  const stats = useMemo(() => {
    const s = { deposees: 0, horsDelai: 0, manquantes: 0 };
    for (const d of depots) {
      if (d.statut === 'DEPOSEE') s.deposees += 1;
      else if (d.statut === 'HORS_DELAI') s.horsDelai += 1;
      else if (d.statut === 'MANQUANTE') s.manquantes += 1;
    }
    return s;
  }, [depots]);

  const defaillantes = depots.filter((d) => d.statut === 'MANQUANTE' || d.statut === 'HORS_DELAI');

  if (!connecte) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60"><LogIn className="h-7 w-7" /></span>
        <p className="text-base font-bold text-ink">Connexion requise</p>
        <p className="text-sm">Le suivi des registres de présence agrège les données réelles du site.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Registre de présence</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Registre de présence — suivi</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> {dateLabel || (chargement ? '' : 'Aucun registre déposé')}
          </span>
          {chargement && (
            <span className="inline-flex items-center gap-1.5 text-forest-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </span>
          )}
        </p>
        {erreur && (
          <p className="mt-2 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>
        )}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard tone="forest" label="Déposées" value={stats.deposees} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard tone="amber" label="Hors délai" value={stats.horsDelai} icon={<AlertTriangle className="h-5 w-5" />} />
        <DangerCard value={stats.manquantes} />
      </div>

      {defaillantes.length > 0 && (
        <div className="mb-5 rounded-2xl border border-danger-100 bg-danger-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-danger-600">
            <AlertTriangle className="h-4 w-4" />
            {defaillantes.length} entreprise(s) défaillante(s) — à relancer
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {defaillantes.map((d) => (
              <Badge key={d.entreprise} tone={d.statut === 'MANQUANTE' ? 'danger' : 'amber'} dot>
                {d.entreprise} · {CFG[d.statut].label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-sand-300/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-sand-300/70 text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-semibold">Entreprise</th>
                <th className="px-4 py-2.5 font-semibold">Statut</th>
                <th className="px-4 py-2.5 font-semibold">Effectif déclaré</th>
                <th className="px-4 py-2.5 font-semibold">Heure de dépôt</th>
                <th className="px-4 py-2.5 font-semibold">Déposé par</th>
              </tr>
            </thead>
            <tbody>
              {depots.map((d) => (
                <LigneDepot key={d.entreprise} d={d} />
              ))}
              {depots.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                    {chargement ? 'Chargement…' : 'Aucun registre déposé pour l’instant.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        Statuts indicatifs : aucun verrouillage horaire. Le registre reste vivant — un dépôt plus tard
        dans la journée est normal, et le référent ajoute, retire ou remplace à tout moment.
      </p>
    </div>
  );
}

function LigneDepot({ d }: { d: DepotEntreprise }) {
  const c = CFG[d.statut];
  const defaillante = d.statut === 'MANQUANTE' || d.statut === 'HORS_DELAI';
  return (
    <tr className={`border-b border-sand-200 last:border-0 ${defaillante ? 'bg-danger-50/40' : 'hover:bg-sand-50'}`}>
      <td className="px-4 py-3 font-semibold text-ink">{d.entreprise}</td>
      <td className="px-4 py-3">
        <Badge tone={c.tone} dot>
          {c.label}
        </Badge>
      </td>
      <td className="px-4 py-3 tabular-nums text-ink">{d.effectif ?? <span className="text-muted">—</span>}</td>
      <td className="px-4 py-3 tabular-nums text-muted">{d.heureDepot ?? '—'}</td>
      <td className="px-4 py-3 text-muted">{d.auteur ?? '—'}</td>
    </tr>
  );
}

function DangerCard({ value }: { value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/80">Manquantes</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <XCircle className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
