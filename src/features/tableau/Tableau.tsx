import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserMinus,
  XCircle,
  ShieldAlert,
  PackageCheck,
  Activity,
  CreditCard,
  Radio,
  BellRing,
  Calendar,
  Loader2,
  LogIn,
  Truck,
  Trash2,
  KeyRound,
  Boxes,
  FileWarning,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  LogOut,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Donut, ColumnChart, BarEffectif, Sparkline } from './charts';
import { useAuthz } from '../../lib/authz';
import { chargerTableauBord, type Periode, type TableauBord } from './api';

type Tone = 'forest' | 'amber' | 'danger' | 'plain';

const ROLES = [
  { id: 'direction', libelle: 'Direction' },
  { id: 'poste', libelle: 'Chef de poste' },
  { id: 'hse', libelle: 'HSE' },
] as const;
type RoleId = (typeof ROLES)[number]['id'];

const PERIODES: { j: Periode; label: string }[] = [
  { j: 1, label: '24 h' },
  { j: 7, label: '7 j' },
  { j: 30, label: '30 j' },
];

const dateLongue = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

interface Kpi {
  id: string;
  label: string;
  value: number;
  unit?: string;
  tone: Tone;
  icon: React.ReactNode;
  trend?: { actuel: number; precedent: number; neutre?: boolean };
  spark?: number[];
}

export function Tableau() {
  const { connecte, chargement: authEnCours } = useAuthz();
  const [tb, setTb] = useState<TableauBord | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [role, setRole] = useState<RoleId>('direction');
  const [periode, setPeriode] = useState<Periode>(1);

  const rafraichir = useCallback(async (j: Periode) => {
    setRafraichissement(true);
    try {
      setTb(await chargerTableauBord(j));
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, []);

  useEffect(() => {
    if (!connecte) {
      setChargement(false);
      return;
    }
    rafraichir(periode);
  }, [connecte, periode, rafraichir]);

  const sfx = periode === 1 ? '24 h' : `${periode} j`;

  const kpis = useMemo<Kpi[]>(() => {
    if (!tb) return [];
    const p = tb.precedent;
    const sEntrees = tb.serie.map((x) => x.entrees);
    const sRefus = tb.serie.map((x) => x.refus);

    if (role === 'poste') {
      return [
        { id: 'presents', label: 'Présents sur site', value: tb.present, unit: `/ ${tb.declare} déclarés`, tone: 'forest', icon: <Users className="h-5 w-5" /> },
        { id: 'refus', label: `Refus (${sfx})`, value: tb.controles.refus, tone: 'danger', icon: <XCircle className="h-5 w-5" />, trend: { actuel: tb.controles.refus, precedent: p.refus }, spark: sRefus },
        { id: 'forcages', label: `Forçages (${sfx})`, value: tb.controles.forcages, tone: 'amber', icon: <ShieldAlert className="h-5 w-5" />, trend: { actuel: tb.controles.forcages, precedent: p.forcages } },
        { id: 'badges', label: 'Badges actifs', value: tb.badges_actifs, tone: 'plain', icon: <CreditCard className="h-5 w-5" /> },
      ];
    }
    if (role === 'hse') {
      return [
        { id: 'presents', label: 'Présents sur site', value: tb.present, unit: `/ ${tb.declare} déclarés`, tone: 'forest', icon: <Users className="h-5 w-5" /> },
        { id: 'incidents', label: `Incidents (${sfx})`, value: tb.incidents.total, tone: 'danger', icon: <FileWarning className="h-5 w-5" />, trend: { actuel: tb.incidents.total, precedent: p.incidents } },
        { id: 'majeurs', label: 'Majeurs ouverts', value: tb.incidents.majeurs, tone: 'amber', icon: <ShieldAlert className="h-5 w-5" /> },
        { id: 'anomalies', label: `Anomalies (${sfx})`, value: tb.anomalies.total, tone: 'amber', icon: <Activity className="h-5 w-5" />, trend: { actuel: tb.anomalies.total, precedent: p.anomalies }, spark: sRefus },
      ];
    }
    // direction
    return [
      { id: 'presents', label: 'Présents sur site', value: tb.present, unit: `/ ${tb.declare} déclarés`, tone: 'forest', icon: <Users className="h-5 w-5" /> },
      { id: 'entrees', label: `Entrées (${sfx})`, value: tb.entrees, tone: 'plain', icon: <Users className="h-5 w-5" />, trend: { actuel: tb.entrees, precedent: p.entrees, neutre: true }, spark: sEntrees },
      { id: 'ecart', label: 'Écart déclaré / entré', value: tb.ecart, tone: 'amber', icon: <UserMinus className="h-5 w-5" /> },
      { id: 'anomalies', label: `Anomalies (${sfx})`, value: tb.anomalies.total, tone: 'danger', icon: <Activity className="h-5 w-5" />, trend: { actuel: tb.anomalies.total, precedent: p.anomalies } },
    ];
  }, [tb, role, sfx]);

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

  const estDir = role === 'direction';
  const estPoste = role === 'poste';
  const estHse = role === 'hse';

  const maxDeclare = Math.max(1, ...tb.presence.map((e) => e.declare));
  const totalControles = tb.controles.autorises + tb.controles.refus + tb.controles.forcages;
  const fluxTotal = tb.serie.reduce((s, p) => s + p.entrees + p.sorties, 0);

  const alertes: { cle: string; libelle: string; valeur: number; ton: 'amber' | 'danger' | 'forest' }[] = [
    { cle: 'listes', libelle: 'Entreprises sans registre', valeur: tb.entreprises_sans_liste, ton: tb.entreprises_sans_liste > 0 ? 'danger' : 'forest' },
    { cle: 'sorties', libelle: 'Autorisations de sortie en attente', valeur: tb.sorties_attente, ton: tb.sorties_attente > 0 ? 'amber' : 'forest' },
    { cle: 'incidents', libelle: 'Incidents ouverts', valeur: tb.incidents.ouverts, ton: tb.incidents.ouverts > 0 ? 'danger' : 'forest' },
    { cle: 'preavis', libelle: 'Préavis de livraison du jour', valeur: tb.preavis_jour, ton: 'forest' },
  ];

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <Radio className="h-3.5 w-3.5" /> Temps réel
              {rafraichissement && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Tableau de bord</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm capitalize text-muted">
              <Calendar className="h-4 w-4" /> {dateLongue}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
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
            <div className="flex gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-sand-300">
              {PERIODES.map((per) => (
                <button
                  key={per.j}
                  onClick={() => setPeriode(per.j)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    periode === per.j ? 'bg-ink text-white' : 'text-muted'
                  }`}
                >
                  {per.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.id} kpi={k} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panneau titre={`Flux d'accès (${sfx})`} className="lg:col-span-2">
            {fluxTotal === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Aucun passage enregistré sur la période.</p>
            ) : (
              <>
                <ColumnChart data={tb.serie.map((p) => ({ label: p.label, entrees: p.entrees, sorties: p.sorties }))} />
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-muted">
                  <Legende hex="#5C6B12" label="Entrées" />
                  <Legende hex="#AEBE6A" label="Sorties" />
                  <span className="ml-auto inline-flex items-center gap-1.5 text-danger-600">
                    <XCircle className="h-3.5 w-3.5" /> {tb.controles.refus} refus sur la période
                  </span>
                </div>
              </>
            )}
          </Panneau>
          <Panneau titre={`Contrôles d'accès (${sfx})`}>
            {totalControles === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Aucun contrôle sur la période.</p>
            ) : (
              <Donut
                centre={String(totalControles)}
                sousTitre="contrôles"
                segments={[
                  { label: 'Autorisés', value: tb.controles.autorises, color: '', hex: '#7E9330' },
                  { label: 'Forçages', value: tb.controles.forcages, color: '', hex: '#F2C14E' },
                  { label: 'Refus', value: tb.controles.refus, color: '', hex: '#C0392B' },
                ]}
              />
            )}
          </Panneau>
        </div>

        {/* Ressources & incidents — vue transversale (direction & HSE) */}
        {(estDir || estHse) && (
          <Panneau titre="Ressources & incidents" className="mt-4" icon={<Boxes className="h-4 w-4 text-forest-500" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RessourceItem icon={<FileWarning className="h-4 w-4" />} label="Incidents ouverts" value={tb.incidents.ouverts} sub={`${tb.incidents.majeurs} majeur(s)`} alerte={tb.incidents.ouverts > 0} />
              <RessourceItem icon={<Boxes className="h-4 w-4" />} label="Dotations présentes" value={tb.dotations.quantite} sub={`${tb.dotations.entreprises} entreprise(s)`} />
              <RessourceItem icon={<KeyRound className="h-4 w-4" />} label="Clés sorties" value={tb.cles.sorties} sub={`sur ${tb.cles.total}`} alerte={tb.cles.sorties > 0} />
              <RessourceItem icon={<Truck className="h-4 w-4" />} label="Préavis livraison (jour)" value={tb.preavis_jour} />
            </div>
          </Panneau>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Effectif par entreprise — direction & chef de poste */}
          {(estDir || estPoste) && (
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
          )}

          {/* Clés & préavis — spécifique chef de poste */}
          {estPoste && (
            <Panneau titre="Clés & préavis" icon={<KeyRound className="h-4 w-4 text-forest-500" />}>
              <div className="grid grid-cols-2 gap-3">
                <RessourceItem icon={<KeyRound className="h-4 w-4" />} label="Clés sorties" value={tb.cles.sorties} sub={`sur ${tb.cles.total}`} alerte={tb.cles.sorties > 0} />
                <RessourceItem icon={<LogOut className="h-4 w-4" />} label="Sorties en attente" value={tb.sorties_attente} alerte={tb.sorties_attente > 0} />
                <RessourceItem icon={<Truck className="h-4 w-4" />} label="Préavis du jour" value={tb.preavis_jour} />
                <RessourceItem icon={<PackageCheck className="h-4 w-4" />} label="Badges actifs" value={tb.badges_actifs} />
              </div>
            </Panneau>
          )}

          <Panneau titre="Alertes du jour" icon={<BellRing className="h-4 w-4 text-amber-500" />} className={estHse ? 'lg:col-span-2' : ''}>
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

        {/* Anomalies de flux — direction & HSE (mouvements, pas objets) */}
        {(estDir || estHse) && (
          <Panneau titre={`Anomalies de flux (${sfx})`} className="mt-4" icon={<Activity className="h-4 w-4 text-forest-500" />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <AnomalieItem icon={<Truck className="h-4 w-4" />} label="Véhicules (entré vide → chargé)" value={tb.anomalies.vehicules} />
              <AnomalieItem icon={<Trash2 className="h-4 w-4" />} label="Contrôles d'évacuation" value={tb.anomalies.evacuations} />
              <AnomalieItem icon={<XCircle className="h-4 w-4" />} label="Sorties refusées faute de couverture" value={tb.anomalies.sorties_refusees} />
            </div>
            <p className="mt-3 text-[11px] text-muted">On ne compte pas les objets, on compte les mouvements. Chiffres réels de la période, bornés à l'organisation.</p>
          </Panneau>
        )}
      </div>
    </div>
  );
}

/* ---------- Sous-composants ---------- */
function Tendance({ actuel, precedent, neutre, clair }: { actuel: number; precedent: number; neutre?: boolean; clair?: boolean }) {
  const delta = actuel - precedent;
  if (actuel === 0 && precedent === 0) return null;
  const flat = delta === 0;
  const pire = delta > 0; // hausse d'un indicateur négatif (refus, anomalies…) = dégradation
  const pct = precedent === 0 ? null : Math.abs(Math.round((delta / precedent) * 100));
  const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  // Tendance neutre : simple direction, sans jugement (ni rouge ni vert).
  let cls: string;
  if (neutre) {
    cls = clair ? 'bg-sand-100 text-muted' : 'bg-white/20 text-white/85';
  } else if (flat) {
    cls = clair ? 'bg-sand-100 text-muted' : 'bg-white/20 text-white/80';
  } else if (pire) {
    cls = clair ? 'bg-danger-50 text-danger-600' : 'bg-danger-600/80 text-white';
  } else {
    cls = clair ? 'bg-forest-50 text-forest-600' : 'bg-white/25 text-white';
  }
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cls}`} title="Par rapport à la période précédente">
      <Icon className="h-3 w-3" />
      {flat ? '—' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)}${pct !== null ? ` · ${pct}%` : ''}`}
    </span>
  );
}

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

function RessourceItem({ icon, label, value, sub, alerte }: { icon: React.ReactNode; label: string; value: number; sub?: string; alerte?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-3 ring-1 ${alerte ? 'bg-amber-50 ring-amber-200' : 'bg-sand-50 ring-sand-200'}`}>
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${alerte ? 'bg-amber-500 text-white' : 'bg-white text-forest-600 ring-1 ring-sand-200'}`}>
        {icon}
      </span>
      <p className="mt-2 text-2xl font-extrabold leading-none tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-muted">{label}</p>
      {sub && <p className="text-[11px] text-muted/80">{sub}</p>}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const { label, value, unit, tone, icon, trend, spark } = kpi;
  const bg: Record<Tone, string> = {
    forest: 'bg-forest-500 text-white',
    amber: 'bg-amber-500 text-white',
    danger: 'bg-danger-500 text-white',
    plain: 'bg-white text-ink',
  };
  const inverted = tone !== 'plain';
  const sparkColor = inverted ? 'rgba(255,255,255,0.85)' : '#5C6B12';
  return (
    <div className={`flex flex-col rounded-2xl border border-sand-300/50 p-5 shadow-card ${bg[tone]}`}>
      <div className="flex items-start justify-between">
        <p className={`text-sm font-medium ${inverted ? 'text-white/85' : 'text-muted'}`}>{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${inverted ? 'bg-white/20' : 'bg-forest-50 text-forest-600'}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight">{value}</span>
        {unit && <span className={`text-xs font-medium ${inverted ? 'text-white/70' : 'text-muted'}`}>{unit}</span>}
        {trend && <span className="ml-auto"><Tendance actuel={trend.actuel} precedent={trend.precedent} neutre={trend.neutre} clair={!inverted} /></span>}
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-2 -mb-1">
          <Sparkline data={spark} color={sparkColor} />
        </div>
      )}
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
