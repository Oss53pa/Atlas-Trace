import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Check,
  X,
  ShieldCheck,
  ArrowRight,
  FileOutput,
  Truck,
  Ban,
  Lock,
  QrCode,
  Loader2,
  LogIn,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { LignesEditeur } from '../../components/ui/LignesEditeur';
import { FakeQR } from '../badges/FakeQR';
import { useAuthz } from '../../lib/authz';
import { CIRCUIT_SORTIE, TYPE_SORTIE_LABEL, UNITES, useEntreprises } from './referentiel';
import {
  approuverSortie,
  chargerAutorisations,
  demanderSortie,
  refuserSortie,
  viserSortie,
  type Autorisation,
  type LigneSortie,
  type StatutSortie,
  type TypeSortie,
} from './api';

const dateHeure = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function AutorisationsSortie() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutDemander = a('DEMANDER_SORTIE');
  const peutViser = a('VISER_SORTIE');
  const peutApprouver = a('APPROUVER_SORTIE');

  const [liste, setListe] = useState<Autorisation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [refusCible, setRefusCible] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    try {
      setListe(await chargerAutorisations());
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
    rafraichir();
  }, [connecte, rafraichir]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  }

  async function action(fn: () => Promise<void>, message: string) {
    try {
      await fn();
      await rafraichir();
      flash(message);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  const stats = useMemo(
    () => ({
      aTraiter: liste.filter((x) => x.statut === 'SOUMISE' || x.statut === 'VISEE').length,
      approuvees: liste.filter((x) => x.statut === 'APPROUVEE').length,
      refusees: liste.filter((x) => x.statut === 'REFUSEE').length,
    }),
    [liste],
  );

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
        <p className="text-sm">Les autorisations de sortie engagent le site : il faut un compte pour les consulter.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <FileOutput className="h-3.5 w-3.5" /> M9 · Lot matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
              Autorisation de sortie de matériel
            </h1>
            <p className="mt-1 text-sm text-muted">
              Le code n'est généré qu'à l'approbation. Validité bornée, usage unique, consommé au poste.
            </p>
          </div>
          {peutDemander && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
              Nouvelle demande
            </Button>
          )}
        </div>

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
            {erreur}
          </p>
        )}

        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard tone="amber" label="À traiter" value={stats.aTraiter} icon={<ArrowRight className="h-5 w-5" />} />
          <StatCard tone="forest" label="Approuvées (code)" value={stats.approuvees} icon={<ShieldCheck className="h-5 w-5" />} />
          <DangerStat label="Refusées" value={stats.refusees} />
        </div>

        {liste.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
            <FileOutput className="mx-auto h-8 w-8 text-sand-300" />
            <p className="mt-2 text-sm font-semibold text-ink">Aucune demande de sortie</p>
            <p className="mt-1 text-sm text-muted">
              {peutDemander
                ? 'Déposez une demande : elle passera par le visa HSE puis l’approbation avant qu’un code existe.'
                : 'La demande relève du référent d’entreprise (pouvoir DEMANDER_SORTIE).'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {liste.map((x) => (
              <AutorisationCard
                key={x.id}
                a={x}
                peutViser={peutViser}
                peutApprouver={peutApprouver}
                onViser={() => action(() => viserSortie(x.id), 'Visa HSE apposé · aucun code tant que l’approbation n’est pas donnée')}
                onApprouver={() => action(async () => { await approuverSortie(x.id); }, 'Approuvée · code de sortie généré')}
                onRefuser={() => setRefusCible(x.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {sheet && (
        <DemandeSheet
          onAnnuler={() => setSheet(false)}
          onConfirmer={async (v) => {
            try {
              const res = await demanderSortie(v);
              setSheet(false);
              await rafraichir();
              flash(`Demande ${res.numero} soumise · circuit lancé`);
            } catch (e) {
              setErreur((e as Error).message);
              setSheet(false);
            }
          }}
        />
      )}

      {refusCible && (
        <RefusSheet
          onAnnuler={() => setRefusCible(null)}
          onConfirmer={(m) => {
            const id = refusCible;
            setRefusCible(null);
            action(() => refuserSortie(id, m), 'Demande refusée · motif consigné');
          }}
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
    </>
  );
}

const statutChip: Record<StatutSortie, React.ReactNode> = {
  SOUMISE: (
    <Badge tone="amber" dot>
      Soumise
    </Badge>
  ),
  VISEE: (
    <Badge tone="amber" dot>
      Visa apposé
    </Badge>
  ),
  APPROUVEE: (
    <Badge tone="forest" dot>
      Approuvée · code
    </Badge>
  ),
  REFUSEE: (
    <Badge tone="danger" dot>
      Refusée
    </Badge>
  ),
  ANNULEE: (
    <Badge tone="neutral" dot>
      Annulée
    </Badge>
  ),
};

function AutorisationCard({
  a,
  peutViser,
  peutApprouver,
  onViser,
  onApprouver,
  onRefuser,
}: {
  a: Autorisation;
  peutViser: boolean;
  peutApprouver: boolean;
  onViser: () => void;
  onApprouver: () => void;
  onRefuser: () => void;
}) {
  const enCircuit = a.statut === 'SOUMISE' || a.statut === 'VISEE';
  const consommee = !!a.consommeeAt;

  return (
    <li className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">{a.numero}</span>
            <Badge tone="neutral">{TYPE_SORTIE_LABEL[a.type] ?? a.type}</Badge>
          </div>
          <p className="mt-1 text-sm font-bold text-ink">{a.entreprise}</p>
          <p className="text-xs text-muted">
            Demandeur {a.demandeur ?? '—'}
            {a.motif ? ` · ${a.motif}` : ''} → {a.destination}
            {a.vehicule && (
              <span className="ml-1 inline-flex items-center gap-1">
                · <Truck className="h-3 w-3" /> {a.vehicule}
              </span>
            )}
          </p>
        </div>
        {consommee ? (
          <Badge tone="neutral" dot>
            Consommée
          </Badge>
        ) : (
          statutChip[a.statut]
        )}
      </div>

      <ul className="mt-2 space-y-0.5">
        {a.lignes.map((l, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-ink">
            <span className="h-1 w-1 rounded-full bg-forest-400" />
            {l.designation} · {l.quantite} {l.unite}
          </li>
        ))}
      </ul>

      {a.statut !== 'REFUSEE' && <CircuitStepper a={a} />}

      {a.statut === 'REFUSEE' && (
        <div className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
          <Ban className="mr-1 inline h-3.5 w-3.5" /> Refusée — {a.motifRefus}
        </div>
      )}

      {a.statut === 'APPROUVEE' && a.code ? (
        <CodeBloc code={a.code} validite={dateHeure(a.validiteFin)} consommeeAt={a.consommeeAt} />
      ) : enCircuit ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-sand-100 px-3 py-2 text-[11px] font-medium text-muted">
          <Lock className="h-3.5 w-3.5" /> Aucun code — étape finale (approbation) non franchie.
        </p>
      ) : null}

      {enCircuit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {a.statut === 'SOUMISE' && peutViser && (
            <Button variant="outline" size="sm" icon={<ShieldCheck className="h-4 w-4" />} onClick={onViser}>
              Viser (HSE Officer)
            </Button>
          )}
          {a.statut === 'VISEE' && peutApprouver && (
            <Button variant="primary" size="sm" icon={<Check className="h-4 w-4" strokeWidth={3} />} onClick={onApprouver}>
              Approuver (Directeur)
            </Button>
          )}
          {(peutViser || peutApprouver) && (
            <Button variant="ghost" size="sm" className="text-danger-600" icon={<Ban className="h-4 w-4" />} onClick={onRefuser}>
              Refuser
            </Button>
          )}
          <span className="text-[11px] text-muted">
            Visa et approbation par des personnes distinctes — le serveur le vérifie (R6).
          </span>
        </div>
      )}
    </li>
  );
}

function CircuitStepper({ a }: { a: Autorisation }) {
  const vise = a.statut === 'VISEE' || a.statut === 'APPROUVEE';
  const approuve = a.statut === 'APPROUVEE';
  const etat = (ordre: number): 'fait' | 'courant' | 'attente' => {
    if (ordre === 1) return 'fait';
    if (ordre === 2) return vise ? 'fait' : 'courant';
    return approuve ? 'fait' : vise ? 'courant' : 'attente';
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sand-200 pt-3">
      {CIRCUIT_SORTIE.map((s, i) => {
        const et = etat(s.ordre);
        const par = s.ordre === 2 ? a.visaPar : s.ordre === 3 ? a.approuvePar : a.demandeur;
        return (
          <div key={s.ordre} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                et === 'fait'
                  ? 'bg-forest-50 text-forest-700 ring-1 ring-inset ring-forest-200'
                  : et === 'courant'
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                    : 'bg-sand-100 text-muted ring-1 ring-inset ring-sand-300'
              }`}
              title={et === 'fait' && par ? `Par ${par}` : undefined}
            >
              {et === 'fait' && <Check className="h-3 w-3" strokeWidth={3} />}
              {s.role}
              {s.effetFinal && ' ⚑'}
            </span>
            {i < CIRCUIT_SORTIE.length - 1 && <ArrowRight className="h-3 w-3 text-muted" />}
          </div>
        );
      })}
    </div>
  );
}

function CodeBloc({ code, validite, consommeeAt }: { code: string; validite: string; consommeeAt?: string | null }) {
  return (
    <div className={`mt-3 flex items-center gap-4 rounded-2xl p-4 text-white ${consommeeAt ? 'bg-muted' : 'bg-forest-500'}`}>
      <div className="rounded-xl bg-white p-1.5">
        <FakeQR value={code} size={68} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
          <QrCode className="h-3.5 w-3.5" /> Code de sortie
        </p>
        <p className="truncate font-mono text-sm font-bold">{code}</p>
        <p className="mt-1 text-xs text-white/85">
          {consommeeAt
            ? `Consommée le ${new Date(consommeeAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
            : `Valide jusqu'au ${validite} · usage unique`}
        </p>
      </div>
    </div>
  );
}

function DangerStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand-300/60 bg-danger-500 p-5 text-white shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white/85">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <Ban className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

/* ---------- Nouvelle demande ---------- */
const ligneVide = (): LigneSortie => ({ designation: '', quantite: 1, unite: 'u' });

function DemandeSheet({
  onAnnuler,
  onConfirmer,
}: {
  onAnnuler: () => void;
  onConfirmer: (v: {
    entrepriseId: string;
    type: TypeSortie;
    motif: string;
    destination: string;
    lignes: LigneSortie[];
    vehicule?: string;
  }) => void;
}) {
  const entreprises = useEntreprises();
  const [entrepriseId, setEntrepriseId] = useState('');
  const [type, setType] = useState<TypeSortie>('SITE');
  const [motif, setMotif] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicule, setVehicule] = useState('');
  const [lignes, setLignes] = useState<LigneSortie[]>([ligneVide()]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!entrepriseId && entreprises.length > 0) setEntrepriseId(entreprises[0].id);
  }, [entreprises, entrepriseId]);

  const valides = lignes.filter((l) => l.designation.trim().length > 1 && l.quantite > 0);
  const pret =
    !!entrepriseId && motif.trim() && destination.trim() && valides.length === lignes.length && valides.length > 0 && !envoi;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouvelle demande de sortie</h3>
          <button onClick={onAnnuler} className="text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          Le numéro et le code sont attribués par le serveur — le code seulement après approbation.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
              <select
                value={entrepriseId}
                onChange={(e) => setEntrepriseId(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400"
              >
                {entreprises.length === 0 && <option value="">Aucune entreprise déclarée</option>}
                {entreprises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.raisonSociale}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TypeSortie)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400"
              >
                <option value="SITE">{TYPE_SORTIE_LABEL.SITE}</option>
                <option value="ENTREPRISE">{TYPE_SORTIE_LABEL.ENTREPRISE}</option>
                <option value="DECHETS">{TYPE_SORTIE_LABEL.DECHETS}</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Motif</span>
            <input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. : retour en dépôt"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Destination</span>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex. : dépôt Yopougon"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Véhicule (optionnel)</span>
            <input
              value={vehicule}
              onChange={(e) => setVehicule(e.target.value)}
              placeholder="Ex. : CI-2208-AB"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
            />
          </label>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              Matériel à sortir — {lignes.length} ligne(s)
            </p>
            <LignesEditeur
              lignes={lignes}
              onChange={setLignes}
              nouvelle={ligneVide}
              labelAjout="Ajouter un matériel"
              titre={() => 'Matériel'}
            >
              {(l, set) => (
                <>
                  <input
                    value={l.designation}
                    onChange={(e) => set({ designation: e.target.value })}
                    placeholder="Désignation — ex. : étais métalliques"
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted focus:border-forest-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={l.quantite}
                      onChange={(e) => set({ quantite: Number(e.target.value) })}
                      className="rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-forest-400"
                    />
                    <select
                      value={l.unite}
                      onChange={(e) => set({ unite: e.target.value })}
                      className="rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400"
                    >
                      {UNITES.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </LignesEditeur>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!pret}
            icon={envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            onClick={() => {
              setEnvoi(true);
              onConfirmer({
                entrepriseId,
                type,
                motif: motif.trim(),
                destination: destination.trim(),
                lignes: valides.map((l) => ({ ...l, designation: l.designation.trim() })),
                vehicule: vehicule.trim() || undefined,
              });
            }}
          >
            Soumettre la demande
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Refus motivé ---------- */
function RefusSheet({ onAnnuler, onConfirmer }: { onAnnuler: () => void; onConfirmer: (motif: string) => void }) {
  const [motif, setMotif] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-card-lg sm:rounded-3xl">
        <div className="mb-1 flex items-center gap-2">
          <Ban className="h-5 w-5 text-danger-500" />
          <h3 className="text-lg font-extrabold text-ink">Refuser la demande</h3>
        </div>
        <p className="mb-3 text-sm text-muted">Un refus clôt le circuit et exige un motif (chap. 7.4).</p>
        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          placeholder="Motif du refus…"
          className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100"
        />
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>
            Annuler
          </Button>
          <Button variant="danger" size="lg" block disabled={motif.trim().length < 5} onClick={() => onConfirmer(motif.trim())}>
            Confirmer le refus
          </Button>
        </div>
      </div>
    </div>
  );
}
