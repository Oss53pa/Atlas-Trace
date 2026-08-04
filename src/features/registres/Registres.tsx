import { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet, Filter, Search, Clock, CheckCircle2, XCircle,
  ShieldAlert, WifiOff, Download, Loader2, Lock, MoonStar,
} from 'lucide-react';
import type { Resultat, Sens } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthz } from '../../lib/authz';
import { MOTIFS } from '../poste/motifs';
import { MOUVEMENTS_JOUR } from '../../data/registre';
import { RapportsAuto } from './RapportsAuto';
import { chargerAcces, telechargerCSV, EXPORTS, type AccesLigne } from './api';

type FiltreResultat = 'TOUS' | Resultat;
type FiltreSens = 'TOUS' | Sens;

const MOCK: AccesLigne[] = MOUVEMENTS_JOUR.map((m) => ({
  id: m.id, horodatage: m.horodatage, personneLabel: m.personneLabel, entrepriseLabel: m.entrepriseLabel,
  sens: m.sens, resultat: m.resultat, motif: m.motif ? MOTIFS[m.motif].libelle : null, mode: m.mode, constatee: true,
}));

export function Registres() {
  const { connecte, a } = useAuthz();
  const [mvts, setMvts] = useState<AccesLigne[]>(MOCK);
  const [live, setLive] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sens, setSens] = useState<FiltreSens>('TOUS');
  const [resultat, setResultat] = useState<FiltreResultat>('TOUS');
  const [entreprise, setEntreprise] = useState('TOUTES');
  const [recherche, setRecherche] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!connecte) { setMvts(MOCK); setLive(false); return; }
    let annule = false;
    setChargement(true);
    chargerAcces()
      .then((r) => { if (annule) return; setMvts(r); setLive(true); setErreur(null); })
      .catch((e) => { if (!annule) setErreur((e as Error).message); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [connecte]);

  const entreprises = useMemo(() => [...new Set(mvts.map((m) => m.entrepriseLabel))].filter((e) => e && e !== '—').sort(), [mvts]);

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return mvts.filter((m) => {
      if (sens !== 'TOUS' && m.sens !== sens) return false;
      if (resultat !== 'TOUS' && m.resultat !== resultat) return false;
      if (entreprise !== 'TOUTES' && m.entrepriseLabel !== entreprise) return false;
      if (q && !m.personneLabel.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mvts, sens, resultat, entreprise, recherche]);

  const stats = useMemo(() => {
    const base = { total: 0, autorise: 0, refuse: 0, force: 0, nonConstatee: 0 };
    for (const m of mvts) {
      base.total += 1;
      if (m.resultat === 'AUTORISE') base.autorise += 1;
      else if (m.resultat === 'REFUSE') base.refuse += 1;
      else base.force += 1;
      if (m.sens === 'SORTIE' && !m.constatee) base.nonConstatee += 1;
    }
    return base;
  }, [mvts]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3600); }

  function exporterAcces() {
    const ref = telechargerCSV('ACCES', ['Heure', 'Personne', 'Entreprise', 'Sens', 'Résultat', 'Motif', 'Mode', 'Sortie'],
      lignes.map((m) => [m.horodatage, m.personneLabel, m.entrepriseLabel, m.sens, m.resultat, m.motif ?? '', m.mode,
        m.sens === 'SORTIE' ? (m.constatee ? 'Constatée' : 'Non constatée') : '']));
    flash(`Registre d'accès exporté · réf ${ref}`);
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
            Registres
            {live ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold text-forest-700 ring-1 ring-forest-200">Données réelles</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-sand-300">Démo</span>
            )}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Registres &amp; exports</h1>
          <p className="mt-1 text-sm text-muted">
            Génération sans saisie dédiée, en CSV horodaté et référencé, disponible immédiatement. Les sorties non
            constatées (clôture) sont distinguées des sorties scannées.
          </p>
        </div>

        <RapportsAuto />

        {erreur && <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Passages" value={stats.total} tone="plain" icon={<Clock className="h-5 w-5" />} />
          <StatCard tone="forest" label="Autorisés" value={stats.autorise} icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard tone="amber" label="Forçages" value={stats.force} icon={<ShieldAlert className="h-5 w-5" />} />
          <StatCardDanger value={stats.refuse} />
        </div>

        <RepartitionBar {...stats} />

        {/* Filtres */}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Filter className="h-4 w-4 text-forest-500" /> Filtres
            {stats.nonConstatee > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                <MoonStar className="h-3.5 w-3.5" /> {stats.nonConstatee} sortie(s) non constatée(s)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ChampRecherche value={recherche} onChange={setRecherche} />
            <Select label="Sens" value={sens} onChange={(v) => setSens(v as FiltreSens)}
              options={[['TOUS', 'Tous'], ['ENTREE', 'Entrées'], ['SORTIE', 'Sorties']]} />
            <Select label="Résultat" value={resultat} onChange={(v) => setResultat(v as FiltreResultat)}
              options={[['TOUS', 'Tous'], ['AUTORISE', 'Autorisés'], ['REFUSE', 'Refusés'], ['FORCE', 'Forçages']]} />
            <Select label="Entreprise" value={entreprise} onChange={setEntreprise}
              options={[['TOUTES', 'Toutes'], ...entreprises.map((e) => [e, e] as [string, string])]} />
          </div>
        </div>

        {/* Tableau */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-sand-300/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-300/70 px-4 py-3">
            <p className="text-sm font-bold text-ink">
              Entrées &amp; sorties de personnes
              <span className="ml-2 font-medium text-muted">{lignes.length} ligne(s){chargement ? ' · chargement…' : ''}</span>
            </p>
            <Button variant="primary" size="sm" icon={<Download className="h-4 w-4" />} onClick={exporterAcces} disabled={lignes.length === 0}>
              Exporter (CSV)
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand-300/70 text-xs uppercase tracking-wide text-muted">
                  <Th>Heure</Th><Th>Personne</Th><Th>Entreprise</Th><Th>Sens</Th><Th>Résultat</Th><Th>Motif</Th><Th>Mode</Th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((m) => <Ligne key={m.id} m={m} />)}
                {lignes.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                    {chargement ? 'Chargement…' : 'Aucun mouvement pour ces filtres.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Catalogue d'exports (chapitre 26) */}
        <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-muted">Registres exportables</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORTS.map((r) => (
            <ExportCard key={r.id} reg={r} connecte={connecte} autorise={!r.pouvoir || a(r.pouvoir)} onFlash={flash} />
          ))}
        </div>

        <p className="mt-5 text-xs text-muted">
          Chaque export est un CSV référencé (ATS-…), versionné et horodaté à l'extraction. Le journal d'audit est
          d'accès restreint (pouvoir CONSULTER_AUDIT) et sa consultation est elle-même journalisée.
        </p>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <FileSpreadsheet className="h-4 w-4" /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportCard({ reg, connecte, autorise, onFlash }: {
  reg: (typeof EXPORTS)[number]; connecte: boolean; autorise: boolean; onFlash: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const bloque = !connecte || !autorise;
  async function telecharger() {
    setBusy(true);
    try {
      const { headers, rows } = await reg.charger();
      const ref = telechargerCSV(reg.base, headers, rows);
      onFlash(`${reg.libelle} · ${rows.length} ligne(s) · réf ${ref}`);
    } catch (e) {
      onFlash('Erreur : ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600 ring-1 ring-forest-100">
        {reg.pouvoir === 'CONSULTER_AUDIT' ? <Lock className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{reg.libelle}</p>
        <p className="text-[11px] text-muted">{bloque ? (!connecte ? 'Connexion requise' : 'Pouvoir requis') : 'CSV horodaté'}</p>
      </div>
      <Button variant="outline" size="sm" disabled={bloque || busy}
        icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} onClick={telecharger}>
        CSV
      </Button>
    </div>
  );
}

/* ---------- Répartition ---------- */
function RepartitionBar({ total, autorise, refuse, force }: { total: number; autorise: number; refuse: number; force: number }) {
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
function Ligne({ m }: { m: AccesLigne }) {
  const cfg: Record<Resultat, { tone: 'forest' | 'danger' | 'amber'; label: string; icon: React.ReactNode }> = {
    AUTORISE: { tone: 'forest', label: 'Autorisé', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    REFUSE: { tone: 'danger', label: 'Refusé', icon: <XCircle className="h-3.5 w-3.5" /> },
    FORCE: { tone: 'amber', label: 'Forçage', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  };
  const c = cfg[m.resultat];
  const nonConstatee = m.sens === 'SORTIE' && !m.constatee;
  return (
    <tr className="border-b border-sand-200 last:border-0 hover:bg-sand-50">
      <Td className="tabular-nums text-muted">{m.horodatage}</Td>
      <Td className="font-semibold text-ink">{m.personneLabel}</Td>
      <Td className="text-muted">{m.entrepriseLabel}</Td>
      <Td>
        <span className="text-muted">{m.sens === 'ENTREE' ? '→ Entrée' : '← Sortie'}</span>
        {nonConstatee && <Badge tone="amber" className="ml-1.5">Non constatée</Badge>}
      </Td>
      <Td><Badge tone={c.tone}><span className="mr-0.5">{c.icon}</span>{c.label}</Badge></Td>
      <Td className="text-muted">{m.motif ?? '—'}</Td>
      <Td>
        {m.mode === 'HORS_LIGNE' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><WifiOff className="h-3.5 w-3.5" /> Hors ligne</span>
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
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Rechercher un nom…"
          className="w-full rounded-xl border border-sand-300 bg-sand-50 py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
      </span>
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function StatCardDanger({ value }: { value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/80">Refus</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"><XCircle className="h-5 w-5" /></span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
