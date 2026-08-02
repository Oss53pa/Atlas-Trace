import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  X,
  Package,
  Boxes,
  AlertTriangle,
  Loader2,
  LogIn,
  Plus,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { useAuthz } from '../../lib/authz';
import { useEntreprises } from './referentiel';
import {
  chargerDotations,
  chargerFamilles,
  chargerMateriels,
  declarerEntree,
  type Dotation,
  type Famille,
  type Materiel,
  type Regime,
} from './api';

const REGIME_LABEL: Record<Regime, string> = { UNITE: 'unité', CONTENANT: 'contenant', LOT: 'lot' };
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

export function ParcsMateriel() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutDeclarer = a('DECLARER_MATERIEL');

  const [familles, setFamilles] = useState<Famille[]>([]);
  const [dotations, setDotations] = useState<Dotation[]>([]);
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState('TOUTES');
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const entreprises = useEntreprises();

  const rafraichir = useCallback(async () => {
    try {
      const [f, d, m] = await Promise.all([chargerFamilles(), chargerDotations(), chargerMateriels()]);
      setFamilles(f);
      setDotations(d);
      setMateriels(m);
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
    setTimeout(() => setToast(null), 3600);
  }

  const stats = useMemo(
    () => ({
      present: dotations.reduce((s, d) => s + d.quantitePresente, 0),
      entites: new Set(dotations.map((d) => d.entrepriseId)).size,
      sensibles: dotations.filter((d) => d.sensible).reduce((s, d) => s + d.quantitePresente, 0),
      familles: familles.length,
    }),
    [dotations, familles],
  );

  const lignes = dotations.filter((d) => filtre === 'TOUTES' || d.entreprise === filtre);

  async function declarer(v: {
    entrepriseId: string;
    familleId: string;
    designation: string;
    quantite: number;
    numeroSerie?: string;
    photoUrl?: string;
    repartLeSoir: boolean;
    dateSortiePrevue?: string;
  }) {
    try {
      const res = await declarerEntree(v);
      setSheet(false);
      await rafraichir();
      flash(`Entrée déclarée · ${res.famille} · dotation ${res.dotation}`);
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
        <p className="text-sm">La dotation est une donnée du site : il faut un compte pour la consulter.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <Package className="h-3.5 w-3.5" /> M7 / M8 · Lot matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Entrée de matériel &amp; dotation</h1>
            <p className="mt-1 text-sm text-muted">
              Ce qui est déclaré incrémente la dotation de la famille et ressort en quelques secondes. Aucune
              apposition physique, aucune étiquette : couvrir, pas compter.
            </p>
          </div>
          {peutDeclarer && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
              Nouvelle entrée
            </Button>
          )}
        </div>

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard tone="forest" label="Objets présents" value={stats.present} icon={<Boxes className="h-5 w-5" />} />
          <StatCard tone="plain" label="Entités dotées" value={stats.entites} icon={<Package className="h-5 w-5" />} />
          <StatCard tone="amber" label="Présents sensibles" value={stats.sensibles} icon={<ShieldAlert className="h-5 w-5" />} />
          <StatCard label="Familles actives" value={stats.familles} icon={<Boxes className="h-5 w-5" />} />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted">
            Entité
            <select
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              className="rounded-xl border border-sand-300 bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-forest-400"
            >
              <option value="TOUTES">Toutes</option>
              {entreprises.map((e) => (
                <option key={e.id}>{e.raisonSociale}</option>
              ))}
            </select>
          </label>
          <span className="text-xs text-muted">{lignes.length} dotation(s)</span>
        </div>

        {lignes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
            <Boxes className="mx-auto h-8 w-8 text-sand-300" />
            <p className="mt-2 text-sm font-semibold text-ink">Aucune dotation en cours</p>
            <p className="mt-1 text-sm text-muted">
              {peutDeclarer
                ? 'Déclarez une entrée : la dotation de la famille est incrémentée pour l’entité.'
                : 'La déclaration relève du référent d’entreprise (pouvoir DECLARER_MATERIEL).'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lignes.map((d) => (
              <DotationRow key={`${d.entrepriseId}-${d.familleId}`} d={d} />
            ))}
          </ul>
        )}

        {materiels.length > 0 && (
          <>
            <h2 className="mb-2 mt-8 text-sm font-bold text-ink">Dernières entrées déclarées</h2>
            <ul className="space-y-2">
              {materiels.slice(0, 8).map((m) => (
                <MaterielRow key={m.id} m={m} />
              ))}
            </ul>
          </>
        )}
      </div>

      {sheet && (
        <EntreeSheet
          entreprises={entreprises}
          familles={familles}
          onAnnuler={() => setSheet(false)}
          onConfirmer={declarer}
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

function DotationRow({ d }: { d: Dotation }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600 ring-1 ring-forest-100">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{d.famille}</p>
        <p className="truncate text-xs text-muted">
          {d.entreprise} · régime {REGIME_LABEL[d.regime]}
        </p>
        {d.sensible && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <ShieldAlert className="h-3 w-3" /> Famille sensible
          </span>
        )}
      </div>
      <div className="shrink-0 text-right">
        <span className="tnum text-2xl font-extrabold tracking-tight text-ink">{d.quantitePresente}</span>
        <p className="text-[11px] text-muted">présent(s)</p>
      </div>
    </li>
  );
}

const statutChip: Record<Materiel['statut'], React.ReactNode> = {
  PRESENT: <Badge tone="forest" dot>Présent</Badge>,
  SORTI: <Badge tone="neutral" dot>Sorti</Badge>,
  EN_RETARD: <Badge tone="danger" dot>En retard</Badge>,
};

function MaterielRow({ m }: { m: Materiel }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-sand-300/70">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand-100 text-muted ring-1 ring-sand-200">
        {m.photoUrl ? <img src={m.photoUrl} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {m.designation} <span className="font-normal text-muted">· {m.quantite}</span>
        </p>
        <p className="truncate text-xs text-muted">
          {m.entreprise} · {m.famille} · entré {fmt(m.dateEntree)}
          {m.numeroSerie && ` · S/N ${m.numeroSerie}`}
        </p>
        {m.repartLeSoir && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-700">
            <Clock className="h-3 w-3" /> Repart le soir{m.dateSortiePrevue ? ` · prévu ${fmt(m.dateSortiePrevue)}` : ''}
          </p>
        )}
      </div>
      {statutChip[m.statut]}
    </li>
  );
}

/* ---------- Entrée de matériel (M7) ---------- */
function EntreeSheet({
  entreprises,
  familles,
  onAnnuler,
  onConfirmer,
}: {
  entreprises: { id: string; raisonSociale: string }[];
  familles: Famille[];
  onAnnuler: () => void;
  onConfirmer: (v: {
    entrepriseId: string;
    familleId: string;
    designation: string;
    quantite: number;
    numeroSerie?: string;
    photoUrl?: string;
    repartLeSoir: boolean;
    dateSortiePrevue?: string;
  }) => void;
}) {
  const [entrepriseId, setEntrepriseId] = useState('');
  const [familleId, setFamilleId] = useState('');
  const [designation, setDesignation] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [repart, setRepart] = useState(false);
  const [dateSortie, setDateSortie] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!entrepriseId && entreprises.length > 0) setEntrepriseId(entreprises[0].id);
  }, [entreprises, entrepriseId]);
  useEffect(() => {
    if (!familleId && familles.length > 0) setFamilleId(familles[0].id);
  }, [familles, familleId]);

  const famille = familles.find((f) => f.id === familleId);
  const photoRequise = famille?.sensible ?? false;
  const pret =
    !!entrepriseId &&
    !!familleId &&
    designation.trim().length > 1 &&
    Number(quantite) > 0 &&
    (!photoRequise || !!photoUrl) &&
    !envoi;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Entrée de matériel</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">Entité, famille, quantité, photo si sensible. La dotation est incrémentée.</p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Entité</span>
          <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {entreprises.length === 0 && <option value="">Aucune entreprise déclarée</option>}
            {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Famille de matériel</span>
          <select value={familleId} onChange={(e) => setFamilleId(e.target.value)}
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {familles.length === 0 && <option value="">Aucune famille configurée</option>}
            {familles.map((f) => <option key={f.id} value={f.id}>{f.libelle}{f.sensible ? ' — sensible' : ''}</option>)}
          </select>
          {famille && (
            <span className="mt-1 block text-[11px] text-muted">Régime {REGIME_LABEL[famille.regime]}{famille.sensible ? ' · photo obligatoire' : ''}</span>
          )}
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Désignation</span>
          <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Ex. : perforateur"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Quantité (unité de portail)</span>
            <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">N° de série (optionnel)</span>
            <input value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} placeholder="—"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400" />
          </label>
        </div>

        <button
          onClick={() => setRepart((v) => !v)}
          className={`mt-3 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${repart ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-sand-300 bg-white text-muted'}`}
        >
          <Clock className="h-3.5 w-3.5" /> Repart le soir {repart && <Check className="ml-auto h-3.5 w-3.5" />}
        </button>
        {repart && (
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-semibold text-muted">Date de sortie prévue</span>
            <input type="date" value={dateSortie} onChange={(e) => setDateSortie(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
          </label>
        )}

        {photoRequise && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Famille sensible : photo obligatoire à l’entrée.
          </div>
        )}
        <div className="mt-3">
          <PhotoCapture label={photoRequise ? 'Photographier (obligatoire)' : 'Photographier (optionnel)'} onCapture={(url) => setPhotoUrl(url)} />
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            onClick={() => {
              setEnvoi(true);
              onConfirmer({
                entrepriseId, familleId, designation: designation.trim(), quantite: Number(quantite),
                numeroSerie: numeroSerie.trim() || undefined, photoUrl: photoUrl || undefined,
                repartLeSoir: repart, dateSortiePrevue: repart ? dateSortie || undefined : undefined,
              });
            }}>
            Déclarer l'entrée
          </Button>
        </div>
      </div>
    </div>
  );
}
