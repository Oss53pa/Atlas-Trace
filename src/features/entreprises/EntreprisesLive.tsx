import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Building2, Plus, Check, X, ShieldCheck, ArrowRight, AlertTriangle, Loader2, Cloud, LogIn, Link2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { supabase } from '../../lib/supabase';

interface Ent {
  id: string;
  raison_sociale: string;
  categorie: string;
  donneur_ordre: string | null;
  referent_nom: string | null;
  assurance_echeance: string | null;
  statut: string;
  visa_hse: boolean;
  approuve: boolean;
}

const CATEGORIES = ['Entreprise de chantier', 'Aménagement de preneur'];

export function EntreprisesLive() {
  const [session, setSession] = useState<Session | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setPret(true); }).catch(() => setPret(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!pret) return <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> …</div>;
  if (!session) return <ConnexionRequise />;
  return <Liste />;
}

function ConnexionRequise() {
  const [charge, setCharge] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function connecter() {
    setCharge(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: 'demo@newheaven.ci', password: 'AtlasTrace2026' });
    if (error) setErr(error.message);
    setCharge(false);
  }
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><Cloud className="h-6 w-6" /></div>
      <h2 className="text-lg font-extrabold text-ink">Écran branché sur Supabase</h2>
      <p className="mt-1 text-sm text-muted">Les entreprises sont lues et écrites en direct, sous RLS. Connectez-vous pour continuer.</p>
      {err && <p className="mt-3 text-xs font-semibold text-danger-600">{err}</p>}
      <Button variant="primary" className="mx-auto mt-4" disabled={charge} icon={charge ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} onClick={connecter}>
        Se connecter (compte démo)
      </Button>
    </div>
  );
}

function Liste() {
  const [ents, setEnts] = useState<Ent[]>([]);
  const [ctx, setCtx] = useState<{ org: string; site: string } | null>(null);
  const [charge, setCharge] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function recharger() {
    const { data, error } = await supabase.from('at_entreprises')
      .select('id,raison_sociale,categorie,donneur_ordre,referent_nom,assurance_echeance,statut,visa_hse,approuve')
      .order('raison_sociale');
    if (error) setErr(error.message);
    setEnts(data ?? []);
  }
  useEffect(() => {
    (async () => {
      const [o, s] = await Promise.all([
        supabase.from('at_organisations').select('id').limit(1).single(),
        supabase.from('at_sites').select('id').limit(1).single(),
      ]);
      if (o.data && s.data) setCtx({ org: o.data.id, site: s.data.id });
      await recharger();
      setCharge(false);
    })();
  }, []);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2600); }

  async function viser(e: Ent) {
    const { error } = await supabase.from('at_entreprises').update({ visa_hse: true }).eq('id', e.id);
    if (error) return flash('Erreur : ' + error.message);
    await recharger(); flash('Visa HSE apposé · enregistré');
  }
  async function approuver(e: Ent) {
    const { error } = await supabase.from('at_entreprises').update({ approuve: true, statut: 'ACTIVE', activated_at: new Date().toISOString() }).eq('id', e.id);
    if (error) return flash('Erreur : ' + error.message);
    await recharger(); flash('Entreprise habilitée · active');
  }
  async function creer(v: { raison: string; categorie: string; referent: string }) {
    if (!ctx) return;
    const { error } = await supabase.from('at_entreprises').insert({
      organisation_id: ctx.org, site_id: ctx.site,
      raison_sociale: v.raison, categorie: v.categorie, referent_nom: v.referent,
      statut: 'EN_VALIDATION', visa_hse: false, approuve: false,
    });
    setSheet(false);
    if (error) return flash('Erreur : ' + error.message);
    await recharger(); flash('Fiche soumise · circuit lancé (enregistré en base)');
  }

  if (charge) return <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Lecture des entreprises…</div>;

  const stats = {
    total: ents.length,
    actives: ents.filter((e) => e.statut === 'ACTIVE').length,
    validation: ents.filter((e) => e.statut === 'EN_VALIDATION').length,
    brouillon: ents.filter((e) => e.statut === 'BROUILLON').length,
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest-600"><Cloud className="h-3.5 w-3.5" /> M1 · Supabase en direct</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Entreprises intervenantes</h1>
          <p className="mt-1 text-sm text-muted">Lues et écrites en direct dans <span className="font-mono text-forest-700">at_entreprises</span>, filtrées par RLS.</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setSheet(true)}>Nouvelle fiche</Button>
      </div>

      {err && <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{err}</p>}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard tone="forest" label="Entreprises" value={stats.total} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Actives" value={stats.actives} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard tone="amber" label="En validation" value={stats.validation} icon={<ArrowRight className="h-5 w-5" />} />
        <StatCard tone="plain" label="Brouillons" value={stats.brouillon} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <ul className="space-y-2">
        {ents.map((e) => <Ligne key={e.id} e={e} onViser={() => viser(e)} onApprouver={() => approuver(e)} />)}
      </ul>

      {sheet && <FicheSheet existantes={ents} onAnnuler={() => setSheet(false)} onCreer={creer} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg"><Check className="h-4 w-4" strokeWidth={3} /> {toast}</div>
        </div>
      )}
    </div>
  );
}

const chip = (s: string) =>
  s === 'ACTIVE' ? <Badge tone="forest" dot>Active</Badge>
  : s === 'EN_VALIDATION' ? <Badge tone="amber" dot>En validation</Badge>
  : s === 'SUSPENDUE' ? <Badge tone="danger" dot>Suspendue</Badge>
  : <Badge tone="neutral" dot>Brouillon</Badge>;

function Ligne({ e, onViser, onApprouver }: { e: Ent; onViser: () => void; onApprouver: () => void }) {
  const etapes = [
    { role: 'Référent entreprise', etat: 'fait' as const },
    { role: 'HSE Officer', etat: e.visa_hse ? 'fait' : 'courant' },
    { role: 'Directeur de la Construction', etat: e.approuve ? 'fait' : e.visa_hse ? 'courant' : 'attente' },
  ];
  return (
    <li className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{e.raison_sociale}</p>
          <p className="mt-0.5 text-xs text-muted">{e.categorie}{e.donneur_ordre && ` · ${e.donneur_ordre}`}{e.referent_nom && ` · Réf. ${e.referent_nom}`}</p>
        </div>
        {chip(e.statut)}
      </div>
      {(e.statut === 'EN_VALIDATION' || e.statut === 'ACTIVE') && (
        <div className="mt-3 border-t border-sand-200 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {etapes.map((s, i) => (
              <div key={s.role} className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.etat === 'fait' ? 'bg-forest-50 text-forest-700 ring-1 ring-inset ring-forest-200' : s.etat === 'courant' ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200' : 'bg-sand-100 text-muted ring-1 ring-inset ring-sand-300'}`}>
                  {s.etat === 'fait' && <Check className="h-3 w-3" strokeWidth={3} />}{s.role}
                </span>
                {i < etapes.length - 1 && <ArrowRight className="h-3 w-3 text-muted" />}
              </div>
            ))}
          </div>
          {e.statut === 'EN_VALIDATION' && (
            <div className="mt-2.5">
              {!e.visa_hse ? (
                <Button variant="outline" size="sm" icon={<ShieldCheck className="h-4 w-4" />} onClick={onViser}>Viser (HSE Officer)</Button>
              ) : (
                <Button variant="primary" size="sm" icon={<Check className="h-4 w-4" strokeWidth={3} />} onClick={onApprouver}>Approuver (Directeur)</Button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function FicheSheet({ existantes, onAnnuler, onCreer }: { existantes: Ent[]; onAnnuler: () => void; onCreer: (v: { raison: string; categorie: string; referent: string }) => void }) {
  const [raison, setRaison] = useState('');
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [referent, setReferent] = useState('');
  const [doublonConfirme, setDoublonConfirme] = useState(false);
  const doublon = existantes.find((e) => e.raison_sociale.trim().toLowerCase() === raison.trim().toLowerCase());
  const pret = raison.trim() && referent.trim();

  function soumettre() {
    if (doublon && !doublonConfirme) { setDoublonConfirme(true); return; }
    onCreer({ raison: raison.trim(), categorie, referent: referent.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 shadow-card-lg">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nouvelle fiche entreprise</h3>
          <button onClick={onAnnuler} className="text-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 flex items-center gap-1.5 text-xs text-muted"><Link2 className="h-3.5 w-3.5" /> Écriture réelle dans Supabase à la soumission.</p>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Raison sociale</span>
          <input value={raison} onChange={(e) => { setRaison(e.target.value); setDoublonConfirme(false); }} placeholder="Ex. : Menuiserie Ébène"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Catégorie</span>
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Référent</span>
          <input value={referent} onChange={(e) => setReferent(e.target.value)} placeholder="Nom du référent"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        {doublon && doublonConfirme && (
          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Doublon possible : « {doublon.raison_sociale} » existe déjà. Vérifiez avant de créer.
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="lg" className="flex-none px-5" onClick={onAnnuler}>Annuler</Button>
          <Button variant="primary" size="lg" block disabled={!pret} onClick={soumettre}>{doublon && !doublonConfirme ? 'Vérifier & soumettre' : 'Soumettre'}</Button>
        </div>
      </div>
    </div>
  );
}
