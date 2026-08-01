import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  X,
  FileOutput,
  Tag,
  ShieldAlert,
  Camera,
  ArrowLeft,
  Wifi,
  WifiOff,
  Loader2,
  Keyboard,
  LogIn,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { Scanner } from '../../components/device/Scanner';
import { ViseurEteint } from '../../components/device/ViseurEteint';
import { useAuthz } from '../../lib/authz';
import { MOTIFS_SORTIE } from './motifs';
import {
  chargerPoste,
  derniersControlesSortie,
  enregistrerSortie,
  evaluerSortie,
  type ControleSortieLigne,
  type Poste,
  type VerdictSortie,
  type Voie,
} from './api';

/**
 * M10 — contrôle des sorties matière au poste.
 * La règle R1 (« rien ne sort sans autorisation approuvée ou marquage opposable »)
 * et la consommation à usage unique sont appliquées par le serveur.
 */
export function ControleSortie() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutControler = a('CONTROLER_AU_POSTE');

  const [poste, setPoste] = useState<Poste | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [mode, setMode] = useState<'EN_LIGNE' | 'HORS_LIGNE'>(navigator.onLine ? 'EN_LIGNE' : 'HORS_LIGNE');
  const [camera, setCamera] = useState(false);
  const [courant, setCourant] = useState<{ verdict: VerdictSortie; ref: string } | null>(null);
  const [controles, setControles] = useState<ControleSortieLigne[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const maj = () => setMode(navigator.onLine ? 'EN_LIGNE' : 'HORS_LIGNE');
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, []);

  const rafraichir = useCallback(async () => {
    setControles(await derniersControlesSortie());
  }, []);

  useEffect(() => {
    if (!connecte || !peutControler) return;
    let annule = false;
    (async () => {
      try {
        const p = await chargerPoste();
        if (annule) return;
        setPoste(p);
        await rafraichir();
      } catch (e) {
        if (!annule) setErreur((e as Error).message);
      }
    })();
    return () => {
      annule = true;
    };
  }, [connecte, peutControler, rafraichir]);

  async function controler(ref: string) {
    if (!poste) return;
    setErreur(null);
    setEnvoi(true);
    setCamera(false);
    try {
      const verdict = await evaluerSortie(poste.id, ref);
      setCourant({ verdict, ref });
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function agir(action: 'VALIDER' | 'REFUSER') {
    if (!poste || !courant) return;
    setEnvoi(true);
    try {
      const enregistre = await enregistrerSortie({ posteId: poste.id, ref: courant.ref, action, mode });
      setCourant(null);
      setToast(
        enregistre.resultat_enregistre === 'AUTORISE'
          ? enregistre.autorisation_consommee
            ? 'Sortie autorisée · autorisation consommée'
            : 'Sortie autorisée · mouvement enregistré'
          : 'Refus consigné · main courante',
      );
      if (tRef.current) clearTimeout(tRef.current);
      tRef.current = setTimeout(() => setToast(null), 2600);
      await rafraichir();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (authEnCours) return <Etat icone={<Loader2 className="h-6 w-6 animate-spin" />} titre="Chargement…" />;
  if (!connecte) {
    return (
      <Etat
        icone={<LogIn className="h-7 w-7" />}
        titre="Connexion requise"
        detail="Le contrôle de sortie écrit au registre : il faut un compte pour l'ouvrir."
      />
    );
  }
  if (!peutControler) {
    return (
      <Etat
        icone={<ShieldAlert className="h-7 w-7" />}
        titre="Accès au poste non autorisé"
        detail="Le pouvoir CONTROLER_AU_POSTE est requis."
      />
    );
  }
  if (!poste) {
    return erreur ? (
      <Etat icone={<ShieldAlert className="h-7 w-7" />} titre="Poste indisponible" detail={erreur} />
    ) : (
      <Etat icone={<Loader2 className="h-6 w-6 animate-spin" />} titre="Ouverture du poste…" />
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-sand-100">
      <header className="flex items-center justify-between border-b border-sand-300 bg-sand-50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">Poste — Contrôle sortie matière</p>
          <p className="truncate text-xs text-muted">
            {poste.siteLabel} · {poste.agentLabel}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
            mode === 'EN_LIGNE'
              ? 'bg-forest-50 text-forest-700 ring-forest-200'
              : 'bg-amber-50 text-amber-700 ring-amber-200'
          }`}
        >
          {mode === 'EN_LIGNE' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {mode === 'EN_LIGNE' ? 'En ligne' : 'Hors ligne'}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {camera ? (
          <div className="mt-4">
            <Scanner
              onDetect={(t) => controler(t)}
              fallback={() => <SaisieReference occupe={envoi} onValider={controler} />}
            />
            <button onClick={() => setCamera(false)} className="mx-auto mt-3 block text-xs font-semibold text-muted hover:text-ink">
              Arrêter la caméra
            </button>
          </div>
        ) : (
          <>
            <ViseurEteint detail="Autorisation de sortie ou marquage — rien ne sort sans l'un des deux (R1)" />
            <div className="mt-3 flex justify-center">
              <Button
                variant="primary"
                size="lg"
                icon={envoi ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                onClick={() => setCamera(true)}
                disabled={envoi}
                className="w-full max-w-[300px]"
              >
                Activer la caméra
              </Button>
            </div>
          </>
        )}

        {erreur && (
          <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <p className="mt-3 rounded-xl bg-sand-200 px-3 py-2 text-center text-[11px] font-medium text-muted">
          Le contrôle des sacs reste un geste physique de l'agent — l'application en enregistre la trace.
        </p>

        {controles.length > 0 && <DerniersControles controles={controles} />}
      </div>

      {courant && (
        <ResultatSortie
          v={courant.verdict}
          occupe={envoi}
          onValider={() => agir('VALIDER')}
          onRefuser={() => agir('REFUSER')}
          onFermer={() => setCourant(null)}
        />
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Check className="h-4 w-4" strokeWidth={3} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function Etat({ icone, titre, detail }: { icone: React.ReactNode; titre: string; detail?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-sand-100 px-8 text-center text-muted">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60">
        {icone}
      </span>
      <p className="text-base font-bold text-ink">{titre}</p>
      {detail && <p className="max-w-xs text-sm">{detail}</p>}
    </div>
  );
}

/* ---------- Repli sans caméra : saisie du code ou du numéro de marquage ---------- */
function SaisieReference({ occupe, onValider }: { occupe: boolean; onValider: (ref: string) => void }) {
  const [ref, setRef] = useState('');
  const pret = ref.trim().length >= 3 && !occupe;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (pret) onValider(ref.trim());
      }}
      className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 p-3"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Keyboard className="h-3.5 w-3.5" /> Saisir le code d'autorisation ou le numéro de marquage
      </p>
      <div className="flex gap-2">
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Ex. : M-00101"
          className="min-w-0 flex-1 rounded-xl border border-sand-300 bg-white px-3 py-2 font-mono text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
        />
        <Button type="submit" variant="primary" size="md" disabled={!pret} className="flex-none">
          Contrôler
        </Button>
      </div>
    </form>
  );
}

function DerniersControles({ controles }: { controles: ControleSortieLigne[] }) {
  const icon = (v: Voie) =>
    v === 'AUTORISATION' ? <FileOutput className="h-3.5 w-3.5" /> : v === 'MARQUAGE' ? <Tag className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Derniers contrôles</p>
      <ul className="space-y-1.5">
        {controles.slice(0, 4).map((m) => (
          <li key={m.id} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm shadow-card ring-1 ring-sand-300/70">
            <span className={`h-2 w-2 shrink-0 rounded-full ${m.resultat === 'AUTORISE' ? 'bg-forest-500' : 'bg-danger-500'}`} />
            <span className="text-muted">{icon(m.voie)}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-ink">{m.libelle}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">{m.heure}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultatSortie({
  v,
  occupe,
  onValider,
  onRefuser,
  onFermer,
}: {
  v: VerdictSortie;
  occupe: boolean;
  onValider: () => void;
  onRefuser: () => void;
  onFermer: () => void;
}) {
  const autorise = v.resultat === 'AUTORISE';
  const motif = v.motif ? MOTIFS_SORTIE[v.motif] : undefined;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-sand-50">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onFermer} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-500">
          <ArrowLeft className="h-4 w-4" /> Nouveau scan
        </button>
        <Badge tone="neutral">
          {v.voie === 'AUTORISATION' ? 'Autorisation' : v.voie === 'MARQUAGE' ? 'Marquage' : 'Non couvert'}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pb-4">
        <div
          className="mt-1 flex h-24 w-24 items-center justify-center rounded-3xl shadow-card-lg ring-4 ring-white"
          style={{ background: autorise ? '#EAF3EF' : '#F8E7E4' }}
        >
          {v.voie === 'AUTORISATION' ? (
            <FileOutput className={`h-11 w-11 ${autorise ? 'text-forest-500' : 'text-danger-500'}`} />
          ) : v.voie === 'MARQUAGE' ? (
            <Tag className={`h-11 w-11 ${autorise ? 'text-forest-500' : 'text-danger-500'}`} />
          ) : (
            <ShieldAlert className="h-11 w-11 text-danger-500" />
          )}
        </div>

        <p className="mt-3 font-mono text-2xl font-extrabold tracking-tight text-ink">{v.libelle}</p>
        {v.sous_titre && <p className="mt-0.5 text-center text-sm font-medium text-muted">{v.sous_titre}</p>}
        {v.lignes && v.lignes.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-center">
            {v.lignes.map((l, i) => (
              <li key={i} className="text-xs text-ink">
                {l}
              </li>
            ))}
          </ul>
        )}

        <StatusBanner
          className="mt-5 w-full"
          result={autorise ? 'AUTORISE' : 'REFUSE'}
          reason={autorise ? (v.voie === 'MARQUAGE' ? 'Matériel déclaré & marqué' : 'Autorisation valide') : motif?.libelle}
          instruction={
            autorise
              ? v.voie === 'AUTORISATION'
                ? 'Consommation à la validation · usage unique'
                : 'Sortie couverte — laisser passer'
              : motif?.consigne
          }
          icon={autorise ? <Check className="h-8 w-8" strokeWidth={3} /> : <X className="h-8 w-8" strokeWidth={3} />}
        />
      </div>

      <div className="border-t border-sand-300 bg-white px-4 py-3">
        {autorise ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" className="flex-none px-5" disabled={occupe} onClick={onRefuser}>
              Refuser
            </Button>
            <Button
              variant="primary"
              size="lg"
              block
              disabled={occupe}
              icon={occupe ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" strokeWidth={2.5} />}
              onClick={onValider}
            >
              Confirmer la sortie
            </Button>
          </div>
        ) : (
          <Button variant="danger" size="lg" block disabled={occupe} onClick={onRefuser}>
            Consigner le refus
          </Button>
        )}
      </div>
    </div>
  );
}
