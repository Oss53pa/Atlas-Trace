import { useMemo, useState } from 'react';
import { Users, ShieldCheck, PauseCircle, PlayCircle, UserCog } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { UTILISATEURS, type Utilisateur } from '../../data/admin';

export function Comptes() {
  const [users, setUsers] = useState<Utilisateur[]>(UTILISATEURS);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  }
  function bascule(id: string) {
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, statut: u.statut === 'ACTIF' ? 'SUSPENDU' : 'ACTIF' } : u)));
    const u = users.find((x) => x.id === id)!;
    flash(u.statut === 'ACTIF' ? 'Compte suspendu' : 'Compte réactivé');
  }

  const stats = useMemo(() => ({
    total: users.length,
    actifs: users.filter((u) => u.statut === 'ACTIF').length,
    suspendus: users.filter((u) => u.statut === 'SUSPENDU').length,
  }), [users]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><UserCog className="h-3.5 w-3.5" /> M18 · Administration</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Comptes internes &amp; rôles</h1>
        <p className="mt-1 text-sm text-muted">
          Rôles composés de pouvoirs atomiques. Suppléance prévue pour ne pas bloquer une approbation. Séparation visa / approbation non désactivable.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard tone="forest" label="Comptes" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Actifs" value={stats.actifs} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard tone="amber" label="Suspendus" value={stats.suspendus} icon={<PauseCircle className="h-5 w-5" />} />
      </div>

      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{u.nom} <span className="font-normal text-muted">· {u.role}</span></p>
              <p className="truncate text-xs text-muted">{u.contact} · dernier accès {u.dernierAcces}{u.suppleant && ` · suppléant : ${u.suppleant}`}</p>
            </div>
            {u.statut === 'ACTIF' ? <Badge tone="forest" dot>Actif</Badge> : <Badge tone="amber" dot>Suspendu</Badge>}
            <Button variant="outline" size="sm" icon={u.statut === 'ACTIF' ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />} onClick={() => bascule(u.id)}>
              {u.statut === 'ACTIF' ? 'Suspendre' : 'Réactiver'}
            </Button>
          </li>
        ))}
      </ul>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">{toast}</div>
        </div>
      )}
    </div>
  );
}
