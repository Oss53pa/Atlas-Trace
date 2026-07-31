import { useMemo, useState } from 'react';
import { ShieldCheck, Lock, Search, ArrowRight } from 'lucide-react';
import { ACTIONS_AUDIT, AUDIT } from '../../data/admin';

export function JournalAudit() {
  const [action, setAction] = useState('Toutes');
  const [q, setQ] = useState('');

  const lignes = useMemo(() => {
    const query = q.trim().toLowerCase();
    return AUDIT.filter((e) => (action === 'Toutes' || e.action === action) && (!query || e.entite.toLowerCase().includes(query) || e.utilisateur.toLowerCase().includes(query)));
  }, [action, q]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><ShieldCheck className="h-3.5 w-3.5" /> M18 · Administration</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Journal d'audit</h1>
        <p className="mt-1 text-sm text-muted">
          Toute action sensible est tracée : utilisateur, entité, valeur avant et après, horodatage, appareil.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-forest-50 px-4 py-2.5 text-sm font-semibold text-forest-700 ring-1 ring-forest-100">
        <Lock className="h-4 w-4 text-forest-500" />
        Journal inaltérable — aucune suppression ni modification possible. Accès restreint et lui-même journalisé.
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          Action
          <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-xl border border-sand-300 bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {ACTIONS_AUDIT.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (entité, utilisateur)…" className="w-64 rounded-xl border border-sand-300 bg-white py-1.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400" />
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-sand-300/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-sand-300/70 text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-semibold">Horodatage</th>
                <th className="px-4 py-2.5 font-semibold">Utilisateur</th>
                <th className="px-4 py-2.5 font-semibold">Action</th>
                <th className="px-4 py-2.5 font-semibold">Entité</th>
                <th className="px-4 py-2.5 font-semibold">Avant → Après</th>
                <th className="px-4 py-2.5 font-semibold">Appareil</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((e) => (
                <tr key={e.id} className="border-b border-sand-200 last:border-0 hover:bg-sand-50">
                  <td className="px-4 py-3 tabular-nums text-muted">{e.horodatage}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{e.utilisateur}</td>
                  <td className="px-4 py-3"><span className="rounded-lg bg-forest-50 px-2 py-0.5 text-xs font-bold text-forest-700">{e.action}</span></td>
                  <td className="px-4 py-3 text-ink">{e.entite}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {e.avant ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-danger-500">{e.avant}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-semibold text-forest-600">{e.apres}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">{e.appareil}</td>
                </tr>
              ))}
              {lignes.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">Aucun événement pour ce filtre.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
