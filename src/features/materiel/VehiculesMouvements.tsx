import { useMemo, useState } from 'react';
import {
  Truck,
  Check,
  X,
  LogIn,
  LogOut,
  AlertTriangle,
  ShieldAlert,
  Camera,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import {
  COUVERTURES,
  CONTROLE_LABEL,
  MOUVEMENTS_VEHICULE_INIT,
  VEHICULES,
  type ControleEffectue,
  type EtatCharge,
  type MouvementVehicule,
  type Vehicule,
} from '../../data/vehicules';

export function VehiculesMouvements() {
  const [vehicules, setVehicules] = useState<Vehicule[]>(VEHICULES);
  const [mouvements, setMouvements] = useState<MouvementVehicule[]>(MOUVEMENTS_VEHICULE_INIT);
  const [cible, setCible] = useState<Vehicule | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const horloge = useMemo(() => ({ v: 8 * 60 + 15 }), []);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  }
  function heure() {
    horloge.v += 1;
    return `${String(Math.floor(horloge.v / 60)).padStart(2, '0')}:${String(horloge.v % 60).padStart(2, '0')}`;
  }

  const stats = useMemo(() => ({
    surSite: vehicules.filter((v) => v.statut === 'SUR_SITE').length,
    mouvements: mouvements.length,
    anomalies: mouvements.filter((m) => m.anomalie).length,
  }), [vehicules, mouvements]);

  function enregistrer(m: Omit<MouvementVehicule, 'id' | 'heure'>) {
    const h = heure();
    setMouvements((prev) => [{ ...m, id: `mv-${prev.length + 2}`, heure: h }, ...prev]);
    setVehicules((vs) =>
      vs.map((v) => {
        if (v.immatriculation !== m.immatriculation) return v;
        return m.sens === 'ENTREE'
          ? { ...v, statut: 'SUR_SITE', etatEntree: m.etat, natureEntree: m.nature, entreeHeure: h }
          : { ...v, statut: 'DEHORS', etatEntree: undefined, natureEntree: undefined, entreeHeure: undefined };
      }),
    );
    setCible(null);
    flash(
      m.anomalie
        ? 'Mouvement forcé · anomalie tracée · alerte chef de poste'
        : `${m.sens === 'ENTREE' ? 'Entrée' : 'Sortie'} enregistrée`,
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
            <Truck className="h-3.5 w-3.5" /> M11 · Lot matière
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Véhicules &amp; mouvements</h1>
          <p className="mt-1 text-sm text-muted">
            Laissez-passer rattaché à l'entreprise. Un véhicule entré vide qui ressort chargé sans
            couverture déclenche une alerte bloquante — le contrôle le plus rentable.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard tone="forest" label="Sur site" value={stats.surSite} icon={<Truck className="h-5 w-5" />} />
          <StatCard tone="plain" label="Mouvements du jour" value={stats.mouvements} icon={<LogIn className="h-5 w-5" />} />
          <DangerStat label="Anomalies" value={stats.anomalies} />
        </div>

        <h2 className="mb-2 text-sm font-bold text-ink">Laissez-passer</h2>
        <ul className="space-y-2">
          {vehicules.map((v) => (
            <VehiculeRow key={v.id} v={v} onMouvement={() => setCible(v)} />
          ))}
        </ul>

        {mouvements.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-sm font-bold text-ink">Derniers mouvements</h2>
            <ul className="space-y-1.5">
              {mouvements.slice(0, 6).map((m) => (
                <MouvementRow key={m.id} m={m} />
              ))}
            </ul>
          </>
        )}
      </div>

      {cible && <MouvementSheet v={cible} onAnnuler={() => setCible(null)} onConfirmer={enregistrer} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} />
            {toast}
          </div>
        </div>
      )}
    </>
  );
}

function VehiculeRow({ v, onMouvement }: { v: Vehicule; onMouvement: () => void }) {
  const surSite = v.statut === 'SUR_SITE';
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-forest-500 ring-1 ring-sand-200">
        <Truck className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">
          {v.immatriculation} <span className="font-normal text-muted">· {v.type}</span>
        </p>
        <p className="truncate text-xs text-muted">
          {v.entreprise} · {v.chauffeur} · <span className="font-mono">{v.laissezPasser}</span>
        </p>
        {surSite && (
          <p className="mt-0.5 text-[11px] text-muted">
            Entré {v.entreeHeure} · {v.etatEntree === 'VIDE' ? 'à vide' : `chargé (${v.natureEntree})`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {surSite ? <Badge tone="forest" dot>Sur site</Badge> : <Badge tone="neutral" dot>Dehors</Badge>}
        <Button
          variant={surSite ? 'accent' : 'primary'}
          size="sm"
          icon={surSite ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          onClick={onMouvement}
        >
          {surSite ? 'Sortie' : 'Entrée'}
        </Button>
      </div>
    </li>
  );
}

function MouvementRow({ m }: { m: MouvementVehicule }) {
  return (
    <li className={`flex flex-wrap items-center gap-2.5 rounded-xl px-3 py-2 text-sm shadow-card ring-1 ${m.anomalie ? 'bg-danger-50 ring-danger-100' : 'bg-white ring-sand-300/70'}`}>
      <span className="text-muted">{m.sens === 'ENTREE' ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}</span>
      <span className="font-mono text-xs font-semibold text-ink">{m.immatriculation}</span>
      <span className="text-xs text-muted">
        {m.sens === 'ENTREE' ? 'entrée' : 'sortie'} · {m.etat === 'VIDE' ? 'à vide' : 'chargé'}
        {m.nature ? ` (${m.nature})` : ''} · contrôle {CONTROLE_LABEL[m.controle].toLowerCase()}
      </span>
      {m.anomalie && <Badge tone="danger">{m.force ? 'Forcé' : 'Anomalie'}</Badge>}
      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">{m.heure}</span>
    </li>
  );
}

function DangerStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <AlertTriangle className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

/* ---------- Déclaration d'un mouvement ---------- */
function MouvementSheet({
  v,
  onAnnuler,
  onConfirmer,
}: {
  v: Vehicule;
  onAnnuler: () => void;
  onConfirmer: (m: Omit<MouvementVehicule, 'id' | 'heure'>) => void;
}) {
  const sens = v.statut === 'SUR_SITE' ? 'SORTIE' : 'ENTREE';
  const [etat, setEtat] = useState<EtatCharge>('VIDE');
  const [nature, setNature] = useState('');
  const [controle, setControle] = useState<ControleEffectue | ''>('');
  const [couverture, setCouverture] = useState('');

  // Anomalie : sortie d'un véhicule entré vide, ressortant chargé, sans couverture.
  const anomalie =
    sens === 'SORTIE' && v.etatEntree === 'VIDE' && etat === 'CHARGE' && !couverture;

  const controleOk = controle !== '';
  const natureOk = etat === 'VIDE' || nature.trim().length > 0;
  const pret = controleOk && natureOk;

  function valider(force: boolean) {
    onConfirmer({
      immatriculation: v.immatriculation,
      entreprise: v.entreprise,
      sens,
      etat,
      nature: etat === 'CHARGE' ? nature.trim() : undefined,
      controle: controle as ControleEffectue,
      couverture: couverture || undefined,
      anomalie,
      force: force || undefined,
    });
  }

  const seg = <T extends string>(val: T, cur: T, set: (v: T) => void, label: string) => (
    <button
      onClick={() => set(val)}
      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
        cur === val ? 'bg-forest-500 text-white shadow-card' : 'text-muted'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">
            {sens === 'ENTREE' ? 'Entrée' : 'Sortie'} · {v.immatriculation}
          </h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">
          {v.entreprise} · {v.chauffeur} · <span className="font-mono">{v.laissezPasser}</span>
          {sens === 'SORTIE' && v.etatEntree && (
            <> · entré <b className="text-ink">{v.etatEntree === 'VIDE' ? 'à vide' : 'chargé'}</b></>
          )}
        </p>

        <p className="mb-1 text-xs font-semibold text-muted">État déclaré</p>
        <div className="mb-3 flex gap-1 rounded-xl bg-sand-200 p-1">
          {seg<EtatCharge>('VIDE', etat, setEtat, 'Vide')}
          {seg<EtatCharge>('CHARGE', etat, setEtat, 'Chargé')}
        </div>

        {etat === 'CHARGE' && (
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold text-muted">Nature du chargement</span>
            <input value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Ex. : gravats, palettes…"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
          </label>
        )}

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Contrôle effectué <span className="text-danger-500">*</span></span>
          <select value={controle} onChange={(e) => setControle(e.target.value as ControleEffectue)}
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
            <option value="">— sélectionner —</option>
            {Object.entries(CONTROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>

        {sens === 'SORTIE' && etat === 'CHARGE' && (
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold text-muted">Couverture documentaire</span>
            <select value={couverture} onChange={(e) => setCouverture(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              <option value="">Aucune</option>
              {COUVERTURES.map((c) => <option key={c.id} value={c.libelle}>{c.libelle}</option>)}
            </select>
          </label>
        )}

        {/* Anomalie bloquante */}
        {anomalie && (
          <div className="mb-3 rounded-xl bg-danger-50 p-3 ring-1 ring-danger-100">
            <p className="flex items-center gap-1.5 text-xs font-bold text-danger-600">
              <ShieldAlert className="h-4 w-4" /> Anomalie bloquante
            </p>
            <p className="mt-1 text-[11px] text-danger-600">
              Véhicule entré à vide, ressort chargé sans couverture documentaire. Validation impossible —
              seul le forçage tracé est possible (photo + alerte chef de poste).
            </p>
          </div>
        )}
        {!controleOk && (
          <p className="mb-3 text-[11px] font-medium text-amber-700">
            Le contrôle effectué doit être renseigné pour valider.
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          {anomalie ? (
            <Button variant="accent" size="lg" block disabled={!pret} icon={<Camera className="h-5 w-5" />} onClick={() => valider(true)}>
              Forcer (photo + tracé)
            </Button>
          ) : (
            <Button variant="primary" size="lg" block disabled={!pret} onClick={() => valider(false)}>
              Valider le mouvement
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
