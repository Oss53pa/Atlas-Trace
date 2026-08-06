import { useEffect, useState } from 'react';
import { Store, Plus, X, MapPin, ShieldAlert, Check, Loader2, Building2, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthz, Gate } from '../../lib/authz';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface Emprise { id: string; libelle: string; code: string | null; statut: string }
interface Condition { id: string; libelle: string; levee: boolean }
interface Preneur {
  id: string;
  raison_sociale: string;
  interne: boolean;
  statut: string;
  at_emprises: Emprise[];
  at_conditions_bloquantes: Condition[];
}

const SELECT = 'id, raison_sociale, interne, statut, at_emprises(id,libelle,code,statut), at_conditions_bloquantes(id,libelle,levee)';

export function PreneursLive() {
  const { connecte, chargement, portees, a } = useAuthz();
  const orgId = portees[0]?.organisationId ?? null;
  const [preneurs, setPreneurs] = useState<Preneur[]>([]);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }

  async function charger() {
    setErreur(null);
    const { data, error } = await supabase.from('at_entites').select(SELECT).eq('type', 'PRENEUR').order('raison_sociale');
    if (error) setErreur(error.message);
    else setPreneurs((data as unknown as Preneur[]) ?? []);
    setPret(true);
  }

  useEffect(() => {
    if (connecte) charger();
    else setPret(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte]);

  async function creerPreneur(raison: string, interne: boolean) {
    if (!orgId) return;
    const { error } = await supabase.from('at_entites').insert({ organisation_id: orgId, type: 'PRENEUR', raison_sociale: raison, interne });
    if (error) { flash('Refusé : ' + error.message); return; }
    setSheet(false);
    flash(`Preneur « ${raison} » créé`);
    charger();
  }

  async function ajouterEmprise(preneur: Preneur, libelle: string, code: string) {
    if (!orgId) return;
    const { error } = await supabase.from('at_emprises').insert({ organisation_id: orgId, entite_id: preneur.id, libelle, code: code || null });
    if (error) { flash('Refusé : ' + error.message); return; }
    flash('Emprise ajoutée'); charger();
  }

  async function ajouterCondition(preneur: Preneur, libelle: string) {
    if (!orgId) return;
    const { error } = await supabase.from('at_conditions_bloquantes').insert({ organisation_id: orgId, entite_id: preneur.id, libelle });
    if (error) { flash('Refusé : ' + error.message); return; }
    flash('Condition bloquante ajoutée'); charger();
  }

  async function leverCondition(c: Condition) {
    const { error } = await supabase.from('at_conditions_bloquantes').update({ levee: true, levee_at: new Date().toISOString() }).eq('id', c.id);
    if (error) { flash('Refusé : ' + error.message); return; }
    flash('Condition levée'); charger();
  }

  if (chargement || !pret) {
    return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>;
  }

  if (!connecte) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><LogIn className="h-6 w-6" /></span>
        <h2 className="text-lg font-extrabold text-ink">Connexion requise</h2>
        <p className="mt-1 text-sm text-muted">La gestion des preneurs est réservée aux comptes autorisés. Connectez-vous via le bouton en haut de l'écran.</p>
      </div>
    );
  }

  const peutCreer = a('ADMINISTRER_ORGANISATION');
  const peutLever = a('GERER_CONDITIONS_BLOQUANTES') || a('ADMINISTRER_ORGANISATION');

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500"><Store className="h-3.5 w-3.5" /> Preneurs & emprises</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Preneurs</h1>
            <p className="mt-1 text-sm text-muted">Occupants d'emprise (internes ou externes). Leurs conditions bloquantes non levées bloquent toute leur chaîne au poste.</p>
          </div>
          <Gate pouvoir="ADMINISTRER_ORGANISATION">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>Nouveau preneur</Button>
          </Gate>
        </div>

        {!peutCreer && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">Votre rôle ne permet pas de créer des preneurs (lecture seule).</p>
        )}
        {erreur && <p className="mb-4 rounded-2xl bg-danger-50 px-4 py-3 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

        {preneurs.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-sand-300/60">
            <Building2 className="mx-auto h-8 w-8 text-sand-400" />
            <p className="mt-2 text-sm font-semibold text-ink">Aucun preneur</p>
            <p className="text-xs text-muted">Créez le premier preneur pour lui rattacher emprises et conditions.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {preneurs.map((p) => (
              <PreneurCarte key={p.id} p={p} peutCreer={peutCreer} peutLever={peutLever}
                onEmprise={(l, c) => ajouterEmprise(p, l, c)} onCondition={(l) => ajouterCondition(p, l)} onLever={leverCondition} />
            ))}
          </ul>
        )}
      </div>

      {sheet && <PreneurSheet onAnnuler={() => setSheet(false)} onCreer={creerPreneur} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

function PreneurCarte({ p, peutCreer, peutLever, onEmprise, onCondition, onLever }: {
  p: Preneur; peutCreer: boolean; peutLever: boolean;
  onEmprise: (libelle: string, code: string) => void; onCondition: (libelle: string) => void; onLever: (c: Condition) => void;
}) {
  const [ajoutEmprise, setAjoutEmprise] = useState(false);
  const [ajoutCond, setAjoutCond] = useState(false);
  const [eLib, setELib] = useState(''); const [eCode, setECode] = useState('');
  const [cLib, setCLib] = useState('');
  const bloque = p.at_conditions_bloquantes.some((c) => !c.levee);

  return (
    <li className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">{p.raison_sociale}
            <Badge tone={p.interne ? 'neutral' : 'forest'}>{p.interne ? 'Interne' : 'Externe'}</Badge>
          </p>
          <p className="mt-0.5 text-xs text-muted">{p.at_emprises.length} emprise(s) · {p.at_conditions_bloquantes.filter((c) => !c.levee).length} condition(s) active(s)</p>
        </div>
        {bloque ? <Badge tone="danger" dot>Bloqué</Badge> : <Badge tone="forest" dot>Autorisé</Badge>}
      </div>

      {/* Emprises */}
      <div className="mt-3 border-t border-sand-200 pt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted"><MapPin className="h-3.5 w-3.5" /> Emprises</p>
        <div className="flex flex-wrap gap-1.5">
          {p.at_emprises.map((e) => (
            <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-sand-50 px-2.5 py-1 text-[11px] font-semibold text-ink ring-1 ring-sand-300">{e.libelle}{e.code ? ` · ${e.code}` : ''}</span>
          ))}
          {peutCreer && !ajoutEmprise && (
            <button onClick={() => setAjoutEmprise(true)} className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest-700 ring-1 ring-forest-100 hover:bg-forest-100"><Plus className="h-3 w-3" /> Emprise</button>
          )}
        </div>
        {ajoutEmprise && (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input value={eLib} onChange={(e) => setELib(e.target.value)} placeholder="Libellé (ex. Cellule B12)" className="flex-1 rounded-xl border border-sand-300 bg-sand-50 px-3 py-1.5 text-sm text-ink outline-none focus:border-forest-400" />
            <input value={eCode} onChange={(e) => setECode(e.target.value)} placeholder="Code" className="w-24 rounded-xl border border-sand-300 bg-sand-50 px-3 py-1.5 text-sm text-ink outline-none focus:border-forest-400" />
            <Button size="sm" variant="primary" disabled={eLib.trim().length < 2} onClick={() => { onEmprise(eLib.trim(), eCode.trim()); setELib(''); setECode(''); setAjoutEmprise(false); }}>Ajouter</Button>
            <Button size="sm" variant="ghost" onClick={() => setAjoutEmprise(false)}>Annuler</Button>
          </div>
        )}
      </div>

      {/* Conditions bloquantes */}
      <div className="mt-3 border-t border-sand-200 pt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted"><ShieldAlert className="h-3.5 w-3.5" /> Conditions bloquantes</p>
        <ul className="space-y-1.5">
          {p.at_conditions_bloquantes.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${c.levee ? 'bg-forest-500' : 'bg-danger-500'}`} />
              <span className={`min-w-0 flex-1 ${c.levee ? 'text-muted line-through' : 'font-medium text-ink'}`}>{c.libelle}</span>
              {c.levee ? <span className="text-[11px] font-semibold text-forest-600">Levée</span>
                : peutLever && <Button size="sm" variant="outline" onClick={() => onLever(c)}>Lever</Button>}
            </li>
          ))}
          {p.at_conditions_bloquantes.length === 0 && <li className="text-xs text-muted">Aucune condition.</li>}
        </ul>
        {peutCreer && (ajoutCond ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input value={cLib} onChange={(e) => setCLib(e.target.value)} placeholder="Condition (ex. Attestation d'assurance)" className="flex-1 rounded-xl border border-sand-300 bg-sand-50 px-3 py-1.5 text-sm text-ink outline-none focus:border-forest-400" />
            <Button size="sm" variant="primary" disabled={cLib.trim().length < 3} onClick={() => { onCondition(cLib.trim()); setCLib(''); setAjoutCond(false); }}>Ajouter</Button>
            <Button size="sm" variant="ghost" onClick={() => setAjoutCond(false)}>Annuler</Button>
          </div>
        ) : (
          <button onClick={() => setAjoutCond(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest-600 hover:text-forest-700"><Plus className="h-3.5 w-3.5" /> Condition bloquante</button>
        ))}
      </div>
    </li>
  );
}

function PreneurSheet({ onAnnuler, onCreer }: { onAnnuler: () => void; onCreer: (raison: string, interne: boolean) => void }) {
  const [raison, setRaison] = useState('');
  const [interne, setInterne] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onAnnuler}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouveau preneur</h3>
          <button onClick={onAnnuler} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-sand-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted">Occupant d'une emprise du site. Vous ajouterez ses emprises et conditions ensuite.</p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Raison sociale</span>
          <input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="Ex. : Enseigne Boutique X" className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setInterne(false)} className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${!interne ? 'border-forest-200 bg-forest-50 text-forest-700' : 'border-sand-300 bg-white text-muted'}`}>Externe</button>
          <button onClick={() => setInterne(true)} className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${interne ? 'border-forest-200 bg-forest-50 text-forest-700' : 'border-sand-300 bg-white text-muted'}`}>Interne (service de l’organisation)</button>
        </div>
        <Button variant="primary" size="lg" block className="mt-4" disabled={raison.trim().length < 2} onClick={() => onCreer(raison.trim(), interne)}>Créer le preneur</Button>
      </div>
    </div>
  );
}
