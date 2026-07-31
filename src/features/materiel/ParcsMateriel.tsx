import { useMemo, useState } from 'react';
import {
  Plus,
  Camera,
  Check,
  X,
  ShieldCheck,
  Package,
  Tag,
  ClipboardCheck,
  AlertTriangle,
  Image,
  FileText,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import {
  CATEGORIES_MATERIEL,
  ENTREPRISES_MATERIEL,
  MATERIELS_PARC,
  type MaterielParc,
  type StatutMateriel,
} from '../../data/materiel';

const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—');
const marquage = (n: number) => `M-${String(n).padStart(5, '0')}`;

/** Une ligne du bordereau (avant attribution du marquage). */
export interface LigneBordereau {
  designation: string;
  marque?: string;
  modele?: string;
  numeroSerie?: string;
  categorie: string;
}

export function ParcsMateriel() {
  const [parc, setParc] = useState<MaterielParc[]>(MATERIELS_PARC);
  const [filtre, setFiltre] = useState('TOUTES');
  const [sheet, setSheet] = useState(false);
  const [photoPour, setPhotoPour] = useState<MaterielParc | null>(null);
  const [nbBordereaux, setNbBordereaux] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const dejaNew = parc.filter((m) => m.id.startsWith('new')).length;
  const baseMarquage = 108 + dejaNew;
  const bordereauRef = `BM-2026-0${45 + nbBordereaux}`;

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  }

  const stats = useMemo(() => ({
    total: parc.length,
    aMarquer: parc.filter((m) => m.statut === 'DECLARE').length,
    aViser: parc.filter((m) => m.statut === 'MARQUE').length,
    opposables: parc.filter((m) => m.statut === 'VISE').length,
  }), [parc]);

  const lignes = parc.filter((m) => filtre === 'TOUTES' || m.entreprise === filtre);

  function photographier(id: string, photo: string) {
    setParc((p) => p.map((m) => (m.id === id ? { ...m, statut: 'MARQUE', photoMarquage: true, photo } : m)));
    setPhotoPour(null);
    flash('Photo du marquage enregistrée · en attente de visa');
  }
  function viser(id: string) {
    setParc((p) =>
      p.map((m) =>
        m.id === id ? { ...m, statut: 'VISE', visaPar: 'M. Diby (HSE)', visaDate: '2026-07-29' } : m,
      ),
    );
    flash('Parc visé · déclaration opposable');
  }

  /** Dépôt d'un bordereau : chaque ligne reçoit un marquage séquentiel unique. */
  function declarerBordereau(entreprise: string, saisies: LigneBordereau[]) {
    const nouveaux: MaterielParc[] = saisies.map((l, i) => ({
      id: `new-${baseMarquage + i + 1}`,
      entreprise,
      designation: l.designation.trim(),
      marque: l.marque?.trim() || undefined,
      modele: l.modele?.trim() || undefined,
      numeroSerie: l.numeroSerie?.trim() || undefined,
      categorie: l.categorie,
      numeroMarquage: marquage(baseMarquage + i + 1),
      statut: 'DECLARE',
      photoMarquage: false,
      bordereau: bordereauRef,
    }));
    setParc((p) => [...nouveaux, ...p]);
    setNbBordereaux((n) => n + 1);
    setSheet(false);
    const nums = nouveaux.map((n) => n.numeroMarquage);
    flash(
      `Bordereau ${bordereauRef} · ${nouveaux.length} matériel(s) déclaré(s)` +
        (nums.length > 1 ? ` · marquages ${nums[0]} → ${nums[nums.length - 1]}` : ` · marquage ${nums[0]}`),
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <Package className="h-3.5 w-3.5" /> M7 · Lot matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
              Parcs de matériel &amp; marquage
            </h1>
            <p className="mt-1 text-sm text-muted">
              Déclaré par le référent, marqué par l'entreprise, visé par échantillon. Opposable une fois visé.
            </p>
          </div>
          <Button variant="primary" icon={<FileText className="h-4 w-4" />} onClick={() => setSheet(true)}>
            Nouveau bordereau
          </Button>
        </div>

        {/* Chemin critique */}
        <div className="mb-5 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p>
            <b>Chemin critique.</b> Le marquage est demandé aux entreprises par courrier plusieurs
            semaines à l'avance. Sans marquage apposé et visé, la déclaration n'est pas opposable et le
            contrôle de sortie (M10) ne fonctionne pas.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard tone="forest" label="Parc total" value={stats.total} icon={<Package className="h-5 w-5" />} />
          <StatCard tone="plain" label="À marquer" value={stats.aMarquer} icon={<Tag className="h-5 w-5" />} />
          <StatCard tone="amber" label="À viser" value={stats.aViser} icon={<ClipboardCheck className="h-5 w-5" />} />
          <StatCard label="Opposables" value={stats.opposables} icon={<ShieldCheck className="h-5 w-5" />} />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted">
            Entreprise
            <select
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              className="rounded-xl border border-sand-300 bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-forest-400"
            >
              <option value="TOUTES">Toutes</option>
              {ENTREPRISES_MATERIEL.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <span className="text-xs text-muted">{lignes.length} matériel(s)</span>
        </div>

        <ul className="space-y-2">
          {lignes.map((m) => (
            <MaterielRow key={m.id} m={m} onPhoto={() => setPhotoPour(m)} onViser={() => viser(m.id)} />
          ))}
        </ul>
      </div>

      {sheet && (
        <BordereauSheet
          onAnnuler={() => setSheet(false)}
          onConfirmer={declarerBordereau}
          bordereauRef={bordereauRef}
          baseMarquage={baseMarquage}
        />
      )}

      {photoPour && (
        <PhotoMarquageSheet
          materiel={photoPour}
          onAnnuler={() => setPhotoPour(null)}
          onPhoto={(url) => photographier(photoPour.id, url)}
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

const statutChip: Record<StatutMateriel, React.ReactNode> = {
  DECLARE: <Badge tone="neutral" dot>À marquer</Badge>,
  MARQUE: <Badge tone="amber" dot>À viser</Badge>,
  VISE: <Badge tone="forest" dot>Opposable</Badge>,
};

function MaterielRow({ m, onPhoto, onViser }: { m: MaterielParc; onPhoto: () => void; onViser: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      {/* Vignette photo du marquage */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand-100 text-muted ring-1 ring-sand-200">
        {m.photo ? (
          <img src={m.photo} alt="Marquage" className="h-full w-full object-cover" />
        ) : m.photoMarquage ? (
          <Image className="h-5 w-5 text-forest-500" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {m.designation}
          {m.marque && m.marque !== '—' && <span className="font-normal text-muted"> · {m.marque} {m.modele}</span>}
        </p>
        <p className="truncate text-xs text-muted">
          {m.entreprise} · {m.categorie}
          {m.numeroSerie && m.numeroSerie !== '—' && ` · S/N ${m.numeroSerie}`}
        </p>
        {m.statut === 'VISE' && (
          <p className="mt-0.5 text-[11px] text-muted">
            Visé le {fmt(m.visaDate)} par {m.visaPar}
            {m.echantillon && ' · contrôlé par échantillon'}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-sm font-bold tracking-wide text-ink">{m.numeroMarquage}</span>
        {m.bordereau && <span className="font-mono text-[10px] text-muted">{m.bordereau}</span>}
        <div className="flex items-center gap-1.5">
          {statutChip[m.statut]}
          {m.echantillon && <Badge tone="forest">Échantillon</Badge>}
        </div>
      </div>

      <div className="w-full sm:w-auto sm:shrink-0">
        {m.statut === 'DECLARE' && (
          <Button variant="accent" size="sm" block icon={<Camera className="h-4 w-4" />} onClick={onPhoto}>
            Photographier le marquage
          </Button>
        )}
        {m.statut === 'MARQUE' && (
          <Button variant="primary" size="sm" block icon={<ShieldCheck className="h-4 w-4" />} onClick={onViser}>
            Viser (échantillon)
          </Button>
        )}
        {m.statut === 'VISE' && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest-600">
            <Check className="h-4 w-4" strokeWidth={3} /> Opposable
          </span>
        )}
      </div>
    </li>
  );
}

/* ---------- Photo du marquage (capture réelle) ---------- */
function PhotoMarquageSheet({ materiel, onAnnuler, onPhoto }: { materiel: MaterielParc; onAnnuler: () => void; onPhoto: (url: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Photo du marquage</h3>
          <button onClick={onAnnuler} className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand-100 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          <b className="font-mono text-ink">{materiel.numeroMarquage}</b> · {materiel.designation} — {materiel.entreprise}.
          Photographiez le marquage <b className="text-ink">apposé physiquement</b> ; il est obligatoire avant le visa.
        </p>
        <PhotoCapture label="Photographier le marquage" onCapture={onPhoto} />
        <p className="mt-3 text-[11px] text-muted">La photo est enregistrée dans l'appli et rattachée au matériel (horodatée en production).</p>
      </div>
    </div>
  );
}

/* ---------- Bordereau de déclaration (un ou plusieurs matériels) ---------- */
const ligneVide = (): LigneBordereau => ({ designation: '', marque: '', modele: '', numeroSerie: '', categorie: CATEGORIES_MATERIEL[0] });

function BordereauSheet({
  onAnnuler,
  onConfirmer,
  bordereauRef,
  baseMarquage,
}: {
  onAnnuler: () => void;
  onConfirmer: (entreprise: string, lignes: LigneBordereau[]) => void;
  bordereauRef: string;
  baseMarquage: number;
}) {
  const [entreprise, setEntreprise] = useState(ENTREPRISES_MATERIEL[0]);
  const [lignes, setLignes] = useState<LigneBordereau[]>([ligneVide()]);

  const valides = lignes.filter((l) => l.designation.trim().length > 1);
  const pret = valides.length > 0 && lignes.every((l) => l.designation.trim().length > 1);

  function set(i: number, patch: Partial<LigneBordereau>) {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  function ajouter() {
    setLignes((ls) => [...ls, ligneVide()]);
  }
  function retirer(i: number) {
    setLignes((ls) => (ls.length === 1 ? ls : ls.filter((_, j) => j !== i)));
  }

  const premier = marquage(baseMarquage + 1);
  const dernier = marquage(baseMarquage + lignes.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-card-lg ring-1 ring-sand-300/60">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 border-b border-sand-200 bg-gradient-to-b from-sand-50 to-white px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600">
              <FileText className="h-3.5 w-3.5" /> Bordereau de déclaration
            </p>
            <h3 className="mt-0.5 text-lg font-extrabold text-ink">
              Matériel · <span className="font-mono text-forest-600">{bordereauRef}</span>
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Un ou plusieurs matériels. Chaque ligne reçoit un marquage unique à la validation.
            </p>
          </div>
          <button onClick={onAnnuler} className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-sand-200 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps défilant */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Entreprise émettrice du bordereau</span>
            <select
              value={entreprise}
              onChange={(e) => setEntreprise(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
            >
              {ENTREPRISES_MATERIEL.map((e) => <option key={e}>{e}</option>)}
            </select>
          </label>

          <div className="space-y-3">
            {lignes.map((l, i) => (
              <div key={i} className="rounded-2xl border border-sand-200 bg-sand-50/60 p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest-500 text-[11px] font-bold text-white">{i + 1}</span>
                    recevra <span className="rounded-md bg-forest-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-forest-700 ring-1 ring-forest-100">{marquage(baseMarquage + i + 1)}</span>
                  </span>
                  {lignes.length > 1 && (
                    <button onClick={() => retirer(i)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted transition-colors hover:bg-danger-50 hover:text-danger-600">
                      <Trash2 className="h-3.5 w-3.5" /> Retirer
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  <input
                    value={l.designation}
                    onChange={(e) => set(i, { designation: e.target.value })}
                    placeholder="Désignation — ex. : perforateur"
                    className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input value={l.marque} onChange={(e) => set(i, { marque: e.target.value })} placeholder="Marque"
                      className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
                    <input value={l.modele} onChange={(e) => set(i, { modele: e.target.value })} placeholder="Modèle"
                      className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input value={l.numeroSerie} onChange={(e) => set(i, { numeroSerie: e.target.value })} placeholder="N° de série (optionnel)"
                      className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
                    <select value={l.categorie} onChange={(e) => set(i, { categorie: e.target.value })}
                      className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                      {CATEGORIES_MATERIEL.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={ajouter}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-forest-300 bg-forest-50/50 py-2.5 text-sm font-semibold text-forest-700 transition-colors hover:bg-forest-50"
          >
            <Plus className="h-4 w-4" /> Ajouter un matériel
          </button>
        </div>

        {/* Pied */}
        <div className="flex items-center gap-2 border-t border-sand-200 bg-white px-5 py-4">
          <div className="mr-auto text-xs text-muted">
            <b className="text-ink">{lignes.length}</b> matériel(s) ·{' '}
            <span className="font-mono">{lignes.length > 1 ? `${premier} → ${dernier}` : premier}</span>
          </div>
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" disabled={!pret} onClick={() => onConfirmer(entreprise, valides)}>
            Déclarer {valides.length || ''} matériel(s)
          </Button>
        </div>
      </div>
    </div>
  );
}
