import { useCallback, useEffect, useState } from 'react';
import {
  Moon, Users, Clock, AlertTriangle, Check, Loader2, LogIn, ShieldAlert,
  CreditCard, Package, LogOut, X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useAuthz } from '../../lib/authz';
import { chargerPoste, type Poste } from '../poste/api';
import { etatCloture, cloturerJournee, type EtatCloture, type Present, type ResumeCloture } from './api';

export function Cloture() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutCloturer = a('CLOTURER_JOURNEE');
  const peutVoir = peutCloturer || a('CONTROLER_AU_POSTE');

  const [poste, setPoste] = useState<Poste | null>(null);
  const [etat, setEtat] = useState<EtatCloture | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [prolonges, setProlonges] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [resume, setResume] = useState<ResumeCloture | null>(null);
  const [confirme, setConfirme] = useState(false);

  const rafraichir = useCallback(async (posteId: string) => {
    setEtat(await etatCloture(posteId));
  }, []);

  useEffect(() => {
    if (!connecte || !peutVoir) {
      setChargement(false);
      return;
    }
    let annule = false;
    (async () => {
      try {
        const p = await chargerPoste();
        if (annule) return;
        setPoste(p);
        await rafraichir(p.id);
      } catch (e) {
        if (!annule) setErreur((e as Error).message);
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => { annule = true; };
  }, [connecte, peutVoir, rafraichir]);

  function toggleProlonge(id: string) {
    setProlonges((p) => {
      const n = { ...p };
      if (id in n) delete n[id];
      else n[id] = '';
      return n;
    });
  }

  const prolongations = Object.entries(prolonges).map(([personne_id, motif]) => ({ personne_id, motif: motif.trim() }));
  const motifsManquants = prolongations.some((p) => p.motif.length < 3);
  const aSolder = (etat?.nbPresents ?? 0) - prolongations.length;

  async function cloturer() {
    if (!poste) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await cloturerJournee(poste.id, prolongations);
      setResume(r);
      setConfirme(false);
      setProlonges({});
      await rafraichir(poste.id);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (authEnCours || chargement) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!connecte) {
    return <Etat icone={<LogIn className="h-7 w-7" />} titre="Connexion requise" detail="La clôture de journée écrit au registre : il faut un compte." />;
  }
  if (!peutVoir) {
    return <Etat icone={<ShieldAlert className="h-7 w-7" />} titre="Accès non autorisé" detail="Le pouvoir CLOTURER_JOURNEE (ou CONTROLER_AU_POSTE) est requis." />;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          <Moon className="h-3.5 w-3.5" /> Clôture de journée
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Clôture de journée</h1>
        <p className="mt-1 text-sm text-muted">
          {etat?.posteLabel} · {etat?.date}. Les présences restantes basculent en <b className="text-ink">sortie non constatée</b> —
          l'appairage est soldé, l'entrée du lendemain reste possible. Jamais bloquant.
        </p>
      </div>

      {erreur && <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

      {etat?.dejaCloture && !resume && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-forest-50 px-4 py-3 text-sm font-semibold text-forest-700 ring-1 ring-forest-100">
          <Check className="h-4 w-4" /> Journée déjà clôturée pour ce site. Une nouvelle clôture ne soldera que d'éventuelles présences restantes.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard tone="forest" label="Présents à solder" value={aSolder < 0 ? 0 : aSolder} icon={<Users className="h-5 w-5" />} />
        <StatCard tone="amber" label="Badges temp. non restitués" value={etat?.badgesTempNonRestitues ?? 0} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard tone="plain" label="Matériels « repart le soir »" value={etat?.materielsRepartNonSortis ?? 0} icon={<Package className="h-5 w-5" />} />
        <StatCard tone="plain" label="Maintenus (motivés)" value={prolongations.length} icon={<Clock className="h-5 w-5" />} />
      </div>

      {resume ? (
        <ResumeCard resume={resume} />
      ) : (
        <>
          <h2 className="mb-2 text-sm font-bold text-ink">Présents restants au poste</h2>
          {(etat?.presents.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
              <Moon className="mx-auto h-8 w-8 text-sand-300" />
              <p className="mt-2 text-sm font-semibold text-ink">Aucune présence restante</p>
              <p className="mt-1 text-sm text-muted">Rien à solder — tout le monde a scanné sa sortie.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {etat!.presents.map((p) => (
                <PresentRow
                  key={p.personneId}
                  p={p}
                  prolonge={p.personneId in prolonges}
                  motif={prolonges[p.personneId] ?? ''}
                  onToggle={() => toggleProlonge(p.personneId)}
                  onMotif={(m) => setProlonges((s) => ({ ...s, [p.personneId]: m }))}
                />
              ))}
            </ul>
          )}

          {peutCloturer && (
            <div className="mt-5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
              <p className="mb-3 text-xs text-muted">
                Les personnes maintenues (présence prolongée) doivent porter un motif et ne seront pas soldées.
                Les autres présents ({aSolder < 0 ? 0 : aSolder}) basculent en sortie non constatée.
              </p>
              <Button
                variant="primary"
                size="lg"
                block
                disabled={envoi || motifsManquants}
                icon={envoi ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                onClick={() => setConfirme(true)}
              >
                Clôturer la journée
              </Button>
              {motifsManquants && <p className="mt-2 text-center text-[11px] font-semibold text-danger-600">Chaque personne maintenue exige un motif.</p>}
            </div>
          )}
        </>
      )}

      {confirme && (
        <ConfirmSheet
          aSolder={aSolder < 0 ? 0 : aSolder}
          prolongations={prolongations.length}
          onAnnuler={() => setConfirme(false)}
          onConfirmer={cloturer}
          envoi={envoi}
        />
      )}
    </div>
  );
}

function PresentRow({
  p, prolonge, motif, onToggle, onMotif,
}: {
  p: Present; prolonge: boolean; motif: string; onToggle: () => void; onMotif: (m: string) => void;
}) {
  return (
    <li className={`rounded-2xl bg-white p-4 shadow-card ring-1 ${prolonge ? 'ring-amber-200' : 'ring-sand-300/70'}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600 ring-1 ring-forest-100">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{p.label}</p>
          <p className="truncate text-xs text-muted">{p.entreprise} · entré {p.heure}</p>
        </div>
        <button
          onClick={onToggle}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
            prolonge ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-white text-muted ring-sand-300'
          }`}
        >
          {prolonge ? 'Maintenu sur site' : 'Marquer maintenu'}
        </button>
      </div>
      {prolonge && (
        <input
          value={motif}
          onChange={(e) => onMotif(e.target.value)}
          placeholder="Motif de la présence prolongée (ex. : gardien de nuit, astreinte)"
          className="mt-2 w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
        />
      )}
    </li>
  );
}

function ResumeCard({ resume }: { resume: ResumeCloture }) {
  const lignes = [
    { label: 'Sorties non constatées générées', value: resume.sortiesNonConstatees, ic: <LogOut className="h-4 w-4" /> },
    { label: 'Présences prolongées (motivées)', value: resume.prolongations, ic: <Clock className="h-4 w-4" /> },
    { label: 'Lignes portail confirmées par silence', value: resume.confirmeesParSilence, ic: <Check className="h-4 w-4" /> },
    { label: 'Matériels passés en retard', value: resume.materielsRetard, ic: <Package className="h-4 w-4" /> },
    { label: 'Badges temporaires non restitués', value: resume.badgesTempNonRestitues, ic: <CreditCard className="h-4 w-4" /> },
  ];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-sand-300/70">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-forest-700">
        <Check className="h-5 w-5 text-forest-500" strokeWidth={3} /> Journée clôturée
      </p>
      <ul className="divide-y divide-sand-200">
        {lignes.map((l) => (
          <li key={l.label} className="flex items-center gap-3 py-2.5">
            <span className="text-muted">{l.ic}</span>
            <span className="flex-1 text-sm text-ink">{l.label}</span>
            <span className="tnum text-lg font-extrabold text-ink">{l.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">
        Les sorties non constatées sont distinguées des sorties scannées dans tous les registres et exports.
        Leur nombre par entité est un indicateur de qualité de gestion — jamais un blocage.
      </p>
    </div>
  );
}

function ConfirmSheet({
  aSolder, prolongations, onAnnuler, onConfirmer, envoi,
}: {
  aSolder: number; prolongations: number; onAnnuler: () => void; onConfirmer: () => void; envoi: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Confirmer la clôture</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="my-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span><b>{aSolder}</b> présence(s) vont basculer en sortie non constatée. <b>{prolongations}</b> maintenue(s) sur site. Action tracée et horodatée.</span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={envoi} icon={envoi ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />} onClick={onConfirmer}>
            Clôturer maintenant
          </Button>
        </div>
      </div>
    </div>
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
