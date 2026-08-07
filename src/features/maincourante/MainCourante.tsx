import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Check,
  X,
  Camera,
  LogIn,
  MapPin,
  ShieldAlert,
  Ban,
  Lock,
  Users,
  Key,
  Info,
  FileText,
  AlertTriangle,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { PhotoCapture } from '../../components/device/PhotoCapture';
import { DicteeVocale } from '../../components/device/DicteeVocale';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthz } from '../../lib/authz';
import { BoutonAlertes } from '../../components/ui/BoutonAlertes';
import {
  CATEGORIE_LABEL,
  chargerJournal,
  consignerEntree,
  ecouterJournal,
  majRapportIncident,
  type Categorie,
  type Entree,
  type Gravite,
  type TypeEntree,
} from './api';

/** Les trois volets du rapport d'incident, exigés avant clôture. */
interface Rapport {
  circonstances: string;
  mesures: string;
  suites: string;
}

const ICON: Record<Categorie, React.ReactNode> = {
  PRISE_POSTE: <LogIn className="h-4 w-4" />,
  RONDE: <MapPin className="h-4 w-4" />,
  FORCAGE: <ShieldAlert className="h-4 w-4" />,
  REFUS: <Ban className="h-4 w-4" />,
  RETENUE: <Lock className="h-4 w-4" />,
  VISITEUR: <Users className="h-4 w-4" />,
  CLE: <Key className="h-4 w-4" />,
  AUTRE: <Info className="h-4 w-4" />,
};

export function MainCourante() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutConsigner = a('CONTROLER_AU_POSTE');
  const peutClore = a('SUIVRE_INCIDENTS');

  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enDirect, setEnDirect] = useState(false);
  const [recus, setRecus] = useState<string[]>([]);
  const [sheet, setSheet] = useState(false);
  const [rapport, setRapport] = useState<Entree | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    try {
      setEntrees(await chargerJournal());
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
    recharger();
    // Réception temps réel : la chaîne de commandement voit arriver les entrées.
    return ecouterJournal(
      (e) => {
        setEntrees((es) => (es.some((x) => x.id === e.id) ? es : [e, ...es]));
        setRecus((r) => [e.id, ...r].slice(0, 12));
      },
      (e) => setEntrees((es) => es.map((x) => (x.id === e.id ? e : x))),
      setEnDirect,
    );
  }, [connecte, recharger]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }

  const stats = useMemo(() => ({
    entrees: entrees.length,
    incidentsOuverts: entrees.filter((e) => e.type === 'INCIDENT' && e.statut === 'OUVERT').length,
    majeurs: entrees.filter((e) => e.gravite === 'MAJEUR' && e.statut === 'OUVERT').length,
  }), [entrees]);

  async function majRapport(id: string, v: Rapport, clos: boolean) {
    try {
      await majRapportIncident(id, v, clos);
      await recharger();
      if (clos) setRapport(null);
      else setRapport((r) => (r && r.id === id ? { ...r, ...v } : r));
      flash(clos ? 'Incident clos · rapport consigné' : 'Rapport enregistré');
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function ajouter(v: {
    type: TypeEntree;
    categorie: Categorie;
    titre: string;
    description: string;
    gravite: Gravite;
    photo: boolean;
    photoUrl?: string;
    circonstances?: string;
    mesures?: string;
  }) {
    try {
      const res = await consignerEntree({
        type: v.type,
        categorie: v.categorie,
        titre: v.titre,
        description: v.description,
        gravite: v.type === 'INCIDENT' ? v.gravite : undefined,
        photoUrl: v.photoUrl,
        circonstances: v.circonstances,
        mesures: v.mesures,
      });
      setSheet(false);
      await recharger();
      flash(
        v.type === 'INCIDENT'
          ? `Incident ${res.numero ?? ''} consigné · transmis HSE et Directeur de la Construction`
          : 'Entrée ajoutée à la main courante',
      );
    } catch (e) {
      setErreur((e as Error).message);
      setSheet(false);
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
        <p className="text-sm">La main courante est un registre du site : il faut un compte pour l'ouvrir.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Main courante</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Main courante &amp; incidents</h1>
            <p className="mt-1 text-sm text-muted">
              Saisie au poste avec photo. Journal horodaté, fiche flash et rapport détaillé pour les incidents.
            </p>
          </div>
          {peutConsigner && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
              Nouvelle entrée
            </Button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
              enDirect
                ? 'bg-forest-50 text-forest-700 ring-forest-200'
                : 'bg-sand-100 text-muted ring-sand-300'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${enDirect ? 'animate-pulse bg-forest-500' : 'bg-sand-300'}`} />
            {enDirect ? 'Réception en direct' : 'Hors direct — rechargez'}
          </span>
          <span className="text-[11px] text-muted">
            Les incidents partent au HSE Officer et au Directeur de la Construction à la seconde.
          </span>
        </div>

        {peutClore && (
          <div className="mb-4">
            <BoutonAlertes />
          </div>
        )}

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard tone="forest" label="Entrées du jour" value={stats.entrees} icon={<FileText className="h-5 w-5" />} />
          <StatCard tone="amber" label="Incidents ouverts" value={stats.incidentsOuverts} icon={<AlertTriangle className="h-5 w-5" />} />
          <DangerStat label="Majeurs ouverts" value={stats.majeurs} />
        </div>

        {/* Journal */}
        {entrees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-sand-300" />
            <p className="mt-2 text-sm font-semibold text-ink">Journal vide</p>
            <p className="mt-1 text-sm text-muted">
              {peutConsigner
                ? 'Consignez la prise de poste : le journal démarre là.'
                : 'Les entrées consignées au poste apparaîtront ici en direct.'}
            </p>
          </div>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-sand-300 pl-5">
            {entrees.map((e) => (
              <EntreeItem key={e.id} e={e} nouveau={recus.includes(e.id)} onRapport={() => setRapport(e)} />
            ))}
          </ol>
        )}
      </div>

      {sheet && <SaisieSheet onAnnuler={() => setSheet(false)} onConfirmer={ajouter} />}
      {rapport && (
        <RapportModal
          e={rapport}
          onFermer={() => setRapport(null)}
          peutClore={peutClore}
          onEnregistrer={(id, v) => majRapport(id, v, false)}
          onClore={(id, v) => majRapport(id, v, true)}
        />
      )}

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

function EntreeItem({ e, nouveau, onRapport }: { e: Entree; nouveau?: boolean; onRapport: () => void }) {
  const incident = e.type === 'INCIDENT';
  const majeur = e.gravite === 'MAJEUR';
  return (
    <li className="relative">
      <span
        className={`absolute -left-[27px] top-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-sand-100 ${
          incident ? (majeur ? 'bg-danger-500 text-white' : 'bg-amber-500 text-ink') : 'bg-forest-500 text-white'
        }`}
      >
        {ICON[e.categorie]}
      </span>
      <div className={`rounded-2xl bg-white p-4 shadow-card ring-1 ${nouveau ? 'ring-2 ring-forest-400' : majeur && e.statut === 'OUVERT' ? 'ring-danger-200' : 'ring-sand-300/70'}`}>
        {nouveau && (
          <p className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-forest-700">
            Reçu à l’instant
          </p>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-ink">{e.titre}</span>
              {e.numero && <span className="font-mono text-[11px] text-muted">{e.numero}</span>}
            </div>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
              <Clock className="h-3 w-3" /> {e.horodatage} · {e.agent} · {CATEGORIE_LABEL[e.categorie]}
              {e.photo && <span className="inline-flex items-center gap-0.5"><Camera className="h-3 w-3" /> photo</span>}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {incident && (majeur ? <Badge tone="danger" dot>Majeur</Badge> : <Badge tone="amber" dot>Mineur</Badge>)}
            {incident && (e.statut === 'CLOS' ? <Badge tone="neutral">Clos</Badge> : <Badge tone="forest">Ouvert</Badge>)}
          </div>
        </div>
        <p className="mt-2 text-sm text-ink">{e.description}</p>
        {incident && (
          <button onClick={onRapport} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest-600">
            Fiche flash &amp; rapport détaillé <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
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

/* ---------- Rapport détaillé ---------- */
function RapportModal({
  e,
  peutClore,
  onFermer,
  onEnregistrer,
  onClore,
}: {
  e: Entree;
  peutClore: boolean;
  onFermer: () => void;
  onEnregistrer: (id: string, v: Rapport) => void;
  onClore: (id: string, v: Rapport) => void;
}) {
  const [circonstances, setCirconstances] = useState(e.circonstances ?? '');
  const [mesures, setMesures] = useState(e.mesures ?? '');
  const [suites, setSuites] = useState(e.suites ?? '');
  const clos = e.statut === 'CLOS';
  const majeur = e.gravite === 'MAJEUR';
  const rapport = { circonstances: circonstances.trim(), mesures: mesures.trim(), suites: suites.trim() };
  const modifie =
    rapport.circonstances !== (e.circonstances ?? '') ||
    rapport.mesures !== (e.mesures ?? '') ||
    rapport.suites !== (e.suites ?? '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-ink">{e.titre}</h3>
              {e.numero && <span className="font-mono text-xs text-muted">{e.numero}</span>}
            </div>
            <p className="text-xs text-muted">{e.horodatage} · {e.agent}</p>
          </div>
          <button onClick={onFermer} className="text-muted"><X className="h-5 w-5" /></button>
        </div>

        {/* Fiche flash */}
        <div className={`mb-4 rounded-2xl p-3 ${majeur ? 'bg-danger-50 ring-1 ring-danger-100' : 'bg-amber-50 ring-1 ring-amber-200'}`}>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink">
            Fiche flash
            {majeur ? <Badge tone="danger">Majeur</Badge> : <Badge tone="amber">Mineur</Badge>}
          </p>
          <p className="mt-1 text-sm text-ink">{e.description}</p>
        </div>

        <ChampDicte
          label="Circonstances"
          placeholder="Ce qui s'est passé : heure, lieu, personnes, enchaînement des faits…"
          valeur={circonstances}
          onChange={setCirconstances}
          desactive={clos}
          rows={3}
        />
        <ChampDicte
          label="Mesures prises"
          placeholder="Ce qui a été fait immédiatement : refus, retenue, alerte, photo…"
          valeur={mesures}
          onChange={setMesures}
          desactive={clos}
          rows={3}
        />
        <ChampDicte
          label="Suites"
          placeholder="Suites données : information du référent, arbitrage, sanction…"
          valeur={suites}
          onChange={setSuites}
          desactive={clos}
          rows={2}
        />

        {e.photo && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-sand-100 px-3 py-2 text-xs font-medium text-muted">
            <Camera className="h-4 w-4 text-forest-500" /> Photo jointe (prise au poste)
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onFermer}>Fermer</Button>
          {clos ? (
            <Button variant="outline" size="lg" block disabled icon={<Check className="h-4 w-4" />}>Incident clos</Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                className="flex-none px-5"
                disabled={!modifie}
                onClick={() => onEnregistrer(e.id, rapport)}
              >
                Enregistrer
              </Button>
              {peutClore && (
                <Button
                  variant="primary"
                  size="lg"
                  block
                  disabled={rapport.circonstances.length < 5 || rapport.mesures.length < 5 || rapport.suites.length < 5}
                  onClick={() => onClore(e.id, rapport)}
                >
                  Clore l'incident
                </Button>
              )}
            </>
          )}
        </div>
        {!clos && (
          <p className="mt-2 text-[11px] text-muted">
            {peutClore
              ? 'Circonstances, mesures prises et suites sont exigées avant clôture — la fiche flash doit être opposable.'
              : 'La clôture relève de la chaîne de commandement (HSE Officer, Directeur de la Construction, direction du site).'}
          </p>
        )}
      </div>
    </div>
  );
}

/** Champ long : saisie au clavier ou à la voix, correcteur du navigateur actif. */
function ChampDicte({
  label,
  placeholder,
  valeur,
  onChange,
  rows = 3,
  desactive,
}: {
  label: string;
  placeholder: string;
  valeur: string;
  onChange: (v: string) => void;
  rows?: number;
  desactive?: boolean;
}) {
  return (
    <div className="mt-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
        <textarea
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          disabled={desactive}
          placeholder={placeholder}
          lang="fr"
          spellCheck
          className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100 disabled:opacity-70"
        />
      </label>
      {!desactive && <DicteeVocale valeur={valeur} onChange={onChange} label={`Dicter ${label.toLowerCase()}`} />}
    </div>
  );
}

/* ---------- Saisie ---------- */
function SaisieSheet({
  onAnnuler,
  onConfirmer,
}: {
  onAnnuler: () => void;
  onConfirmer: (v: {
    type: TypeEntree;
    categorie: Categorie;
    titre: string;
    description: string;
    gravite: Gravite;
    photo: boolean;
    photoUrl?: string;
    circonstances?: string;
    mesures?: string;
  }) => void;
}) {
  const [type, setType] = useState<TypeEntree>('EVENEMENT');
  const [categorie, setCategorie] = useState<Categorie>('RONDE');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [gravite, setGravite] = useState<Gravite>('MINEUR');
  const [photo, setPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [circonstances, setCirconstances] = useState('');
  const [mesures, setMesures] = useState('');
  const incident = type === 'INCIDENT';
  // Un incident majeur n'est pas consignable sans photo (I1) ni circonstances.
  const majeur = incident && gravite === 'MAJEUR';
  const pret =
    titre.trim() &&
    description.trim() &&
    (!majeur || (photo && circonstances.trim().length >= 5 && mesures.trim().length >= 5));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouvelle entrée</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3 flex gap-1 rounded-xl bg-sand-200 p-1">
          {(['EVENEMENT', 'INCIDENT'] as TypeEntree[]).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${type === t ? 'bg-forest-500 text-white shadow-card' : 'text-muted'}`}>
              {t === 'EVENEMENT' ? 'Événement' : 'Incident'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Catégorie</span>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value as Categorie)}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {Object.entries(CATEGORIE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {type === 'INCIDENT' && (
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Gravité</span>
              <select value={gravite} onChange={(e) => setGravite(e.target.value as Gravite)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                <option value="MINEUR">Mineur</option>
                <option value="MAJEUR">Majeur</option>
              </select>
            </label>
          )}
        </div>

        <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Titre</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : ronde secteur travaux"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        <ChampDicte
          label="Description"
          placeholder="Constat, faits, personnes concernées…"
          valeur={description}
          onChange={setDescription}
          rows={3}
        />

        {incident && (
          <>
            <ChampDicte
              label="Circonstances"
              placeholder="Heure, lieu, personnes, enchaînement des faits…"
              valeur={circonstances}
              onChange={setCirconstances}
              rows={3}
            />
            <ChampDicte
              label="Mesures prises"
              placeholder="Refus, retenue, alerte du chef de poste, raccompagnement…"
              valeur={mesures}
              onChange={setMesures}
              rows={3}
            />
          </>
        )}

        <div className="mt-3">
          <PhotoCapture
            label={incident ? "Photographier l'incident" : 'Photographier (optionnel)'}
            onCapture={(url) => { setPhoto(true); setPhotoUrl(url); }}
          />
        </div>

        {majeur && !pret && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
            Incident majeur : photo, circonstances et mesures prises sont obligatoires dès la consignation.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({
              type,
              categorie,
              titre: titre.trim(),
              description: description.trim(),
              gravite,
              photo,
              photoUrl,
              circonstances: circonstances.trim() || undefined,
              mesures: mesures.trim() || undefined,
            })}>
            Consigner
          </Button>
        </div>
      </div>
    </div>
  );
}
