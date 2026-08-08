import { useEffect, useState, type ReactNode } from 'react';
import {
  ScanLine, GitBranch, Truck, Package, SlidersHorizontal, Map, Building2, Users, Gauge, Car,
  Check, ArrowRight, ArrowLeft, Sparkles, LayoutGrid, ListChecks, Loader2, LogIn, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz } from '../../lib/authz';
import { Button } from '../../components/ui/Button';

/**
 * « Configurer mon chantier » — point d'entrée unique de la configuration (M-config).
 * Deux modes : vue d'ensemble (cartes + état réel « configuré / à faire ») et
 * assistant pas-à-pas. L'état vient de `at_etat_configuration()` (lecture réelle).
 * Chaque composante ouvre l'écran dédié existant ; l'étape de l'assistant est
 * mémorisée pour reprendre au retour.
 */

type Etat = Record<string, number>;

interface Area {
  cle: keyof Etat & string;
  titre: string;
  desc: string;
  vue: string;
  icon: ReactNode;
}

const AREAS: Area[] = [
  { cle: 'postes', titre: 'Postes de contrôle', desc: 'Les points d’entrée où l’on scanne les badges.', vue: 'parametrage', icon: <ScanLine className="h-5 w-5" /> },
  { cle: 'circuits', titre: 'Circuits d’habilitation', desc: 'Le parcours de validation des habilitations.', vue: 'parametrage', icon: <GitBranch className="h-5 w-5" /> },
  { cle: 'creneaux', titre: 'Créneaux de livraison', desc: 'Les fenêtres horaires autorisées pour livrer.', vue: 'parametrage', icon: <Truck className="h-5 w-5" /> },
  { cle: 'familles', titre: 'Familles de matériel', desc: 'Les catégories de matière suivies sur site.', vue: 'parametrage', icon: <Package className="h-5 w-5" /> },
  { cle: 'referentiels', titre: 'Référentiels', desc: 'Types de badges, motifs, listes de référence.', vue: 'parametrage', icon: <SlidersHorizontal className="h-5 w-5" /> },
  { cle: 'emprises', titre: 'Zones & emprises', desc: 'Le découpage spatial du chantier.', vue: 'espaces', icon: <Map className="h-5 w-5" /> },
  { cle: 'entreprises', titre: 'Entreprises intervenantes', desc: 'Les sociétés présentes et leurs habilitations.', vue: 'entites', icon: <Building2 className="h-5 w-5" /> },
  { cle: 'comptes', titre: 'Comptes & rôles', desc: 'Les personnes internes et leurs droits.', vue: 'comptes', icon: <Users className="h-5 w-5" /> },
  { cle: 'plafonds', titre: 'Plafonds d’effectif', desc: 'Les effectifs maximum par entreprise.', vue: 'plafonds', icon: <Gauge className="h-5 w-5" /> },
  { cle: 'vehicules', titre: 'Véhicules autorisés', desc: 'Les véhicules pré-déclarés reconnus au poste.', vue: 'vehicules', icon: <Car className="h-5 w-5" /> },
];

const CLE_MODE = 'at_config_mode';
const CLE_STEP = 'at_config_step';

export function ConfigurationChantier({ onOpen }: { onOpen: (v: string) => void }) {
  const { connecte } = useAuthz();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [mode, setMode] = useState<'apercu' | 'assistant'>(() =>
    localStorage.getItem(CLE_MODE) === 'assistant' ? 'assistant' : 'apercu',
  );
  const [step, setStep] = useState(() => {
    const n = Number(localStorage.getItem(CLE_STEP) ?? 0);
    return Number.isFinite(n) && n >= 0 && n < AREAS.length ? n : 0;
  });

  useEffect(() => {
    if (!connecte) { setChargement(false); return; }
    let annule = false;
    setChargement(true);
    supabase.rpc('at_etat_configuration').then(({ data, error }) => {
      if (annule) return;
      if (error) setErreur(error.message);
      else { setEtat(data as Etat); setErreur(null); }
      setChargement(false);
    });
    return () => { annule = true; };
  }, [connecte]);

  useEffect(() => { localStorage.setItem(CLE_MODE, mode); }, [mode]);
  useEffect(() => { localStorage.setItem(CLE_STEP, String(step)); }, [step]);

  const estFait = (cle: string) => (etat?.[cle] ?? 0) > 0;
  const faits = AREAS.filter((a) => estFait(a.cle)).length;
  const pct = Math.round((faits / AREAS.length) * 100);

  if (!connecte) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60"><LogIn className="h-7 w-7" /></span>
        <p className="text-base font-bold text-ink">Connexion requise</p>
        <p className="text-sm">La configuration du chantier est réservée à l’administration.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
            <Sparkles className="h-3.5 w-3.5" /> Administration
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Configurer mon chantier</h1>
          <p className="mt-1 text-sm text-muted">
            Toutes les composantes de votre site en un endroit. Suivez l’avancement et complétez ce qu’il manque.
          </p>
        </div>

        {/* Progression + bascule de mode */}
        <div className="mb-5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">
                {chargement ? 'Analyse de la configuration…' : `${faits} / ${AREAS.length} composantes configurées`}
              </p>
              <div className="mt-2 h-2 w-56 max-w-full overflow-hidden rounded-full bg-sand-200">
                <div className="h-full rounded-full bg-forest-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex gap-1 rounded-full bg-sand-100 p-1 ring-1 ring-sand-300">
              <button onClick={() => setMode('apercu')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'apercu' ? 'bg-forest-500 text-white' : 'text-muted'}`}>
                <LayoutGrid className="h-3.5 w-3.5" /> Vue d’ensemble
              </button>
              <button onClick={() => setMode('assistant')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'assistant' ? 'bg-forest-500 text-white' : 'text-muted'}`}>
                <ListChecks className="h-3.5 w-3.5" /> Assistant
              </button>
            </div>
          </div>
        </div>

        {erreur && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>
        )}

        {chargement ? (
          <div className="flex min-h-[30vh] items-center justify-center text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : mode === 'apercu' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((a) => (
              <CarteArea key={a.cle} area={a} fait={estFait(a.cle)} n={etat?.[a.cle] ?? 0} onOpen={() => onOpen(a.vue)} />
            ))}
          </div>
        ) : (
          <Assistant
            area={AREAS[step]}
            index={step}
            total={AREAS.length}
            fait={estFait(AREAS[step].cle)}
            n={etat?.[AREAS[step].cle] ?? 0}
            onOpen={() => onOpen(AREAS[step].vue)}
            onPrev={() => setStep((s) => Math.max(0, s - 1))}
            onNext={() => setStep((s) => Math.min(AREAS.length - 1, s + 1))}
          />
        )}
      </div>
    </div>
  );
}

function StatutBadge({ fait, n }: { fait: boolean; n: number }) {
  return fait ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-bold text-forest-700 ring-1 ring-forest-100">
      <Check className="h-3 w-3" strokeWidth={3} /> Configuré · {n}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
      À faire
    </span>
  );
}

function CarteArea({ area, fait, n, onOpen }: { area: Area; fait: boolean; n: number; onOpen: () => void }) {
  return (
    <button onClick={onOpen}
      className="group flex flex-col rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-sand-300/70 transition-all hover:-translate-y-0.5 hover:shadow-card-lg">
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${fait ? 'bg-forest-50 text-forest-600' : 'bg-amber-50 text-amber-600'}`}>
          {area.icon}
        </span>
        <StatutBadge fait={fait} n={n} />
      </div>
      <p className="mt-3 text-sm font-bold text-ink">{area.titre}</p>
      <p className="mt-0.5 text-xs text-muted">{area.desc}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-600">
        {fait ? 'Gérer' : 'Configurer'} <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function Assistant({
  area, index, total, fait, n, onOpen, onPrev, onNext,
}: {
  area: Area; index: number; total: number; fait: boolean; n: number;
  onOpen: () => void; onPrev: () => void; onNext: () => void;
}) {
  const dernier = index === total - 1;
  return (
    <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-sand-300/70">
      <div className="mb-4 flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-forest-400' : i === index ? 'bg-forest-500' : 'bg-sand-200'}`} />
        ))}
      </div>
      <p className="text-xs font-semibold text-muted">Étape {index + 1} / {total}</p>

      <div className="mt-3 flex items-start gap-4">
        <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${fait ? 'bg-forest-50 text-forest-600' : 'bg-amber-50 text-amber-600'}`}>
          {area.icon}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-ink">{area.titre}</h2>
            <StatutBadge fait={fait} n={n} />
          </div>
          <p className="mt-1 text-sm text-muted">{area.desc}</p>
        </div>
      </div>

      <div className="mt-5">
        <Button variant="primary" size="lg" block icon={<ArrowRight className="h-4 w-4" />} onClick={onOpen}>
          Ouvrir l’écran de {area.titre.toLowerCase()}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted">
          Vous configurez sur l’écran dédié, puis revenez ici : l’assistant reprend à cette étape.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-sand-200 pt-4">
        <Button variant="ghost" size="md" disabled={index === 0} icon={<ArrowLeft className="h-4 w-4" />} onClick={onPrev}>
          Précédent
        </Button>
        <Button variant={dernier ? 'primary' : 'outline'} size="md" onClick={dernier ? undefined : onNext} disabled={dernier}>
          {dernier ? 'Dernière étape' : 'Étape suivante'}
        </Button>
      </div>
    </div>
  );
}
