import { useState } from 'react';
import { Layers, Check, Building2, MapPin, Users, Zap, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { MODELES } from '../../data/parametrage';

export function ModelesSectoriels({ modeleId, setModeleId }: { modeleId: string; setModeleId: (id: string) => void }) {
  const [toast, setToast] = useState<string | null>(null);

  function appliquer(id: string) {
    setModeleId(id);
    const m = MODELES.find((x) => x.id === id)!;
    setToast(`Modèle « ${m.nom} » appliqué · ${m.roles.length} rôles, ${m.categories.length} catégories configurés`);
    setTimeout(() => setToast(null), 3200);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Layers className="h-3.5 w-3.5" /> M19 · Paramétrage</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Modèles sectoriels</h1>
        <p className="mt-1 text-sm text-muted">
          Rien n'est codé en dur (R11). Appliquez un modèle en un geste puis ajustez. Objectif : site opérationnel en moins d'une journée, sans développement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {MODELES.map((m) => {
          const actif = modeleId === m.id;
          return (
            <div key={m.id} className={`rounded-2xl bg-white p-5 shadow-card ring-1 ${actif ? 'ring-2 ring-forest-500' : 'ring-sand-300/70'}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
                    {m.id === 'btp' ? <Building2 className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  </span>
                  <h2 className="text-base font-extrabold text-ink">{m.nom}</h2>
                </div>
                {actif && <Badge tone="forest" dot>Appliqué</Badge>}
              </div>
              <p className="mb-3 text-sm text-muted">{m.description}</p>

              <dl className="space-y-1.5 text-sm">
                <Ligne icon={<Users className="h-4 w-4" />} label="Rôles" val={`${m.roles.length} rôles fournis`} />
                <Ligne icon={<Building2 className="h-4 w-4" />} label="Donneur d'ordre" val={m.donneurOrdreLabel ?? 'Aucun (conditions sur l’entreprise)'} />
                <Ligne icon={<MapPin className="h-4 w-4" />} label="Emprise" val={m.empriseLabel} />
                <Ligne icon={<Layers className="h-4 w-4" />} label="Catégories" val={m.categories.join(', ')} />
              </dl>

              <Button variant={actif ? 'outline' : 'primary'} block className="mt-4" icon={actif ? <Check className="h-4 w-4" /> : <Layers className="h-4 w-4" />} onClick={() => appliquer(m.id)}>
                {actif ? 'Modèle appliqué' : 'Appliquer le modèle'}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>Le second cas de référence (site minier, <b>sans donneur d'ordre externe</b>) doit fonctionner intégralement sans recours au développement — c'est le test de généricité du produit (cas 40).</p>
      </div>

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

function Ligne({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 shrink-0 text-forest-500">{icon}</span>
      <span className="text-muted">{label} :</span>
      <span className="font-semibold text-ink">{val}</span>
    </div>
  );
}
