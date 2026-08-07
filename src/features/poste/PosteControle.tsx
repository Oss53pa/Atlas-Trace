import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  X,
  Wifi,
  WifiOff,
  ShieldAlert,
  Camera,
  LogIn,
  LogOut,
  UserCheck,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Keyboard,
  ChevronDown,
} from 'lucide-react';
import type { Mode, Resultat, Sens } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { MOTIFS } from './motifs';
import { Scanner } from '../../components/device/Scanner';
import { ViseurEteint } from '../../components/device/ViseurEteint';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { PorteSelecteur } from './PorteSelecteur';
import { litJeton } from '../../lib/token';
import { useAuthz } from '../../lib/authz';
import { televerserPhoto } from '../../lib/stockage';
import {
  chargerPhotoSacEntree,
  chargerPoste,
  compteursDuJour,
  derniersPassages,
  enregistrerAcces,
  evaluerAcces,
  type Passage,
  type Poste,
  type Verdict,
} from './api';

export function PosteControle() {
  const { connecte, chargement: authEnCours, a, portees } = useAuthz();
  const peutControler = a('CONTROLER_AU_POSTE');
  const peutForcer = a('FORCER_ACCES');
  const orgId = portees[0]?.organisationId ?? '';
  // Photo du sac / des effets : prise au contrôle, comparée entrée ↔ sortie.
  const [sac, setSac] = useState<{ path: string | null; pris: boolean; telev: boolean; entree: string | null }>(
    { path: null, pris: false, telev: false, entree: null },
  );

  const [poste, setPoste] = useState<Poste | null>(null);
  const [portesOuvert, setPortesOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sens, setSens] = useState<Sens>('ENTREE');
  const [mode, setMode] = useState<Mode>(navigator.onLine ? 'EN_LIGNE' : 'HORS_LIGNE');
  const [courant, setCourant] = useState<{ verdict: Verdict; badgeRef: string } | null>(null);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [compteurs, setCompteurs] = useState({ entrees: 0, sorties: 0 });
  const [forceOuvert, setForceOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState<{ resultat: Resultat; label: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le mode reflète l'état réel du réseau, il ne se décrète pas.
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
    const [p, c] = await Promise.all([derniersPassages(), compteursDuJour()]);
    setPassages(p);
    setCompteurs(c);
  }, []);

  // Changement de porte : recharge le poste courant (mémorisé sur l'appareil).
  const changerPorte = useCallback(async (id: string) => {
    try {
      setPoste(await chargerPoste(id));
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    }
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

  /** Un QR peut porter un jeton signé (AT1.…) ou directement le numéro de badge. */
  async function surDetection(texte: string) {
    const charge = litJeton(texte);
    await controler(charge ? charge.badge : texte);
  }

  async function controler(badgeRef: string) {
    if (!poste) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const verdict = await evaluerAcces(poste.id, badgeRef, sens);
      setCourant({ verdict, badgeRef });
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  // À chaque nouveau contrôle : on repart d'une photo vierge ; à la sortie, on
  // récupère la photo du sac prise à l'entrée pour la comparer.
  useEffect(() => {
    setSac({ path: null, pris: false, telev: false, entree: null });
    const v = courant?.verdict;
    if (v && v.sens === 'SORTIE' && v.personne_id) {
      chargerPhotoSacEntree(v.personne_id).then((url) => setSac((s) => ({ ...s, entree: url }))).catch(() => {});
    }
  }, [courant]);

  async function capturerSac(dataUrl: string) {
    setSac((s) => ({ ...s, pris: true, telev: !!orgId }));
    if (!orgId) return;
    try {
      const chemin = await televerserPhoto(dataUrl, orgId, 'sacs');
      setSac((s) => ({ ...s, path: chemin, telev: false }));
    } catch {
      setSac((s) => ({ ...s, telev: false }));
    }
  }

  async function agir(action: 'VALIDER' | 'REFUSER' | 'FORCER', commentaire?: string, photo?: boolean) {
    if (!poste || !courant) return;
    setEnvoi(true);
    try {
      const enregistre = await enregistrerAcces({
        posteId: poste.id,
        badgeRef: courant.badgeRef,
        sens: courant.verdict.sens,
        action,
        commentaire,
        mode,
        photoForcage: photo,
        photoUrl: sac.path,
      });
      setCourant(null);
      setForceOuvert(false);
      setToast({
        resultat: enregistre.resultat_enregistre,
        label: `${enregistre.personne_label} · ${enregistre.sens === 'ENTREE' ? 'entrée' : 'sortie'}`,
      });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2400);
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
        detail="Le poste écrit dans le registre des passages : il faut un compte pour l'ouvrir."
      />
    );
  }
  if (!peutControler) {
    return (
      <Etat
        icone={<ShieldAlert className="h-7 w-7" />}
        titre="Accès au poste non autorisé"
        detail="Le pouvoir CONTROLER_AU_POSTE est requis. Voir la direction du site pour l'affectation."
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
      <Entete poste={poste} mode={mode} onChangerPorte={() => setPortesOuvert(true)} />
      {portesOuvert && (
        <PorteSelecteur posteActifId={poste.id} onChoisir={changerPorte} onClose={() => setPortesOuvert(false)} />
      )}

      {mode === 'HORS_LIGNE' && (
        <div className="flex items-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-ink">
          <WifiOff className="h-3.5 w-3.5" />
          Hors ligne — le contrôle serveur est indisponible
        </div>
      )}

      <SensSwitch sens={sens} onChange={setSens} />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <ScanZone sens={sens} occupe={envoi} onControler={controler} onDetect={surDetection} />
        {erreur && (
          <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}
        <Compteurs entrees={compteurs.entrees} sorties={compteurs.sorties} />
        <DerniersPassages passages={passages} />
      </div>

      {courant && (
        <ResultatOverlay
          verdict={courant.verdict}
          occupe={envoi}
          peutForcer={peutForcer}
          sacEntree={sac.entree}
          sacPris={sac.pris}
          sacTelev={sac.telev}
          onSacCapture={capturerSac}
          onValider={() => agir('VALIDER')}
          onRefuser={() => agir('REFUSER')}
          onForcer={() => setForceOuvert(true)}
          onFermer={() => setCourant(null)}
        />
      )}

      {forceOuvert && courant && (
        <ForcageSheet
          occupe={envoi}
          onAnnuler={() => setForceOuvert(false)}
          onConfirmer={(commentaire) => agir('FORCER', commentaire, true)}
        />
      )}

      {toast && <Toast resultat={toast.resultat} label={toast.label} />}
    </div>
  );
}

/* ---------- États pleine page (connexion, pouvoir, chargement) ---------- */
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

/* ---------- En-tête ---------- */
function Entete({ poste, mode, onChangerPorte }: { poste: Poste; mode: Mode; onChangerPorte: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-sand-200 bg-sand-50 px-4 py-3">
      <button onClick={onChangerPorte} className="group flex min-w-0 items-center gap-2 rounded-lg text-left transition-colors" title="Changer de porte">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-ink">{poste.libelle}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-forest-600" />
          </span>
          <span className="block truncate text-xs text-muted">
            {poste.siteLabel} · {poste.agentLabel}
          </span>
        </span>
      </button>
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
  );
}

/* ---------- Sélecteur de sens ---------- */
function SensSwitch({ sens, onChange }: { sens: Sens; onChange: (s: Sens) => void }) {
  const opt = (value: Sens, label: string, icon: React.ReactNode) => {
    const actif = sens === value;
    return (
      <button
        onClick={() => onChange(value)}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${
          actif ? 'bg-forest-500 text-white shadow-card' : 'text-muted'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };
  return (
    <div className="mx-4 mt-3 flex gap-1 rounded-2xl bg-sand-200 p-1">
      {opt('ENTREE', 'Entrée', <LogIn className="h-4 w-4" />)}
      {opt('SORTIE', 'Sortie', <LogOut className="h-4 w-4" />)}
    </div>
  );
}

/* ---------- Zone de scan : caméra réelle, ou saisie du numéro si elle manque ---------- */
function ScanZone({
  sens,
  occupe,
  onControler,
  onDetect,
}: {
  sens: Sens;
  occupe: boolean;
  onControler: (badgeRef: string) => void;
  onDetect: (texte: string) => void;
}) {
  const [camera, setCamera] = useState(false);

  if (camera) {
    return (
      <div className="mt-4">
        <Scanner
          onDetect={(t) => {
            setCamera(false);
            onDetect(t);
          }}
          fallback={() => <SaisieBadge occupe={occupe} onValider={(n) => { setCamera(false); onControler(n); }} />}
        />
        <button onClick={() => setCamera(false)} className="mx-auto mt-3 block text-xs font-semibold text-muted hover:text-ink">
          Arrêter la caméra
        </button>
      </div>
    );
  }

  return (
    <>
      <ViseurEteint detail={sens === 'ENTREE' ? 'Contrôle d’entrée' : 'Contrôle de sortie'} />
      <div className="mt-3 flex justify-center">
        <Button
          variant="primary"
          size="lg"
          icon={occupe ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          onClick={() => setCamera(true)}
          disabled={occupe}
          className="w-full max-w-[300px]"
        >
          Activer la caméra
        </Button>
      </div>
    </>
  );
}

/* ---------- Repli sans caméra : l'agent saisit le numéro inscrit sur le badge ---------- */
function SaisieBadge({ occupe, onValider }: { occupe: boolean; onValider: (numero: string) => void }) {
  const [numero, setNumero] = useState('');
  const pret = numero.trim().length >= 3 && !occupe;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (pret) onValider(numero.trim());
      }}
      className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 p-3"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Keyboard className="h-3.5 w-3.5" /> Saisir le numéro inscrit sur le badge
      </p>
      <div className="flex gap-2">
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Ex. : NOM-00142"
          autoCapitalize="characters"
          className="min-w-0 flex-1 rounded-xl border border-sand-300 bg-white px-3 py-2 font-mono text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
        />
        <Button type="submit" variant="primary" size="md" disabled={!pret} className="flex-none">
          Contrôler
        </Button>
      </div>
    </form>
  );
}

/* ---------- Compteurs du jour ---------- */
function Compteurs({ entrees, sorties }: { entrees: number; sorties: number }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-white p-3 text-center shadow-card ring-1 ring-sand-200/60">
        <p className="text-2xl font-extrabold text-forest-700">{entrees}</p>
        <p className="text-xs font-medium text-muted">Entrées aujourd’hui</p>
      </div>
      <div className="rounded-2xl bg-white p-3 text-center shadow-card ring-1 ring-sand-200/60">
        <p className="text-2xl font-extrabold text-amber-600">{sorties}</p>
        <p className="text-xs font-medium text-muted">Sorties aujourd’hui</p>
      </div>
    </div>
  );
}

/* ---------- Derniers passages ---------- */
function DerniersPassages({ passages }: { passages: Passage[] }) {
  if (passages.length === 0) return null;
  const tone: Record<Resultat, string> = {
    AUTORISE: 'bg-forest-500',
    REFUSE: 'bg-danger-500',
    FORCE: 'bg-amber-500',
  };
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Derniers passages</p>
      <ul className="space-y-1.5">
        {passages.slice(0, 4).map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm shadow-card ring-1 ring-sand-200/60"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${tone[m.resultat]}`} />
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{m.personneLabel}</span>
            <span className="shrink-0 text-xs text-muted">
              {m.sens === 'ENTREE' ? '→ entrée' : '← sortie'}
              {m.motif && MOTIFS[m.motif] ? ` · ${MOTIFS[m.motif].libelle}` : ''}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted">{m.horodatage}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Résultat plein écran ---------- */
function ResultatOverlay({
  verdict,
  occupe,
  peutForcer,
  sacEntree,
  sacPris,
  sacTelev,
  onSacCapture,
  onValider,
  onRefuser,
  onForcer,
  onFermer,
}: {
  verdict: Verdict;
  occupe: boolean;
  peutForcer: boolean;
  sacEntree: string | null;
  sacPris: boolean;
  sacTelev: boolean;
  onSacCapture: (dataUrl: string) => void;
  onValider: () => void;
  onRefuser: () => void;
  onForcer: () => void;
  onFermer: () => void;
}) {
  const autorise = verdict.resultat === 'AUTORISE';
  const motif = verdict.motif ? MOTIFS[verdict.motif] : undefined;
  const inconnu = !verdict.personne_id;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-sand-50">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onFermer} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-500">
          <ArrowLeft className="h-4 w-4" />
          Nouveau scan
        </button>
        <Badge tone="neutral">{verdict.sens === 'ENTREE' ? 'Entrée' : 'Sortie'}</Badge>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pb-5">
        {/* Photo — support du contrôle visuel (R2) */}
        <div className="mt-1">
          {inconnu ? (
            <div className="flex h-44 w-44 items-center justify-center rounded-3xl bg-danger-50 shadow-card-lg ring-4 ring-white">
              <ShieldAlert className="h-16 w-16 text-danger-400" />
            </div>
          ) : (
            <Avatar
              nom={verdict.personne_nom ?? ''}
              prenom={verdict.personne_prenom ?? ''}
              photoUrl={verdict.photo_url ?? undefined}
            />
          )}
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">
            {inconnu ? 'Badge non reconnu' : verdict.personne_label}
          </h2>
          {!inconnu && (
            <p className="mt-0.5 text-base font-medium text-muted">
              {verdict.entreprise_label}
              {verdict.fonction ? ` · ${verdict.fonction}` : ''}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="neutral">{verdict.badge_numero}</Badge>
            {verdict.zone_label && <Badge tone="neutral">{verdict.zone_label}</Badge>}
            {verdict.badge_type === 'VISITEUR' && verdict.accompagnateur && (
              <Badge tone="amber" dot>
                Accompagné · {verdict.accompagnateur}
              </Badge>
            )}
          </div>
        </div>

        {/* Bandeau de décision — rendu par le serveur */}
        <StatusBanner
          className="mt-5 w-full"
          result={autorise ? 'AUTORISE' : 'REFUSE'}
          reason={autorise ? undefined : motif?.libelle}
          instruction={autorise ? 'Contrôle visuel de la photo — laisser passer' : motif?.consigne}
          icon={autorise ? <Check className="h-8 w-8" strokeWidth={3} /> : <X className="h-8 w-8" strokeWidth={3} />}
        />

        {autorise && verdict.alerte && MOTIFS[verdict.alerte] && (
          <div className="mt-3 flex w-full items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <b>{MOTIFS[verdict.alerte].libelle}.</b> {MOTIFS[verdict.alerte].consigne}
            </span>
          </div>
        )}
        {/* Sac / effets : photo à l'entrée, comparée à la sortie */}
        {!inconnu && (
          <div className="mt-4 w-full rounded-2xl bg-white p-3 shadow-card ring-1 ring-sand-200">
            <p className="mb-2 text-xs font-semibold text-muted">
              {verdict.sens === 'SORTIE'
                ? 'Sac / effets — comparez avec la photo prise à l’entrée'
                : 'Photographier le sac / les effets — conservé pour comparaison à la sortie'}
            </p>
            {verdict.sens === 'SORTIE' && (
              sacEntree
                ? <img src={sacEntree} alt="Sac à l’entrée" className="mb-2 max-h-40 w-full rounded-lg object-contain ring-1 ring-sand-200" />
                : <p className="mb-2 text-[11px] text-muted">Aucune photo de sac à l’entrée pour cette personne.</p>
            )}
            <PhotoCapture
              label={sacTelev ? 'Enregistrement…' : sacPris ? 'Reprendre la photo' : (verdict.sens === 'SORTIE' ? 'Photographier à la sortie' : 'Photographier le sac')}
              onCapture={onSacCapture}
            />
          </div>
        )}
      </div>

      {/* Actions — un geste (R3) */}
      <div className="border-t border-sand-200 bg-white px-4 py-3">
        {autorise ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" onClick={onRefuser} disabled={occupe} className="flex-none px-5">
              Refuser
            </Button>
            <Button
              variant="primary"
              size="lg"
              block
              disabled={occupe}
              icon={occupe ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserCheck className="h-5 w-5" strokeWidth={2.5} />}
              onClick={onValider}
            >
              Confirmer le passage
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {peutForcer && (
              <Button
                variant="outline"
                size="lg"
                onClick={onForcer}
                disabled={occupe}
                className="flex-none border-amber-200 px-5 text-amber-700 hover:bg-amber-50"
                icon={<ShieldAlert className="h-5 w-5" />}
              >
                Forcer
              </Button>
            )}
            <Button variant="danger" size="lg" block disabled={occupe} onClick={onRefuser}>
              Consigner le refus
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Forçage : motif + photo obligatoires (le serveur exige le motif) ---------- */
function ForcageSheet({
  occupe,
  onAnnuler,
  onConfirmer,
}: {
  occupe: boolean;
  onAnnuler: () => void;
  onConfirmer: (commentaire: string) => void;
}) {
  const [motif, setMotif] = useState('');
  const [photoPrise, setPhotoPrise] = useState(false);
  const pret = motif.trim().length >= 5 && photoPrise && !occupe;

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-forest-900/50">
      <div className="rounded-t-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-extrabold text-ink">Forçage d’accès</h3>
        </div>
        <p className="mb-4 text-sm text-muted">
          Le forçage n’est jamais silencieux : motif et photo obligatoires, passage tracé au registre
          et à l’audit.
        </p>

        <label className="mb-1.5 block text-sm font-semibold text-forest-700">Motif du forçage</label>
        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          placeholder="Ex. : autorisation verbale du chef de poste, badge en cours de renouvellement…"
          className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
        />

        <div className="mt-3">
          <PhotoCapture label="Photographier la situation" onCapture={() => setPhotoPrise(true)} />
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" onClick={onAnnuler} className="flex-none px-5">
            Annuler
          </Button>
          <Button variant="accent" size="lg" block disabled={!pret} onClick={() => onConfirmer(motif.trim())}>
            Confirmer le forçage
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Toast de confirmation ---------- */
function Toast({ resultat, label }: { resultat: Resultat; label: string }) {
  const cfg: Record<Resultat, { bg: string; texte: string }> = {
    AUTORISE: { bg: 'bg-forest-600', texte: 'Passage enregistré' },
    REFUSE: { bg: 'bg-danger-600', texte: 'Refus consigné' },
    FORCE: { bg: 'bg-amber-600', texte: 'Forçage enregistré · tracé à l’audit' },
  };
  const c = cfg[resultat];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className={`flex items-center gap-2 rounded-full ${c.bg} px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg`}>
        <Check className="h-4 w-4" strokeWidth={3} />
        <span>{c.texte}</span>
        <span className="opacity-80">· {label}</span>
      </div>
    </div>
  );
}
