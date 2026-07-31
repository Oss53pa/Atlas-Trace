import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Cloud, LogIn, LogOut, Building2, MapPin, KeyRound, ShieldCheck, Loader2, AlertTriangle, Check, Users, CreditCard } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

interface Org { id: string; raison_sociale: string; pays: string; hebergement: string; statut: string }
interface Site { id: string; libelle: string; adresse: string; statut: string }
interface Role { id: string; libelle: string; pouvoirs: string[] }
interface Entreprise { id: string; raison_sociale: string; categorie: string; statut: string }
interface Personne { id: string; nom: string; prenom: string; fonction: string; induction_statut: string }
interface Badge_ { id: string; numero: string; type: string; statut: string; personne_id: string | null }

const chipStatut = (s: string) =>
  s === 'ACTIVE' || s === 'ACTIF' ? 'forest' : s === 'EN_VALIDATION' ? 'amber' : s === 'SUSPENDU' || s === 'SUSPENDUE' ? 'danger' : 'neutral';

export function Live() {
  const [session, setSession] = useState<Session | null>(null);
  const [chargeSession, setChargeSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChargeSession(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-sand-100">
      <div className="border-b border-sand-300/70 bg-sand-50 px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-bold text-ink"><Cloud className="h-4 w-4 text-forest-500" /> Connexion en direct · Supabase</p>
          {session && (
            <div className="flex items-center gap-2">
              <Badge tone="forest" dot>{session.user.email}</Badge>
              <Button variant="outline" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={() => supabase.auth.signOut()}>Déconnexion</Button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-8">
        {chargeSession ? (
          <Centre><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</Centre>
        ) : session ? (
          <Donnees />
        ) : (
          <Connexion />
        )}
      </div>
    </div>
  );
}

function Centre({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">{children}</div>;
}

function Connexion() {
  const [email, setEmail] = useState('demo@newheaven.ci');
  const [mdp, setMdp] = useState('AtlasTrace2026');
  const [erreur, setErreur] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);

  async function connecter() {
    setCharge(true); setErreur(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp });
    if (error) setErreur(error.message);
    setCharge(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Console client</h1>
        <p className="mt-1 text-sm text-muted">Connectez-vous : les données affichées viennent en direct de Supabase, filtrées par la RLS. Vous ne verrez que votre organisation.</p>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-sand-300/70">
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Courriel</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
        </label>
        <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-muted">Mot de passe</span>
          <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && connecter()} className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400" />
        </label>
        {erreur && <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100"><AlertTriangle className="h-3.5 w-3.5" /> {erreur}</p>}
        <Button variant="primary" block className="mt-4" disabled={charge} icon={charge ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} onClick={connecter}>
          {charge ? 'Connexion…' : 'Se connecter'}
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted">Compte de démonstration pré-rempli · New Heaven SA</p>
      </div>
    </div>
  );
}

function Donnees() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [badges, setBadges] = useState<Badge_[]>([]);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [o, s, r, e, p, b] = await Promise.all([
        supabase.from('at_organisations').select('*'),
        supabase.from('at_sites').select('*'),
        supabase.from('at_roles').select('*').order('libelle'),
        supabase.from('at_entreprises').select('id,raison_sociale,categorie,statut').order('raison_sociale'),
        supabase.from('at_personnes').select('id,nom,prenom,fonction,induction_statut').order('nom'),
        supabase.from('at_badges').select('id,numero,type,statut,personne_id').order('numero'),
      ]);
      const err = o.error || s.error || r.error || e.error || p.error || b.error;
      if (err) setErreur(err.message);
      setOrgs(o.data ?? []); setSites(s.data ?? []); setRoles(r.data ?? []);
      setEntreprises(e.data ?? []); setPersonnes(p.data ?? []); setBadges(b.data ?? []);
      setCharge(false);
    })();
  }, []);

  if (charge) return <Centre><Loader2 className="h-5 w-5 animate-spin" /> Lecture des données…</Centre>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-2xl bg-forest-50 px-4 py-3 text-sm text-forest-700 ring-1 ring-forest-100">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
        Données lues en direct via la clé publiable. La RLS ne renvoie que les lignes de votre organisation — le cloisonnement est appliqué par le moteur, pas par l'écran.
      </div>
      {erreur && <p className="rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{erreur}</p>}

      <Bloc titre="Organisation" icon={<Building2 className="h-4 w-4" />} compte={orgs.length}>
        {orgs.map((o) => (
          <div key={o.id} className="flex items-center justify-between">
            <div><p className="text-sm font-bold text-ink">{o.raison_sociale}</p><p className="text-xs text-muted">{o.pays} · hébergement {o.hebergement.toLowerCase()}</p></div>
            <Badge tone="forest" dot>{o.statut}</Badge>
          </div>
        ))}
      </Bloc>

      <Bloc titre="Sites" icon={<MapPin className="h-4 w-4" />} compte={sites.length}>
        <ul className="space-y-1.5">
          {sites.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2 ring-1 ring-sand-200">
              <div><p className="text-sm font-semibold text-ink">{s.libelle}</p><p className="text-xs text-muted">{s.adresse}</p></div>
              <Badge tone="forest">{s.statut}</Badge>
            </li>
          ))}
        </ul>
      </Bloc>

      <Bloc titre="Rôles & pouvoirs" icon={<KeyRound className="h-4 w-4" />} compte={roles.length}>
        <div className="space-y-2">
          {roles.map((r) => (
            <div key={r.id} className="rounded-xl bg-sand-50 px-3 py-2 ring-1 ring-sand-200">
              <div className="mb-1 flex items-center justify-between"><p className="text-sm font-bold text-ink">{r.libelle}</p><Badge tone="neutral">{r.pouvoirs.length}</Badge></div>
              <div className="flex flex-wrap gap-1">{r.pouvoirs.map((p) => <span key={p} className="rounded-full bg-forest-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-forest-700">{p}</span>)}</div>
            </div>
          ))}
        </div>
      </Bloc>

      <Bloc titre="Entreprises intervenantes" icon={<Building2 className="h-4 w-4" />} compte={entreprises.length}>
        <ul className="space-y-1.5">
          {entreprises.map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2 ring-1 ring-sand-200">
              <div><p className="text-sm font-semibold text-ink">{e.raison_sociale}</p><p className="text-xs text-muted">{e.categorie}</p></div>
              <Badge tone={chipStatut(e.statut)} dot>{e.statut}</Badge>
            </li>
          ))}
        </ul>
      </Bloc>

      <Bloc titre="Personnes" icon={<Users className="h-4 w-4" />} compte={personnes.length}>
        <ul className="space-y-1.5">
          {personnes.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2 ring-1 ring-sand-200">
              <div><p className="text-sm font-semibold text-ink">{p.prenom} {p.nom}</p><p className="text-xs text-muted">{p.fonction}</p></div>
              <Badge tone={p.induction_statut === 'VALIDE' ? 'forest' : p.induction_statut === 'EXPIREE' ? 'danger' : 'amber'} dot>Induction {p.induction_statut.toLowerCase()}</Badge>
            </li>
          ))}
        </ul>
      </Bloc>

      <Bloc titre="Badges" icon={<CreditCard className="h-4 w-4" />} compte={badges.length}>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span key={b.id} className="inline-flex items-center gap-1.5 rounded-full bg-sand-50 px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-sand-200">
              <span className="font-mono">{b.numero}</span><Badge tone={chipStatut(b.statut)}>{b.statut}</Badge>
            </span>
          ))}
        </div>
      </Bloc>

      <p className="flex items-center gap-1.5 text-xs text-muted"><Check className="h-3.5 w-3.5 text-forest-500" /> {orgs.length} organisation · {sites.length} site · {roles.length} rôles · {entreprises.length} entreprises · {personnes.length} personnes · {badges.length} badges — lus en direct des tables at_ sous RLS.</p>
    </div>
  );
}

function Bloc({ titre, icon, compte, children }: { titre: string; icon: React.ReactNode; compte: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><span className="text-forest-500">{icon}</span>{titre}<Badge tone="neutral">{compte}</Badge></p>
      {children}
    </div>
  );
}
