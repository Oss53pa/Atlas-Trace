import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Truck,
  Plus,
  Check,
  X,
  PackageCheck,
  CalendarClock,
  AlertTriangle,
  ShieldCheck,
  Flame,
  ArrowUpFromLine,
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
  chargerCreneaux,
  chargerPreavis,
  deposerPreavis,
  viserPreavis,
  prendreEnCharge,
  type Creneau,
  type Preavis,
  type StatutPreavis,
} from './api';

const FOURNISSEURS = ['Ciments d’Afrique', 'Carrelage Décor', 'Sablière du Sud', 'Quincaillerie Centrale', 'Clim Import'];
const NATURES_LIVRAISON = ['Ciment (sacs 50 kg)', 'Carrelage grès', 'Sable 0/4', 'Aciers HA', 'Quincaillerie', 'Groupe froid + fluide R32'];
const creneauSature = (c: Creneau) => c.utilises >= c.quota;

export function Livraisons() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutDemander = a('DEMANDER_LIVRAISON');
  const peutViser = a('VALIDER_CRENEAU');
  const peutReceptionner = a('RECEPTIONNER');

  const [preavis, setPreavis] = useState<Preavis[]>([]);
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [pec, setPec] = useState<Preavis | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const entreprises = useEntreprises();

  const rafraichir = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([chargerCreneaux(), chargerPreavis()]);
      setCreneaux(c);
      setPreavis(p);
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

  const stats = useMemo(() => ({
    total: preavis.length,
    aViser: preavis.filter((p) => p.statut === 'SOUMIS').length,
    aPrendreEnCharge: preavis.filter((p) => p.statut === 'VALIDE').length,
  }), [preavis]);

  async function viser(id: string) {
    try {
      await viserPreavis(id);
      await rafraichir();
      flash('Visa conditionnel apposé · créneau validé · code transmis');
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function accuser(id: string, reserve: string) {
    try {
      await prendreEnCharge(id, reserve, true);
      setPec(null);
      await rafraichir();
      flash('Prise en charge accusée · responsabilité de l’entité engagée');
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function creer(p: {
    entrepriseId: string; creneauId: string; fournisseur: string; nature: string;
    quantite: number; unite: string; levage: boolean; matieresDangereuses: boolean; derogation?: string;
  }) {
    try {
      const res = await deposerPreavis(p);
      setSheet(false);
      await rafraichir();
      flash(`Préavis ${res.numero} déposé${res.statut === 'SOUMIS' ? ' · à viser' : ' · créneau validé'}`);
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
        <p className="text-sm">Les préavis de livraison et créneaux sont une donnée du site.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <Truck className="h-3.5 w-3.5" /> M12 / M13 · Lot matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Livraisons &amp; prise en charge</h1>
            <p className="mt-1 text-sm text-muted">
              Préavis dans le délai, visa si levage ou matières dangereuses, créneau sous quota, code
              transmis. Prise en charge oui/non par l’entité destinataire — aucune quantité, aucun écart.
            </p>
          </div>
          {peutDemander && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
              Nouveau préavis
            </Button>
          )}
        </div>

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard tone="forest" label="Préavis" value={stats.total} icon={<CalendarClock className="h-5 w-5" />} />
          <StatCard tone="amber" label="À viser" value={stats.aViser} icon={<ShieldCheck className="h-5 w-5" />} />
          <StatCard tone="plain" label="À prendre en charge" value={stats.aPrendreEnCharge} icon={<PackageCheck className="h-5 w-5" />} />
        </div>

        {/* Créneaux & quotas */}
        <h2 className="mb-2 text-sm font-bold text-ink">Créneaux &amp; quotas du jour</h2>
        {creneaux.length === 0 ? (
          <p className="mb-6 rounded-2xl border border-dashed border-sand-300 bg-white/60 px-4 py-6 text-center text-sm text-muted">
            Aucun créneau paramétré pour ce site.
          </p>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {creneaux.map((c) => (
              <CreneauCard key={c.id} c={c} />
            ))}
          </div>
        )}

        <h2 className="mb-2 text-sm font-bold text-ink">Préavis</h2>
        {preavis.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
            <Truck className="mx-auto h-8 w-8 text-sand-300" />
            <p className="mt-2 text-sm font-semibold text-ink">Aucun préavis</p>
            <p className="mt-1 text-sm text-muted">
              {peutDemander
                ? 'Déposez un préavis : fournisseur, nature, créneau sous quota.'
                : 'Le dépôt relève du référent d’entreprise (pouvoir DEMANDER_LIVRAISON).'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {preavis.map((p) => (
              <PreavisRow
                key={p.id}
                p={p}
                creneaux={creneaux}
                peutViser={peutViser}
                peutReceptionner={peutReceptionner}
                onViser={() => viser(p.id)}
                onPrendreEnCharge={() => setPec(p)}
              />
            ))}
          </ul>
        )}
      </div>

      {sheet && (
        <PreavisSheet
          entreprises={entreprises}
          creneaux={creneaux}
          onAnnuler={() => setSheet(false)}
          onConfirmer={creer}
        />
      )}
      {pec && <PriseEnChargeSheet p={pec} onAnnuler={() => setPec(null)} onConfirmer={(reserve) => accuser(pec.id, reserve)} />}

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

function CreneauCard({ c }: { c: Creneau }) {
  const sature = creneauSature(c);
  const pct = Math.min(100, (c.utilises / c.quota) * 100);
  return (
    <div className={`rounded-2xl bg-white p-3 shadow-card ring-1 ${sature ? 'ring-danger-200' : 'ring-sand-300/70'}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink">{c.libelle}</p>
        {sature && <Badge tone="danger">Saturé</Badge>}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sand-200">
        <div className={`h-full rounded-full ${sature ? 'bg-danger-500' : 'bg-forest-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">{c.utilises} / {c.quota} créneaux</p>
    </div>
  );
}

const statutChip: Record<StatutPreavis, React.ReactNode> = {
  SOUMIS: <Badge tone="amber" dot>À viser</Badge>,
  VALIDE: <Badge tone="forest" dot>Validé · créneau</Badge>,
  PRIS_EN_CHARGE: <Badge tone="neutral" dot>Pris en charge</Badge>,
  REFUSE: <Badge tone="danger" dot>Refusé</Badge>,
  EXPIRE: <Badge tone="danger" dot>Expiré</Badge>,
};

function PreavisRow({
  p,
  creneaux,
  peutViser,
  peutReceptionner,
  onViser,
  onPrendreEnCharge,
}: {
  p: Preavis;
  creneaux: Creneau[];
  peutViser: boolean;
  peutReceptionner: boolean;
  onViser: () => void;
  onPrendreEnCharge: () => void;
}) {
  const cr = creneaux.find((c) => c.id === p.creneauId);
  return (
    <li className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">{p.numero}</span>
            {p.levage && <Badge tone="amber"><ArrowUpFromLine className="h-3 w-3" /> Levage</Badge>}
            {p.matieresDangereuses && <Badge tone="danger"><Flame className="h-3 w-3" /> Mat. dangereuses</Badge>}
          </div>
          <p className="mt-1 text-sm font-bold text-ink">{p.entreprise} · {p.fournisseur}</p>
          <p className="text-xs text-muted">
            {p.nature} · {p.quantitePrevue} {p.unite}{cr ? ` · créneau ${cr.libelle}` : ''}
          </p>
          {p.code && <p className="mt-0.5 font-mono text-[11px] text-muted">Code {p.code}</p>}
          {p.derogation && <p className="mt-0.5 text-[11px] font-semibold text-amber-700">Dérogation : {p.derogation}</p>}
          {p.pecResponsable && (
            <p className="mt-0.5 text-[11px] text-muted">
              Pris en charge · {p.pecResponsable}
              {p.pecReserve && <span className="text-amber-700"> · réserve : {p.pecReserve}</span>}
            </p>
          )}
        </div>
        {statutChip[p.statut]}
      </div>

      {p.statut === 'SOUMIS' && peutViser && (
        <div className="mt-3 border-t border-sand-200 pt-3">
          <Button variant="primary" size="sm" icon={<ShieldCheck className="h-4 w-4" />} onClick={onViser}>
            Viser (levage / matières dangereuses)
          </Button>
        </div>
      )}
      {p.statut === 'VALIDE' && peutReceptionner && (
        <div className="mt-3 border-t border-sand-200 pt-3">
          <Button variant="accent" size="sm" icon={<PackageCheck className="h-4 w-4" />} onClick={onPrendreEnCharge}>
            Accuser la prise en charge
          </Button>
        </div>
      )}
    </li>
  );
}

/* ---------- Prise en charge (M13) ---------- */
function PriseEnChargeSheet({ p, onAnnuler, onConfirmer }: { p: Preavis; onAnnuler: () => void; onConfirmer: (reserve: string) => void }) {
  const [reserve, setReserve] = useState('');
  const [photo, setPhoto] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Prise en charge · {p.numero}</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">{p.fournisseur} · {p.nature}</p>

        <div className="rounded-xl bg-sand-50 p-3 text-sm text-ink ring-1 ring-sand-200">
          L’entité destinataire confirme-t-elle la <b>prise en charge</b> de cette livraison ?
          <span className="mt-1 block text-[11px] text-muted">
            Aucune quantité, aucun écart. L’accusé engage la responsabilité de l’entité sur ce qui est entré chez elle. Le litige commercial avec le fournisseur reste hors périmètre.
          </span>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Réserve (facultative, texte libre)</span>
          <textarea value={reserve} onChange={(e) => setReserve(e.target.value)} rows={2} placeholder="Ex. : emballage endommagé, palette entamée…"
            className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>

        <div className="mt-3">
          <PhotoCapture label="Photographier la livraison" onCapture={() => setPhoto(true)} />
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!photo} onClick={() => onConfirmer(reserve)}>
            Oui, prise en charge
          </Button>
        </div>
        {!photo && <p className="mt-2 text-center text-[11px] font-medium text-amber-700">La photo est exigée pour accuser la prise en charge.</p>}
      </div>
    </div>
  );
}

/* ---------- Nouveau préavis (M12) ---------- */
function PreavisSheet({
  entreprises,
  creneaux,
  onAnnuler,
  onConfirmer,
}: {
  entreprises: { id: string; raisonSociale: string }[];
  creneaux: Creneau[];
  onAnnuler: () => void;
  onConfirmer: (p: {
    entrepriseId: string; creneauId: string; fournisseur: string; nature: string;
    quantite: number; unite: string; levage: boolean; matieresDangereuses: boolean; derogation?: string;
  }) => void;
}) {
  const [entrepriseId, setEntrepriseId] = useState(entreprises[0]?.id ?? '');
  const [fournisseur, setFournisseur] = useState(FOURNISSEURS[0]);
  const [nature, setNature] = useState(NATURES_LIVRAISON[0]);
  const [quantite, setQuantite] = useState('10');
  const [unite, setUnite] = useState('u');
  const [levage, setLevage] = useState(false);
  const [md, setMd] = useState(false);
  const [creneauId, setCreneauId] = useState(creneaux.find((c) => !creneauSature(c))?.id ?? '');
  const [horsDelai, setHorsDelai] = useState(false);
  const [derogation, setDerogation] = useState('');

  const creneau = creneaux.find((c) => c.id === creneauId);
  const sature = creneau ? creneauSature(creneau) : false;
  const disponibles = creneaux.filter((c) => !creneauSature(c));
  const conditionne = levage || md;
  const derogationOk = !horsDelai || derogation.trim().length >= 5;
  const pret = !!creneauId && !sature && !!entrepriseId && derogationOk && Number(quantite) > 0;

  function soumettre() {
    onConfirmer({
      entrepriseId, creneauId, fournisseur, nature,
      quantite: Number(quantite), unite, levage, matieresDangereuses: md,
      derogation: horsDelai ? derogation.trim() : undefined,
    });
  }

  const toggle = (v: boolean, set: (b: boolean) => void, label: string, icon: React.ReactNode) => (
    <button onClick={() => set(!v)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${v ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-sand-300 bg-white text-muted'}`}>
      {icon} {label} {v && <Check className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouveau préavis</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">Le numéro et le code sont générés par le serveur au dépôt.</p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
              <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {entreprises.length === 0 && <option value="">Aucune entreprise</option>}
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
              </select>
            </label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Fournisseur</span>
              <select value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {FOURNISSEURS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Nature de la marchandise</span>
            <select value={nature} onChange={(e) => setNature(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {NATURES_LIVRAISON.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Quantité prévue</span>
              <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
            </label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Unité</span>
              <select value={unite} onChange={(e) => setUnite(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {['u', 'sacs', 'm²', 'm³', 'kg', 'lot'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            {toggle(levage, setLevage, 'Levage', <ArrowUpFromLine className="h-4 w-4" />)}
            {toggle(md, setMd, 'Mat. dangereuses', <Flame className="h-4 w-4" />)}
          </div>
          {conditionne && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
              Visa conditionnel requis avant validation du créneau.
            </p>
          )}

          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Créneau souhaité</span>
            <select value={creneauId} onChange={(e) => setCreneauId(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {creneaux.length === 0 && <option value="">Aucun créneau</option>}
              {creneaux.map((c) => <option key={c.id} value={c.id}>{c.libelle} {creneauSature(c) ? '— saturé' : `(${c.utilises}/${c.quota})`}</option>)}
            </select>
          </label>

          {sature && (
            <div className="rounded-xl bg-danger-50 p-3 ring-1 ring-danger-100">
              <p className="text-xs font-bold text-danger-600">Créneau saturé — quota atteint.</p>
              <p className="mt-1 text-[11px] text-danger-600">Créneaux disponibles :</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {disponibles.map((c) => (
                  <button key={c.id} onClick={() => setCreneauId(c.id)} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50">
                    {c.libelle}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setHorsDelai((v) => !v)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${horsDelai ? 'border-danger-200 bg-danger-50 text-danger-600' : 'border-sand-300 bg-white text-muted'}`}>
            <AlertTriangle className="h-3.5 w-3.5" /> Demande tardive (hors délai minimal) {horsDelai && <Check className="ml-auto h-3.5 w-3.5" />}
          </button>
          {horsDelai && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-danger-600">Dérogation motivée (obligatoire, tracée)</span>
              <textarea value={derogation} onChange={(e) => setDerogation(e.target.value)} rows={2} placeholder="Motif de la dérogation au délai minimal…"
                className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
            </label>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret} onClick={soumettre}>
            {sature ? 'Choisir un créneau disponible' : 'Déposer le préavis'}
          </Button>
        </div>
      </div>
    </div>
  );
}
