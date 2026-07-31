import { useMemo, useRef, useState } from 'react';
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
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import {
  CATEGORIE_LABEL,
  MAIN_COURANTE_INIT,
  type Categorie,
  type Entree,
  type Gravite,
  type TypeEntree,
} from '../../data/mainCourante';

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
  const [entrees, setEntrees] = useState<Entree[]>(MAIN_COURANTE_INIT);
  const [sheet, setSheet] = useState(false);
  const [rapport, setRapport] = useState<Entree | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const seq = useRef(16);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }

  const stats = useMemo(() => ({
    entrees: entrees.length,
    incidentsOuverts: entrees.filter((e) => e.type === 'INCIDENT' && e.statut === 'OUVERT').length,
    majeurs: entrees.filter((e) => e.gravite === 'MAJEUR' && e.statut === 'OUVERT').length,
  }), [entrees]);

  function clore(id: string, suites: string) {
    setEntrees((es) => es.map((e) => (e.id === id ? { ...e, statut: 'CLOS', suites: suites || e.suites } : e)));
    setRapport(null);
    flash('Incident clos · suites consignées');
  }

  function ajouter(v: { type: TypeEntree; categorie: Categorie; titre: string; description: string; gravite: Gravite; photo: boolean }) {
    const incident = v.type === 'INCIDENT';
    if (incident) seq.current += 1;
    setEntrees((es) => [
      {
        id: `new-${es.length}`,
        numero: incident ? `INC-2026-0${seq.current}` : undefined,
        horodatage: '31/07 09:52',
        agent: 'M. Koné',
        type: v.type,
        categorie: v.categorie,
        titre: v.titre,
        description: v.description,
        photo: v.photo,
        gravite: incident ? v.gravite : undefined,
        statut: incident ? 'OUVERT' : undefined,
      },
      ...es,
    ]);
    setSheet(false);
    flash(incident ? 'Incident consigné' : 'Entrée ajoutée à la main courante');
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500">M16 · Lot 3</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Main courante &amp; incidents</h1>
            <p className="mt-1 text-sm text-muted">
              Saisie au poste avec photo. Journal horodaté, fiche flash et rapport détaillé pour les incidents.
            </p>
          </div>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
            Nouvelle entrée
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard tone="forest" label="Entrées du jour" value={stats.entrees} icon={<FileText className="h-5 w-5" />} />
          <StatCard tone="amber" label="Incidents ouverts" value={stats.incidentsOuverts} icon={<AlertTriangle className="h-5 w-5" />} />
          <DangerStat label="Majeurs ouverts" value={stats.majeurs} />
        </div>

        {/* Journal */}
        <ol className="relative space-y-3 border-l-2 border-sand-300 pl-5">
          {entrees.map((e) => (
            <EntreeItem key={e.id} e={e} onRapport={() => setRapport(e)} />
          ))}
        </ol>
      </div>

      {sheet && <SaisieSheet onAnnuler={() => setSheet(false)} onConfirmer={ajouter} />}
      {rapport && <RapportModal e={rapport} onFermer={() => setRapport(null)} onClore={clore} />}

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

function EntreeItem({ e, onRapport }: { e: Entree; onRapport: () => void }) {
  const incident = e.type === 'INCIDENT';
  const majeur = e.gravite === 'MAJEUR';
  return (
    <li className="relative">
      <span
        className={`absolute -left-[27px] top-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-sand-100 ${
          incident ? (majeur ? 'bg-danger-500 text-white' : 'bg-amber-500 text-white') : 'bg-forest-500 text-white'
        }`}
      >
        {ICON[e.categorie]}
      </span>
      <div className={`rounded-2xl bg-white p-4 shadow-card ring-1 ${majeur && e.statut === 'OUVERT' ? 'ring-danger-200' : 'ring-sand-300/70'}`}>
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
function RapportModal({ e, onFermer, onClore }: { e: Entree; onFermer: () => void; onClore: (id: string, suites: string) => void }) {
  const [suites, setSuites] = useState(e.suites ?? '');
  const majeur = e.gravite === 'MAJEUR';
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

        <Section titre="Circonstances" contenu={e.circonstances} />
        <Section titre="Mesures prises" contenu={e.mesures} />

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Suites</span>
          <textarea value={suites} onChange={(ev) => setSuites(ev.target.value)} rows={2}
            disabled={e.statut === 'CLOS'}
            className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100 disabled:opacity-70" />
        </label>

        {e.photo && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-sand-100 px-3 py-2 text-xs font-medium text-muted">
            <Camera className="h-4 w-4 text-forest-500" /> Photo jointe (prise au poste)
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onFermer}>Fermer</Button>
          {e.statut === 'OUVERT' ? (
            <Button variant="primary" size="lg" block disabled={suites.trim().length < 5} onClick={() => onClore(e.id, suites.trim())}>
              Clore l'incident
            </Button>
          ) : (
            <Button variant="outline" size="lg" block disabled icon={<Check className="h-4 w-4" />}>Incident clos</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ titre, contenu }: { titre: string; contenu?: string }) {
  if (!contenu) return null;
  return (
    <div className="mb-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{titre}</p>
      <p className="text-sm text-ink">{contenu}</p>
    </div>
  );
}

/* ---------- Saisie ---------- */
function SaisieSheet({
  onAnnuler,
  onConfirmer,
}: {
  onAnnuler: () => void;
  onConfirmer: (v: { type: TypeEntree; categorie: Categorie; titre: string; description: string; gravite: Gravite; photo: boolean }) => void;
}) {
  const [type, setType] = useState<TypeEntree>('EVENEMENT');
  const [categorie, setCategorie] = useState<Categorie>('RONDE');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [gravite, setGravite] = useState<Gravite>('MINEUR');
  const [photo, setPhoto] = useState(false);
  const pret = titre.trim() && description.trim();

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
        <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Constat, faits, personnes concernées…"
            className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>

        <button onClick={() => setPhoto((v) => !v)}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${photo ? 'border-forest-200 bg-forest-50 text-forest-700' : 'border-sand-300 bg-white text-muted'}`}>
          {photo ? <Check className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {photo ? 'Photo prise ✓' : 'Prendre une photo (au poste)'}
        </button>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({ type, categorie, titre: titre.trim(), description: description.trim(), gravite, photo })}>
            Consigner
          </Button>
        </div>
      </div>
    </div>
  );
}
