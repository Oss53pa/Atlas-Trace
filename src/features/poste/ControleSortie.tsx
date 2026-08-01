import { useRef, useState } from 'react';
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
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { Scanner } from '../../components/device/Scanner';
import { ViseurEteint } from '../../components/device/ViseurEteint';
import {
  AUTOS_POSTE,
  DEMO_SCANS_SORTIE,
  MARQUAGES_POSTE,
  type DemoScanSortie,
} from '../../data/sortiesPoste';

type Voie = 'AUTORISATION' | 'MARQUAGE' | 'AUCUNE';
interface Decision {
  resultat: 'AUTORISE' | 'REFUSE';
  voie: Voie;
  titre: string;
  sousTitre?: string;
  lignes?: string[];
  motif?: string;
  consigne?: string;
  code?: string;
}

interface Mouvement {
  id: string;
  label: string;
  resultat: 'AUTORISE' | 'REFUSE';
  voie: Voie;
  heure: string;
}

function evaluer(scan: DemoScanSortie, consommees: Set<string>): Decision {
  if (scan.kind === 'AUTO') {
    const a = AUTOS_POSTE.find((x) => x.code === scan.ref);
    if (!a) return refusR1();
    if (consommees.has(a.code))
      return { resultat: 'REFUSE', voie: 'AUTORISATION', titre: a.numero, motif: 'Autorisation déjà consommée', consigne: 'Usage unique — sortie refusée.' };
    if (a.expiree)
      return { resultat: 'REFUSE', voie: 'AUTORISATION', titre: a.numero, motif: 'Autorisation expirée', consigne: `Hors validité (${a.validiteFin}) — refuser.` };
    return {
      resultat: 'AUTORISE', voie: 'AUTORISATION', titre: a.numero,
      sousTitre: `${a.entreprise} · ${a.type} → ${a.destination}`,
      lignes: a.lignes, code: a.code,
    };
  }
  if (scan.kind === 'MARQ') {
    const m = MARQUAGES_POSTE.find((x) => x.numero === scan.ref);
    if (!m) return refusR1();
    if (!m.opposable)
      return { resultat: 'REFUSE', voie: 'MARQUAGE', titre: m.numero, motif: 'Marquage non opposable', consigne: 'Déclaration non visée — refuser.' };
    return {
      resultat: 'AUTORISE', voie: 'MARQUAGE', titre: m.numero,
      sousTitre: `${m.designation}${m.marque && m.marque !== '—' ? ` · ${m.marque} ${m.modele}` : ''}`,
      lignes: [`${m.entreprise} · matériel déclaré à l'entrée`],
    };
  }
  return refusR1();
}

/** Texte d'un QR réel → autorisation de sortie, marquage, ou rien (R1). */
function resoudreTexte(texte: string): DemoScanSortie {
  const t = texte.trim();
  if (AUTOS_POSTE.some((a) => a.code === t)) return { label: t, kind: 'AUTO', ref: t };
  if (MARQUAGES_POSTE.some((m) => m.numero === t)) return { label: t, kind: 'MARQ', ref: t };
  return { label: t, kind: 'INCONNU', ref: null };
}

function refusR1(): Decision {
  return {
    resultat: 'REFUSE', voie: 'AUCUNE', titre: 'Non couvert',
    motif: 'Règle de sortie unique (R1)',
    consigne: 'Retenir le matériel · photo · alerte chef de poste · main courante.',
  };
}

/** Repli quand la caméra est refusée/indisponible : jeux d'essai du poste sortie. */
function SimulationSortie({ onScan }: { onScan: (d: DemoScanSortie) => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Camera className="h-3.5 w-3.5" /> Jeux d'essai — sans caméra
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DEMO_SCANS_SORTIE.map((d) => (
          <button
            key={d.label}
            onClick={() => onScan(d)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-inset ring-sand-300 transition-colors hover:bg-forest-50 hover:ring-forest-200"
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ControleSortie() {
  const [camera, setCamera] = useState(false);
  const [courant, setCourant] = useState<Decision | null>(null);
  const [consommees, setConsommees] = useState<Set<string>>(new Set());
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [mode, setMode] = useState<'EN_LIGNE' | 'HORS_LIGNE'>('EN_LIGNE');
  const [toast, setToast] = useState<string | null>(null);
  const seq = useRef(0);
  const horloge = useRef(8 * 60 + 20);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function heure() {
    horloge.current += 1;
    return `${String(Math.floor(horloge.current / 60)).padStart(2, '0')}:${String(horloge.current % 60).padStart(2, '0')}`;
  }

  function scanner(scan: DemoScanSortie) {
    setCourant(evaluer(scan, consommees));
  }

  function enregistrer(resultat: 'AUTORISE' | 'REFUSE') {
    if (!courant) return;
    seq.current += 1;
    if (resultat === 'AUTORISE' && courant.voie === 'AUTORISATION' && courant.code) {
      setConsommees((s) => new Set(s).add(courant.code!));
    }
    setMouvements((prev) =>
      [{ id: `s-${seq.current}`, label: courant.titre, resultat, voie: courant.voie, heure: heure() }, ...prev].slice(0, 8),
    );
    setToast(
      resultat === 'AUTORISE'
        ? courant.voie === 'AUTORISATION'
          ? 'Sortie autorisée · autorisation consommée'
          : 'Sortie autorisée · mouvement enregistré'
        : 'Refus consigné · main courante',
    );
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), 2400);
    setCourant(null);
  }

  return (
    <div className="relative flex h-full flex-col bg-sand-100">
      {/* En-tête */}
      <header className="flex items-center justify-between border-b border-sand-300 bg-sand-50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">Poste — Contrôle sortie matière</p>
          <p className="truncate text-xs text-muted">Cosmos Angré · Agent M. Koné</p>
        </div>
        <button
          onClick={() => setMode((m) => (m === 'EN_LIGNE' ? 'HORS_LIGNE' : 'EN_LIGNE'))}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
            mode === 'EN_LIGNE' ? 'bg-forest-50 text-forest-700 ring-forest-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
          }`}
        >
          {mode === 'EN_LIGNE' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {mode === 'EN_LIGNE' ? 'En ligne' : 'Hors ligne'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {camera ? (
          <div className="mt-4">
            <Scanner
              onDetect={(t) => { setCamera(false); scanner(resoudreTexte(t)); }}
              fallback={() => <SimulationSortie onScan={(d) => { setCamera(false); scanner(d); }} />}
            />
            <button onClick={() => setCamera(false)} className="mx-auto mt-3 block text-xs font-semibold text-muted hover:text-ink">
              Arrêter la caméra
            </button>
          </div>
        ) : (
          <>
            <ViseurEteint detail="Autorisation de sortie ou marquage — rien ne sort sans l'un des deux (R1)" />
            <div className="mt-3 flex justify-center">
              <Button variant="primary" size="lg" icon={<Camera className="h-5 w-5" />} onClick={() => setCamera(true)} className="w-full max-w-[300px]">
                Activer la caméra
              </Button>
            </div>
          </>
        )}

        <p className="mt-3 rounded-xl bg-sand-200 px-3 py-2 text-center text-[11px] font-medium text-muted">
          Le contrôle des sacs reste un geste physique de l'agent — l'application en enregistre la trace.
        </p>

        {mouvements.length > 0 && <DerniersControles mouvements={mouvements} />}
      </div>

      {courant && (
        <ResultatSortie
          d={courant}
          onValider={() => enregistrer('AUTORISE')}
          onRefuser={() => enregistrer('REFUSE')}
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

function DerniersControles({ mouvements }: { mouvements: Mouvement[] }) {
  const icon = (v: Voie) => (v === 'AUTORISATION' ? <FileOutput className="h-3.5 w-3.5" /> : v === 'MARQUAGE' ? <Tag className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />);
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Derniers contrôles</p>
      <ul className="space-y-1.5">
        {mouvements.slice(0, 4).map((m) => (
          <li key={m.id} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm shadow-card ring-1 ring-sand-300/70">
            <span className={`h-2 w-2 shrink-0 rounded-full ${m.resultat === 'AUTORISE' ? 'bg-forest-500' : 'bg-danger-500'}`} />
            <span className="text-muted">{icon(m.voie)}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-ink">{m.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">{m.heure}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultatSortie({
  d,
  onValider,
  onRefuser,
  onFermer,
}: {
  d: Decision;
  onValider: () => void;
  onRefuser: () => void;
  onFermer: () => void;
}) {
  const autorise = d.resultat === 'AUTORISE';
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-sand-50">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onFermer} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-500">
          <ArrowLeft className="h-4 w-4" /> Nouveau scan
        </button>
        <Badge tone="neutral">
          {d.voie === 'AUTORISATION' ? 'Autorisation' : d.voie === 'MARQUAGE' ? 'Marquage' : 'Non couvert'}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pb-4">
        <div className="mt-1 flex h-24 w-24 items-center justify-center rounded-3xl ring-4 ring-white shadow-card-lg" style={{ background: autorise ? '#EAF3EF' : '#F8E7E4' }}>
          {d.voie === 'AUTORISATION' ? (
            <FileOutput className={`h-11 w-11 ${autorise ? 'text-forest-500' : 'text-danger-500'}`} />
          ) : d.voie === 'MARQUAGE' ? (
            <Tag className={`h-11 w-11 ${autorise ? 'text-forest-500' : 'text-danger-500'}`} />
          ) : (
            <ShieldAlert className="h-11 w-11 text-danger-500" />
          )}
        </div>

        <p className="mt-3 font-mono text-2xl font-extrabold tracking-tight text-ink">{d.titre}</p>
        {d.sousTitre && <p className="mt-0.5 text-center text-sm font-medium text-muted">{d.sousTitre}</p>}
        {d.lignes && (
          <ul className="mt-2 space-y-0.5 text-center">
            {d.lignes.map((l, i) => (
              <li key={i} className="text-xs text-ink">{l}</li>
            ))}
          </ul>
        )}

        <StatusBanner
          className="mt-5 w-full"
          result={autorise ? 'AUTORISE' : 'REFUSE'}
          reason={autorise ? (d.voie === 'MARQUAGE' ? 'Matériel déclaré & marqué' : 'Autorisation valide') : d.motif}
          instruction={autorise ? (d.voie === 'AUTORISATION' ? 'Consommation à la validation · usage unique' : 'Sortie couverte — laisser passer') : d.consigne}
          icon={autorise ? <Check className="h-8 w-8" strokeWidth={3} /> : <X className="h-8 w-8" strokeWidth={3} />}
        />
      </div>

      <div className="border-t border-sand-300 bg-white px-4 py-3">
        {autorise ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onRefuser}>Refuser</Button>
            <Button variant="primary" size="lg" block icon={<Check className="h-5 w-5" strokeWidth={2.5} />} onClick={onValider}>
              Confirmer la sortie
            </Button>
          </div>
        ) : (
          <Button variant="danger" size="lg" block icon={<ShieldAlert className="h-5 w-5" />} onClick={onRefuser}>
            Refuser &amp; consigner
          </Button>
        )}
      </div>
    </div>
  );
}
