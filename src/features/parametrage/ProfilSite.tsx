import { useCallback, useEffect, useState } from 'react';
import {
  Layers, Building2, Zap, Anchor, FilePlus2, Check, X, Plus, ArrowRight, ArrowLeft,
  GitBranch, MapPin, Users, KeyRound, ClipboardCheck, Save, RotateCcw, Info, Loader2, LogIn,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthz } from '../../lib/authz';
import { chargerProfilSite, appliquerProfil } from './api';
import {
  EFFET_AXE, PREREGLAGES, PROFIL_VIERGE,
  type AxesProfil, type Prereglage, type RegimeVisiteurs,
} from '../../data/profils';

const VISITEURS_LABEL: Record<RegimeVisiteurs, string> = { AUCUN: 'Non accueillis', ESCORTE: 'Escorte obligatoire', LIBRE: 'Accès libre' };

const PROFIL_VIERGE_COMPLET: Prereglage = {
  id: 'vierge', nom: 'Profil vierge', description: 'Tout est désactivé au départ. À composer axe par axe.',
  axes: PROFIL_VIERGE,
  qualification: { lienContractuel: ['Entreprise contractante', 'Prestataire ponctuel'], regimeAcces: ['Permanent (badge nominatif)'] },
  roles: [{ nom: 'Direction du site', perimetre: 'Site' }, { nom: 'Chef de poste', perimetre: 'Site' }, { nom: 'Agent de contrôle', perimetre: 'Site' }, { nom: 'Référent entreprise', perimetre: 'Entreprise' }],
  chaines: [{ objet: 'Habilitation d’entreprise', etapes: [{ role: 'Référent entreprise', perimetre: 'Entreprise' }, { role: 'Direction du site', perimetre: 'Site' }] }],
  resteAFaire: ['Nommer les niveaux d’emprise', 'Composer les rôles', 'Définir les chaînes de validation', 'Importer les entreprises'],
};

const ICONE: Record<string, React.ReactNode> = {
  chantier: <Building2 className="h-5 w-5" />, industriel: <Zap className="h-5 w-5" />, portuaire: <Anchor className="h-5 w-5" />, vierge: <FilePlus2 className="h-5 w-5" />,
};

const baseDeId = (id: string): Prereglage => PREREGLAGES.find((p) => p.id === id) ?? PROFIL_VIERGE_COMPLET;

export function ProfilSite() {
  const { connecte, chargement: authEnCours, a } = useAuthz();
  const peutAppliquer = a('ADMINISTRER_ORGANISATION');

  const [etape, setEtape] = useState(1);
  const [base, setBase] = useState<Prereglage>(PREREGLAGES[0]);
  const [axes, setAxes] = useState<AxesProfil>(PREREGLAGES[0].axes);
  const [modifie, setModifie] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [modelesMaison, setModelesMaison] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [actuel, setActuel] = useState<{ etiquette: string; appliqueAt: string; appliquePar: string | null } | null>(null);

  const charger = useCallback(async () => {
    try {
      const p = await chargerProfilSite();
      if (p) {
        setBase(baseDeId(p.baseId));
        setAxes(p.axes);
        setModifie(false);
        setActuel({ etiquette: p.etiquette, appliqueAt: p.appliqueAt, appliquePar: p.appliquePar });
      }
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (!connecte) { setChargement(false); return; }
    charger();
  }, [connecte, charger]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2600); }
  function maj<K extends keyof AxesProfil>(k: K, v: AxesProfil[K]) { setAxes((a) => ({ ...a, [k]: v })); setModifie(true); }

  function choisir(p: Prereglage) {
    setBase(p); setAxes(p.axes); setModifie(false); setChecklist({}); setEtape(2);
  }

  const etiquette = modifie ? `Profil personnalisé, issu de « ${base.nom} »` : base.nom;

  async function appliquer() {
    try {
      await appliquerProfil(base.id, etiquette, axes);
      setActuel({ etiquette, appliqueAt: new Date().toISOString(), appliquePar: null });
      setEtape(4);
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  if (authEnCours || chargement) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!connecte) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60"><LogIn className="h-7 w-7" /></span>
        <p className="text-base font-bold text-ink">Connexion requise</p>
        <p className="text-sm">Le profil de site est une configuration réservée aux comptes autorisés.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Layers className="h-3.5 w-3.5" /> Paramétrage</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Profil de site</h1>
        <p className="mt-1 text-sm text-muted">La configuration d’un site se pose par axes structurels. Les préréglages ne sont que des points de départ — tout reste modifiable ensuite.</p>
      </div>

      {actuel && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-forest-50 px-4 py-3 text-sm text-forest-800 ring-1 ring-forest-100">
          <Check className="h-4 w-4 shrink-0 text-forest-500" />
          Profil actuel : <b>{actuel.etiquette}</b>
          <span className="text-xs text-forest-600">· appliqué le {new Date(actuel.appliqueAt).toLocaleDateString('fr-FR')}{actuel.appliquePar ? ` par ${actuel.appliquePar}` : ''}</span>
        </div>
      )}
      {erreur && (
        <div className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</div>
      )}
      {!peutAppliquer && (
        <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          Lecture seule — l'application d'un profil requiert le pouvoir ADMINISTRER_ORGANISATION.
        </div>
      )}

      <Progression etape={etape} />

      {etape === 1 && <Etape1 modelesMaison={modelesMaison} onChoisir={choisir} />}
      {etape === 2 && <Etape2 axes={axes} maj={maj} onRetour={() => setEtape(1)} onSuite={() => setEtape(3)} />}
      {etape === 3 && <Etape3 base={base} axes={axes} etiquette={etiquette} peutAppliquer={peutAppliquer} onRetour={() => setEtape(2)} onAppliquer={appliquer} />}
      {etape === 4 && (
        <Etape4
          base={base} etiquette={etiquette} modifie={modifie} checklist={checklist}
          onToggle={(t) => setChecklist((c) => ({ ...c, [t]: !c[t] }))}
          onModele={() => { setModelesMaison((m) => [...m, etiquette]); flash('Profil enregistré comme modèle maison'); }}
          onRevenir={() => { setAxes(base.axes); setModifie(false); setEtape(2); flash('Retour au préréglage d’origine'); }}
          onRecommencer={() => { setEtape(1); }}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- Progression ---------- */
function Progression({ etape }: { etape: number }) {
  const pas = ['Point de départ', 'Assistant de profil', 'Récapitulatif', 'Application'];
  return (
    <div className="mb-6 flex items-center gap-2">
      {pas.map((p, i) => {
        const n = i + 1; const actif = n === etape; const fait = n < etape;
        return (
          <div key={p} className="flex flex-1 items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${fait ? 'bg-forest-500 text-white' : actif ? 'bg-forest-500 text-white ring-4 ring-forest-100' : 'bg-sand-200 text-muted'}`}>
              {fait ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={`hidden text-xs font-semibold sm:block ${actif || fait ? 'text-ink' : 'text-muted'}`}>{p}</span>
            {i < pas.length - 1 && <span className={`h-0.5 flex-1 rounded ${fait ? 'bg-forest-400' : 'bg-sand-300'}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Temps 1 : point de départ ---------- */
function Etape1({ modelesMaison, onChoisir }: { modelesMaison: string[]; onChoisir: (p: Prereglage) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted">Choisissez un point de départ. Il pré-remplit les axes ; vous ajustez tout ensuite.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PREREGLAGES.map((p) => (
          <button key={p.id} onClick={() => onChoisir(p)} className="group flex flex-col rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-sand-300/70 transition-all hover:-translate-y-0.5 hover:ring-forest-300">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">{ICONE[p.id]}</span>
            <p className="mt-2 text-sm font-extrabold text-ink">{p.nom}</p>
            <p className="mt-0.5 flex-1 text-xs text-muted">{p.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-600">Partir de ce préréglage <ArrowRight className="h-3.5 w-3.5" /></span>
          </button>
        ))}
        <button onClick={() => onChoisir(PROFIL_VIERGE_COMPLET)} className="group flex flex-col rounded-2xl border-2 border-dashed border-sand-300 bg-sand-50 p-4 text-left transition-colors hover:border-forest-300 hover:bg-forest-50/40">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-muted ring-1 ring-sand-300">{ICONE.vierge}</span>
          <p className="mt-2 text-sm font-extrabold text-ink">Partir d’un profil vierge</p>
          <p className="mt-0.5 flex-1 text-xs text-muted">Tout désactivé. À composer entièrement, axe par axe.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-600">Composer de zéro <ArrowRight className="h-3.5 w-3.5" /></span>
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
        <p className="text-sm font-bold text-ink">Mes modèles maison</p>
        {modelesMaison.length === 0 ? (
          <p className="mt-1 text-xs text-muted">Aucun modèle enregistré. Un profil ajusté peut être enregistré comme modèle et réutilisé sur vos autres sites.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">{modelesMaison.map((m, i) => <Badge key={i} tone="forest" dot>{m}</Badge>)}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- Temps 2 : assistant ---------- */
function Etape2({ axes, maj, onRetour, onSuite }: { axes: AxesProfil; maj: <K extends keyof AxesProfil>(k: K, v: AxesProfil[K]) => void; onRetour: () => void; onSuite: () => void }) {
  const actifs = modulesActifs(axes);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        <Toggle label="Preneur externe" aide={axes.donneurOrdre ? EFFET_AXE.donneurOrdreOn : EFFET_AXE.donneurOrdreOff} on={axes.donneurOrdre} onToggle={() => maj('donneurOrdre', !axes.donneurOrdre)}>
          {axes.donneurOrdre && (
            <label className="mt-2 block">
              <span className="mb-1 block text-[11px] font-semibold text-muted">Libellé de l’entité</span>
              <input value={axes.donneurOrdreLabel} onChange={(e) => maj('donneurOrdreLabel', e.target.value)} placeholder="Maître d’ouvrage, client, exploitant, concédant…"
                className="w-full rounded-lg border border-sand-300 bg-sand-50 px-3 py-1.5 text-sm text-ink outline-none focus:border-forest-400" />
            </label>
          )}
        </Toggle>

        <NiveauxEmprise niveaux={axes.niveauxEmprise} onChange={(n) => maj('niveauxEmprise', n)} />

        <Toggle label="Population tournante" aide={axes.populationTournante ? EFFET_AXE.tournanteOn : EFFET_AXE.tournanteOff} on={axes.populationTournante} onToggle={() => maj('populationTournante', !axes.populationTournante)} />
        <Toggle label="Personnel propre" aide={axes.personnelPropre ? EFFET_AXE.personnelOn : EFFET_AXE.personnelOff} on={axes.personnelPropre} onToggle={() => maj('personnelPropre', !axes.personnelPropre)} />
        <Toggle label="Flux matière sortant" aide={axes.fluxMatiereSortant ? EFFET_AXE.fluxOn : EFFET_AXE.fluxOff} on={axes.fluxMatiereSortant} onToggle={() => maj('fluxMatiereSortant', !axes.fluxMatiereSortant)} />
        <Toggle label="Matériel entrant" aide={axes.materielEntrant ? EFFET_AXE.materielOn : EFFET_AXE.materielOff} on={axes.materielEntrant} onToggle={() => maj('materielEntrant', !axes.materielEntrant)} />
        <Toggle label="Véhicules et livraisons" aide={axes.vehiculesLivraisons ? EFFET_AXE.vehiculesOn : EFFET_AXE.vehiculesOff} on={axes.vehiculesLivraisons} onToggle={() => maj('vehiculesLivraisons', !axes.vehiculesLivraisons)} />

        <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
          <p className="text-sm font-bold text-ink">Visiteurs</p>
          <div className="mt-2 flex gap-1 rounded-xl bg-sand-200 p-1">
            {(['AUCUN', 'ESCORTE', 'LIBRE'] as RegimeVisiteurs[]).map((v) => (
              <button key={v} onClick={() => maj('visiteurs', v)} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${axes.visiteurs === v ? 'bg-forest-500 text-white shadow-card' : 'text-muted'}`}>{VISITEURS_LABEL[v]}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Effet en temps réel */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl bg-forest-50 p-4 ring-1 ring-forest-100">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-forest-700">Ce qui est actif</p>
          <ul className="space-y-1.5">
            {actifs.map((m) => (
              <li key={m.label} className={`flex items-center gap-1.5 text-xs ${m.on ? 'font-semibold text-ink' : 'text-muted line-through'}`}>
                {m.on ? <Check className="h-3.5 w-3.5 text-forest-500" /> : <X className="h-3.5 w-3.5 text-sand-400" />}{m.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" className="flex-none px-4" icon={<ArrowLeft className="h-4 w-4" />} onClick={onRetour}>Retour</Button>
          <Button variant="primary" block icon={<ArrowRight className="h-4 w-4" />} onClick={onSuite}>Récapitulatif</Button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, aide, on, onToggle, children }: { label: string; aide: string; on: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-bold text-ink">{label}</p><p className="mt-0.5 text-xs text-muted">{aide}</p></div>
        <button onClick={onToggle} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-forest-500' : 'bg-sand-300'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {children}
    </div>
  );
}

function NiveauxEmprise({ niveaux, onChange }: { niveaux: string[]; onChange: (n: string[]) => void }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-bold text-ink">Arborescence d’emprise</p><p className="mt-0.5 text-xs text-muted">1 à 4 niveaux, chacun librement nommé.</p></div>
        {niveaux.length < 4 && (
          <button onClick={() => onChange([...niveaux, 'Niveau'])} className="inline-flex items-center gap-1 rounded-lg bg-forest-50 px-2.5 py-1.5 text-xs font-semibold text-forest-700 hover:bg-forest-100"><Plus className="h-3.5 w-3.5" /> Niveau</button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {niveaux.map((n, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg bg-sand-50 px-2 py-1 ring-1 ring-sand-300">
              <MapPin className="h-3 w-3 text-forest-500" />
              <input value={n} onChange={(e) => onChange(niveaux.map((x, j) => (j === i ? e.target.value : x)))} className="w-24 bg-transparent text-xs font-semibold text-ink outline-none" />
              {i > 0 && <button onClick={() => onChange(niveaux.filter((_, j) => j !== i))} className="text-muted hover:text-danger-500"><X className="h-3 w-3" /></button>}
            </span>
            {i < niveaux.length - 1 && <ArrowRight className="h-3 w-3 text-muted" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Temps 3 : récapitulatif ---------- */
function Etape3({ base, axes, etiquette, peutAppliquer, onRetour, onAppliquer }: { base: Prereglage; axes: AxesProfil; etiquette: string; peutAppliquer: boolean; onRetour: () => void; onAppliquer: () => void }) {
  const chaines = base.chaines.filter((c) => {
    if (c.objet === 'Sortie de matériel') return axes.fluxMatiereSortant;
    if (c.objet === 'Laissez-passer véhicule') return axes.vehiculesLivraisons;
    return true;
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
        <Info className="h-4 w-4 shrink-0 text-amber-500" /> Vérifiez avant d’appliquer. Rien n’est écrit tant que vous n’avez pas confirmé — <b>{etiquette}</b>.
      </div>

      <Bloc titre="Arborescence d’emprise" icon={<MapPin className="h-4 w-4" />}>
        <div className="flex flex-wrap items-center gap-1.5">
          {axes.niveauxEmprise.map((n, i) => (<span key={i} className="inline-flex items-center gap-1.5">{i > 0 && <ArrowRight className="h-3 w-3 text-muted" />}<span className="rounded-lg bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">{n}</span></span>))}
        </div>
      </Bloc>

      {axes.donneurOrdre && (
        <Bloc titre="Preneur" icon={<Building2 className="h-4 w-4" />}>
          <p className="text-sm font-semibold text-ink">{axes.donneurOrdreLabel}</p>
          <p className="text-xs text-muted">Les entreprises lui sont rattachables ; il porte les conditions préalables.</p>
        </Bloc>
      )}

      <Bloc titre="Qualification des intervenants" icon={<Users className="h-4 w-4" />}>
        <ListeNommee titre="Lien contractuel" valeurs={base.qualification.lienContractuel} />
        <ListeNommee titre="Régime d’accès" valeurs={axes.visiteurs === 'LIBRE' ? base.qualification.regimeAcces : base.qualification.regimeAcces.filter((r) => r !== 'Visiteur libre')} />
        <p className="mt-1 text-[11px] text-muted">Rattachement : entreprise d’appartenance{axes.donneurOrdre ? `, ${axes.donneurOrdreLabel.toLowerCase()}` : ''}, emprises autorisées. Un intervenant est une combinaison des trois axes.</p>
      </Bloc>

      <Bloc titre="Rôles" icon={<KeyRound className="h-4 w-4" />}>
        <div className="flex flex-wrap gap-1.5">{base.roles.map((r) => (<span key={r.nom} className="inline-flex items-center gap-1.5 rounded-full bg-sand-50 px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-sand-300">{r.nom}<Badge tone="neutral">{r.perimetre}</Badge></span>))}</div>
      </Bloc>

      <Bloc titre="Chaînes de validation" icon={<GitBranch className="h-4 w-4" />}>
        <ul className="space-y-2">
          {chaines.map((c) => (
            <li key={c.objet}>
              <p className="text-xs font-bold text-ink">{c.objet}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {c.etapes.map((e, i) => (<span key={i} className="inline-flex items-center gap-1.5">{i > 0 && <ArrowRight className="h-3 w-3 text-muted" />}<span className="rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest-700">{e.role} <span className="opacity-60">· {e.perimetre}</span></span></span>))}
              </div>
            </li>
          ))}
        </ul>
      </Bloc>

      <Bloc titre="Ce qui restera à faire après application" icon={<ClipboardCheck className="h-4 w-4" />}>
        <ul className="space-y-1 text-sm text-muted">{base.resteAFaire.map((r) => (<li key={r} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{r}</li>))}</ul>
      </Bloc>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-none px-4" icon={<ArrowLeft className="h-4 w-4" />} onClick={onRetour}>Retour</Button>
        <Button variant="primary" block disabled={!peutAppliquer} icon={<Check className="h-4 w-4" strokeWidth={3} />} onClick={onAppliquer}>Appliquer le profil</Button>
      </div>
    </div>
  );
}

function Bloc({ titre, icon, children }: { titre: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink"><span className="text-forest-500">{icon}</span>{titre}</p>
      {children}
    </div>
  );
}
function ListeNommee({ titre, valeurs }: { titre: string; valeurs: string[] }) {
  return (
    <div className="mb-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{titre}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">{valeurs.map((v) => <span key={v} className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-semibold text-forest-700">{v}</span>)}</div>
    </div>
  );
}

/* ---------- Temps 4 : application + reste à faire ---------- */
function Etape4({ base, etiquette, modifie, checklist, onToggle, onModele, onRevenir, onRecommencer }: {
  base: Prereglage; etiquette: string; modifie: boolean; checklist: Record<string, boolean>;
  onToggle: (t: string) => void; onModele: () => void; onRevenir: () => void; onRecommencer: () => void;
}) {
  const faits = base.resteAFaire.filter((r) => checklist[r]).length;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-forest-500 p-5 text-white shadow-card">
        <p className="flex items-center gap-2 text-lg font-extrabold"><Check className="h-5 w-5" strokeWidth={3} /> Profil appliqué</p>
        <p className="mt-1 text-sm text-white/90">{etiquette}. Application non destructive : aucune donnée existante n’est supprimée. Chaque application est journalisée (auteur, horodatage) et réversible tant qu’aucune donnée n’a été créée sur les objets introduits.</p>
        {modifie && <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold"><Info className="h-3.5 w-3.5" /> Profil personnalisé — le site n’est pas figé sur un préréglage.</span>}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Reste à faire</p>
          <Badge tone={faits === base.resteAFaire.length ? 'forest' : 'amber'}>{faits}/{base.resteAFaire.length}</Badge>
        </div>
        <ul className="space-y-1.5">
          {base.resteAFaire.map((r) => (
            <li key={r}>
              <button onClick={() => onToggle(r)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-sand-50">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${checklist[r] ? 'border-forest-500 bg-forest-500 text-white' : 'border-sand-400 bg-white text-transparent'}`}><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                <span className={`text-sm ${checklist[r] ? 'text-muted line-through' : 'text-ink'}`}>{r}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted">« Site opérationnel en moins d’une journée » ne tient que si ce qui reste à faire est visible.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={onModele}>Enregistrer comme modèle maison</Button>
        {modifie && <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={onRevenir}>Revenir au préréglage</Button>}
        <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={onRecommencer}>Autre profil</Button>
      </div>
    </div>
  );
}

/* ---------- util ---------- */
function modulesActifs(a: AxesProfil) {
  return [
    { label: 'Contrôle d’accès au poste', on: true },
    { label: 'Preneur & conditions', on: a.donneurOrdre },
    { label: 'Registre de présence & badges temporaires', on: a.populationTournante },
    { label: 'Personnel propre', on: a.personnelPropre },
    { label: 'Bons de sortie matière', on: a.fluxMatiereSortant },
    { label: 'Matériel entrant déclaré', on: a.materielEntrant },
    { label: 'Véhicules & livraisons', on: a.vehiculesLivraisons },
    { label: `Visiteurs (${VISITEURS_LABEL[a.visiteurs].toLowerCase()})`, on: a.visiteurs !== 'AUCUN' },
  ];
}
