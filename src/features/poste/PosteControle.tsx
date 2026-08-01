import { useMemo, useRef, useState } from 'react';
import {
  Check,
  X,
  ScanLine,
  Wifi,
  WifiOff,
  ShieldAlert,
  Camera,
  LogIn,
  LogOut,
  UserCheck,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import type { Mode, MouvementAcces, Resultat, Sens } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { evaluerAcces } from './evaluate';
import { MOTIFS } from './motifs';
import { Scanner } from '../../components/device/Scanner';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { litJeton } from '../../lib/token';
import {
  CONTEXTE,
  DEMO_SCANS,
  POSTE,
  minutesToLabel,
  resoudreScan,
  type ScanResolu,
} from '../../data/mock';
import type { Decision } from './evaluate';

interface CourantScan extends ScanResolu {
  decision: Decision;
  sens: Sens;
}

export function PosteControle() {
  const [sens, setSens] = useState<Sens>('ENTREE');
  const [mode, setMode] = useState<Mode>('EN_LIGNE');
  const [courant, setCourant] = useState<CourantScan | null>(null);
  const [mouvements, setMouvements] = useState<MouvementAcces[]>([]);
  const [forceOuvert, setForceOuvert] = useState(false);
  const [toast, setToast] = useState<{ resultat: Resultat; label: string } | null>(null);

  const seq = useRef(0);
  const horloge = useRef(CONTEXTE.maintenantMinutes);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const compteurs = useMemo(() => {
    let entrees = 47;
    let sorties = 12;
    for (const m of mouvements) {
      if (m.resultat === 'REFUSE') continue;
      if (m.sens === 'ENTREE') entrees += 1;
      else sorties += 1;
    }
    return { entrees, sorties };
  }, [mouvements]);

  function surDetection(texte: string) {
    // Un QR peut porter un jeton signé (AT1.…) ou directement un identifiant.
    const charge = litJeton(texte);
    scanner(charge ? charge.badge : texte);
  }

  function scanner(badgeId: string | null) {
    const resolu = resoudreScan(badgeId);
    const decision = evaluerAcces(
      resolu.badge,
      resolu.personne,
      resolu.entreprise,
      resolu.donneurOrdreBloque,
      sens,
      CONTEXTE,
    );
    setCourant({ ...resolu, decision, sens });
  }

  function heure() {
    horloge.current += 1;
    return minutesToLabel(horloge.current);
  }

  function enregistrer(resultat: Resultat, options?: { commentaire?: string; photoForcage?: boolean }) {
    if (!courant) return;
    seq.current += 1;
    const nom = courant.personne
      ? `${courant.personne.prenom} ${courant.personne.nom}`
      : 'Badge inconnu';
    const mouvement: MouvementAcces = {
      id: `mv-${seq.current}`,
      badgeNumero: courant.badge?.numero ?? '—',
      personneLabel: nom,
      entrepriseLabel: courant.entreprise?.raisonSociale ?? '—',
      sens: courant.sens,
      resultat,
      motif: resultat !== 'AUTORISE' ? courant.decision.motif : undefined,
      mode,
      posteLabel: POSTE.posteLabel,
      agentLabel: POSTE.agentLabel,
      horodatage: heure(),
      commentaire: options?.commentaire,
      photoForcage: options?.photoForcage,
    };
    setMouvements((prev) => [mouvement, ...prev].slice(0, 20));
    setCourant(null);
    setForceOuvert(false);
    setToast({ resultat, label: `${nom} · ${courant.sens === 'ENTREE' ? 'entrée' : 'sortie'}` });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="relative flex h-full flex-col bg-sand-100">
      <Entete
        mode={mode}
        onToggleMode={() => setMode((m) => (m === 'EN_LIGNE' ? 'HORS_LIGNE' : 'EN_LIGNE'))}
      />

      {mode === 'HORS_LIGNE' && (
        <div className="flex items-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white">
          <WifiOff className="h-3.5 w-3.5" />
          Mode hors ligne — contrôles maintenus, synchronisation différée
        </div>
      )}

      <SensSwitch sens={sens} onChange={setSens} />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <ScanZone sens={sens} onScan={scanner} onDetect={surDetection} />
        <Compteurs entrees={compteurs.entrees} sorties={compteurs.sorties} />
        <DerniersPassages mouvements={mouvements} />
      </div>

      {courant && (
        <ResultatOverlay
          courant={courant}
          onValider={() => enregistrer('AUTORISE')}
          onRefuser={() => enregistrer('REFUSE')}
          onForcer={() => setForceOuvert(true)}
          onFermer={() => setCourant(null)}
        />
      )}

      {forceOuvert && courant && (
        <ForcageSheet
          onAnnuler={() => setForceOuvert(false)}
          onConfirmer={(commentaire) =>
            enregistrer('FORCE', { commentaire, photoForcage: true })
          }
        />
      )}

      {toast && <Toast resultat={toast.resultat} label={toast.label} />}
    </div>
  );
}

/* ---------- En-tête ---------- */
function Entete({ mode, onToggleMode }: { mode: Mode; onToggleMode: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-sand-200 bg-sand-50 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink">{POSTE.posteLabel}</p>
        <p className="truncate text-xs text-muted">
          {POSTE.siteLabel} · {POSTE.agentLabel}
        </p>
      </div>
      <button
        onClick={onToggleMode}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
          mode === 'EN_LIGNE'
            ? 'bg-forest-50 text-forest-700 ring-forest-200'
            : 'bg-amber-50 text-amber-700 ring-amber-200'
        }`}
      >
        {mode === 'EN_LIGNE' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {mode === 'EN_LIGNE' ? 'En ligne' : 'Hors ligne'}
      </button>
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

/* ---------- Zone de scan : caméra réelle ou visée + simulation ---------- */
function ScanZone({ sens, onScan, onDetect }: { sens: Sens; onScan: (id: string | null) => void; onDetect: (t: string) => void }) {
  const [camera, setCamera] = useState(false);

  if (camera) {
    return (
      <div className="mt-4">
        <Scanner
          onDetect={(t) => { setCamera(false); onDetect(t); }}
          fallback={() => <SimulationStrip onScan={(id) => { setCamera(false); onScan(id); }} />}
        />
        <button onClick={() => setCamera(false)} className="mx-auto mt-3 block text-xs font-semibold text-muted hover:text-ink">
          Arrêter la caméra
        </button>
      </div>
    );
  }

  return (
    <>
      <Viseur sens={sens} />
      <div className="mt-3 flex justify-center">
        <Button variant="primary" size="lg" icon={<Camera className="h-5 w-5" />} onClick={() => setCamera(true)} className="w-full max-w-[300px]">
          Activer la caméra
        </Button>
      </div>
      <SimulationStrip onScan={onScan} />
    </>
  );
}

/* ---------- Viseur caméra ---------- */
function Viseur({ sens }: { sens: Sens }) {
  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl bg-forest-900">
        {/* trames décoratives */}
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_50%_40%,#0F5044_0%,transparent_60%)]" />
        {/* coins */}
        {['left-5 top-5 border-l-4 border-t-4', 'right-5 top-5 border-r-4 border-t-4', 'left-5 bottom-5 border-l-4 border-b-4', 'right-5 bottom-5 border-r-4 border-b-4'].map(
          (c) => (
            <span key={c} className={`absolute h-10 w-10 rounded-md border-white/80 ${c}`} />
          ),
        )}
        {/* ligne de scan animée */}
        <span className="absolute inset-x-10 top-1/2 h-0.5 animate-pulse bg-forest-200/90 shadow-[0_0_12px_2px_rgba(175,209,184,0.8)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90">
          <ScanLine className="h-9 w-9" />
          <p className="text-sm font-semibold">Cadrez le code du badge</p>
          <p className="text-xs text-white/60">
            {sens === 'ENTREE' ? 'Contrôle d’entrée' : 'Contrôle de sortie'}
          </p>
        </div>
      </div>
    </div>
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
function DerniersPassages({ mouvements }: { mouvements: MouvementAcces[] }) {
  if (mouvements.length === 0) return null;
  const tone: Record<Resultat, string> = {
    AUTORISE: 'bg-forest-500',
    REFUSE: 'bg-danger-500',
    FORCE: 'bg-amber-500',
  };
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
        Derniers passages
      </p>
      <ul className="space-y-1.5">
        {mouvements.slice(0, 4).map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm shadow-card ring-1 ring-sand-200/60"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${tone[m.resultat]}`} />
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">
              {m.personneLabel}
            </span>
            <span className="shrink-0 text-xs text-muted">
              {m.sens === 'ENTREE' ? '→ entrée' : '← sortie'}
              {m.motif ? ` · ${MOTIFS[m.motif].libelle}` : ''}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted">{m.horodatage}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Bandeau de simulation (remplace la caméra) ---------- */
function SimulationStrip({ onScan }: { onScan: (badgeId: string | null) => void }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-sand-300 bg-sand-50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Camera className="h-3.5 w-3.5" />
        Simulation — remplace le scan caméra
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DEMO_SCANS.map((d) => (
          <button
            key={d.badgeId ?? 'inconnu'}
            onClick={() => onScan(d.badgeId)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-forest-700 ring-1 ring-inset ring-sand-300 transition-colors hover:bg-forest-50 hover:ring-forest-200"
          >
            {d.attendu}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Résultat plein écran ---------- */
function ResultatOverlay({
  courant,
  onValider,
  onRefuser,
  onForcer,
  onFermer,
}: {
  courant: CourantScan;
  onValider: () => void;
  onRefuser: () => void;
  onForcer: () => void;
  onFermer: () => void;
}) {
  const { badge, personne, entreprise, decision, sens } = courant;
  const autorise = decision.resultat === 'AUTORISE';
  const motif = decision.motif ? MOTIFS[decision.motif] : undefined;
  const inconnu = !badge || !personne;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-sand-50">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onFermer}
          className="inline-flex items-center gap-1 text-sm font-semibold text-forest-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Nouveau scan
        </button>
        <Badge tone="neutral">{sens === 'ENTREE' ? 'Entrée' : 'Sortie'}</Badge>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pb-5">
        {/* Photo — support du contrôle visuel (R2) */}
        <div className="mt-1">
          {inconnu ? (
            <div className="flex h-44 w-44 items-center justify-center rounded-3xl bg-danger-50 ring-4 ring-white shadow-card-lg">
              <ShieldAlert className="h-16 w-16 text-danger-400" />
            </div>
          ) : (
            <Avatar nom={personne.nom} prenom={personne.prenom} photoUrl={personne.photoUrl} />
          )}
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">
            {inconnu ? 'Badge non reconnu' : `${personne.prenom} ${personne.nom}`}
          </h2>
          {!inconnu && (
            <p className="mt-0.5 text-base font-medium text-muted">
              {entreprise?.raisonSociale}
              {personne.fonction ? ` · ${personne.fonction}` : ''}
            </p>
          )}
          {badge && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge tone="neutral">{badge.numero}</Badge>
              <Badge tone="neutral">{badge.zoneLabel}</Badge>
              {badge.type === 'VISITEUR' && badge.accompagnateur && (
                <Badge tone="amber" dot>
                  Accompagné · {badge.accompagnateur}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Bandeau de décision */}
        <StatusBanner
          className="mt-5 w-full"
          result={autorise ? 'AUTORISE' : 'REFUSE'}
          reason={autorise ? undefined : motif?.libelle}
          instruction={autorise ? 'Contrôle visuel de la photo — laisser passer' : motif?.consigne}
          icon={
            autorise ? (
              <Check className="h-8 w-8" strokeWidth={3} />
            ) : (
              <X className="h-8 w-8" strokeWidth={3} />
            )
          }
        />

        {autorise && decision.alerte && (
          <div className="mt-3 flex w-full items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span><b>{MOTIFS[decision.alerte].libelle}.</b> {MOTIFS[decision.alerte].consigne}</span>
          </div>
        )}
      </div>

      {/* Actions — un geste (R3) */}
      <div className="border-t border-sand-200 bg-white px-4 py-3">
        {autorise ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" onClick={onRefuser} className="flex-none px-5">
              Refuser
            </Button>
            <Button
              variant="primary"
              size="lg"
              block
              icon={<UserCheck className="h-5 w-5" strokeWidth={2.5} />}
              onClick={onValider}
            >
              Confirmer le passage
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={onForcer}
              className="flex-none border-amber-200 px-5 text-amber-700 hover:bg-amber-50"
              icon={<ShieldAlert className="h-5 w-5" />}
            >
              Forcer
            </Button>
            <Button variant="danger" size="lg" block onClick={onRefuser}>
              Consigner le refus
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Forçage : motif + photo obligatoires ---------- */
function ForcageSheet({
  onAnnuler,
  onConfirmer,
}: {
  onAnnuler: () => void;
  onConfirmer: (commentaire: string) => void;
}) {
  const [motif, setMotif] = useState('');
  const [photoPrise, setPhotoPrise] = useState(false);
  const pret = motif.trim().length >= 5 && photoPrise;

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-forest-900/50">
      <div className="rounded-t-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-extrabold text-ink">Forçage d’accès</h3>
        </div>
        <p className="mb-4 text-sm text-muted">
          Le forçage n’est jamais silencieux : motif et photo obligatoires, alerte immédiate au chef
          de poste.
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
          <Button
            variant="accent"
            size="lg"
            block
            disabled={!pret}
            onClick={() => onConfirmer(motif.trim())}
          >
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
    FORCE: { bg: 'bg-amber-600', texte: 'Forçage enregistré · alerte envoyée' },
  };
  const c = cfg[resultat];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className={`flex items-center gap-2 rounded-full ${c.bg} px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg`}>
        <Check className="h-4 w-4" strokeWidth={3} />
        {c.texte} · {label}
      </div>
    </div>
  );
}
