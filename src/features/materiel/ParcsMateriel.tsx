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
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import {
  CATEGORIES_MATERIEL,
  ENTREPRISES_MATERIEL,
  MATERIELS_PARC,
  type MaterielParc,
  type StatutMateriel,
} from '../../data/materiel';

const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—');

export function ParcsMateriel() {
  const [parc, setParc] = useState<MaterielParc[]>(MATERIELS_PARC);
  const [filtre, setFiltre] = useState('TOUTES');
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const seq = 108 + parc.filter((m) => m.id.startsWith('new')).length;

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }

  const stats = useMemo(() => ({
    total: parc.length,
    aMarquer: parc.filter((m) => m.statut === 'DECLARE').length,
    aViser: parc.filter((m) => m.statut === 'MARQUE').length,
    opposables: parc.filter((m) => m.statut === 'VISE').length,
  }), [parc]);

  const lignes = parc.filter((m) => filtre === 'TOUTES' || m.entreprise === filtre);

  function photographier(id: string) {
    setParc((p) => p.map((m) => (m.id === id ? { ...m, statut: 'MARQUE', photoMarquage: true } : m)));
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
  function declarer(v: Omit<MaterielParc, 'id' | 'numeroMarquage' | 'statut' | 'photoMarquage'>) {
    const numero = `M-00${seq + 1}`;
    setParc((p) => [
      { ...v, id: `new-${seq + 1}`, numeroMarquage: numero, statut: 'DECLARE', photoMarquage: false },
      ...p,
    ]);
    setSheet(false);
    flash(`Matériel déclaré · marquage ${numero} attribué`);
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
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
            Déclarer un matériel
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
            <MaterielRow key={m.id} m={m} onPhoto={() => photographier(m.id)} onViser={() => viser(m.id)} />
          ))}
        </ul>
      </div>

      {sheet && (
        <DeclarerSheet onAnnuler={() => setSheet(false)} onConfirmer={declarer} prochainNumero={`M-00${seq + 1}`} />
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
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-muted ring-1 ring-sand-200">
        {m.photoMarquage ? <Image className="h-5 w-5 text-forest-500" /> : <Camera className="h-5 w-5" />}
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

/* ---------- Déclaration (référent) ---------- */
function DeclarerSheet({
  onAnnuler,
  onConfirmer,
  prochainNumero,
}: {
  onAnnuler: () => void;
  onConfirmer: (v: Omit<MaterielParc, 'id' | 'numeroMarquage' | 'statut' | 'photoMarquage'>) => void;
  prochainNumero: string;
}) {
  const [designation, setDesignation] = useState('');
  const [marque, setMarque] = useState('');
  const [modele, setModele] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [categorie, setCategorie] = useState(CATEGORIES_MATERIEL[0]);
  const [entreprise, setEntreprise] = useState(ENTREPRISES_MATERIEL[0]);
  const pret = designation.trim().length > 1;

  const input = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input value={value} onChange={(e) => set(e.target.value)} placeholder={ph}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Déclarer un matériel</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">
          À la validation, le système attribue le marquage <b className="font-mono text-ink">{prochainNumero}</b>,
          à apposer physiquement puis photographier.
        </p>

        <div className="space-y-3">
          {input('Désignation', designation, setDesignation, 'Ex. : perforateur')}
          <div className="grid grid-cols-2 gap-3">
            {input('Marque', marque, setMarque, 'Ex. : Bosch')}
            {input('Modèle', modele, setModele, 'Ex. : GBH 5-40')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {input('N° de série', numeroSerie, setNumeroSerie, 'Optionnel')}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Catégorie</span>
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {CATEGORIES_MATERIEL.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
            <select value={entreprise} onChange={(e) => setEntreprise(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {ENTREPRISES_MATERIEL.map((e) => <option key={e}>{e}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({ designation: designation.trim(), marque: marque.trim() || undefined, modele: modele.trim() || undefined, numeroSerie: numeroSerie.trim() || undefined, categorie, entreprise })}>
            Déclarer &amp; attribuer le marquage
          </Button>
        </div>
      </div>
    </div>
  );
}
