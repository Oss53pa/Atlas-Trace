import {
  Users, ArrowRightLeft, FileOutput, CreditCard, ScanLine, ClipboardList, Package,
  LayoutDashboard, AlertTriangle, ChevronRight, Wifi, Scale,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { PRESENCE_ENTREPRISE, ALERTES, MATIERE_SENSIBLE } from '../../data/tableau';

const alerteVue: Record<string, string> = {
  listes: 'listes', badges: 'badges', materiel: 'materiel', sorties: 'materiel', preavis: 'materiel',
};

export function Accueil({ onOpen }: { onOpen: (vue: string) => void }) {
  const presents = PRESENCE_ENTREPRISE.reduce((s, e) => s + e.entre, 0);
  const declares = PRESENCE_ENTREPRISE.reduce((s, e) => s + e.declare, 0);
  const ecart = declares - presents;
  const val = (cle: string) => ALERTES.find((a) => a.cle === cle)?.valeur ?? 0;
  const ecartsMatiere = MATIERE_SENSIBLE.filter((m) => m.ecart < 0).sort((a, b) => a.ecart - b.ecart);

  const actions = [
    { vue: 'poste', label: 'Poste de contrôle', sous: 'Scanner un badge', icon: <ScanLine className="h-5 w-5" />, hex: '#0F5044' },
    { vue: 'listes', label: 'Listes du jour', sous: 'Dépôts & suivi', icon: <ClipboardList className="h-5 w-5" />, hex: '#2E7C68' },
    { vue: 'materiel', label: 'Matière', sous: 'Bordereau, sorties', icon: <Package className="h-5 w-5" />, hex: '#C08A2A' },
    { vue: 'tableau', label: 'Tableau de bord', sous: 'Vue temps réel', icon: <LayoutDashboard className="h-5 w-5" />, hex: '#0A2E28' },
  ];

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-3xl">
        {/* En-tête cockpit */}
        <header className="animate-fade-up px-5 pb-2 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted">Aujourd'hui · 31/07/2026</p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Bonjour</h1>
              <p className="truncate text-sm text-muted">Chantier Cosmos Angré · New Heaven SA</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-700 ring-1 ring-forest-200">
              <Wifi className="h-3.5 w-3.5" /> En ligne
            </span>
          </div>
        </header>

        {/* Repères du jour */}
        <section className="px-5 pt-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard tone="forest" label="Présents sur site" value={presents} unit={`/ ${declares}`} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Écart déclaré / entré" value={ecart} icon={<ArrowRightLeft className="h-5 w-5" />} trend={{ value: ecart > 0 ? 'à rapprocher' : 'conforme', direction: ecart > 0 ? 'flat' : 'up' }} />
            <StatCard tone="amber" label="Sorties en attente" value={val('sorties')} icon={<FileOutput className="h-5 w-5" />} />
            <StatCard label="Badges non restitués" value={val('badges')} icon={<CreditCard className="h-5 w-5" />} />
          </div>
        </section>

        {/* Actions rapides */}
        <section className="px-5 pt-7">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {actions.map((a) => (
              <button
                key={a.vue}
                onClick={() => onOpen(a.vue)}
                className="group flex flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-sand-300/60 transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-card-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-soft" style={{ background: a.hex }}>{a.icon}</span>
                <span className="mt-1">
                  <span className="block text-sm font-bold leading-tight text-ink">{a.label}</span>
                  <span className="block text-[11px] text-muted">{a.sous}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Alertes du jour */}
        <section className="px-5 pt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Alertes du jour</h2>
            <button onClick={() => onOpen('tableau')} className="inline-flex items-center gap-0.5 text-xs font-semibold text-forest-600 hover:text-forest-700">
              Tableau <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="space-y-2">
            {ALERTES.map((a) => {
              const ton = a.ton === 'danger'
                ? { chip: 'bg-danger-50 text-danger-600 ring-danger-100', ic: 'text-danger-500' }
                : a.ton === 'amber'
                  ? { chip: 'bg-amber-50 text-amber-700 ring-amber-200', ic: 'text-amber-600' }
                  : { chip: 'bg-forest-50 text-forest-700 ring-forest-200', ic: 'text-forest-600' };
              return (
                <li key={a.cle}>
                  <button
                    onClick={() => onOpen(alerteVue[a.cle] ?? 'tableau')}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card ring-1 ring-sand-300/60 transition-colors hover:bg-sand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
                  >
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${ton.chip}`}>
                      <AlertTriangle className={`h-4 w-4 ${ton.ic}`} />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{a.libelle}</span>
                    <span className={`tnum inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold ring-1 ${ton.chip}`}>{a.valeur}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-sand-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Rapprochement matière — écarts */}
        <section className="px-5 pb-10 pt-7">
          <div className="mb-3 flex items-center gap-2">
            <Scale className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Rapprochement matière — écarts</h2>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-sand-300/60">
            {ecartsMatiere.map((m, i) => (
              <div key={m.reference} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-sand-200' : ''}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{m.reference}</span>
                  <span className="block text-[11px] text-muted">compté {m.comptage} {m.unite}</span>
                </span>
                <span className="tnum inline-flex items-center rounded-full bg-danger-50 px-2.5 py-1 text-xs font-bold text-danger-600 ring-1 ring-danger-100">
                  {m.ecart} {m.unite}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Écarts = comptage − stock théorique (entrées − sorties). Négatif = manquant à investiguer.</p>
        </section>
      </div>
    </div>
  );
}
