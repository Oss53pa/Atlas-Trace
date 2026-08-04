import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, CreditCard, Check, RotateCcw, KeyRound, UserCheck, AlertTriangle, X, Loader2, LogIn } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthz } from '../../lib/authz';
import {
  chargerBadgesTemporaires,
  chargerVisiteurs,
  genererBadgesTemporaires,
  remettreBadge,
  restituerBadge,
  type BadgeLive,
} from './api';

export function Temporaires() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutDelivrer = a('DELIVRER_BADGE');

  const [temp, setTemp] = useState<BadgeLive[]>([]);
  const [visiteurs, setVisiteurs] = useState<BadgeLive[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [remise, setRemise] = useState<BadgeLive | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([chargerBadgesTemporaires(), chargerVisiteurs()]);
      setTemp(t);
      setVisiteurs(v);
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
    setTimeout(() => setToast(null), 2800);
  }

  const c = useMemo(() => ({
    generes: temp.length,
    remis: temp.filter((b) => b.statut === 'REMIS').length,
    restitues: temp.filter((b) => b.statut === 'RESTITUE').length,
    enGeneration: temp.filter((b) => b.statut === 'GENERE').length,
  }), [temp]);

  async function generer() {
    try {
      const res = await genererBadgesTemporaires();
      await rafraichir();
      flash(res.generes > 0 ? `Lot de ${res.generes} badge(s) temporaire(s) généré` : 'Aucun tournant à badger (registre à jour)');
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function confirmerRemise(piece: string) {
    if (!remise) return;
    try {
      await remettreBadge(remise.id, piece);
      setRemise(null);
      await rafraichir();
      flash('Badge remis contre pièce · en circulation');
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function restituer(id: string) {
    try {
      await restituerBadge(id);
      await rafraichir();
      flash('Badge restitué');
    } catch (e) {
      setErreur((e as Error).message);
    }
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
        <p className="text-sm">Les badges temporaires sont générés depuis le registre du site.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
            <Layers className="h-3.5 w-3.5" /> Temporaires &amp; visiteurs
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Badges temporaires &amp; visiteurs</h1>
          <p className="mt-1 text-sm text-muted">
            Générés par lot depuis le registre de présence, remis contre pièce d'identité, restitués le soir.
          </p>
        </div>
        {peutDelivrer && (
          <Button variant="primary" icon={<Layers className="h-4 w-4" />} onClick={generer}>
            Générer le lot
          </Button>
        )}
      </div>

      {erreur && (
        <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
          {erreur}
        </p>
      )}

      {temp.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-sand-300/70">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
            <CreditCard className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-ink">Aucun badge temporaire</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            La génération crée un badge numéroté par personne tournante présente au registre, prêt à être remis au poste.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard tone="forest" label="Générés" value={c.generes} icon={<CreditCard className="h-5 w-5" />} />
            <StatCard label="Remis (en circulation)" value={c.remis} icon={<KeyRound className="h-5 w-5" />} />
            <StatCard label="Restitués" value={c.restitues} icon={<Check className="h-5 w-5" />} />
            <StatCard tone={c.remis > 0 ? 'amber' : 'plain'} label="Non restitués" value={c.remis} icon={<AlertTriangle className="h-5 w-5" />} />
          </div>

          <ul className="space-y-2">
            {temp.map((b) => (
              <TempRow key={b.id} b={b} peutDelivrer={peutDelivrer} onRemettre={() => setRemise(b)} onRestituer={() => restituer(b.id)} />
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
        {visiteurs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-4 py-6 text-center text-sm text-muted">
            Aucun badge visiteur en cours.
          </p>
        ) : (
          <ul className="space-y-2">
            {visiteurs.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-sand-300/70">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{v.prenom} {v.nom}</p>
                  <p className="truncate text-xs text-muted">{v.fonction || v.entreprise}</p>
                  {v.accompagnateur && <p className="mt-0.5 text-xs font-semibold text-amber-700">Accompagné · {v.accompagnateur}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-[11px] text-muted">{v.numero}</span>
                  <Badge tone={v.statut === 'RESTITUE' ? 'neutral' : 'forest'} dot>
                    {v.statut === 'RESTITUE' ? 'Sorti' : 'Sur site'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {remise && <RemiseSheet b={remise} onAnnuler={() => setRemise(null)} onConfirmer={confirmerRemise} />}

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

function TempRow({ b, peutDelivrer, onRemettre, onRestituer }: { b: BadgeLive; peutDelivrer: boolean; onRemettre: () => void; onRestituer: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-sand-300/70">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <CreditCard className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{b.prenom} {b.nom}</p>
        <p className="truncate text-xs text-muted">{b.fonction || '—'} · {b.entreprise}</p>
      </div>
      <span className="hidden shrink-0 font-mono text-xs font-semibold text-ink sm:block">{b.numero}</span>
      <div className="w-40 shrink-0 text-right">
        {b.statut === 'GENERE' && peutDelivrer && (
          <Button variant="accent" size="sm" icon={<KeyRound className="h-4 w-4" />} onClick={onRemettre}>
            Remettre / pièce
          </Button>
        )}
        {b.statut === 'REMIS' && peutDelivrer && (
          <Button variant="outline" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={onRestituer}>
            Restituer
          </Button>
        )}
        {b.statut === 'RESTITUE' && <Badge tone="forest" dot>Restitué</Badge>}
        {!peutDelivrer && b.statut !== 'RESTITUE' && <Badge tone={b.statut === 'REMIS' ? 'amber' : 'neutral'} dot>{b.statut === 'REMIS' ? 'Remis' : 'Généré'}</Badge>}
      </div>
    </li>
  );
}

function RemiseSheet({ b, onAnnuler, onConfirmer }: { b: BadgeLive; onAnnuler: () => void; onConfirmer: (piece: string) => void }) {
  const [type, setType] = useState('CNI');
  const [numero, setNumero] = useState('');
  const pret = numero.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Remise du badge · {b.numero}</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">{b.prenom} {b.nom} · {b.entreprise}. Une pièce est retenue en échange du badge.</p>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Type de pièce</span>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {['CNI', 'Passeport', 'Permis', 'Carte pro'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-xs font-semibold text-muted">Référence de la pièce</span>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="N° / référence"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret} onClick={() => onConfirmer(`${type} · ${numero.trim()}`)}>
            Remettre contre pièce
          </Button>
        </div>
      </div>
    </div>
  );
}
