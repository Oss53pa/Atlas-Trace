import { useMemo, useState } from 'react';
import { Layers, CreditCard, Check, RotateCcw, KeyRound, UserCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { SITE, TOURNANTS_JOUR, VISITEURS } from '../../data/badges';

type TempStatut = 'GENERE' | 'REMIS' | 'RESTITUE';
interface TempBadge {
  id: string;
  numero: string;
  nom: string;
  prenom: string;
  fonction: string;
  entreprise: string;
  statut: TempStatut;
}

export function Temporaires() {
  const [lot, setLot] = useState<TempBadge[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  }

  function generer() {
    setLot(
      TOURNANTS_JOUR.map((t, i) => ({
        id: t.id,
        numero: `TMP-${SITE.dateLot}-${String(i + 1).padStart(3, '0')}`,
        nom: t.nom,
        prenom: t.prenom,
        fonction: t.fonction,
        entreprise: t.entreprise,
        statut: 'GENERE',
      })),
    );
    flash(`Lot de ${TOURNANTS_JOUR.length} badges temporaires généré`);
  }

  function maj(id: string, statut: TempStatut) {
    setLot((l) => (l ? l.map((b) => (b.id === id ? { ...b, statut } : b)) : l));
  }

  const c = useMemo(() => {
    const l = lot ?? [];
    return {
      generes: l.length,
      remis: l.filter((b) => b.statut === 'REMIS').length,
      restitues: l.filter((b) => b.statut === 'RESTITUE').length,
      nonRestitues: l.filter((b) => b.statut === 'REMIS').length,
    };
  }, [lot]);

  const visitAlertes = VISITEURS.filter((v) => v.nonSorti).length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          <Layers className="h-3.5 w-3.5" /> M3 · Temporaires &amp; visiteurs
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
          Badges temporaires &amp; visiteurs
        </h1>
        <p className="mt-1 text-sm text-muted">
          Générés par lot depuis le registre de présence, remis contre pièce d'identité, restitués le soir.
        </p>
      </div>

      {/* Lot */}
      {!lot ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-sand-300/70">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
            <CreditCard className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-ink">
            {TOURNANTS_JOUR.length} tournants du registre du jour (Bâti-Sud, VRD, Toiture Plus…)
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            La génération crée un badge numéroté par personne, prêt à être remis au poste.
          </p>
          <Button variant="primary" className="mx-auto mt-4" icon={<Layers className="h-4 w-4" />} onClick={generer}>
            Générer le lot ({TOURNANTS_JOUR.length})
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard tone="forest" label="Générés" value={c.generes} icon={<CreditCard className="h-5 w-5" />} />
            <StatCard label="Remis (en circulation)" value={c.remis} icon={<KeyRound className="h-5 w-5" />} />
            <StatCard label="Restitués" value={c.restitues} icon={<Check className="h-5 w-5" />} />
            <StatCard
              tone={c.nonRestitues > 0 ? 'amber' : 'plain'}
              label="Non restitués"
              value={c.nonRestitues}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          <ul className="space-y-2">
            {lot.map((b) => (
              <TempRow key={b.id} b={b} onRemettre={() => maj(b.id, 'REMIS')} onRestituer={() => maj(b.id, 'RESTITUE')} />
            ))}
          </ul>
        </>
      )}

      {/* Visiteurs */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <UserCheck className="h-4 w-4 text-forest-500" />
          Badges visiteurs
        </h2>

        {visitAlertes > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            <AlertTriangle className="h-4 w-4" />
            {visitAlertes} visiteur non sorti — à relancer auprès de l'accompagnateur
          </div>
        )}

        <ul className="space-y-2">
          {VISITEURS.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-sand-300/70">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">
                  {v.prenom} {v.nom}
                </p>
                <p className="truncate text-xs text-muted">
                  {v.motif} · entré {v.entree}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-amber-700">Accompagné · {v.accompagnateur}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-mono text-[11px] text-muted">{v.numero}</span>
                {v.nonSorti ? (
                  <Badge tone="danger" dot>Non sorti</Badge>
                ) : v.statut === 'SUR_SITE' ? (
                  <Badge tone="forest" dot>Sur site</Badge>
                ) : (
                  <Badge tone="neutral" dot>Sorti</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function TempRow({ b, onRemettre, onRestituer }: { b: TempBadge; onRemettre: () => void; onRestituer: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-sand-300/70">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <CreditCard className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {b.prenom} {b.nom}
        </p>
        <p className="truncate text-xs text-muted">
          {b.fonction} · {b.entreprise}
        </p>
      </div>
      <span className="hidden shrink-0 font-mono text-xs font-semibold text-ink sm:block">{b.numero}</span>
      <div className="w-40 shrink-0 text-right">
        {b.statut === 'GENERE' && (
          <Button variant="accent" size="sm" icon={<KeyRound className="h-4 w-4" />} onClick={onRemettre}>
            Remettre / pièce
          </Button>
        )}
        {b.statut === 'REMIS' && (
          <Button variant="outline" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={onRestituer}>
            Restituer
          </Button>
        )}
        {b.statut === 'RESTITUE' && <Badge tone="forest" dot>Restitué</Badge>}
      </div>
    </li>
  );
}
