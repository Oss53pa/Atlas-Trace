import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Lock, Search, ArrowRight, Loader2, LogIn } from 'lucide-react';
import { useAuthz } from '../../lib/authz';
import { chargerAudit, type EvenementAudit } from './api';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function JournalAudit() {
  const { connecte, chargement: authEnCours } = useAuthz();
  const [evenements, setEvenements] = useState<EvenementAudit[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState('Toutes');
  const [q, setQ] = useState('');

  const rafraichir = useCallback(async () => {
    try {
      setEvenements(await chargerAudit());
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

  // Filtre d'actions dérivé des évènements réellement présents.
  const actions = useMemo(
    () => ['Toutes', ...Array.from(new Set(evenements.map((e) => e.action))).sort()],
    [evenements],
  );

  const lignes = useMemo(() => {
    const query = q.trim().toLowerCase();
    return evenements.filter(
      (e) =>
        (action === 'Toutes' || e.action === action) &&
        (!query || e.entite.toLowerCase().includes(query) || e.utilisateur.toLowerCase().includes(query)),
    );
  }, [evenements, action, q]);

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
        <p className="text-sm">Le journal d'audit est réservé aux comptes disposant du pouvoir CONSULTER_AUDIT.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><ShieldCheck className="h-3.5 w-3.5" /> Administration</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Journal d'audit</h1>
        <p className="mt-1 text-sm text-muted">
          Toute action sensible est tracée : utilisateur, entité, valeur avant et après, horodatage, appareil.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-forest-50 px-4 py-2.5 text-sm font-semibold text-forest-700 ring-1 ring-forest-100">
        <Lock className="h-4 w-4 text-forest-500" />
        Journal inaltérable — écrit par le serveur, aucune suppression ni modification possible. Lecture restreinte au pouvoir d'audit.
      </div>

      {erreur && (
        <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
          {erreur}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          Action
          <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-xl border border-sand-300 bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (entité, utilisateur)…" className="w-64 rounded-xl border border-sand-300 bg-white py-1.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400" />
        </span>
        <span className="ml-auto text-xs text-muted">{lignes.length} évènement(s)</span>
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
                  <td className="px-4 py-3 tabular-nums text-muted">{fmt(e.horodatage)}</td>
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
                    ) : e.apres ? (
                      <span className="font-semibold text-forest-600">{e.apres}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">{e.appareil ?? '—'}</td>
                </tr>
              ))}
              {lignes.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">Aucun évènement pour ce filtre.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
