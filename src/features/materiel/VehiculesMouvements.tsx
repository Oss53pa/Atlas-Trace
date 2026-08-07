import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Truck,
  Check,
  X,
  LogIn,
  LogOut,
  AlertTriangle,
  ShieldAlert,
  Camera,
  Plus,
  Loader2,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { useAuthz } from '../../lib/authz';
import { lirePlaque } from '../../lib/ocr';
import { televerserPhoto, urlPhotoSignee } from '../../lib/stockage';
import { useEntreprises } from './referentiel';
import {
  chargerVehicules,
  chargerMouvementsVehicule,
  enregistrerVehicule,
  enregistrerMouvementVehicule,
  lierOccupantVehicule,
  type Vehicule,
  type MouvementVehicule,
  type EtatCharge,
  type ControleEffectue,
  type OccupantVehicule,
} from './api';

const CONTROLE_LABEL: Record<ControleEffectue, string> = {
  COFFRE: 'Coffre',
  BENNE: 'Benne',
  LES_DEUX: 'Les deux',
  SANS_OBJET: 'Sans objet',
};

/** Couvertures documentaires possibles pour une sortie chargée. */
const COUVERTURES = [
  'Autorisation de sortie',
  'Autorisation d’évacuation',
  'Préavis de livraison',
];

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function VehiculesMouvements() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutControler = a('CONTROLER_AU_POSTE');
  const peutForcer = a('FORCER_ACCES');

  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [mouvements, setMouvements] = useState<MouvementVehicule[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cible, setCible] = useState<Vehicule | null>(null);
  const [creation, setCreation] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const entreprises = useEntreprises();

  const rafraichir = useCallback(async () => {
    try {
      const [v, m] = await Promise.all([chargerVehicules(), chargerMouvementsVehicule()]);
      setVehicules(v);
      setMouvements(m);
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

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  }

  const stats = useMemo(
    () => ({
      surSite: vehicules.filter((v) => v.statut === 'SUR_SITE').length,
      mouvements: mouvements.length,
      anomalies: mouvements.filter((m) => m.anomalie).length,
    }),
    [vehicules, mouvements],
  );

  async function enregistrerMouvement(p: {
    vehiculeId: string;
    sens: 'ENTREE' | 'SORTIE';
    etat: EtatCharge;
    controle: ControleEffectue;
    nature?: string;
    couverture?: string;
    force?: boolean;
    photo?: boolean;
    photoUrl?: string | null;
    occupants?: OccupantVehicule[];
  }) {
    try {
      const { occupants, ...mv } = p;
      const res = await enregistrerMouvementVehicule(mv);
      for (const o of occupants ?? []) {
        try { await lierOccupantVehicule(res.mouvementId, o.badge, o.role); } catch { /* occupant ignoré individuellement */ }
      }
      setCible(null);
      await rafraichir();
      flash(
        res.force
          ? 'Mouvement forcé · anomalie tracée · alerte chef de poste'
          : `${p.sens === 'ENTREE' ? 'Entrée' : 'Sortie'} enregistrée`,
      );
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function creerVehicule(p: { entrepriseId: string; immatriculation: string; type: string; chauffeur: string }) {
    try {
      const res = await enregistrerVehicule(p);
      setCreation(false);
      await rafraichir();
      flash(`Laissez-passer ${res.laissezPasser} créé`);
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
        <p className="text-sm">Les mouvements de véhicules sont une donnée du poste : il faut un compte pour les tenir.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <Truck className="h-3.5 w-3.5" /> Matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Véhicules &amp; mouvements</h1>
            <p className="mt-1 text-sm text-muted">
              Laissez-passer rattaché à l'entreprise. Un véhicule entré vide qui ressort chargé sans
              couverture déclenche une alerte bloquante — le contrôle le plus rentable.
            </p>
          </div>
          {peutControler && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreation(true)}>
              Nouveau laissez-passer
            </Button>
          )}
        </div>

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard tone="forest" label="Sur site" value={stats.surSite} icon={<Truck className="h-5 w-5" />} />
          <StatCard tone="plain" label="Mouvements du jour" value={stats.mouvements} icon={<LogIn className="h-5 w-5" />} />
          <DangerStat label="Anomalies" value={stats.anomalies} />
        </div>

        <h2 className="mb-2 text-sm font-bold text-ink">Laissez-passer</h2>
        {vehicules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
            <Truck className="mx-auto h-8 w-8 text-sand-300" />
            <p className="mt-2 text-sm font-semibold text-ink">Aucun laissez-passer</p>
            <p className="mt-1 text-sm text-muted">
              {peutControler
                ? 'Créez un laissez-passer : il rattache le véhicule à son entreprise.'
                : 'La tenue des laissez-passer relève du poste (pouvoir CONTROLER_AU_POSTE).'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {vehicules.map((v) => (
              <VehiculeRow key={v.id} v={v} peutControler={peutControler} onMouvement={() => setCible(v)} />
            ))}
          </ul>
        )}

        {mouvements.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-sm font-bold text-ink">Derniers mouvements</h2>
            <ul className="space-y-1.5">
              {mouvements.slice(0, 8).map((m) => (
                <MouvementRow key={m.id} m={m} />
              ))}
            </ul>
          </>
        )}
      </div>

      {cible && (
        <MouvementSheet
          v={cible}
          peutForcer={peutForcer}
          onAnnuler={() => setCible(null)}
          onConfirmer={enregistrerMouvement}
        />
      )}
      {creation && (
        <VehiculeSheet
          entreprises={entreprises}
          onAnnuler={() => setCreation(false)}
          onConfirmer={creerVehicule}
        />
      )}

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

function VehiculeRow({
  v,
  peutControler,
  onMouvement,
}: {
  v: Vehicule;
  peutControler: boolean;
  onMouvement: () => void;
}) {
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
          {v.entreprise}{v.chauffeur ? ` · ${v.chauffeur}` : ''} · <span className="font-mono">{v.laissezPasser}</span>
        </p>
        {surSite && v.entreeAt && (
          <p className="mt-0.5 text-[11px] text-muted">
            Entré {heure(v.entreeAt)} · {v.etatEntree === 'VIDE' ? 'à vide' : `chargé${v.natureEntree ? ` (${v.natureEntree})` : ''}`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {surSite ? <Badge tone="forest" dot>Sur site</Badge> : <Badge tone="neutral" dot>Dehors</Badge>}
        {peutControler && (
          <Button
            variant={surSite ? 'accent' : 'primary'}
            size="sm"
            icon={surSite ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            onClick={onMouvement}
          >
            {surSite ? 'Sortie' : 'Entrée'}
          </Button>
        )}
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
      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">{heure(m.horodatage)}</span>
      {m.occupants.length > 0 && (
        <div className="flex basis-full flex-wrap items-center gap-1.5 pl-6 pt-0.5">
          <Users className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Occupants" />
          {m.occupants.map((o) => (
            <span
              key={o.badge}
              title={o.connu ? undefined : 'Badge inconnu au référentiel'}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                o.role === 'CONDUCTEUR'
                  ? 'bg-forest-50 text-forest-700 ring-forest-100'
                  : 'bg-sand-100 text-ink ring-sand-300/70'
              }`}
            >
              <span className="font-semibold">{o.role === 'CONDUCTEUR' ? 'Cond.' : 'Pass.'}</span>
              <span className="max-w-[9rem] truncate">{o.label}</span>
              {!o.connu && <AlertTriangle className="h-3 w-3 text-danger-500" />}
            </span>
          ))}
        </div>
      )}
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
  peutForcer,
  onAnnuler,
  onConfirmer,
}: {
  v: Vehicule;
  peutForcer: boolean;
  onAnnuler: () => void;
  onConfirmer: (p: {
    vehiculeId: string;
    sens: 'ENTREE' | 'SORTIE';
    etat: EtatCharge;
    controle: ControleEffectue;
    nature?: string;
    couverture?: string;
    force?: boolean;
    photo?: boolean;
    photoUrl?: string | null;
    occupants?: OccupantVehicule[];
  }) => void;
}) {
  const { portees } = useAuthz();
  const orgId = portees[0]?.organisationId ?? '';
  const sens = v.statut === 'SUR_SITE' ? 'SORTIE' : 'ENTREE';
  const [etat, setEtat] = useState<EtatCharge>('VIDE');
  const [nature, setNature] = useState('');
  const [controle, setControle] = useState<ControleEffectue | ''>('');
  const [couverture, setCouverture] = useState('');
  const [photo, setPhoto] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [telev, setTelev] = useState(false);
  const [entreeSignee, setEntreeSignee] = useState<string | null>(null);
  const [occupants, setOccupants] = useState<OccupantVehicule[]>([]);
  const [badgeSaisi, setBadgeSaisi] = useState('');
  const [roleSaisi, setRoleSaisi] = useState<'CONDUCTEUR' | 'PASSAGER'>('CONDUCTEUR');

  function ajouterOccupant() {
    const b = badgeSaisi.trim().toUpperCase();
    if (!b || occupants.some((o) => o.badge === b)) return;
    // Le conducteur est unique : si déjà pris, le nouveau devient passager.
    const role = roleSaisi === 'CONDUCTEUR' && occupants.some((o) => o.role === 'CONDUCTEUR') ? 'PASSAGER' : roleSaisi;
    setOccupants((l) => [...l, { badge: b, role }]);
    setBadgeSaisi('');
    setRoleSaisi('PASSAGER');
  }

  // À la sortie : récupère la photo prise à l'entrée pour comparaison.
  useEffect(() => {
    if (sens === 'SORTIE' && v.photoEntreeUrl) {
      urlPhotoSignee(v.photoEntreeUrl).then(setEntreeSignee).catch(() => setEntreeSignee(null));
    }
  }, [sens, v.photoEntreeUrl]);

  async function capturerPhoto(dataUrl: string) {
    setPhoto(true);
    if (!orgId) return;
    setTelev(true);
    try {
      const chemin = await televerserPhoto(dataUrl, orgId, 'vehicules');
      setPhotoPath(chemin);
    } catch {
      /* échec upload : la photo reste visuellement prise, sans stockage */
    } finally {
      setTelev(false);
    }
  }

  // Prévisualisation de l'anomalie (le serveur reste l'arbitre) : sortie d'un
  // véhicule entré vide, ressortant chargé, sans couverture.
  const anomalie = sens === 'SORTIE' && v.etatEntree === 'VIDE' && etat === 'CHARGE' && !couverture;

  const controleOk = controle !== '';
  const natureOk = etat === 'VIDE' || nature.trim().length > 0;
  const pret = controleOk && natureOk && (!anomalie || photo);

  function valider(force: boolean) {
    onConfirmer({
      vehiculeId: v.id,
      sens,
      etat,
      controle: controle as ControleEffectue,
      nature: etat === 'CHARGE' ? nature.trim() : undefined,
      couverture: couverture || undefined,
      force: force || undefined,
      photo: photo || undefined,
      photoUrl: photoPath,
      occupants: occupants.length ? occupants : undefined,
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
          {v.entreprise}{v.chauffeur ? ` · ${v.chauffeur}` : ''} · <span className="font-mono">{v.laissezPasser}</span>
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

        {/* Occupants badgés : conducteur + passagers rattachés au passage du véhicule */}
        <div className="mb-3 rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
          <p className="mb-2 text-xs font-semibold text-muted">Occupants badgés (conducteur + passagers)</p>
          {occupants.length > 0 && (
            <ul className="mb-2 space-y-1">
              {occupants.map((o) => (
                <li key={o.badge} className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${o.role === 'CONDUCTEUR' ? 'bg-forest-100 text-forest-700' : 'bg-sand-200 text-ink'}`}>
                    {o.role === 'CONDUCTEUR' ? 'Conducteur' : 'Passager'}
                  </span>
                  <span className="font-mono text-ink">{o.badge}</span>
                  <button onClick={() => setOccupants((l) => l.filter((x) => x.badge !== o.badge))} className="ml-auto text-muted hover:text-danger-500" aria-label="Retirer"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input value={badgeSaisi} onChange={(e) => setBadgeSaisi(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterOccupant(); } }}
              placeholder="N° de badge"
              className="min-w-0 flex-1 rounded-lg border border-sand-300 bg-white px-2.5 py-1.5 text-sm uppercase text-ink outline-none placeholder:normal-case placeholder:text-muted focus:border-forest-400" />
            <select value={roleSaisi} onChange={(e) => setRoleSaisi(e.target.value as 'CONDUCTEUR' | 'PASSAGER')}
              className="rounded-lg border border-sand-300 bg-white px-2 py-1.5 text-sm font-medium text-ink outline-none focus:border-forest-400">
              <option value="CONDUCTEUR">Conducteur</option>
              <option value="PASSAGER">Passager</option>
            </select>
            <button onClick={ajouterOccupant} className="inline-flex shrink-0 items-center rounded-lg bg-forest-500 px-2.5 py-1.5 text-white hover:bg-forest-600" aria-label="Ajouter l'occupant"><Plus className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-[11px] text-muted">Le numéro de badge est résolu en identité côté serveur.</p>
        </div>

        {sens === 'SORTIE' && etat === 'CHARGE' && (
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold text-muted">Couverture documentaire</span>
            <select value={couverture} onChange={(e) => setCouverture(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              <option value="">Aucune</option>
              {COUVERTURES.map((c) => <option key={c} value={c}>{c}</option>)}
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
            <div className="mt-2">
              <PhotoCapture label="Photographier le chargement" onCapture={capturerPhoto} />
            </div>
          </div>
        )}

        {/* Entrée chargée : photo du coffre / chargement, conservée pour comparaison à la sortie */}
        {sens === 'ENTREE' && etat === 'CHARGE' && !anomalie && (
          <div className="mb-3 rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
            <p className="mb-2 text-[11px] font-semibold text-muted">
              Photo du coffre / du chargement — conservée pour vérifier qu'il ressort identique.
            </p>
            <PhotoCapture label={telev ? 'Enregistrement…' : photo ? 'Reprendre la photo' : 'Photographier le coffre / chargement'} onCapture={capturerPhoto} />
          </div>
        )}

        {/* Sortie : rappel de la photo prise à l'entrée pour comparaison */}
        {sens === 'SORTIE' && (entreeSignee || v.photoEntreeUrl) && (
          <div className="mb-3 rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
            <p className="mb-2 text-[11px] font-semibold text-muted">Photo à l'entrée — comparez avec ce qui ressort.</p>
            {entreeSignee ? (
              <img src={entreeSignee} alt="Chargement à l'entrée" className="mb-2 max-h-48 w-full rounded-lg object-contain ring-1 ring-sand-200" />
            ) : (
              <p className="mb-2 text-[11px] text-muted">Chargement de la photo d'entrée…</p>
            )}
            <PhotoCapture label={telev ? 'Enregistrement…' : photo ? 'Reprendre la photo de sortie' : 'Photographier à la sortie'} onCapture={capturerPhoto} />
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
            peutForcer ? (
              <Button variant="accent" size="lg" block disabled={!pret} icon={<Camera className="h-5 w-5" />} onClick={() => valider(true)}>
                Forcer (photo + tracé)
              </Button>
            ) : (
              <Button variant="danger" size="lg" block disabled>
                Forçage réservé (FORCER_ACCES)
              </Button>
            )
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

/* ---------- Nouveau laissez-passer ---------- */
function VehiculeSheet({
  entreprises,
  onAnnuler,
  onConfirmer,
}: {
  entreprises: { id: string; raisonSociale: string }[];
  onAnnuler: () => void;
  onConfirmer: (p: { entrepriseId: string; immatriculation: string; type: string; chauffeur: string }) => void;
}) {
  const [entrepriseId, setEntrepriseId] = useState(entreprises[0]?.id ?? '');
  const [immatriculation, setImmatriculation] = useState('');
  const [type, setType] = useState('Benne');
  const [chauffeur, setChauffeur] = useState('');
  const [ocr, setOcr] = useState<{ enCours: boolean; msg: string | null }>({ enCours: false, msg: null });
  const pret = entrepriseId && immatriculation.trim().length > 0;

  async function scannerPlaque(dataUrl: string) {
    setOcr({ enCours: true, msg: 'Lecture de la plaque…' });
    try {
      const p = await lirePlaque(dataUrl);
      if (p) setOcr({ enCours: false, msg: `Plaque lue : ${p} — vérifiez et corrigez si besoin.` });
      else setOcr({ enCours: false, msg: 'Plaque illisible — saisissez-la manuellement.' });
      if (p) setImmatriculation(p);
    } catch {
      setOcr({ enCours: false, msg: 'Lecture impossible — saisissez la plaque manuellement.' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouveau laissez-passer</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
            <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {entreprises.length === 0 && <option value="">Aucune entreprise</option>}
              {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Immatriculation <span className="text-danger-500">*</span></span>
              <input value={immatriculation} onChange={(e) => setImmatriculation(e.target.value)} placeholder="CI-2208-AB"
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm uppercase text-ink outline-none placeholder:normal-case placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {['Benne', 'Camion', 'Utilitaire', 'Véhicule léger'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <div>
            <PhotoCapture label={ocr.enCours ? 'Lecture en cours…' : 'Scanner la plaque (photo → immatriculation)'} onCapture={scannerPlaque} />
            {ocr.msg && <p className={`mt-1 text-[11px] font-medium ${ocr.enCours ? 'text-muted' : 'text-forest-700'}`}>{ocr.msg}</p>}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Chauffeur</span>
            <input value={chauffeur} onChange={(e) => setChauffeur(e.target.value)} placeholder="Ex. : M. Koffi"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({ entrepriseId, immatriculation: immatriculation.trim(), type, chauffeur: chauffeur.trim() })}>
            Créer le laissez-passer
          </Button>
        </div>
      </div>
    </div>
  );
}
