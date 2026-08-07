import { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, X, Plus, Palette, Check, Loader2, LogIn } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useAuthz } from '../../lib/authz';
import { chargerReferentiels, majReferentielValeurs, type Referentiel } from './api';

/** Charte des bandes de catégorie (utilisée par les badges) — référence. */
const BADGE_CATEGORIES = [
  { libelle: 'Chantier', hex: '#5C6B12' },
  { libelle: 'Aménagement preneur', hex: '#C08A2A' },
  { libelle: 'Visiteur', hex: '#6A6B5F' },
  { libelle: 'Personnel propre', hex: '#0A362E' },
];

export function Referentiels() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutEditer = a('ADMINISTRER_ORGANISATION');

  const [refs, setRefs] = useState<Referentiel[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    try {
      setRefs(await chargerReferentiels());
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
    setTimeout(() => setToast(null), 2200);
  }

  async function persister(r: Referentiel, valeurs: string[]) {
    const avant = refs;
    setRefs((rs) => rs.map((x) => (x.id === r.id ? { ...x, valeurs } : x))); // optimiste
    try {
      await majReferentielValeurs(r.id, valeurs);
    } catch (e) {
      setRefs(avant); // rollback
      setErreur((e as Error).message);
    }
  }

  function retirer(r: Referentiel, valeur: string) {
    persister(r, r.valeurs.filter((v) => v !== valeur));
  }
  function ajouter(r: Referentiel) {
    const v = (saisie[r.cle] ?? '').trim();
    if (!v || r.valeurs.includes(v)) return;
    persister(r, [...r.valeurs, v]);
    setSaisie((s) => ({ ...s, [r.cle]: '' }));
    flash('Valeur ajoutée au référentiel');
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
        <p className="text-sm">Les référentiels sont une donnée de configuration du site.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><SlidersHorizontal className="h-3.5 w-3.5" /> Paramétrage</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Référentiels paramétrables</h1>
        <p className="mt-1 text-sm text-muted">Listes éditables, portées par site ou par organisation. Enregistrées en base et propagées à toute l'interface.</p>
      </div>

      {erreur && (
        <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>
      )}
      {!peutEditer && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          Lecture seule — l'édition des référentiels requiert le pouvoir ADMINISTRER_ORGANISATION.
        </p>
      )}

      {/* Charte des catégories de badges (référence) */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Palette className="h-4 w-4 text-forest-500" /> Catégories de badges &amp; couleurs <Badge tone="neutral">Charte</Badge></p>
        <div className="flex flex-wrap gap-2">
          {BADGE_CATEGORIES.map((c) => (
            <span key={c.libelle} className="inline-flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-sand-300">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: c.hex }} /> {c.libelle}
              <span className="font-mono text-[10px] text-muted">{c.hex}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Listes éditables (live) */}
      {refs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-4 py-8 text-center text-sm text-muted">
          Aucun référentiel configuré.
        </p>
      ) : (
        <div className="space-y-4">
          {refs.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">{r.libelle} <Badge tone="neutral">{r.portee}</Badge></p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {r.valeurs.map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700 ring-1 ring-inset ring-forest-200">
                    {v}
                    {peutEditer && (
                      <button onClick={() => retirer(r, v)} className="text-forest-400 hover:text-danger-500" aria-label={`Retirer ${v}`}><X className="h-3 w-3" /></button>
                    )}
                  </span>
                ))}
                {r.valeurs.length === 0 && <span className="text-xs text-muted">Aucune valeur.</span>}
              </div>
              {peutEditer && (
                <div className="flex gap-2">
                  <input value={saisie[r.cle] ?? ''} onChange={(e) => setSaisie((s) => ({ ...s, [r.cle]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && ajouter(r)} placeholder="Ajouter une valeur…"
                    className="flex-1 rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
                  <button onClick={() => ajouter(r)} className="inline-flex items-center gap-1 rounded-xl bg-forest-500 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-600">
                    <Plus className="h-4 w-4" /> Ajouter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
