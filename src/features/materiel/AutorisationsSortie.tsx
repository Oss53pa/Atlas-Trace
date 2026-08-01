import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { FakeQR } from '../badges/FakeQR';
import { useEntreprises } from './referentiel';
import { UNITES } from '../../data/entrees';
import {
  AUTORISATIONS,
  CIRCUIT_SORTIE,
  TYPE_LABEL,
  genererCode,
  type AutorisationSortie,
  type StatutSortie,
  type TypeSortie,
} from '../../data/autorisations';

export function AutorisationsSortie() {
  const [liste, setListe] = useState<AutorisationSortie[]>(AUTORISATIONS);
  const [sheet, setSheet] = useState(false);
  const [refusCible, setRefusCible] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const seq = 187 + liste.filter((a) => a.id.startsWith('new')).length;

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  }

  const stats = useMemo(() => ({
    aTraiter: liste.filter((a) => a.statut === 'SOUMISE' || a.statut === 'VISA').length,
    approuvees: liste.filter((a) => a.statut === 'APPROUVEE').length,
    refusees: liste.filter((a) => a.statut === 'REFUSEE').length,
  }), [liste]);

  function viser(id: string) {
    setListe((l) => l.map((a) => (a.id === id ? { ...a, statut: 'VISA', visaFait: true } : a)));
    flash('Visa HSE apposé · aucun code tant que l’approbation n’est pas donnée');
  }
  function approuver(id: string) {
    setListe((l) =>
      l.map((a) =>
        a.id === id
          ? { ...a, statut: 'APPROUVEE', approuve: true, code: genererCode(a.numero), validiteFin: '30/07/2026 08:14' }
          : a,
      ),
    );
    flash('Approuvée · code de sortie généré (usage unique, 24 h)');
  }
  function refuser(id: string, motif: string) {
    setListe((l) => l.map((a) => (a.id === id ? { ...a, statut: 'REFUSEE', motifRefus: motif } : a)));
    setRefusCible(null);
    flash('Demande refusée · motif consigné');
  }
  function creer(a: AutorisationSortie) {
    setListe((l) => [a, ...l]);
    setSheet(false);
    flash(`Demande ${a.numero} soumise · circuit lancé`);
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
              <FileOutput className="h-3.5 w-3.5" /> M9 · Lot matière
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Autorisation de sortie de matériel</h1>
            <p className="mt-1 text-sm text-muted">
              Circuit en données. Le code n'est généré qu'au franchissement de l'étape finale. Validité bornée, usage unique.
            </p>
          </div>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
            Nouvelle demande
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard tone="amber" label="À traiter" value={stats.aTraiter} icon={<ArrowRight className="h-5 w-5" />} />
          <StatCard tone="forest" label="Approuvées (code)" value={stats.approuvees} icon={<ShieldCheck className="h-5 w-5" />} />
          <DangerStat label="Refusées" value={stats.refusees} />
        </div>

        <ul className="space-y-3">
          {liste.map((a) => (
            <AutorisationCard
              key={a.id}
              a={a}
              onViser={() => viser(a.id)}
              onApprouver={() => approuver(a.id)}
              onRefuser={() => setRefusCible(a.id)}
            />
          ))}
        </ul>
      </div>

      {sheet && <DemandeSheet numero={`AS-2026-00${seq + 1}`} onAnnuler={() => setSheet(false)} onConfirmer={creer} />}
      {refusCible && (
        <RefusSheet onAnnuler={() => setRefusCible(null)} onConfirmer={(m) => refuser(refusCible, m)} />
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
  SOUMISE: <Badge tone="amber" dot>Soumise</Badge>,
  VISA: <Badge tone="amber" dot>Visa apposé</Badge>,
  APPROUVEE: <Badge tone="forest" dot>Approuvée · code</Badge>,
  REFUSEE: <Badge tone="danger" dot>Refusée</Badge>,
  CONSOMMEE: <Badge tone="neutral" dot>Consommée</Badge>,
  EXPIREE: <Badge tone="danger" dot>Expirée</Badge>,
};

function AutorisationCard({
  a,
  onViser,
  onApprouver,
  onRefuser,
}: {
  a: AutorisationSortie;
  onViser: () => void;
  onApprouver: () => void;
  onRefuser: () => void;
}) {
  const enCircuit = a.statut === 'SOUMISE' || a.statut === 'VISA';
  return (
    <li className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">{a.numero}</span>
            <Badge tone="neutral">{TYPE_LABEL[a.type]}</Badge>
          </div>
          <p className="mt-1 text-sm font-bold text-ink">{a.entreprise}</p>
          <p className="text-xs text-muted">
            Demandeur {a.demandeur} · {a.motif} → {a.destination}
            {a.vehicule && (
              <span className="ml-1 inline-flex items-center gap-1">
                · <Truck className="h-3 w-3" /> {a.vehicule}
              </span>
            )}
          </p>
        </div>
        {statutChip[a.statut]}
      </div>

      {/* Lignes */}
      <ul className="mt-2 space-y-0.5">
        {a.lignes.map((l, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-ink">
            <span className="h-1 w-1 rounded-full bg-forest-400" />
            {l.designation} · {l.quantite} {l.unite}
            {l.marquage && <span className="font-mono text-muted">· {l.marquage}</span>}
          </li>
        ))}
      </ul>

      {/* Circuit */}
      {a.statut !== 'REFUSEE' && <CircuitStepper a={a} />}

      {/* Refus */}
      {a.statut === 'REFUSEE' && (
        <div className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
          <Ban className="mr-1 inline h-3.5 w-3.5" /> Refusée — {a.motifRefus}
        </div>
      )}

      {/* Code ou absence de code */}
      {a.statut === 'APPROUVEE' && a.code ? (
        <CodeBloc code={a.code} validite={a.validiteFin!} />
      ) : enCircuit ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-sand-100 px-3 py-2 text-[11px] font-medium text-muted">
          <Lock className="h-3.5 w-3.5" /> Aucun code — étape finale (approbation) non franchie.
        </p>
      ) : null}

      {/* Actions */}
      {enCircuit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {a.statut === 'SOUMISE' ? (
            <Button variant="outline" size="sm" icon={<ShieldCheck className="h-4 w-4" />} onClick={onViser}>
              Viser (HSE Officer)
            </Button>
          ) : (
            <Button variant="primary" size="sm" icon={<Check className="h-4 w-4" strokeWidth={3} />} onClick={onApprouver}>
              Approuver (Directeur)
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-danger-600" icon={<Ban className="h-4 w-4" />} onClick={onRefuser}>
            Refuser
          </Button>
          <span className="text-[11px] text-muted">Visa et approbation par des personnes distinctes (R6).</span>
        </div>
      )}
    </li>
  );
}

function CircuitStepper({ a }: { a: AutorisationSortie }) {
  const etat = (ordre: number): 'fait' | 'courant' | 'attente' => {
    if (ordre === 1) return 'fait';
    if (ordre === 2) return a.visaFait ? 'fait' : 'courant';
    return a.approuve ? 'fait' : a.visaFait ? 'courant' : 'attente';
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sand-200 pt-3">
      {CIRCUIT_SORTIE.map((s, i) => {
        const et = etat(s.ordre);
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
            >
              {et === 'fait' && <Check className="h-3 w-3" strokeWidth={3} />}
              {s.role}
              {'effetFinal' in s && s.effetFinal && ' ⚑'}
            </span>
            {i < CIRCUIT_SORTIE.length - 1 && <ArrowRight className="h-3 w-3 text-muted" />}
          </div>
        );
      })}
    </div>
  );
}

function CodeBloc({ code, validite }: { code: string; validite: string }) {
  return (
    <div className="mt-3 flex items-center gap-4 rounded-2xl bg-forest-500 p-4 text-white">
      <div className="rounded-xl bg-white p-1.5">
        <FakeQR value={code} size={68} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
          <QrCode className="h-3.5 w-3.5" /> Code de sortie
        </p>
        <p className="truncate font-mono text-sm font-bold">{code}</p>
        <p className="mt-1 text-xs text-white/85">Valide jusqu'au {validite} · usage unique · consommation totale</p>
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
function DemandeSheet({
  numero,
  onAnnuler,
  onConfirmer,
}: {
  numero: string;
  onAnnuler: () => void;
  onConfirmer: (a: AutorisationSortie) => void;
}) {
  const entreprises = useEntreprises();
  const [entreprise, setEntreprise] = useState('');
  const [type, setType] = useState<TypeSortie>('SITE');
  const [motif, setMotif] = useState('');
  const [destination, setDestination] = useState('');
  const [designation, setDesignation] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [unite, setUnite] = useState('u');
  const [vehicule, setVehicule] = useState('');
  const pret = motif.trim() && destination.trim() && designation.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouvelle demande de sortie</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">
          N° <b className="font-mono text-ink">{numero}</b> · le code ne sera généré qu'après approbation.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
              <select value={entreprise} onChange={(e) => setEntreprise(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {entreprises.length === 0 && <option value="">Aucune entreprise declaree</option>}
                {entreprises.map((e) => <option key={e.id}>{e.raisonSociale}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as TypeSortie)}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                <option value="SITE">Matériel du site</option>
                <option value="ENTREPRISE">Matériel de l'entreprise</option>
                <option value="DECHETS">Déchets & emballages</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Motif</span>
            <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : retour en dépôt"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Destination</span>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex. : dépôt Yopougon"
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
          </label>
          <div className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Ligne de matériel</p>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Désignation"
              className="mb-2 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)}
                className="rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
              <select value={unite} onChange={(e) => setUnite(e.target.value)}
                className="rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {UNITES.map((u) => <option key={u}>{u}</option>)}
              </select>
              <input value={vehicule} onChange={(e) => setVehicule(e.target.value)} placeholder="Véhicule"
                className="rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret}
            onClick={() => onConfirmer({
              id: `new-${numero}`, numero, entreprise, demandeur: 'Référent', type,
              motif: motif.trim(), destination: destination.trim(),
              lignes: [{ designation: designation.trim(), quantite: Number(quantite), unite }],
              vehicule: vehicule.trim() || undefined,
              statut: 'SOUMISE', visaFait: false, approuve: false,
            })}>
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
        <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2}
          placeholder="Motif du refus…"
          className="w-full resize-none rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="danger" size="lg" block disabled={motif.trim().length < 5} onClick={() => onConfirmer(motif.trim())}>
            Confirmer le refus
          </Button>
        </div>
      </div>
    </div>
  );
}
