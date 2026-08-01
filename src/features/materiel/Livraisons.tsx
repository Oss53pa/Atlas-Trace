import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import {
  CRENEAUX,
  FOURNISSEURS,
  NATURES_LIVRAISON,
  PREAVIS,
  creneauSature,
  type Creneau,
  type Preavis,
  type StatutPreavis,
} from '../../data/livraisons';

export function Livraisons() {
  const [preavis, setPreavis] = useState<Preavis[]>(PREAVIS);
  const [creneaux, setCreneaux] = useState<Creneau[]>(CRENEAUX);
  const [sheet, setSheet] = useState(false);
  const [reception, setReception] = useState<Preavis | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  }

  const stats = useMemo(() => ({
    total: preavis.length,
    aReceptionner: preavis.filter((p) => p.statut === 'VALIDE').length,
    nonRecues: preavis.filter((p) => p.arriveeNonRecue && p.statut !== 'RECEPTIONNE').length,
  }), [preavis]);

  const nonRecues = preavis.filter((p) => p.arriveeNonRecue && p.statut !== 'RECEPTIONNE');

  function viser(id: string) {
    setPreavis((ps) => ps.map((p) => (p.id === id ? { ...p, statut: 'VALIDE', code: `PL-${p.numero.slice(-2)}-VISA` } : p)));
    flash('Visa conditionnel apposé · créneau validé · code transmis');
  }

  function receptionner(id: string, recu: number) {
    setPreavis((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const ecart = recu - p.quantitePrevue;
        return { ...p, statut: 'RECEPTIONNE', arriveeNonRecue: false, reception: { recu, ecart, photo: true, receptionnaire: 'M. Sanou (magasin)', heure: '31/07 09:40' } };
      }),
    );
    setReception(null);
    flash('Livraison réceptionnée · entrée en stock');
  }

  function creer(p: Preavis, creneauId: string) {
    setPreavis((ps) => [p, ...ps]);
    setCreneaux((cs) => cs.map((c) => (c.id === creneauId ? { ...c, utilises: c.utilises + 1 } : c)));
    setSheet(false);
    flash(`Préavis ${p.numero} déposé`);
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <Truck className="h-3.5 w-3.5" /> M12 / M13 · Lot matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Livraisons &amp; réception</h1>
            <p className="mt-1 text-sm text-muted">
              Préavis dans le délai, visa si levage ou matières dangereuses, créneau sous quota, code
              transmis. Réception en stock avec écarts.
            </p>
          </div>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
            Nouveau préavis
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard tone="forest" label="Préavis du jour" value={stats.total} icon={<CalendarClock className="h-5 w-5" />} />
          <StatCard tone="amber" label="À réceptionner" value={stats.aReceptionner} icon={<PackageCheck className="h-5 w-5" />} />
          <DangerStat label="Non reçues > 24 h" value={stats.nonRecues} />
        </div>

        {/* Alerte cas 34 */}
        {nonRecues.length > 0 && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            <AlertTriangle className="h-4 w-4" />
            {nonRecues.length} livraison(s) entrée(s) non réceptionnée(s) sous 24 h — à traiter au magasin
          </div>
        )}

        {/* Créneaux & quotas */}
        <h2 className="mb-2 text-sm font-bold text-ink">Créneaux &amp; quotas du jour</h2>
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {creneaux.map((c) => (
            <CreneauCard key={c.id} c={c} />
          ))}
        </div>

        <h2 className="mb-2 text-sm font-bold text-ink">Préavis</h2>
        <ul className="space-y-2">
          {preavis.map((p) => (
            <PreavisRow key={p.id} p={p} creneaux={creneaux} onViser={() => viser(p.id)} onReceptionner={() => setReception(p)} />
          ))}
        </ul>
      </div>

      {sheet && <PreavisSheet numero={`PL-2026-000${45 + preavis.filter((p) => p.id.startsWith('new')).length}`} creneaux={creneaux} onAnnuler={() => setSheet(false)} onConfirmer={creer} />}
      {reception && <ReceptionSheet p={reception} onAnnuler={() => setReception(null)} onConfirmer={(recu) => receptionner(reception.id, recu)} />}

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
  RECEPTIONNE: <Badge tone="neutral" dot>Réceptionné</Badge>,
  REFUSE: <Badge tone="danger" dot>Refusé</Badge>,
  EXPIRE: <Badge tone="danger" dot>Expiré</Badge>,
};

function PreavisRow({ p, creneaux, onViser, onReceptionner }: { p: Preavis; creneaux: Creneau[]; onViser: () => void; onReceptionner: () => void }) {
  const cr = creneaux.find((c) => c.id === p.creneauId);
  return (
    <li className={`rounded-2xl bg-white p-4 shadow-card ring-1 ${p.arriveeNonRecue && p.statut !== 'RECEPTIONNE' ? 'ring-danger-200' : 'ring-sand-300/70'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">{p.numero}</span>
            {p.levage && <Badge tone="amber"><ArrowUpFromLine className="h-3 w-3" /> Levage</Badge>}
            {p.matieresDangereuses && <Badge tone="danger"><Flame className="h-3 w-3" /> Mat. dangereuses</Badge>}
          </div>
          <p className="mt-1 text-sm font-bold text-ink">{p.entreprise} · {p.fournisseur}</p>
          <p className="text-xs text-muted">
            {p.nature} · {p.quantitePrevue} {p.unite} · créneau {cr?.libelle}
            {p.chauffeur && ` · ${p.immatriculation} (${p.chauffeur})`}
          </p>
          {p.code && <p className="mt-0.5 font-mono text-[11px] text-muted">Code {p.code}</p>}
          {p.derogation && <p className="mt-0.5 text-[11px] font-semibold text-amber-700">Dérogation : {p.derogation}</p>}
          {p.reception && (
            <p className="mt-0.5 text-[11px] text-muted">
              Reçu {p.reception.recu} {p.unite} · écart {p.reception.ecart > 0 ? '+' : ''}{p.reception.ecart} · {p.reception.receptionnaire}
            </p>
          )}
        </div>
        {statutChip[p.statut]}
      </div>

      {p.statut === 'SOUMIS' && (
        <div className="mt-3 border-t border-sand-200 pt-3">
          <Button variant="primary" size="sm" icon={<ShieldCheck className="h-4 w-4" />} onClick={onViser}>
            Viser (levage / matières dangereuses)
          </Button>
        </div>
      )}
      {p.statut === 'VALIDE' && (
        <div className="mt-3 border-t border-sand-200 pt-3">
          <Button variant="accent" size="sm" icon={<PackageCheck className="h-4 w-4" />} onClick={onReceptionner}>
            Réceptionner
          </Button>
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

/* ---------- Réception (M13) ---------- */
function ReceptionSheet({ p, onAnnuler, onConfirmer }: { p: Preavis; onAnnuler: () => void; onConfirmer: (recu: number) => void }) {
  const [recu, setRecu] = useState(String(p.quantitePrevue));
  const [photo, setPhoto] = useState(false);
  const ecart = Number(recu) - p.quantitePrevue;
  const pret = Number(recu) >= 0 && photo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Réception · {p.numero}</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">{p.fournisseur} · {p.nature}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
            <p className="text-xs text-muted">Prévu</p>
            <p className="text-lg font-bold text-ink">{p.quantitePrevue} {p.unite}</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Reçu</span>
            <input type="number" min="0" value={recu} onChange={(e) => setRecu(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-lg font-bold text-ink outline-none focus:border-forest-400" />
          </label>
        </div>

        <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${ecart === 0 ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-700'}`}>
          Écart : {ecart > 0 ? '+' : ''}{ecart} {p.unite} {ecart === 0 ? '· conforme' : '· à signaler'}
        </div>

        <div className="mt-3">
          <PhotoCapture label="Photographier la livraison" onCapture={() => setPhoto(true)} />
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret} onClick={() => onConfirmer(Number(recu))}>
            Valider la réception
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Nouveau préavis (M12) ---------- */
function PreavisSheet({ numero, creneaux, onAnnuler, onConfirmer }: { numero: string; creneaux: Creneau[]; onAnnuler: () => void; onConfirmer: (p: Preavis, creneauId: string) => void }) {
  const [entreprise, setEntreprise] = useState('Bâti-Sud');
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
  const pret = !!creneauId && !sature && derogationOk && Number(quantite) > 0;

  function soumettre() {
    onConfirmer(
      {
        id: `new-${numero}`, numero, entreprise, fournisseur, nature,
        quantitePrevue: Number(quantite), unite, levage, matieresDangereuses: md,
        creneauId, statut: conditionne ? 'SOUMIS' : 'VALIDE',
        code: conditionne ? undefined : `PL-${numero.slice(-2)}-${Math.floor(quantite.length)}X${unite[0].toUpperCase()}`,
        derogation: horsDelai ? derogation.trim() : undefined,
      },
      creneauId,
    );
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
        <p className="mb-4 text-xs text-muted">N° <b className="font-mono text-ink">{numero}</b> · déposé par le référent</p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
              <select value={entreprise} onChange={(e) => setEntreprise(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {['Bâti-Sud', 'Aménag-Preneur K', 'Froid & Clim', 'VRD Services'].map((e) => <option key={e}>{e}</option>)}
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
              {creneaux.map((c) => <option key={c.id} value={c.id}>{c.libelle} {creneauSature(c) ? '— saturé' : `(${c.utilises}/${c.quota})`}</option>)}
            </select>
          </label>

          {/* cas 33 : créneau saturé */}
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

          {/* cas 32 : hors délai minimal */}
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
