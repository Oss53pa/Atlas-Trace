import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Users, ArrowRightLeft, FileOutput, TrendingUp, ScanLine, ClipboardList, Package,
  LayoutDashboard, AlertTriangle, ChevronRight, Wifi, Activity, Building2, BookText, Table2, Settings,
} from 'lucide-react';
import { useAuthz } from '../../lib/authz';
import { useContexteSite } from '../../lib/contexte';
import { chargerTableauBord, type TableauBord } from '../tableau/api';

const alerteVue: Record<string, string> = {
  listes: 'listes', sorties: 'materiel', anomalies: 'tableau', preavis: 'materiel',
};

/** Carte d'action rapide par destination — l'accueil surface les onglets du rôle. */
const ACTION_META: Record<string, { label: string; sous: string; icon: ReactNode; from: string; to: string }> = {
  poste: { label: 'Poste de contrôle', sous: 'Scanner un badge', icon: <ScanLine className="h-5 w-5" />, from: '#5C6B12', to: '#282C20' },
  materiel: { label: 'Matière', sous: 'Bordereau, sorties', icon: <Package className="h-5 w-5" />, from: '#E0B23C', to: '#C08A2A' },
  tableau: { label: 'Tableau de bord', sous: 'Vue temps réel', icon: <LayoutDashboard className="h-5 w-5" />, from: '#7E9330', to: '#282C20' },
  entreprises: { label: 'Entreprises', sous: 'Habilitations', icon: <Building2 className="h-5 w-5" />, from: '#7E9330', to: '#5C6B12' },
  listes: { label: 'Registre du jour', sous: 'Présence & suivi', icon: <ClipboardList className="h-5 w-5" />, from: '#7E9330', to: '#5C6B12' },
  maincourante: { label: 'Main courante', sous: 'Événements & incidents', icon: <BookText className="h-5 w-5" />, from: '#3E4A0C', to: '#282C20' },
  registres: { label: 'Registres & exports', sous: 'Produire les registres', icon: <Table2 className="h-5 w-5" />, from: '#7E9330', to: '#282C20' },
  admin: { label: 'Administration', sous: 'Comptes, audit', icon: <Settings className="h-5 w-5" />, from: '#3E4A0C', to: '#282C20' },
};

const ACTIONS_DEMO = ['poste', 'listes', 'materiel', 'tableau'];
const dateJour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function Accueil({ onOpen, primaires }: { onOpen: (vue: string) => void; primaires?: string[] }) {
  const { connecte, a } = useAuthz();
  // La supervision (KPI, alertes, anomalies) est une donnée réelle du site :
  // réservée aux comptes connectés qui consultent le tableau. Hors session,
  // aucun chiffre n'est affiché (pas de vitrine).
  const peutSuperviser = connecte && a('CONSULTER_TABLEAU');
  const ctx = useContexteSite();
  const [tb, setTb] = useState<TableauBord | null>(null);

  const charger = useCallback(async () => {
    try {
      setTb(await chargerTableauBord());
    } catch {
      setTb(null);
    }
  }, []);

  useEffect(() => {
    if (peutSuperviser) charger();
    else setTb(null);
  }, [peutSuperviser, charger]);

  // Actions rapides = les onglets principaux du rôle (déjà filtrés par accès).
  const actionsVues = (connecte ? (primaires ?? []) : ACTIONS_DEMO)
    .filter((v) => v !== 'accueil' && ACTION_META[v]);

  const kpis = tb
    ? [
        { label: 'Présents sur site', value: tb.present, unit: `/ ${tb.declare}`, icon: <Users className="h-5 w-5" />, gold: true },
        { label: 'Écart déclaré / entré', value: tb.ecart, unit: '', icon: <ArrowRightLeft className="h-5 w-5" />, gold: false },
        { label: 'Sorties en attente', value: tb.sorties_attente, unit: '', icon: <FileOutput className="h-5 w-5" />, gold: false },
        { label: 'Anomalies (24 h)', value: tb.anomalies.total, unit: '', icon: <TrendingUp className="h-5 w-5" />, gold: false },
      ]
    : [];

  const alertes = tb
    ? [
        { cle: 'listes', libelle: 'Entreprises sans registre', valeur: tb.entreprises_sans_liste, ton: tb.entreprises_sans_liste > 0 ? 'danger' : 'forest' },
        { cle: 'sorties', libelle: 'Autorisations de sortie en attente', valeur: tb.sorties_attente, ton: tb.sorties_attente > 0 ? 'amber' : 'forest' },
        { cle: 'anomalies', libelle: 'Anomalies de flux (24 h)', valeur: tb.anomalies.total, ton: tb.anomalies.total > 0 ? 'amber' : 'forest' },
        { cle: 'preavis', libelle: 'Préavis de livraison du jour', valeur: tb.preavis_jour, ton: 'forest' as const },
      ]
    : [];

  const anomalies = tb
    ? [
        { serie: 'Véhicules (entré vide → chargé)', valeur: tb.anomalies.vehicules },
        { serie: 'Contrôles d’évacuation', valeur: tb.anomalies.evacuations },
        { serie: 'Sorties refusées faute de couverture', valeur: tb.anomalies.sorties_refusees },
      ].filter((f) => f.valeur > 0)
    : [];

  const montrerTableau = peutSuperviser && tb !== null;

  return (
    <div className="min-h-screen bg-sand-50">
      {/* ---- Hero dégradé (prolonge la barre d'app) ---- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#282C20] via-[#3E4A0C] to-[#5C6B12] px-5 pb-16 pt-6">
        <div className="pointer-events-none absolute -right-16 -top-12 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 top-24 h-52 w-52 rounded-full bg-forest-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl">
          <header className="flex animate-fade-up items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium capitalize text-white/60">{dateJour}</p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-white">Bonjour</h1>
              <p className="truncate text-sm text-white/70">
                {ctx.site ? `${ctx.site}${ctx.organisation ? ` · ${ctx.organisation}` : ''}` : 'Contrôle d’accès de site'}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-inset ring-white/15 backdrop-blur">
              <Wifi className="h-3.5 w-3.5" /> En ligne
            </span>
          </header>

          {/* KPI en verre — supervision réelle */}
          {montrerTableau && (
            <div className="mt-5 grid animate-fade-up grid-cols-2 gap-3 md:grid-cols-4">
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className={`rounded-2xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-inset backdrop-blur-md ${
                    k.gold ? 'bg-gradient-to-br from-amber-400/25 to-white/5 ring-amber-300/30' : 'bg-white/10 ring-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] font-medium leading-tight text-white/65">{k.label}</p>
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${k.gold ? 'bg-amber-300/25 text-amber-100' : 'bg-white/10 text-white/80'}`}>
                      {k.icon}
                    </span>
                  </div>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="tnum text-3xl font-extrabold text-white">{k.value}</span>
                    {k.unit && <span className="text-sm font-medium text-white/55">{k.unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Feuille de contenu surélevée ---- */}
      <div className="relative z-10 -mt-8 rounded-t-[2rem] bg-sand-50 px-5 pb-10 pt-7 shadow-[0_-14px_44px_-16px_rgba(10,46,40,0.55)]">
        <div className="mx-auto max-w-5xl">
          {/* Actions rapides — les onglets du rôle */}
          {actionsVues.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Actions rapides</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {actionsVues.map((vue) => {
                  const act = ACTION_META[vue];
                  return (
                    <button
                      key={vue}
                      onClick={() => onOpen(vue)}
                      className="group flex flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-sand-300/50 transition-all duration-200 ease-premium hover:-translate-y-1 hover:shadow-card-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
                    >
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-soft ring-1 ring-inset ring-white/15" style={{ backgroundImage: `linear-gradient(135deg, ${act.from}, ${act.to})` }}>
                        {act.icon}
                      </span>
                      <span className="mt-1">
                        <span className="block text-sm font-bold leading-tight text-ink">{act.label}</span>
                        <span className="block text-[11px] text-muted">{act.sous}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Alertes du jour — supervision réelle */}
          {montrerTableau && (
            <section className="pt-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Alertes du jour</h2>
                <button onClick={() => onOpen('tableau')} className="inline-flex items-center gap-0.5 text-xs font-semibold text-forest-600 hover:text-forest-700">
                  Tableau <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul className="space-y-2">
                {alertes.map((al) => {
                  const ton = al.ton === 'danger'
                    ? { chip: 'bg-danger-50 text-danger-600 ring-danger-100', ic: 'text-danger-500' }
                    : al.ton === 'amber'
                      ? { chip: 'bg-amber-50 text-amber-700 ring-amber-200', ic: 'text-amber-600' }
                      : { chip: 'bg-forest-50 text-forest-700 ring-forest-200', ic: 'text-forest-600' };
                  return (
                    <li key={al.cle}>
                      <button
                        onClick={() => onOpen(alerteVue[al.cle] ?? 'tableau')}
                        className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card ring-1 ring-sand-300/50 transition-all hover:-translate-y-0.5 hover:shadow-card-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
                      >
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${ton.chip}`}>
                          <AlertTriangle className={`h-4 w-4 ${ton.ic}`} />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{al.libelle}</span>
                        <span className={`tnum inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold ring-1 ${ton.chip}`}>{al.valeur}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-sand-400" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Anomalies de flux (24 h) — supervision réelle */}
          {montrerTableau && anomalies.length > 0 && (
            <section className="pt-7">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Anomalies de flux (24 h)</h2>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-sand-300/50">
                {anomalies.map((f, i) => (
                  <div key={f.serie} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-sand-200' : ''}`}>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{f.serie}</span>
                    <span className="tnum inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                      {f.valeur}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">On ne compte pas les objets, on compte les mouvements. Chiffres réels des dernières 24 h.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
