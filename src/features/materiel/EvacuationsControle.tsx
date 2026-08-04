import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Trash2,
  Plus,
  Check,
  X,
  Truck,
  Dice5,
  Camera,
  ShieldAlert,
  ClipboardCheck,
  LogIn,
  Loader2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { useAuthz } from '../../lib/authz';
import { useEntreprises } from './referentiel';
import {
  chargerEvacuations,
  chargerControlesEvac,
  creerEvacuation,
  enregistrerControleEvac,
  type Evacuation,
  type ControleInopine,
  type ResultatControle,
} from './api';

/** Taux de contrôle inopiné (référentiel site, chap. 8) : 1 sur 5 par défaut. */
const TAUX_CONTROLE = { sur: 5, libelle: '1 sur 5' };

const NATURES_DEBLAIS = [
  'Déblais de terrassement',
  'Gravats de démolition',
  'Chutes de couverture',
  'Terre végétale',
  'Bétons de démolition',
];

const dh = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function EvacuationsControle() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutAutoriser = a('AUTORISER_EVACUATION');
  const peutControler = a('CONTROLER_AU_POSTE');

  const [autos, setAutos] = useState<Evacuation[]>([]);
  const [controles, setControles] = useState<ControleInopine[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [controleEnCours, setControleEnCours] = useState<{ evacuationId: string; numero: string; immat: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const nbSorties = useRef(0);
  const entreprises = useEntreprises();

  const rafraichir = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([chargerEvacuations(), chargerControlesEvac()]);
      setAutos(e);
      setControles(c);
      setErreur(null);
    } catch (err) {
      setErreur((err as Error).message);
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

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  }

  const actives = useMemo(() => autos.filter((a) => a.statut === 'ACTIVE'), [autos]);
  const stats = useMemo(() => ({
    actives: actives.length,
    controles: controles.length,
    anomalies: controles.filter((c) => c.resultat === 'ANOMALIE').length,
  }), [actives.length, controles]);

  // Simulation d'une sortie de benne : le système tire au sort le contrôle du
  // fond de benne au taux paramétré. Le tirage est déterministe (démo) ; c'est
  // l'enregistrement du contrôle qui est réel et opposable côté serveur.
  function simulerSortie() {
    if (actives.length === 0) return;
    nbSorties.current += 1;
    const ae = actives[nbSorties.current % actives.length];
    const immat = ae.immatriculations[0] ?? '—';
    const tire = (nbSorties.current - 1) % TAUX_CONTROLE.sur === 0;
    if (tire) {
      setControleEnCours({ evacuationId: ae.id, numero: ae.numero, immat });
    } else {
      flash(`Sortie ${immat} autorisée · pas de contrôle ce coup-ci`);
    }
  }

  async function enregistrerControle(resultat: ResultatControle) {
    if (!controleEnCours) return;
    try {
      await enregistrerControleEvac({
        evacuationId: controleEnCours.evacuationId,
        immatriculation: controleEnCours.immat,
        resultat,
        photo: true,
      });
      setControleEnCours(null);
      await rafraichir();
      flash(resultat === 'ANOMALIE' ? 'Contrôle : anomalie · alerte chef de poste' : 'Contrôle du fond de benne : conforme');
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function creer(p: { entrepriseId: string; nature: string; volume: number; periode: string; destination: string; immatriculations: string[] }) {
    try {
      const res = await creerEvacuation(p);
      setSheet(false);
      await rafraichir();
      flash(`Autorisation ${res.numero} créée`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

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
        <p className="text-sm">Les autorisations d'évacuation et leurs contrôles sont une donnée du site.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <Trash2 className="h-3.5 w-3.5" /> Matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Autorisations d'évacuation</h1>
            <p className="mt-1 text-sm text-muted">
              Nature, volume, période, destination, immatriculations autorisées. Contrôle inopiné du
              fond de benne au taux paramétré.
            </p>
          </div>
          {peutAutoriser && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
              Nouvelle autorisation
            </Button>
          )}
        </div>

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard tone="forest" label="Évacuations actives" value={stats.actives} icon={<Trash2 className="h-5 w-5" />} />
          <StatCard tone="plain" label="Contrôles inopinés" value={stats.controles} unit={`taux ${TAUX_CONTROLE.libelle}`} icon={<ClipboardCheck className="h-5 w-5" />} />
          <DangerStat label="Anomalies" value={stats.anomalies} />
        </div>

        {/* Simulation contrôle inopiné */}
        {peutControler && actives.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <p className="flex items-center gap-2 text-sm text-amber-800">
              <Dice5 className="h-4 w-4 shrink-0 text-amber-500" />
              Simuler une sortie de benne sous évacuation — le système tire au sort le contrôle du fond de benne ({TAUX_CONTROLE.libelle}).
            </p>
            <Button variant="accent" size="sm" icon={<Truck className="h-4 w-4" />} onClick={simulerSortie}>
              Simuler une sortie
            </Button>
          </div>
        )}

        <h2 className="mb-2 text-sm font-bold text-ink">Autorisations</h2>
        {autos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
            <Trash2 className="mx-auto h-8 w-8 text-sand-300" />
            <p className="mt-2 text-sm font-semibold text-ink">Aucune autorisation d'évacuation</p>
            <p className="mt-1 text-sm text-muted">
              {peutAutoriser
                ? 'Créez une autorisation : nature, volume, période, destination et immatriculations admises.'
                : 'La délivrance relève du HSE (pouvoir AUTORISER_EVACUATION).'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {autos.map((a) => (
              <EvacRow key={a.id} a={a} />
            ))}
          </ul>
        )}

        {controles.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-sm font-bold text-ink">Contrôles inopinés</h2>
            <ul className="space-y-1.5">
              {controles.slice(0, 8).map((c) => (
                <ControleRow key={c.id} c={c} />
              ))}
            </ul>
          </>
        )}
      </div>

      {controleEnCours && (
        <ControleSheet
          numero={controleEnCours.numero}
          immat={controleEnCours.immat}
          onAnnuler={() => setControleEnCours(null)}
          onEnregistrer={enregistrerControle}
        />
      )}
      {sheet && <EvacSheet entreprises={entreprises} onAnnuler={() => setSheet(false)} onConfirmer={creer} />}

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

function EvacRow({ a }: { a: Evacuation }) {
  return (
    <li className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">{a.numero}</span>
            {a.visee && <Badge tone="forest">Visée</Badge>}
          </div>
          <p className="mt-1 text-sm font-bold text-ink">{a.entreprise}</p>
          <p className="text-xs text-muted">
            {a.nature} · {a.volume} m³ · {a.periode} → {a.destination}
          </p>
        </div>
        {a.statut === 'ACTIVE' ? <Badge tone="forest" dot>Active</Badge> : <Badge tone="neutral" dot>Clôturée</Badge>}
      </div>
      {a.immatriculations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.immatriculations.map((i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink ring-1 ring-sand-300">
              <Truck className="h-3 w-3 text-muted" /> {i}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

function ControleRow({ c }: { c: ControleInopine }) {
  const ano = c.resultat === 'ANOMALIE';
  return (
    <li className={`flex flex-wrap items-center gap-2.5 rounded-xl px-3 py-2 text-sm shadow-card ring-1 ${ano ? 'bg-danger-50 ring-danger-100' : 'bg-white ring-sand-300/70'}`}>
      <Camera className="h-3.5 w-3.5 text-muted" />
      <span className="font-mono text-xs font-semibold text-ink">{c.immatriculation}</span>
      <span className="text-xs text-muted">{c.numeroEvac} · fond de benne · {c.agent}</span>
      <Badge tone={ano ? 'danger' : 'forest'}>{ano ? 'Anomalie' : 'Conforme'}</Badge>
      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">{dh(c.horodatage)}</span>
    </li>
  );
}

function DangerStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <ShieldAlert className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

/* ---------- Contrôle inopiné (tiré au sort) ---------- */
function ControleSheet({
  numero,
  immat,
  onAnnuler,
  onEnregistrer,
}: {
  numero: string;
  immat: string;
  onAnnuler: () => void;
  onEnregistrer: (r: ResultatControle) => void;
}) {
  const [photo, setPhoto] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dice5 className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-extrabold text-ink">Contrôle inopiné tiré au sort</h3>
          </div>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-sm text-muted">
          <span className="font-mono font-semibold text-ink">{immat}</span> · {numero}. Consigne :
          contrôle du fond de benne, photo exigée avant validation.
        </p>

        <div className="mb-4">
          <PhotoCapture label="Photographier le fond de benne" onCapture={() => setPhoto(true)} />
        </div>

        <div className="flex gap-2">
          <Button variant="danger" size="lg" block disabled={!photo} icon={<ShieldAlert className="h-5 w-5" />} onClick={() => onEnregistrer('ANOMALIE')}>
            Anomalie
          </Button>
          <Button variant="primary" size="lg" block disabled={!photo} icon={<Check className="h-5 w-5" strokeWidth={2.5} />} onClick={() => onEnregistrer('CONFORME')}>
            Conforme
          </Button>
        </div>
        {!photo && <p className="mt-2 text-center text-[11px] font-medium text-amber-700">La photo est exigée pour clore le contrôle.</p>}
      </div>
    </div>
  );
}

/* ---------- Nouvelle autorisation ---------- */
function EvacSheet({
  entreprises,
  onAnnuler,
  onConfirmer,
}: {
  entreprises: { id: string; raisonSociale: string }[];
  onAnnuler: () => void;
  onConfirmer: (p: { entrepriseId: string; nature: string; volume: number; periode: string; destination: string; immatriculations: string[] }) => void;
}) {
  const [entrepriseId, setEntrepriseId] = useState(entreprises[0]?.id ?? '');
  const [nature, setNature] = useState(NATURES_DEBLAIS[0]);
  const [volume, setVolume] = useState('50');
  const [periode, setPeriode] = useState('');
  const [destination, setDestination] = useState('');
  const [immat, setImmat] = useState('');
  const pret = entrepriseId && periode.trim() && destination.trim() && immat.trim() && Number(volume) > 0;

  const input = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input value={value} onChange={(e) => set(e.target.value)} placeholder={ph}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouvelle autorisation d'évacuation</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
              <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {entreprises.length === 0 && <option value="">Aucune entreprise</option>}
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Volume (m³)</span>
              <input type="number" min="1" value={volume} onChange={(e) => setVolume(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Nature des déblais</span>
            <select value={nature} onChange={(e) => setNature(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {NATURES_DEBLAIS.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          {input('Période', periode, setPeriode, 'Ex. : 01/08 → 31/08')}
          {input('Destination désignée', destination, setDestination, 'Ex. : Décharge Akouédo')}
          {input('Immatriculations autorisées', immat, setImmat, 'Ex. : CI-2208-AB, CI-3312-MN')}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({
              entrepriseId, nature, volume: Number(volume),
              periode: periode.trim(), destination: destination.trim(),
              immatriculations: immat.split(',').map((s) => s.trim()).filter(Boolean),
            })}>
            Créer l'autorisation
          </Button>
        </div>
      </div>
    </div>
  );
}
