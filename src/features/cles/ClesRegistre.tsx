import { useCallback, useEffect, useMemo, useState } from 'react';
import { Key, Check, X, KeyRound, RotateCcw, AlertTriangle, MapPin, ClipboardCheck, Loader2, LogIn } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthz } from '../../lib/authz';
import { chargerCles, chargerMouvementsCle, remettreCle, restituerCle, type Cle, type MouvementCle } from './api';

type StatutEffectif = 'DISPONIBLE' | 'REMISE' | 'NON_RESTITUEE';

const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dh = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

/** Une clé remise non rendue le jour même est « non restituée ». */
function statutEffectif(c: Cle): StatutEffectif {
  if (c.statut !== 'REMISE') return 'DISPONIBLE';
  const rendue = c.remiseAt ? new Date(c.remiseAt).toDateString() === new Date().toDateString() : true;
  return rendue ? 'REMISE' : 'NON_RESTITUEE';
}

export function ClesRegistre() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutGerer = a('CONTROLER_AU_POSTE');

  const [cles, setCles] = useState<Cle[]>([]);
  const [mouvements, setMouvements] = useState<MouvementCle[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [remise, setRemise] = useState<Cle | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([chargerCles(), chargerMouvementsCle()]);
      setCles(c);
      setMouvements(m);
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
    setTimeout(() => setToast(null), 2600);
  }

  const stats = useMemo(() => {
    const eff = cles.map(statutEffectif);
    return {
      total: cles.length,
      remises: eff.filter((s) => s === 'REMISE' || s === 'NON_RESTITUEE').length,
      nonRestituees: eff.filter((s) => s === 'NON_RESTITUEE').length,
    };
  }, [cles]);

  const nonRestituees = cles.filter((c) => statutEffectif(c) === 'NON_RESTITUEE');

  async function confirmerRemise(id: string, detenteur: string) {
    try {
      await remettreCle(id, detenteur, true);
      setRemise(null);
      await rafraichir();
      flash('Clé remise · émargement recueilli');
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function restituer(id: string) {
    try {
      await restituerCle(id);
      await rafraichir();
      flash('Clé restituée');
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
        <p className="text-sm">Le registre des clés est une donnée du poste.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Clés &amp; zones</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Clés &amp; zones sensibles</h1>
          <p className="mt-1 text-sm text-muted">
            Registre nominatif des remises et restitutions. Alerte sur toute clé non restituée.
          </p>
        </div>

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>
        )}

        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard tone="forest" label="Clés au registre" value={stats.total} icon={<Key className="h-5 w-5" />} />
          <StatCard tone="amber" label="Remises (en circulation)" value={stats.remises} icon={<KeyRound className="h-5 w-5" />} />
          <DangerStat label="Non restituées" value={stats.nonRestituees} />
        </div>

        {nonRestituees.length > 0 && (
          <div className="mb-5 rounded-2xl bg-danger-50 px-4 py-3 ring-1 ring-danger-100">
            <p className="flex items-center gap-2 text-sm font-bold text-danger-600">
              <AlertTriangle className="h-4 w-4" /> {nonRestituees.length} clé(s) non restituée(s) — à relancer
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {nonRestituees.map((c) => (
                <Badge key={c.id} tone="danger" dot>{c.code} · {c.detenteur}</Badge>
              ))}
            </div>
          </div>
        )}

        <h2 className="mb-2 text-sm font-bold text-ink">Trousseau</h2>
        {cles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-4 py-8 text-center text-sm text-muted">Aucune clé au registre.</p>
        ) : (
          <ul className="space-y-2">
            {cles.map((c) => (
              <CleRow key={c.id} c={c} peutGerer={peutGerer} onRemettre={() => setRemise(c)} onRestituer={() => restituer(c.id)} />
            ))}
          </ul>
        )}

        {mouvements.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-sm font-bold text-ink">Registre des mouvements</h2>
            <ul className="space-y-1.5">
              {mouvements.slice(0, 8).map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm shadow-card ring-1 ring-sand-300/70">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${m.sens === 'REMISE' ? 'bg-amber-500' : 'bg-forest-500'}`} />
                  <span className="font-mono text-xs font-semibold text-ink">{m.code}</span>
                  <span className="text-xs text-muted">{m.sens === 'REMISE' ? 'remise à' : 'restituée par'} {m.detenteur} · {m.agent}</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">{heure(m.horodatage)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {remise && <RemiseSheet c={remise} onAnnuler={() => setRemise(null)} onConfirmer={confirmerRemise} />}

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

const chip: Record<StatutEffectif, React.ReactNode> = {
  DISPONIBLE: <Badge tone="forest" dot>Disponible</Badge>,
  REMISE: <Badge tone="amber" dot>Remise</Badge>,
  NON_RESTITUEE: <Badge tone="danger" dot>Non restituée</Badge>,
};

function CleRow({ c, peutGerer, onRemettre, onRestituer }: { c: Cle; peutGerer: boolean; onRemettre: () => void; onRestituer: () => void }) {
  const eff = statutEffectif(c);
  const remise = eff !== 'DISPONIBLE';
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ${eff === 'NON_RESTITUEE' ? 'ring-danger-200' : 'ring-sand-300/70'}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-forest-500 ring-1 ring-sand-200">
        <Key className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">
          <span className="font-mono">{c.code}</span> <span className="font-normal text-muted">· {c.libelle}</span>
        </p>
        <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {c.zone}</p>
        {remise && <p className="mt-0.5 text-[11px] text-muted">Détenteur : {c.detenteur} · depuis {dh(c.remiseAt)}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {chip[eff]}
        {peutGerer && (remise ? (
          <Button variant="outline" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={onRestituer}>Restituer</Button>
        ) : (
          <Button variant="accent" size="sm" icon={<KeyRound className="h-4 w-4" />} onClick={onRemettre}>Remettre</Button>
        ))}
      </div>
    </li>
  );
}

function DangerStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <AlertTriangle className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function RemiseSheet({ c, onAnnuler, onConfirmer }: { c: Cle; onAnnuler: () => void; onConfirmer: (id: string, detenteur: string) => void }) {
  const [detenteur, setDetenteur] = useState('');
  const [emargement, setEmargement] = useState(false);
  const pret = detenteur.trim().length > 1 && emargement;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Remise de clé</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted"><span className="font-mono font-semibold text-ink">{c.code}</span> · {c.libelle} · {c.zone}</p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Détenteur</span>
          <input value={detenteur} onChange={(e) => setDetenteur(e.target.value)} placeholder="Nom · entreprise / fonction"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>

        <button onClick={() => setEmargement((v) => !v)}
          className={`mt-3 flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${emargement ? 'border-forest-200 bg-forest-50 text-forest-700' : 'border-sand-300 bg-white text-muted'}`}>
          {emargement ? <Check className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
          Émargement recueilli
        </button>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret} onClick={() => onConfirmer(c.id, detenteur.trim())}>
            Confirmer la remise
          </Button>
        </div>
      </div>
    </div>
  );
}
