import { useState } from 'react';
import { KeyRound, ShieldAlert, Check, ChevronDown, Plus } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { MODELES, POUVOIRS, type RoleModele } from '../../data/parametrage';
import { PREREGLAGES } from '../../data/profils';

type Perimetre = 'Site' | 'Emprise' | 'Entreprise';
interface RoleAvecPerimetre extends RoleModele { perimetre: Perimetre }

/** Périmètre par défaut d'un rôle, repris du préréglage chantier ; sinon « Site ». */
const perimetreDe = (nom: string): Perimetre =>
  (PREREGLAGES[0].roles.find((r) => r.nom === nom)?.perimetre as Perimetre) ?? 'Site';

const ROLES_INIT: RoleAvecPerimetre[] = MODELES[0].roles.map((r) => ({ ...r, perimetre: perimetreDe(r.nom) }));

export function RolesPouvoirs() {
  const [roles, setRoles] = useState<RoleAvecPerimetre[]>(ROLES_INIT);
  const [catalogue, setCatalogue] = useState(false);

  function toggle(roleNom: string, pouvoir: string) {
    setRoles((rs) => rs.map((r) => {
      if (r.nom !== roleNom) return r;
      const has = r.pouvoirs.includes(pouvoir);
      return { ...r, pouvoirs: has ? r.pouvoirs.filter((p) => p !== pouvoir) : [...r.pouvoirs, pouvoir] };
    }));
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><KeyRound className="h-3.5 w-3.5" /> M19 · Paramétrage</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Rôles &amp; pouvoirs</h1>
        <p className="mt-1 text-sm text-muted">
          Une bibliothèque de permissions atomiques ; les rôles en sont des assemblages. Chaque rôle est renommable, modifiable, supprimable, et porte un périmètre.
        </p>
      </div>

      <div className="mb-4 space-y-2">
        <Regle texte="Le visa et l’approbation d’un même dossier ne peuvent pas être exercés par la même personne." />
        <Regle texte="Contrôler au poste et approuver une sortie sont incompatibles : un agent ne peut pas approuver ce qu’il contrôle." />
      </div>

      <button onClick={() => setCatalogue((v) => !v)} className="mb-3 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink shadow-card ring-1 ring-sand-300/70">
        <span>Bibliothèque de permissions ({POUVOIRS.length})</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${catalogue ? 'rotate-180' : ''}`} />
      </button>
      {catalogue && (
        <div className="mb-4 grid grid-cols-1 gap-1.5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70 sm:grid-cols-2">
          {POUVOIRS.map((p) => (
            <div key={p.code} className="text-xs"><span className="font-mono font-semibold text-forest-700">{p.code}</span><span className="text-muted"> — {p.effet}</span></div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.nom} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink">{r.nom}</h3>
              <div className="flex items-center gap-1.5">
                <Badge tone="neutral">Périmètre · {r.perimetre}</Badge>
                <Badge tone="forest">{r.pouvoirs.length}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.pouvoirs.map((p) => (
                <button key={p} onClick={() => toggle(r.nom, p)} className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-forest-700 ring-1 ring-inset ring-forest-200 hover:bg-forest-100">
                  <Check className="h-3 w-3" /> {p}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sand-300 bg-white py-3 text-sm font-semibold text-muted hover:border-forest-300 hover:text-forest-600">
          <Plus className="h-4 w-4" /> Créer un rôle
        </button>
      </div>
    </div>
  );
}

function Regle({ texte }: { texte: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-forest-50 px-3 py-2 text-xs font-medium text-forest-700 ring-1 ring-forest-100">
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-500" />
      {texte}
    </div>
  );
}
