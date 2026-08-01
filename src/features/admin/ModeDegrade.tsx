import { useState } from 'react';
import { WifiOff, Wifi, Lock, Plus, Check, X, FileWarning } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PROCEDURE_DEGRADE, type Rattrapage } from '../../data/admin';

export function ModeDegrade() {
  const [actif, setActif] = useState(false);
  const [rattrapages, setRattrapages] = useState<Rattrapage[]>([]);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }
  function ajouter(horodatage: string, description: string) {
    setRattrapages((rs) => [{ id: `r-${rs.length}`, horodatage, description, agent: 'M. Koné', valide: true }, ...rs]);
    setSheet(false);
    flash('Mouvement de rattrapage validé · verrouillé');
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><FileWarning className="h-3.5 w-3.5" /> M18 · Administration</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Mode dégradé &amp; rattrapage</h1>
        <p className="mt-1 text-sm text-muted">
          Le papier reste le secours (R7). Procédure écrite, affichée au poste et testée. À la reprise, saisie de rattrapage identifiée et non modifiable.
        </p>
      </div>

      <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1 ${actif ? 'bg-amber-50 ring-amber-200' : 'bg-white shadow-card ring-sand-300/70'}`}>
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${actif ? 'bg-amber-500 text-white' : 'bg-forest-50 text-forest-600'}`}>
            {actif ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{actif ? 'Mode dégradé actif' : 'Fonctionnement normal'}</p>
            <p className="text-xs text-muted">{actif ? 'Contrôles tenus sur registre papier' : 'Système en ligne'}</p>
          </div>
        </div>
        <Button variant={actif ? 'primary' : 'accent'} onClick={() => setActif((v) => !v)} icon={actif ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}>
          {actif ? 'Reprise normale' : 'Activer le mode dégradé'}
        </Button>
      </div>

      {/* Procédure affichée */}
      <h2 className="mb-2 text-sm font-bold text-ink">Procédure de secours (affichée au poste)</h2>
      <ol className="mb-6 space-y-2">
        {PROCEDURE_DEGRADE.map((etape, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-white p-3 shadow-card ring-1 ring-sand-300/70">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-500 text-xs font-bold text-white">{i + 1}</span>
            <span className="text-sm text-ink">{etape}</span>
          </li>
        ))}
      </ol>

      {/* Saisie de rattrapage */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">Saisie de rattrapage</h2>
        <Button variant="outline" size="sm" icon={<Plus className="h-4 w-4" />} disabled={!actif} onClick={() => setSheet(true)}>
          Saisir un mouvement papier
        </Button>
      </div>
      {!actif && <p className="mb-2 text-xs text-muted">Activez le mode dégradé pour saisir les mouvements papier.</p>}

      {rattrapages.length === 0 ? (
        <p className="rounded-xl bg-sand-50 px-4 py-6 text-center text-sm text-muted ring-1 ring-sand-200">Aucun mouvement de rattrapage.</p>
      ) : (
        <ul className="space-y-2">
          {rattrapages.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card ring-1 ring-sand-300/70">
              <Lock className="h-4 w-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{r.description}</p>
                <p className="text-[11px] text-muted">{r.horodatage} · saisi par {r.agent}</p>
              </div>
              <Badge tone="neutral">Rattrapage · verrouillé</Badge>
            </li>
          ))}
        </ul>
      )}

      {sheet && <RattrapageSheet onAnnuler={() => setSheet(false)} onConfirmer={ajouter} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function RattrapageSheet({ onAnnuler, onConfirmer }: { onAnnuler: () => void; onConfirmer: (horodatage: string, description: string) => void }) {
  const [horodatage, setHorodatage] = useState('');
  const [description, setDescription] = useState('');
  const pret = horodatage.trim() && description.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Rattrapage — mouvement papier</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><Lock className="h-3.5 w-3.5" /> Une fois validé, cet enregistrement ne pourra plus être modifié.</p>

        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Heure (papier)</span>
          <input value={horodatage} onChange={(e) => setHorodatage(e.target.value)} placeholder="Ex. : 31/07 11:20"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Description du mouvement</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Ex. : entrée Kouadio J. (Bâti-Sud), badge NOM-00142, à 11:20"
            className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret} onClick={() => onConfirmer(horodatage.trim(), description.trim())}>
            Valider (verrouillage définitif)
          </Button>
        </div>
      </div>
    </div>
  );
}
