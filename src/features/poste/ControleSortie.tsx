import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  X,
  FileOutput,
  Boxes,
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
  sortirDotation,
  type ControleSortieLigne,
  type Poste,
  type VerdictDotation,
  type VerdictSortie,
  type Voie,
} from './api';
import {
  chargerDotations,
  chargerEntreprises,
  chargerFamilles,
  type Dotation,
  type EntrepriseOption,
  type Famille,
} from '../materiel/api';

/**
 * M10 — contrôle des sorties matière au poste. Deux voies, un seul écran (R1) :
 *   1. Dotation — l'agent choisit l'entité et la famille, le serveur décrémente.
 *   2. Autorisation — scan du code, consommation à usage unique.
 * Aucune apposition physique sur le matériel. Les règles et l'écriture vivent sur le serveur.
 */
export function ControleSortie() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutControler = a('CONTROLER_AU_POSTE');

  const [poste, setPoste] = useState<Poste | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [mode, setMode] = useState<'EN_LIGNE' | 'HORS_LIGNE'>(navigator.onLine ? 'EN_LIGNE' : 'HORS_LIGNE');
  const [ongletDotation, setOngletDotation] = useState(false);
  const [camera, setCamera] = useState(false);
  const [courant, setCourant] = useState<{ verdict: VerdictSortie; ref: string } | null>(null);
  const [controles, setControles] = useState<ControleSortieLigne[]>([]);
  const [entreprises, setEntreprises] = useState<EntrepriseOption[]>([]);
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [dotations, setDotations] = useState<Dotation[]>([]);
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
    const [c, d] = await Promise.all([derniersControlesSortie(), chargerDotations()]);
    setControles(c);
    setDotations(d);
  }, []);

  useEffect(() => {
    if (!connecte || !peutControler) return;
    let annule = false;
    (async () => {
      try {
        const [p, e, f] = await Promise.all([chargerPoste(), chargerEntreprises(), chargerFamilles()]);
        if (annule) return;
        setPoste(p);
        setEntreprises(e);
        setFamilles(f);
        await rafraichir();
      } catch (e) {
        if (!annule) setErreur((e as Error).message);
      }
    })();
    return () => {
      annule = true;
    };
  }, [connecte, peutControler, rafraichir]);

  function annonce(m: string) {
    setToast(m);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), 2800);
  }

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
      annonce(
        enregistre.resultat_enregistre === 'AUTORISE'
          ? enregistre.autorisation_consommee
            ? 'Sortie autorisée · autorisation consommée'
            : 'Sortie autorisée · mouvement enregistré'
          : 'Refus consigné · main courante',
      );
      await rafraichir();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function sortie(entrepriseId: string, familleId: string, quantite: number, action: 'VALIDER' | 'REFUSER'): Promise<VerdictDotation | null> {
    if (!poste) return null;
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await sortirDotation({ posteId: poste.id, entrepriseId, familleId, quantite, action, mode });
      annonce(
        r.resultat_enregistre === 'AUTORISE'
          ? `Sortie autorisée · dotation restante ${r.reste ?? '—'}`
          : `Refus consigné${r.motif === 'DOTATION_INSUFFISANTE' ? ' · dotation insuffisante' : ''}`,
      );
      await rafraichir();
      return r;
    } catch (e) {
      setErreur((e as Error).message);
      return null;
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

      {/* Sélecteur de voie */}
      <div className="flex gap-1 border-b border-sand-300 bg-sand-50 px-4 pb-3">
        <VoieTab actif={!ongletDotation} label="Dotation" icon={<Boxes className="h-4 w-4" />} onClick={() => { setOngletDotation(false); }} />
        <VoieTab actif={ongletDotation} label="Autorisation (scan)" icon={<FileOutput className="h-4 w-4" />} onClick={() => { setOngletDotation(true); setCamera(false); }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!ongletDotation ? (
          <DotationSortie
            entreprises={entreprises}
            familles={familles}
            dotations={dotations}
            occupe={envoi}
            onSortie={sortie}
          />
        ) : camera ? (
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
            <ViseurEteint detail="Scanner le code d'une autorisation de sortie approuvée (R1)" />
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

function VoieTab({ actif, label, icon, onClick }: { actif: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        actif ? 'bg-forest-500 text-white shadow-card' : 'bg-white text-muted ring-1 ring-sand-300'
      }`}
    >
      {icon} {label}
    </button>
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

/* ---------- Voie 1 : sortie par dotation (sélection entité + famille) ---------- */
function DotationSortie({
  entreprises,
  familles,
  dotations,
  occupe,
  onSortie,
}: {
  entreprises: EntrepriseOption[];
  familles: Famille[];
  dotations: Dotation[];
  occupe: boolean;
  onSortie: (entrepriseId: string, familleId: string, quantite: number, action: 'VALIDER' | 'REFUSER') => Promise<VerdictDotation | null>;
}) {
  const [entrepriseId, setEntrepriseId] = useState('');
  const [familleId, setFamilleId] = useState('');
  const [quantite, setQuantite] = useState('1');

  useEffect(() => {
    if (!entrepriseId && entreprises.length > 0) setEntrepriseId(entreprises[0].id);
  }, [entreprises, entrepriseId]);
  useEffect(() => {
    if (!familleId && familles.length > 0) setFamilleId(familles[0].id);
  }, [familles, familleId]);

  const present = dotations.find((d) => d.entrepriseId === entrepriseId && d.familleId === familleId)?.quantitePresente ?? 0;
  const q = Number(quantite);
  const couvert = q > 0 && q <= present;
  const pret = !!entrepriseId && !!familleId && q > 0 && !occupe;

  async function valider(action: 'VALIDER' | 'REFUSER') {
    const r = await onSortie(entrepriseId, familleId, q, action);
    if (r && r.resultat_enregistre === 'AUTORISE') setQuantite('1');
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">Entité</span>
        <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}
          className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
          {entreprises.length === 0 && <option value="">Aucune entreprise</option>}
          {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
        </select>
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold text-muted">Famille</span>
        <select value={familleId} onChange={(e) => setFamilleId(e.target.value)}
          className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
          {familles.length === 0 && <option value="">Aucune famille</option>}
          {familles.map((f) => <option key={f.id} value={f.id}>{f.libelle}</option>)}
        </select>
      </label>

      <div className="mt-3 flex items-end gap-3">
        <div className={`flex-1 rounded-xl px-3 py-2.5 text-center ring-1 ${present > 0 ? 'bg-forest-50 ring-forest-100' : 'bg-sand-100 ring-sand-200'}`}>
          <p className="text-[11px] text-muted">Présent en dotation</p>
          <p className={`tnum text-2xl font-extrabold ${present > 0 ? 'text-forest-700' : 'text-muted'}`}>{present}</p>
        </div>
        <label className="w-28">
          <span className="mb-1 block text-xs font-semibold text-muted">Quantité</span>
          <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)}
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-lg font-bold text-ink outline-none focus:border-forest-400" />
        </label>
      </div>

      {!couvert && q > 0 && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
          <ShieldAlert className="h-3.5 w-3.5" /> Dotation insuffisante — le serveur refusera (ou passer par une autorisation de sortie).
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="ghost" size="lg" className="flex-none px-5" disabled={occupe} onClick={() => valider('REFUSER')}>
          Refuser
        </Button>
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!pret}
          icon={occupe ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" strokeWidth={2.5} />}
          onClick={() => valider('VALIDER')}
        >
          Confirmer la sortie
        </Button>
      </div>
    </div>
  );
}

/* ---------- Repli sans caméra : saisie du code d'autorisation ---------- */
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
        <Keyboard className="h-3.5 w-3.5" /> Saisir le code d'autorisation
      </p>
      <div className="flex gap-2">
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Ex. : AS-2026-00042"
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
    v === 'AUTORISATION' ? <FileOutput className="h-3.5 w-3.5" /> : v === 'DOTATION' ? <Boxes className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Derniers contrôles</p>
      <ul className="space-y-1.5">
        {controles.slice(0, 4).map((m) => (
          <li key={m.id} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm shadow-card ring-1 ring-sand-300/70">
            <span className={`h-2 w-2 shrink-0 rounded-full ${m.resultat === 'AUTORISE' ? 'bg-forest-500' : 'bg-danger-500'}`} />
            <span className="text-muted">{icon(m.voie)}</span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{m.libelle}</span>
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
        <Badge tone="neutral">{v.voie === 'AUTORISATION' ? 'Autorisation' : 'Non couvert'}</Badge>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pb-4">
        <div
          className="mt-1 flex h-24 w-24 items-center justify-center rounded-3xl shadow-card-lg ring-4 ring-white"
          style={{ background: autorise ? '#EAF3EF' : '#F8E7E4' }}
        >
          {v.voie === 'AUTORISATION' ? (
            <FileOutput className={`h-11 w-11 ${autorise ? 'text-forest-500' : 'text-danger-500'}`} />
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
          reason={autorise ? 'Autorisation valide' : motif?.libelle}
          instruction={autorise ? 'Consommation à la validation · usage unique' : motif?.consigne}
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
