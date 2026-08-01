import { useMemo, useState } from 'react';
import {
  Plus,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  Link2,
  ArrowRight,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import {
  CATEGORIES,
  CIRCUIT_HABILITATION,
  ENTREPRISES,
  conditionsManquantes,
  donneurBloque,
  type DonneurOrdre,
  type Entreprise,
  type StatutEntreprise,
} from '../../data/entreprises';

const cat = (id: string) => CATEGORIES.find((c) => c.id === id);

export function Entreprises({ donneurs }: { donneurs: DonneurOrdre[] }) {
  const [liste, setListe] = useState<Entreprise[]>(ENTREPRISES);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }

  const stats = useMemo(() => {
    return {
      total: liste.length,
      actives: liste.filter((e) => e.statut === 'ACTIVE').length,
      validation: liste.filter((e) => e.statut === 'EN_VALIDATION').length,
      brouillon: liste.filter((e) => e.statut === 'BROUILLON').length,
    };
  }, [liste]);

  function viser(id: string) {
    setListe((l) => l.map((e) => (e.id === id ? { ...e, visaHSE: true } : e)));
    flash('Visa HSE apposé');
  }
  function approuver(id: string) {
    setListe((l) => l.map((e) => (e.id === id ? { ...e, approuve: true, statut: 'ACTIVE' } : e)));
    flash('Entreprise habilitée · active');
  }

  function ajouter(e: Entreprise) {
    setListe((l) => [e, ...l]);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
            <Building2 className="h-3.5 w-3.5" /> M1 · Entreprises
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Entreprises intervenantes</h1>
          <p className="mt-1 text-sm text-muted">
            Fiche complétée par le référent depuis son lien. Le circuit d'habilitation s'exécute en données.
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>
          Nouvelle fiche
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tone="forest" label="Entreprises" value={stats.total} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Actives" value={stats.actives} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard tone="amber" label="En validation" value={stats.validation} icon={<ArrowRight className="h-5 w-5" />} />
        <StatCard tone="plain" label="Brouillons" value={stats.brouillon} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <ul className="space-y-2">
        {liste.map((e) => (
          <EntrepriseRow key={e.id} e={e} donneurs={donneurs} onViser={() => viser(e.id)} onApprouver={() => approuver(e.id)} />
        ))}
      </ul>

      {sheet && (
        <FicheSheet
          donneurs={donneurs}
          existantes={liste}
          onAnnuler={() => setSheet(false)}
          onCree={(e, msg) => {
            ajouter(e);
            setSheet(false);
            flash(msg);
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
    </div>
  );
}

const statutChip: Record<StatutEntreprise, React.ReactNode> = {
  ACTIVE: <Badge tone="forest" dot>Active</Badge>,
  EN_VALIDATION: <Badge tone="amber" dot>En validation</Badge>,
  BROUILLON: <Badge tone="neutral" dot>Brouillon</Badge>,
  SUSPENDUE: <Badge tone="danger" dot>Suspendue</Badge>,
};

function EntrepriseRow({
  e,
  donneurs,
  onViser,
  onApprouver,
}: {
  e: Entreprise;
  donneurs: DonneurOrdre[];
  onViser: () => void;
  onApprouver: () => void;
}) {
  const c = cat(e.categorieId);
  const donneur = e.donneurOrdreId ? donneurs.find((d) => d.id === e.donneurOrdreId) : undefined;
  const bloque = donneur ? donneurBloque(donneur) : false;

  return (
    <li className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{e.raisonSociale}</p>
          <p className="mt-0.5 text-xs text-muted">
            {c?.libelle}
            {e.titulaire && ` · sous-traitant de ${e.titulaire}`}
            {donneur && ` · ${donneur.libelle}`}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Référent {e.referent} · assurance éch. {e.assuranceEcheance.split('-').reverse().join('/')}
          </p>
        </div>
        {statutChip[e.statut]}
      </div>

      {/* Fiche bloquée par preneur */}
      {e.statut === 'BROUILLON' && bloque && (
        <div className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">
          <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
          Preneur bloqué — soumission impossible ({conditionsManquantes(donneur!).length} condition(s) manquante(s))
        </div>
      )}

      {/* Circuit d'habilitation */}
      {(e.statut === 'EN_VALIDATION' || e.statut === 'ACTIVE') && (
        <CircuitStepper e={e} onViser={onViser} onApprouver={onApprouver} />
      )}
    </li>
  );
}

function CircuitStepper({ e, onViser, onApprouver }: { e: Entreprise; onViser: () => void; onApprouver: () => void }) {
  const etat = (ordre: number): 'fait' | 'courant' | 'attente' => {
    if (ordre === 1) return 'fait';
    if (ordre === 2) return e.visaHSE ? 'fait' : 'courant';
    return e.approuve ? 'fait' : e.visaHSE ? 'courant' : 'attente';
  };
  return (
    <div className="mt-3 border-t border-sand-200 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {CIRCUIT_HABILITATION.map((s, i) => {
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
              </span>
              {i < CIRCUIT_HABILITATION.length - 1 && <ArrowRight className="h-3 w-3 text-muted" />}
            </div>
          );
        })}
      </div>
      {e.statut === 'EN_VALIDATION' && (
        <div className="mt-2.5 flex items-center gap-2">
          {!e.visaHSE ? (
            <Button variant="outline" size="sm" icon={<ShieldCheck className="h-4 w-4" />} onClick={onViser}>
              Viser (HSE Officer)
            </Button>
          ) : (
            <Button variant="primary" size="sm" icon={<Check className="h-4 w-4" strokeWidth={3} />} onClick={onApprouver}>
              Approuver (Directeur)
            </Button>
          )}
          <span className="text-[11px] text-muted">Visa et approbation par des personnes distinctes (R6).</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Nouvelle fiche (référent) ---------- */
function FicheSheet({
  donneurs,
  existantes,
  onAnnuler,
  onCree,
}: {
  donneurs: DonneurOrdre[];
  existantes: Entreprise[];
  onAnnuler: () => void;
  onCree: (e: Entreprise, msg: string) => void;
}) {
  const [raison, setRaison] = useState('');
  const [categorieId, setCategorieId] = useState('chantier');
  const [donneurId, setDonneurId] = useState(donneurs[0]?.id ?? '');
  const [referent, setReferent] = useState('');
  const [doublonConfirme, setDoublonConfirme] = useState(false);
  const [refus, setRefus] = useState<DonneurOrdre | null>(null);

  const categorie = CATEGORIES.find((c) => c.id === categorieId)!;
  const requiertDO = categorie.requiertDonneurOrdre;
  const donneur = donneurs.find((d) => d.id === donneurId);
  const doublon = existantes.find((e) => e.raisonSociale.trim().toLowerCase() === raison.trim().toLowerCase());
  const pret = raison.trim() && referent.trim();

  function nouvelle(statut: StatutEntreprise): Entreprise {
    return {
      id: `new-${Date.now() /* mock */}`,
      raisonSociale: raison.trim(),
      categorieId,
      donneurOrdreId: requiertDO ? donneurId : undefined,
      empriseId: requiertDO ? donneur?.empriseId : undefined,
      referent: referent.trim(),
      assuranceEcheance: '2027-07-29',
      statut,
      visaHSE: false,
      approuve: false,
    };
  }

  function soumettre() {
    if (doublon && !doublonConfirme) {
      setDoublonConfirme(true); // afficher l'avertissement, exiger confirmation
      return;
    }
    if (requiertDO && donneur && donneurBloque(donneur)) {
      setRefus(donneur); // cas 20 : refus, conditions manquantes affichées
      return;
    }
    onCree(nouvelle('EN_VALIDATION'), 'Fiche soumise · circuit d\'habilitation lancé');
  }

  const input = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input value={value} onChange={(e) => { set(e.target.value); setDoublonConfirme(false); setRefus(null); }} placeholder={ph}
        className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouvelle fiche entreprise</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 flex items-center gap-1.5 text-xs text-muted">
          <Link2 className="h-3.5 w-3.5" /> Saisie par le référent depuis son lien.
        </p>

        <div className="space-y-3">
          {input('Raison sociale', raison, setRaison, 'Ex. : Menuiserie Ébène')}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Catégorie d'intervenant</span>
            <select value={categorieId} onChange={(e) => { setCategorieId(e.target.value); setRefus(null); }}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
            </select>
          </label>

          {requiertDO && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">Preneur</span>
              <select value={donneurId} onChange={(e) => { setDonneurId(e.target.value); setRefus(null); }}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
                {donneurs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.libelle} {donneurBloque(d) ? '— bloqué' : '— autorisé'}
                  </option>
                ))}
              </select>
            </label>
          )}

          {input('Référent (correspondant sécurité)', referent, setReferent, 'Nom du référent')}
        </div>

        {/* Détection de doublon */}
        {doublon && doublonConfirme && (
          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
            Doublon possible : « {doublon.raisonSociale} » existe déjà. Vérifiez avant de créer.
          </div>
        )}

        {/* Refus : preneur bloqué (cas 20) */}
        {refus && (
          <div className="mt-3 rounded-xl bg-danger-50 p-3 ring-1 ring-danger-100">
            <p className="flex items-center gap-1.5 text-xs font-bold text-danger-600">
              <ShieldAlert className="h-4 w-4" /> Soumission refusée — preneur bloqué
            </p>
            <p className="mt-1 text-[11px] font-semibold text-danger-600">Conditions manquantes :</p>
            <ul className="mt-1 list-inside list-disc text-[11px] text-danger-600">
              {conditionsManquantes(refus).map((c) => <li key={c.id}>{c.libelle}</li>)}
            </ul>
            <p className="mt-2 text-[11px] text-muted">
              La fiche peut être conservée en brouillon ; aucun badge n'est possible tant que le
              preneur reste bloqué.
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          {refus ? (
            <Button variant="outline" size="lg" block onClick={() => onCree(nouvelle('BROUILLON'), 'Fiche conservée en brouillon')}>
              Enregistrer en brouillon
            </Button>
          ) : (
            <Button variant="primary" size="lg" block disabled={!pret} onClick={soumettre}>
              {doublon && !doublonConfirme ? 'Vérifier & soumettre' : 'Soumettre'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
