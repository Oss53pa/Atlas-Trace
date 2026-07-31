import { useState } from 'react';
import { Link2, RefreshCw, Copy, ShieldAlert, Check } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LIENS_EXTERNES, type LienExterne } from '../../data/admin';

const url = (jeton: string) => `trace.at/r/${jeton}`;

/** Nouveau jeton déterministe dérivé de l'ancien (maquette). */
function regenerer(jeton: string): string {
  let h = 0;
  for (let i = 0; i < jeton.length; i++) h = (h * 33 + jeton.charCodeAt(i) + 7) & 0xffffffff;
  return Math.abs(h).toString(36).padStart(10, 'x').slice(0, 10);
}

export function LiensExternes() {
  const [liens, setLiens] = useState<LienExterne[]>(LIENS_EXTERNES);
  const [ancien, setAncien] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  }

  function revoquer(id: string) {
    setLiens((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l;
        setAncien((a) => ({ ...a, [id]: l.jeton }));
        return { ...l, jeton: regenerer(l.jeton) };
      }),
    );
    flash('Lien révoqué et régénéré · ancien lien désormais inopérant · tracé au journal');
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Link2 className="h-3.5 w-3.5" /> M18 · Administration</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Liens externes des référents</h1>
        <p className="mt-1 text-sm text-muted">
          Aucun compte ni mot de passe pour les référents (R5). Lien unique permanent, révocable et régénérable en un geste.
        </p>
      </div>

      <ul className="space-y-2">
        {liens.map((l) => (
          <li key={l.id} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{l.entreprise} <span className="font-normal text-muted">· {l.referent}</span></p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-forest-700">
                  <Link2 className="h-3 w-3" /> {url(l.jeton)}
                </p>
                {ancien[l.id] && (
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-danger-500 line-through">
                    <ShieldAlert className="h-3 w-3" /> {url(ancien[l.id])} — inopérant
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted">Créé le {l.cree}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone="forest" dot>Actif</Badge>
                <Button variant="outline" size="sm" icon={<Copy className="h-4 w-4" />} onClick={() => flash('Lien copié')}>Copier</Button>
                <Button variant="accent" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => revoquer(l.id)}>Révoquer &amp; régénérer</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

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
