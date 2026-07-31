import { useMemo } from 'react';
import { CreditCard, TrendingUp } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { ABONNEMENTS, type Abonnement, type StatutAbonnement } from '../../data/editeur';

const statutChip: Record<StatutAbonnement, React.ReactNode> = {
  ACTIF: <Badge tone="forest" dot>Actif</Badge>,
  ESSAI: <Badge tone="amber" dot>Essai</Badge>,
  IMPAYE: <Badge tone="danger" dot>Impayé</Badge>,
};

export function Abonnements() {
  const totaux = useMemo(() => ({
    mrr: ABONNEMENTS.reduce((s, a) => s + a.mrr, 0),
    actifs: ABONNEMENTS.filter((a) => a.statut === 'ACTIF').length,
    essais: ABONNEMENTS.filter((a) => a.statut === 'ESSAI').length,
  }), []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><CreditCard className="h-3.5 w-3.5" /> M20 · Éditeur</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Abonnements</h1>
        <p className="mt-1 text-sm text-muted">Abonnement mensuel par site actif, paliers sur le nombre de badges actifs. Options : postes supplémentaires, hébergement dédié.</p>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard tone="forest" label="MRR" value={`${totaux.mrr.toLocaleString('fr-FR')} k`} unit="FCFA / mois" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Abonnements actifs" value={totaux.actifs} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard tone="amber" label="En essai" value={totaux.essais} icon={<CreditCard className="h-5 w-5" />} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-sand-300/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-sand-300/70 text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-semibold">Organisation</th>
                <th className="px-4 py-2.5 font-semibold">Palier</th>
                <th className="px-4 py-2.5 font-semibold">Badges</th>
                <th className="px-4 py-2.5 font-semibold">Statut</th>
                <th className="px-4 py-2.5 font-semibold">Prochaine échéance</th>
                <th className="px-4 py-2.5 text-right font-semibold">MRR</th>
              </tr>
            </thead>
            <tbody>
              {ABONNEMENTS.map((a) => (
                <AbonnementRow key={a.organisationId} a={a} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AbonnementRow({ a }: { a: Abonnement }) {
  const pct = Math.min(100, (a.badgesActifs / a.badgesQuota) * 100);
  const proche = pct >= 85;
  return (
    <tr className="border-b border-sand-200 last:border-0 hover:bg-sand-50">
      <td className="px-4 py-3 font-semibold text-ink">{a.organisation}</td>
      <td className="px-4 py-3 text-muted">{a.palier}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-sand-200">
            <div className={`h-full rounded-full ${proche ? 'bg-amber-500' : 'bg-forest-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted">{a.badgesActifs}/{a.badgesQuota}</span>
        </div>
      </td>
      <td className="px-4 py-3">{statutChip[a.statut]}</td>
      <td className="px-4 py-3 tabular-nums text-muted">{a.prochaineEcheance}</td>
      <td className="px-4 py-3 text-right font-bold tabular-nums text-ink">{a.mrr > 0 ? `${a.mrr} k` : '—'}</td>
    </tr>
  );
}
