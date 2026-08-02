import { useCallback, useEffect, useState } from 'react';
import { Gauge, Check, Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthz } from '../../lib/authz';
import { chargerPlafonds, definirPlafond, type PlafondEntreprise } from '../listes/api';

/**
 * M24 — plafonds d'effectif par entité. Définis par l'autorité opérationnelle
 * (pouvoir ADMINISTRER_ORGANISATION). Le référent voit son solde ; un ajout au-delà
 * est bloqué (dérogation), une inscription au portail dépasse et est signalée.
 */
export function Plafonds() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peut = a('ADMINISTRER_ORGANISATION');
  const [lignes, setLignes] = useState<PlafondEntreprise[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    try {
      setLignes(await chargerPlafonds());
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (!connecte) { setChargement(false); return; }
    rafraichir();
  }, [connecte, rafraichir]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2600); }

  async function definir(entrepriseId: string, valeur: number) {
    try {
      await definirPlafond(entrepriseId, valeur);
      await rafraichir();
      flash(`Plafond défini à ${valeur}`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  if (authEnCours || (connecte && chargement)) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!connecte) return <Etat icone={<LogIn className="h-7 w-7" />} titre="Connexion requise" detail="Les plafonds sont une donnée du site." />;
  if (!peut) return <Etat icone={<ShieldAlert className="h-7 w-7" />} titre="Accès non autorisé" detail="Le pouvoir ADMINISTRER_ORGANISATION est requis." />;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          <Gauge className="h-3.5 w-3.5" /> M24 · Lot 1
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Plafonds d'effectif</h1>
        <p className="mt-1 text-sm text-muted">
          Un plafond borne l'effectif présent d'une entité (utile en cas d'évacuation). Non renseigné = pas de
          plafond. L'ajout d'un référent au-delà est bloqué ; une inscription au portail dépasse et est signalée.
        </p>
      </div>

      {erreur && <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

      <ul className="space-y-2">
        {lignes.map((l) => <PlafondRow key={l.entrepriseId} l={l} onDefinir={(v) => definir(l.entrepriseId, v)} />)}
        {lignes.length === 0 && (
          <li className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center text-sm text-muted">
            Aucune entreprise déclarée.
          </li>
        )}
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

function PlafondRow({ l, onDefinir }: { l: PlafondEntreprise; onDefinir: (v: number) => void }) {
  const [valeur, setValeur] = useState(l.valeur != null ? String(l.valeur) : '');
  const [envoi, setEnvoi] = useState(false);
  const n = Number(valeur);
  const pret = valeur.trim() !== '' && Number.isInteger(n) && n >= 0 && n !== l.valeur && !envoi;
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600 ring-1 ring-forest-100">
        <Gauge className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{l.entreprise}</p>
        <p className="text-xs text-muted">
          {l.valeur != null ? <>Plafond courant <b className="text-ink">{l.valeur}</b></> : <Badge tone="neutral">Pas de plafond</Badge>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <input type="number" min="0" value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder="—"
          className="w-20 rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
        <Button variant="primary" size="sm" disabled={!pret}
          icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          onClick={() => { setEnvoi(true); onDefinir(n); setTimeout(() => setEnvoi(false), 400); }}>
          Définir
        </Button>
      </div>
    </li>
  );
}

function Etat({ icone, titre, detail }: { icone: React.ReactNode; titre: string; detail?: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60">{icone}</span>
      <p className="text-base font-bold text-ink">{titre}</p>
      {detail && <p className="text-sm">{detail}</p>}
    </div>
  );
}
