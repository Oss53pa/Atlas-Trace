import { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Lock,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import type { MouvementAcces, Resultat, Sens } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { MOTIFS } from '../poste/motifs';
import {
  CATALOGUE_REGISTRES,
  ENTREPRISES_REGISTRE,
  MOUVEMENTS_JOUR,
} from '../../data/registre';

type FiltreResultat = 'TOUS' | Resultat;
type FiltreSens = 'TOUS' | Sens;

export function Registres() {
  const [registre, setRegistre] = useState('acces');
  const [sens, setSens] = useState<FiltreSens>('TOUS');
  const [resultat, setResultat] = useState<FiltreResultat>('TOUS');
  const [entreprise, setEntreprise] = useState('TOUTES');
  const [recherche, setRecherche] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return MOUVEMENTS_JOUR.filter((m) => {
      if (sens !== 'TOUS' && m.sens !== sens) return false;
      if (resultat !== 'TOUS' && m.resultat !== resultat) return false;
      if (entreprise !== 'TOUTES' && m.entrepriseLabel !== entreprise) return false;
      if (q && !m.personneLabel.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sens, resultat, entreprise, recherche]);

  const stats = useMemo(() => {
    const base = { total: 0, autorise: 0, refuse: 0, force: 0 };
    for (const m of MOUVEMENTS_JOUR) {
      base.total += 1;
      if (m.resultat === 'AUTORISE') base.autorise += 1;
      else if (m.resultat === 'REFUSE') base.refuse += 1;
      else base.force += 1;
    }
    return base;
  }, []);

  function exporter(format: string) {
    setToast(`Registre ${format} généré · réf ATS-REG-2026-0729 · horodaté ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) /* mock */}`);
    setTimeout(() => setToast(null), 3200);
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* En-tête */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500">M6 · Lot 1</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
            Registres &amp; exports
          </h1>
          <p className="mt-1 text-sm text-muted">
            Génération sans saisie dédiée, aux formats du client, disponible en moins de 5 minutes.
          </p>
        </div>

        {/* Sélecteur de registre */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATALOGUE_REGISTRES.map((r) => {
            const actif = registre === r.id && r.actif;
            return (
              <button
                key={r.id}
                disabled={!r.actif}
                onClick={() => r.actif && setRegistre(r.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-inset transition-colors ${
                  actif
                    ? 'bg-forest-500 text-white ring-forest-500'
                    : r.actif
                      ? 'bg-white text-ink ring-sand-300 hover:bg-forest-50'
                      : 'cursor-not-allowed bg-sand-200 text-muted ring-transparent'
                }`}
              >
                {!r.actif && <Lock className="h-3.5 w-3.5" />}
                {r.libelle}
              </button>
            );
          })}
        </div>

        {/* Indicateurs */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Passages" value={stats.total} tone="plain" icon={<Clock className="h-5 w-5" />} />
          <StatCard
            tone="forest"
            label="Autorisés"
            value={stats.autorise}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StatCard
            tone="amber"
            label="Forçages"
            value={stats.force}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <StatCardDanger value={stats.refuse} />
        </div>

        {/* Répartition (séries de couleurs) */}
        <RepartitionBar {...stats} />

        {/* Filtres */}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Filter className="h-4 w-4 text-forest-500" />
            Filtres
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted">
              <Calendar className="h-3.5 w-3.5" />
              Mardi 29 juillet 2026
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ChampRecherche value={recherche} onChange={setRecherche} />
            <Select
              label="Sens"
              value={sens}
              onChange={(v) => setSens(v as FiltreSens)}
              options={[
                ['TOUS', 'Tous'],
                ['ENTREE', 'Entrées'],
                ['SORTIE', 'Sorties'],
              ]}
            />
            <Select
              label="Résultat"
              value={resultat}
              onChange={(v) => setResultat(v as FiltreResultat)}
              options={[
                ['TOUS', 'Tous'],
                ['AUTORISE', 'Autorisés'],
                ['REFUSE', 'Refusés'],
                ['FORCE', 'Forçages'],
              ]}
            />
            <Select
              label="Entreprise"
              value={entreprise}
              onChange={setEntreprise}
              options={[['TOUTES', 'Toutes'], ...ENTREPRISES_REGISTRE.map((e) => [e, e] as [string, string])]}
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-sand-300/70">
          <div className="flex items-center justify-between border-b border-sand-300/70 px-4 py-3">
            <p className="text-sm font-bold text-ink">
              Entrées &amp; sorties de personnes
              <span className="ml-2 font-medium text-muted">{lignes.length} ligne(s)</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand-300/70 text-xs uppercase tracking-wide text-muted">
                  <Th>Heure</Th>
                  <Th>Personne</Th>
                  <Th>Entreprise</Th>
                  <Th>Sens</Th>
                  <Th>Résultat</Th>
                  <Th>Motif</Th>
                  <Th>Mode</Th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((m) => (
                  <Ligne key={m.id} m={m} />
                ))}
                {lignes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                      Aucun mouvement pour ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-forest-50 p-4 ring-1 ring-forest-100 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Registre généré sans ressaisie, à la charte du client, horodaté et versionné.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => exporter('PDF')}
            >
              Document (.pdf)
            </Button>
            <Button
              variant="primary"
              icon={<FileSpreadsheet className="h-4 w-4" />}
              onClick={() => exporter('tableur')}
            >
              Tableur (.xlsx)
            </Button>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted">
          Réf. ATS-REG-001 · V1 · extraction horodatée · accès journalisé (chap. 18).
        </p>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <FileSpreadsheet className="h-4 w-4" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Répartition ---------- */
function RepartitionBar({
  total,
  autorise,
  refuse,
  force,
}: {
  total: number;
  autorise: number;
  refuse: number;
  force: number;
}) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-sand-200">
        <span style={{ width: `${pct(autorise)}%` }} className="bg-forest-400" />
        <span style={{ width: `${pct(force)}%` }} className="bg-amber-400" />
        <span style={{ width: `${pct(refuse)}%` }} className="bg-danger-500" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium text-muted">
        <Legende color="bg-forest-400" label="Autorisés" value={`${Math.round(pct(autorise))} %`} />
        <Legende color="bg-amber-400" label="Forçages" value={`${Math.round(pct(force))} %`} />
        <Legende color="bg-danger-500" label="Refusés" value={`${Math.round(pct(refuse))} %`} />
      </div>
    </div>
  );
}

function Legende({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
      <span className="font-bold text-ink">{value}</span>
    </span>
  );
}

/* ---------- Ligne de tableau ---------- */
function Ligne({ m }: { m: MouvementAcces }) {
  const cfg: Record<Resultat, { tone: 'forest' | 'danger' | 'amber'; label: string; icon: React.ReactNode }> = {
    AUTORISE: { tone: 'forest', label: 'Autorisé', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    REFUSE: { tone: 'danger', label: 'Refusé', icon: <XCircle className="h-3.5 w-3.5" /> },
    FORCE: { tone: 'amber', label: 'Forçage', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  };
  const c = cfg[m.resultat];
  return (
    <tr className="border-b border-sand-200 last:border-0 hover:bg-sand-50">
      <Td className="tabular-nums text-muted">{m.horodatage}</Td>
      <Td className="font-semibold text-ink">{m.personneLabel}</Td>
      <Td className="text-muted">{m.entrepriseLabel}</Td>
      <Td>
        <span className="text-muted">{m.sens === 'ENTREE' ? '→ Entrée' : '← Sortie'}</span>
      </Td>
      <Td>
        <Badge tone={c.tone}>
          <span className="mr-0.5">{c.icon}</span>
          {c.label}
        </Badge>
      </Td>
      <Td className="text-muted">{m.motif ? MOTIFS[m.motif].libelle : '—'}</Td>
      <Td>
        {m.mode === 'HORS_LIGNE' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
            <WifiOff className="h-3.5 w-3.5" />
            Hors ligne
          </span>
        ) : (
          <span className="text-xs text-muted">En ligne</span>
        )}
      </Td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 font-semibold">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ''}`}>{children}</td>;
}

/* ---------- Contrôles de filtre ---------- */
function ChampRecherche({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">Personne</span>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher un nom…"
          className="w-full rounded-xl border border-sand-300 bg-sand-50 py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
        />
      </span>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/* StatCard variante refus (rouge) — non couverte par le composant générique. */
function StatCardDanger({ value }: { value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/80">Refus</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <XCircle className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
