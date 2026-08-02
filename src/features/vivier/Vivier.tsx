import { useCallback, useEffect, useState } from 'react';
import { UsersRound, Loader2, LogIn, ShieldAlert, CreditCard, Camera, ShieldCheck, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthz } from '../../lib/authz';
import { useEntreprises } from '../materiel/referentiel';
import { chargerVivier, type VivierPersonne } from './api';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

export function Vivier() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peut = a('DECLARER_PERSONNEL') || a('DEPOSER_LISTE') || a('DELIVRER_BADGE') || a('CONTROLER_AU_POSTE');
  const entreprises = useEntreprises();
  const [entrepriseId, setEntrepriseId] = useState('');
  const [vivier, setVivier] = useState<VivierPersonne[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!entrepriseId && entreprises.length > 0) setEntrepriseId(entreprises[0].id);
  }, [entreprises, entrepriseId]);

  const rafraichir = useCallback(async (id: string) => {
    setChargement(true);
    setErreur(null);
    try {
      setVivier(await chargerVivier(id));
    } catch (e) {
      setErreur((e as Error).message);
      setVivier([]);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (connecte && peut && entrepriseId) rafraichir(entrepriseId);
  }, [connecte, peut, entrepriseId, rafraichir]);

  if (authEnCours) return <Etat icone={<Loader2 className="h-6 w-6 animate-spin" />} titre="Chargement…" />;
  if (!connecte) return <Etat icone={<LogIn className="h-7 w-7" />} titre="Connexion requise" detail="Le vivier est une donnée du site." />;
  if (!peut) return <Etat icone={<ShieldAlert className="h-7 w-7" />} titre="Accès non autorisé" detail="Un pouvoir de gestion du personnel est requis." />;

  const propositions = vivier.filter((p) => p.proposeNominatif).length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          <UsersRound className="h-3.5 w-3.5" /> M21 · Lot 1
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Vivier de personnel</h1>
        <p className="mt-1 text-sm text-muted">
          Référentiel réutilisable des personnes déjà venues — un ajout au registre devient un geste. Au-delà de
          3 passages sur 7 jours, la bascule en badge nominatif est proposée (décision humaine).
        </p>
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold text-muted">Entité</span>
        <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
          {entreprises.length === 0 && <option value="">Aucune entreprise</option>}
          {entreprises.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
        </select>
      </label>

      {erreur && <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard tone="forest" label="Au vivier" value={vivier.length} icon={<UsersRound className="h-5 w-5" />} />
        <StatCard tone="amber" label="Bascule nominatif proposée" value={propositions} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard tone="plain" label="Photo au dossier" value={vivier.filter((p) => p.photoUrl).length} icon={<Camera className="h-5 w-5" />} />
      </div>

      {chargement ? (
        <div className="flex justify-center py-10 text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : vivier.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
          <UsersRound className="mx-auto h-8 w-8 text-sand-300" />
          <p className="mt-2 text-sm font-semibold text-ink">Vivier vide</p>
          <p className="mt-1 text-sm text-muted">Il se remplit par les déclarations du référent et les inscriptions au poste.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {vivier.map((p) => <VivierRow key={p.id} p={p} />)}
        </ul>
      )}
    </div>
  );
}

function VivierRow({ p }: { p: VivierPersonne }) {
  const inductionOk = p.inductionStatut === 'VALIDE';
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand-100 text-muted ring-1 ring-sand-200">
        {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{p.prenom} {p.nom}</p>
        <p className="truncate text-xs text-muted">{p.fonction || '—'} · {p.regime === 'STABLE' ? 'stable' : 'tournant'}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {p.nb30} passage(s) / 30 j</span>
          <span>1er passage {fmt(p.premierPassage)}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {p.statut === 'SUSPENDUE' && <Badge tone="danger" dot>Suspendue</Badge>}
        {inductionOk ? (
          <Badge tone="forest"><ShieldCheck className="h-3 w-3" /> Induction</Badge>
        ) : (
          <Badge tone="amber">Induction {p.inductionStatut === 'EN_ATTENTE' ? 'en attente' : 'à revoir'}</Badge>
        )}
        {p.proposeNominatif && <Badge tone="amber" dot>Nominatif proposé</Badge>}
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
