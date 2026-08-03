import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserMinus,
  XCircle,
  ShieldAlert,
  PackageCheck,
  TrendingUp,
  Activity,
  CreditCard,
  Radio,
  BellRing,
  Calendar,
  Loader2,
  LogIn,
  Truck,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Donut, ColumnChart, BarEffectif } from './charts';
import { useAuthz } from '../../lib/authz';
import { chargerTableauBord, type TableauBord } from './api';

type Tone = 'forest' | 'amber' | 'danger' | 'plain';

const ROLES = [
  { id: 'direction', libelle: 'Direction' },
  { id: 'poste', libelle: 'Chef de poste' },
  { id: 'hse', libelle: 'HSE' },
] as const;
type RoleId = (typeof ROLES)[number]['id'];

const dateLongue = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function Tableau() {
  const { connecte, chargement: authEnCours } = useAuthz();
  const [tb, setTb] = useState<TableauBord | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [role, setRole] = useState<RoleId>('direction');

  const rafraichir = useCallback(async () => {
    try {
      setTb(await chargerTableauBord());
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

  const kpis = useMemo(() => {
    if (!tb) return [];
    return [
      { id: 'presents', label: 'Présents sur site', value: tb.present, unit: `/ ${tb.declare} déclarés`, tone: 'forest' as Tone, icon: <Users className="h-5 w-5" />, roles: ['direction', 'poste', 'hse'] },
      { id: 'ecart', label: 'Écart déclaré / entré', value: tb.ecart, tone: 'amber' as Tone, icon: <UserMinus className="h-5 w-5" />, roles: ['direction', 'poste'] },
      { id: 'refus', label: 'Refus (24 h)', value: tb.controles.refus, tone: 'danger' as Tone, icon: <XCircle className="h-5 w-5" />, roles: ['poste', 'hse'] },
      { id: 'forcages', label: 'Forçages (24 h)', value: tb.controles.forcages, tone: 'amber' as Tone, icon: <ShieldAlert className="h-5 w-5" />, roles: ['poste', 'hse'] },
      { id: 'sorties', label: 'Sorties en attente', value: tb.sorties_attente, tone: 'amber' as Tone, icon: <PackageCheck className="h-5 w-5" />, roles: ['direction'] },
      { id: 'matiere', label: 'Anomalies (24 h)', value: tb.anomalies.total, tone: 'amber' as Tone, icon: <TrendingUp className="h-5 w-5" />, roles: ['direction', 'hse'] },
      { id: 'badges', label: 'Badges actifs', value: tb.badges_actifs, tone: 'plain' as Tone, icon: <CreditCard className="h-5 w-5" />, roles: ['poste'] },
    ];
  }, [tb]);

  const kpisRole = kpis.filter((k) => k.roles.includes(role)).slice(0, 4);

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
        <p className="text-sm">Le tableau de bord agrège les données du site : il faut un compte disposant du pouvoir CONSULTER_TABLEAU.</p>
      </div>
    );
  }

  if (!tb) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-sm text-danger-600">
        {erreur ?? 'Tableau de bord indisponible.'}
      </div>
    );
  }

  const maxDeclare = Math.max(1, ...tb.presence.map((e) => e.declare));
  const totalControles = tb.controles.autorises + tb.controles.refus + tb.controles.forcages;
  const alertes: { cle: string; libelle: string; valeur: number; ton: 'amber' | 'danger' | 'forest' }[] = [
    { cle: 'listes', libelle: 'Entreprises sans registre', valeur: tb.entreprises_sans_liste, ton: tb.entreprises_sans_liste > 0 ? 'danger' : 'forest' },
    { cle: 'sorties', libelle: 'Autorisations de sortie en attente', valeur: tb.sorties_attente, ton: tb.sorties_attente > 0 ? 'amber' : 'forest' },
    { cle: 'anomalies', libelle: 'Anomalies de flux (24 h)', valeur: tb.anomalies.total, ton: tb.anomalies.total > 0 ? 'amber' : 'forest' },
    { cle: 'preavis', libelle: 'Préavis de livraison du jour', valeur: tb.preavis_jour, ton: 'forest' },
  ];

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              M15 · <Radio className="h-3.5 w-3.5" /> Temps réel
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Tableau de bord</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm capitalize text-muted">
              <Calendar className="h-4 w-4" /> {dateLongue}
            </p>
          </div>
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

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpisRole.map((k) => (
            <KpiCard key={k.id} label={k.label} value={k.value} unit={k.unit} tone={k.tone} icon={k.icon} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panneau titre="Passages par heure (24 h)" className="lg:col-span-2">
            {tb.passages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Aucun passage enregistré sur les dernières 24 h.</p>
            ) : (
              <>
                <ColumnChart data={tb.passages.map((p) => ({ label: p.heure, entrees: p.entrees, sorties: p.sorties }))} />
                <div className="mt-3 flex gap-4 text-xs font-medium text-muted">
                  <Legende hex="#0F5044" label="Entrées" />
                  <Legende hex="#A7CEC3" label="Sorties" />
                </div>
              </>
            )}
          </Panneau>
          <Panneau titre="Contrôles d'accès (24 h)">
            {totalControles === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Aucun contrôle sur les dernières 24 h.</p>
            ) : (
              <Donut
                centre={String(totalControles)}
                sousTitre="contrôles"
                segments={[
                  { label: 'Autorisés', value: tb.controles.autorises, color: '', hex: '#2E7C68' },
                  { label: 'Forçages', value: tb.controles.forcages, color: '', hex: '#F2C14E' },
                  { label: 'Refus', value: tb.controles.refus, color: '', hex: '#C0392B' },
                ]}
              />
            )}
          </Panneau>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panneau titre="Effectif présent par entreprise" className="lg:col-span-2">
            {tb.presence.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Aucun registre de présence déposé.</p>
            ) : (
              <ul className="space-y-3">
                {tb.presence.map((e) => {
                  const ecart = e.declare - e.entre;
                  return (
                    <li key={e.entreprise} className="flex items-center gap-3">
                      <div className="w-40 shrink-0">
                        <p className="truncate text-sm font-semibold text-ink">{e.entreprise}</p>
                      </div>
                      <div className="flex-1">
                        <BarEffectif entre={e.entre} declare={e.declare} max={maxDeclare} />
                      </div>
                      <div className="w-24 shrink-0 text-right text-sm">
                        <span className="font-bold text-ink">{e.entre}</span>
                        <span className="text-muted">/{e.declare}</span>
                        {ecart > 0 && <Badge tone="amber" className="ml-1.5">−{ecart}</Badge>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panneau>

          <Panneau titre="Alertes du jour" icon={<BellRing className="h-4 w-4 text-amber-500" />}>
            <ul className="space-y-2">
              {alertes.map((a) => (
                <li key={a.cle} className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2.5 ring-1 ring-sand-200">
                  <span className="text-sm font-medium text-ink">{a.libelle}</span>
                  <Badge tone={a.ton} dot>{a.valeur}</Badge>
                </li>
              ))}
            </ul>
          </Panneau>
        </div>

        {/* Anomalies de flux (24 h) — mouvements, pas objets */}
        <Panneau titre="Anomalies de flux (24 h)" className="mt-4" icon={<Activity className="h-4 w-4 text-forest-500" />}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AnomalieItem icon={<Truck className="h-4 w-4" />} label="Véhicules (entré vide → chargé)" value={tb.anomalies.vehicules} />
            <AnomalieItem icon={<Trash2 className="h-4 w-4" />} label="Contrôles d'évacuation" value={tb.anomalies.evacuations} />
            <AnomalieItem icon={<XCircle className="h-4 w-4" />} label="Sorties refusées faute de couverture" value={tb.anomalies.sorties_refusees} />
          </div>
          <p className="mt-3 text-[11px] text-muted">On ne compte pas les objets, on compte les mouvements. Chiffres réels des dernières 24 h, bornés à l'organisation.</p>
        </Panneau>
      </div>
    </div>
  );
}

/* ---------- Sous-composants ---------- */
function AnomalieItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const alerte = value > 0;
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ${alerte ? 'bg-amber-50 ring-amber-200' : 'bg-sand-50 ring-sand-200'}`}>
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${alerte ? 'bg-amber-500 text-white' : 'bg-white text-muted ring-1 ring-sand-200'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold tracking-tight text-ink">{value}</p>
        <p className="truncate text-[11px] text-muted">{label}</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, tone, icon }: { label: string; value: number; unit?: string; tone: Tone; icon: React.ReactNode }) {
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
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${inverted ? 'bg-white/20' : 'bg-forest-50 text-forest-600'}`}>
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

function Panneau({ titre, icon, className, children }: { titre: string; icon?: React.ReactNode; className?: string; children: React.ReactNode }) {
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
