import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface LignesEditeurProps<T> {
  lignes: T[];
  onChange: (lignes: T[]) => void;
  /** Fabrique une ligne vide. */
  nouvelle: () => T;
  /** Nombre de lignes en dessous duquel on ne peut plus retirer (défaut 1). */
  minimum?: number;
  labelAjout?: string;
  /** En-tête de la ligne (défaut : « Ligne n »). */
  titre?: (index: number) => string;
  /** Champs de la ligne. `set` applique une modification partielle. */
  children: (ligne: T, set: (patch: Partial<T>) => void, index: number) => ReactNode;
}

/**
 * Saisie d'une liste d'éléments : un bordereau, une demande de sortie, une
 * évacuation, un préavis de livraison portent presque toujours plusieurs objets.
 * Ce composant tient l'ajout/retrait pour que chaque formulaire ne redéfinisse
 * que ses champs.
 */
export function LignesEditeur<T>({
  lignes,
  onChange,
  nouvelle,
  minimum = 1,
  labelAjout = 'Ajouter une ligne',
  titre,
  children,
}: LignesEditeurProps<T>) {
  const set = (i: number, patch: Partial<T>) =>
    onChange(lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-3">
      {lignes.map((ligne, i) => (
        <div key={i} className="rounded-2xl border border-sand-200 bg-sand-50/60 p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest-500 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              {titre ? titre(i) : 'Ligne'}
            </span>
            {lignes.length > minimum && (
              <button
                type="button"
                onClick={() => onChange(lignes.filter((_, j) => j !== i))}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted transition-colors hover:bg-danger-50 hover:text-danger-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Retirer
              </button>
            )}
          </div>
          <div className="space-y-2.5">{children(ligne, (patch) => set(i, patch), i)}</div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...lignes, nouvelle()])}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-forest-300 bg-forest-50/50 py-2.5 text-sm font-semibold text-forest-700 transition-colors hover:bg-forest-50"
      >
        <Plus className="h-4 w-4" /> {labelAjout}
      </button>
    </div>
  );
}
