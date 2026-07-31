import { useMemo, useState } from 'react';
import {
  Users,
  UserMinus,
  XCircle,
  ShieldAlert,
  PackageCheck,
  TrendingDown,
  CreditCard,
  Radio,
  FileText,
  BellRing,
  Calendar,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Donut, ColumnChart, BarEffectif } from './charts';
import { MOUVEMENTS_JOUR } from '../../data/registre';
import {
  ALERTES,
  MATIERE_SENSIBLE,
  PASSAGES_HEURE,
  PRESENCE_ENTREPRISE,
  ROLES,
  type RoleId,
} from '../../data/tableau';

type Tone = 'forest' | 'amber' | 'danger' | 'plain';

export function Tableau() {
  const [role, setRole] = useState<RoleId>('direction');
  const [toast, setToast] = useState(false);

  const c = useMemo(() => {
    const presents = PRESENCE_ENTREPRISE.reduce((s, e) => s + e.entre, 0);
    const declares = PRESENCE_ENTREPRISE.reduce((s, e) => s + e.declare, 0);
    const autorises = MOUVEMENTS_JOUR.filter((m) => m.resultat === 'AUTORISE').length;
    const refus = MOUVEMENTS_JOUR.filter((m) => m.resultat === 'REFUSE').length;
    const forcages = MOUVEMENTS_JOUR.filter((m) => m.resultat === 'FORCE').length;
    const refsEcart = MATIERE_SENSIBLE.filter((r) => r.ecart < 0).length;
    return {
      presents,
      declares,
      ecart: declares - presents,
      autorises,
      refus,
      forcages,
      refsEcart,
      badges: ALERTES.find((a) => a.cle === 'badges')?.valeur ?? 0,
      sorties: ALERTES.find((a) => a.cle === 'sorties')?.valeur ?? 0,
    };
  }, []);

  const kpis: Array<{ id: string; label: string; value: number; unit?: string; tone: Tone; icon: React.ReactNode; roles: RoleId[] }> = [
    { id: 'presents', label: 'Présents sur site', value: c.presents, unit: `/ ${c.declares} déclarés`, tone: 'forest', icon: <Users className="h-5 w-5" />, roles: ['direction', 'poste', 'hse'] },
    { id: 'ecart', label: 'Écart déclaré / entré', value: c.ecart, tone: 'amber', icon: <UserMinus className="h-5 w-5" />, roles: ['direction', 'poste'] },
    { id: 'refus', label: 'Refus (24 h)', value: c.refus, tone: 'danger', icon: <XCircle className="h-5 w-5" />, roles: ['poste', 'hse'] },
    { id: 'forcages', label: 'Forçages (24 h)', value: c.forcages, tone: 'amber', icon: <ShieldAlert className="h-5 w-5" />, roles: ['poste', 'hse'] },
    { id: 'sorties', label: 'Sorties en attente', value: c.sorties, tone: 'amber', icon: <PackageCheck className="h-5 w-5" />, roles: ['direction'] },
    { id: 'matiere', label: 'Références en écart', value: c.refsEcart, tone: 'danger', icon: <TrendingDown className="h-5 w-5" />, roles: ['direction', 'hse'] },
    { id: 'badges', label: 'Badges non restitués', value: c.badges, tone: 'amber', icon: <CreditCard className="h-5 w-5" />, roles: ['poste'] },
  ];
  const kpisRole = kpis.filter((k) => k.roles.includes(role)).slice(0, 4);
  const maxDeclare = Math.max(...PRESENCE_ENTREPRISE.map((e) => e.declare));

  function genererRapport() {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* En-tête */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              M15 · <Radio className="h-3.5 w-3.5" /> Temps réel
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Tableau de bord</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Calendar className="h-4 w-4" /> Mardi 29 juillet 2026 · Chantier Cosmos Angré
            </p>
          </div>
          {/* Vue par rôle */}
          <div className="flex gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-sand-300">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  role === r.id ? 'bg-forest-500 text-white' : 'text-muted'
                }`}
              >
                {r.libelle}
              </button>
            ))}
          </div>
        </div>

        {/* KPI par rôle */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpisRole.map((k) => (
            <KpiCard key={k.id} label={k.label} value={k.value} unit={k.unit} tone={k.tone} icon={k.icon} />
          ))}
        </div>

        {/* Passages + Donut */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panneau titre="Passages par heure" className="lg:col-span-2">
            <ColumnChart
              data={PASSAGES_HEURE.map((p) => ({ label: p.heure, entrees: p.entrees, sorties: p.sorties }))}
            />
            <div className="mt-3 flex gap-4 text-xs font-medium text-muted">
              <Legende hex="#2F6B45" label="Entrées" />
              <Legende hex="#A9D3AE" label="Sorties" />
            </div>
          </Panneau>
          <Panneau titre="Résultats des contrôles (24 h)">
            <Donut
              centre={String(c.autorises + c.refus + c.forcages)}
              sousTitre="contrôles"
              segments={[
                { label: 'Autorisés', value: c.autorises, color: '', hex: '#6FB07C' },
                { label: 'Forçages', value: c.forcages, color: '', hex: '#E8A33D' },
                { label: 'Refus', value: c.refus, color: '', hex: '#C0392B' },
              ]}
            />
          </Panneau>
        </div>

        {/* Présence par entreprise + Alertes */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panneau titre="Effectif présent par entreprise" className="lg:col-span-2">
            <ul className="space-y-3">
              {PRESENCE_ENTREPRISE.map((e) => {
                const ecart = e.declare - e.entre;
                return (
                  <li key={e.entreprise} className="flex items-center gap-3">
                    <div className="w-40 shrink-0">
                      <p className="truncate text-sm font-semibold text-ink">{e.entreprise}</p>
                      <p className="text-[11px] text-muted">{e.categorie}</p>
                    </div>
                    <div className="flex-1">
                      <BarEffectif entre={e.entre} declare={e.declare} max={maxDeclare} />
                    </div>
                    <div className="w-24 shrink-0 text-right text-sm">
                      <span className="font-bold text-ink">{e.entre}</span>
                      <span className="text-muted">/{e.declare}</span>
                      {ecart > 0 && (
                        <Badge tone="amber" className="ml-1.5">
                          −{ecart}
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panneau>

          <Panneau titre="Alertes du jour" icon={<BellRing className="h-4 w-4 text-amber-500" />}>
            <ul className="space-y-2">
              {ALERTES.map((a) => (
                <li
                  key={a.cle}
                  className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2.5 ring-1 ring-sand-200"
                >
                  <span className="text-sm font-medium text-ink">{a.libelle}</span>
                  <Badge tone={a.ton} dot>
                    {a.valeur}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panneau>
        </div>

        {/* Rapprochement matière */}
        <Panneau
          titre="Rapprochement matière — références sensibles"
          className="mt-4"
          icon={<TrendingDown className="h-4 w-4 text-forest-500" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand-300/70 text-xs uppercase tracking-wide text-muted">
                  <th className="py-2.5 pr-4 font-semibold">Référence</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Entrées</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Sorties</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Comptage</th>
                  <th className="py-2.5 pl-4 text-right font-semibold">Écart</th>
                </tr>
              </thead>
              <tbody>
                {MATIERE_SENSIBLE.map((r) => {
                  const perte = r.ecart < 0;
                  return (
                    <tr key={r.reference} className="border-b border-sand-200 last:border-0">
                      <td className="py-3 pr-4 font-semibold text-ink">
                        {r.reference}
                        <span className="ml-1 text-xs font-normal text-muted">({r.unite})</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{r.entrees.toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{r.sorties.toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">{r.comptage.toLocaleString('fr-FR')}</td>
                      <td className="py-3 pl-4 text-right">
                        <span
                          className={`inline-block rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums ${
                            perte ? 'bg-danger-50 text-danger-600' : 'bg-forest-50 text-forest-700'
                          }`}
                        >
                          {r.ecart > 0 ? '+' : ''}
                          {r.ecart} {r.unite}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panneau>

        {/* Rapport périodique */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-forest-50 p-4 ring-1 ring-forest-100 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Rapport périodique généré automatiquement, à la fréquence et au format du client.
          </p>
          <Button variant="primary" icon={<FileText className="h-4 w-4" />} onClick={genererRapport}>
            Générer le rapport
          </Button>
        </div>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <FileText className="h-4 w-4" />
            Rapport ATS-RAP-2026-0729 généré · horodaté
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sous-composants ---------- */
function KpiCard({
  label,
  value,
  unit,
  tone,
  icon,
}: {
  label: string;
  value: number;
  unit?: string;
  tone: Tone;
  icon: React.ReactNode;
}) {
  const bg: Record<Tone, string> = {
    forest: 'bg-forest-500 text-white',
    amber: 'bg-amber-500 text-white',
    danger: 'bg-danger-500 text-white',
    plain: 'bg-white text-ink',
  };
  const inverted = tone !== 'plain';
  return (
    <div className={`rounded-2xl border border-sand-300/50 p-5 shadow-card ${bg[tone]}`}>
      <div className="flex items-start justify-between">
        <p className={`text-sm font-medium ${inverted ? 'text-white/85' : 'text-muted'}`}>{label}</p>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
            inverted ? 'bg-white/20' : 'bg-forest-50 text-forest-600'
          }`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight">{value}</span>
        {unit && <span className={`text-xs font-medium ${inverted ? 'text-white/70' : 'text-muted'}`}>{unit}</span>}
      </div>
    </div>
  );
}

function Panneau({
  titre,
  icon,
  className,
  children,
}: {
  titre: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-card ring-1 ring-sand-300/70 ${className ?? ''}`}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
        {icon}
        {titre}
      </h3>
      {children}
    </div>
  );
}

function Legende({ hex, label }: { hex: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: hex }} />
      {label}
    </span>
  );
}
