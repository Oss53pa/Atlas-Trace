import { useState } from 'react';
import { SlidersHorizontal, X, Plus, Palette, Check } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BADGE_CATEGORIES_CONF, PARAMETRES_SCALAIRES, REFERENTIELS, type Referentiel } from '../../data/parametrage';

export function Referentiels() {
  const [refs, setRefs] = useState<Referentiel[]>(REFERENTIELS);
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }
  function retirer(cle: string, valeur: string) {
    setRefs((rs) => rs.map((r) => (r.cle === cle ? { ...r, valeurs: r.valeurs.filter((v) => v !== valeur) } : r)));
  }
  function ajouter(cle: string) {
    const v = (saisie[cle] ?? '').trim();
    if (!v) return;
    setRefs((rs) => rs.map((r) => (r.cle === cle && !r.valeurs.includes(v) ? { ...r, valeurs: [...r.valeurs, v] } : r)));
    setSaisie((s) => ({ ...s, [cle]: '' }));
    flash('Valeur ajoutée au référentiel');
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><SlidersHorizontal className="h-3.5 w-3.5" /> M19 · Paramétrage</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Référentiels paramétrables</h1>
        <p className="mt-1 text-sm text-muted">Aucun de ces éléments n'existe dans le code (chap. 8). Portée par site ou par organisation.</p>
      </div>

      {/* Catégories de badges & couleurs */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Palette className="h-4 w-4 text-forest-500" /> Catégories de badges &amp; couleurs <Badge tone="neutral">Site</Badge></p>
        <div className="flex flex-wrap gap-2">
          {BADGE_CATEGORIES_CONF.map((c) => (
            <span key={c.libelle} className="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-sand-300">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: c.hex }} /> {c.libelle}
              <span className="font-mono text-[10px] text-muted">{c.hex}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Listes éditables */}
      <div className="space-y-4">
        {refs.map((r) => (
          <div key={r.cle} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">{r.libelle} <Badge tone="neutral">{r.portee}</Badge></p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {r.valeurs.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700 ring-1 ring-inset ring-forest-200">
                  {v}
                  <button onClick={() => retirer(r.cle, v)} className="text-forest-400 hover:text-danger-500"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={saisie[r.cle] ?? ''} onChange={(e) => setSaisie((s) => ({ ...s, [r.cle]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && ajouter(r.cle)} placeholder="Ajouter une valeur…"
                className="flex-1 rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
              <button onClick={() => ajouter(r.cle)} className="inline-flex items-center gap-1 rounded-xl bg-forest-500 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-600">
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Paramètres scalaires */}
      <div className="mt-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
        <p className="mb-3 text-sm font-bold text-ink">Paramètres du site</p>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PARAMETRES_SCALAIRES.map((p) => (
            <div key={p.cle} className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2 ring-1 ring-sand-200">
              <dt className="text-xs text-muted">{p.cle}</dt>
              <dd className="text-sm font-bold text-ink">{p.valeur}</dd>
            </div>
          ))}
        </dl>
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
