import { useMemo, useState } from 'react';
import { Plus, Check, X, Package, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { ENTREES_PONCTUEL, UNITES, type EntreePonctuel, type StatutPonctuel } from '../../data/entrees';
import { ENTREPRISES_MATERIEL } from '../../data/materiel';

export function EntreesPonctuel() {
  const [entrees, setEntrees] = useState<EntreePonctuel[]>(ENTREES_PONCTUEL);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }

  const stats = useMemo(() => ({
    surSite: entrees.filter((e) => e.statut === 'SUR_SITE').length,
    enRetard: entrees.filter((e) => e.statut === 'EN_RETARD').length,
    sortis: entrees.filter((e) => e.statut === 'SORTI').length,
  }), [entrees]);

  function sortir(id: string) {
    setEntrees((es) => es.map((e) => (e.id === id ? { ...e, statut: 'SORTI' } : e)));
    flash('Matériel sorti · mouvement enregistré');
  }
  function ajouter(v: { entreprise: string; designation: string; quantite: number; unite: string; dateSortiePrevue: string }) {
    setEntrees((es) => [
      { ...v, id: `new-${es.length}`, agent: 'M. Koné', horodatageEntree: '29/07 08:14', statut: 'SUR_SITE' },
      ...es,
    ]);
    setSheet(false);
    flash('Entrée ponctuelle enregistrée');
  }

  const retards = entrees.filter((e) => e.statut === 'EN_RETARD');

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <Package className="h-3.5 w-3.5" /> M8 · Lot matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Entrée de matériel ponctuel</h1>
            <p className="mt-1 text-sm text-muted">
              Deux champs et une photo au poste, quinze secondes. Date de sortie prévue, alerte sur les retards.
            </p>
          </div>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
            Nouvelle entrée
          </Button>
        </div>

        {retards.length > 0 && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            <AlertTriangle className="h-4 w-4" />
            {retards.length} matériel(s) non ressorti(s) à échéance — à contrôler
          </div>
        )}

        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard tone="forest" label="Sur site" value={stats.surSite} icon={<Package className="h-5 w-5" />} />
          <DangerStat label="En retard" value={stats.enRetard} />
          <StatCard tone="plain" label="Sortis" value={stats.sortis} icon={<LogOut className="h-5 w-5" />} />
        </div>

        <ul className="space-y-2">
          {entrees.map((e) => (
            <EntreeRow key={e.id} e={e} onSortir={() => sortir(e.id)} />
          ))}
        </ul>
      </div>

      {sheet && <EntreeSheet onAnnuler={() => setSheet(false)} onConfirmer={ajouter} />}

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

const fmt = (iso: string) => iso.split('-').reverse().join('/');
const statutChip: Record<StatutPonctuel, React.ReactNode> = {
  SUR_SITE: <Badge tone="forest" dot>Sur site</Badge>,
  EN_RETARD: <Badge tone="danger" dot>En retard</Badge>,
  SORTI: <Badge tone="neutral" dot>Sorti</Badge>,
};

function EntreeRow({ e, onSortir }: { e: EntreePonctuel; onSortir: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-forest-500 ring-1 ring-sand-200">
        <Package className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {e.designation} <span className="font-normal text-muted">· {e.quantite} {e.unite}</span>
        </p>
        <p className="truncate text-xs text-muted">
          {e.entreprise} · entré {e.horodatageEntree} par {e.agent}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
          <Clock className="h-3 w-3" /> Sortie prévue {fmt(e.dateSortiePrevue)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {statutChip[e.statut]}
        {e.statut !== 'SORTI' && (
          <Button variant="outline" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={onSortir}>
            Sortir
          </Button>
        )}
      </div>
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

/* ---------- Entrée rapide (poste) ---------- */
function EntreeSheet({
  onAnnuler,
  onConfirmer,
}: {
  onAnnuler: () => void;
  onConfirmer: (v: { entreprise: string; designation: string; quantite: number; unite: string; dateSortiePrevue: string }) => void;
}) {
  const [entreprise, setEntreprise] = useState(ENTREPRISES_MATERIEL[0]);
  const [designation, setDesignation] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [unite, setUnite] = useState('u');
  const [dateSortie, setDateSortie] = useState('2026-07-29');
  const [photo, setPhoto] = useState(false);
  const pret = designation.trim() && Number(quantite) > 0 && photo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Entrée ponctuelle</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">Rapide : désignation, quantité, photo au poste, date de sortie prévue.</p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
          <select value={entreprise} onChange={(e) => setEntreprise(e.target.value)}
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {ENTREPRISES_MATERIEL.map((e) => <option key={e}>{e}</option>)}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Désignation</span>
          <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Ex. : perceuse-visseuse"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Quantité</span>
            <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Unité</span>
            <select value={unite} onChange={(e) => setUnite(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {UNITES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Sortie prévue</span>
            <input type="date" value={dateSortie} onChange={(e) => setDateSortie(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-2 py-2 text-xs text-ink outline-none focus:border-forest-400" />
          </label>
        </div>

        <div className="mt-3">
          <PhotoCapture label="Photographier l'entrée" onCapture={() => setPhoto(true)} />
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({ entreprise, designation: designation.trim(), quantite: Number(quantite), unite, dateSortiePrevue: dateSortie })}>
            Enregistrer l'entrée
          </Button>
        </div>
      </div>
    </div>
  );
}
