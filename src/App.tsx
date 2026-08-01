import { useState, useEffect, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Palette, Table2, ClipboardList, LayoutDashboard, CreditCard, Building2,
  Package, BookText, Key, Settings, SlidersHorizontal, Boxes, Home, Cloud, Link2, Users,
  ScanLine, LayoutGrid, X, Loader2, LogIn, LogOut, Store, KeyRound,
} from 'lucide-react';
import { Logo } from './components/ui/Logo';
import { supabase } from './lib/supabase';
import { useAuthz } from './lib/authz';

// Chargement à la demande : chaque écran forme son propre chunk, seul l'écran
// affiché est téléchargé (démarrage mobile allégé).
const PosteHub = lazy(() => import('./features/poste/PosteHub').then((m) => ({ default: m.PosteHub })));
const Registres = lazy(() => import('./features/registres/Registres').then((m) => ({ default: m.Registres })));
const Listes = lazy(() => import('./features/listes/Listes').then((m) => ({ default: m.Listes })));
const Tableau = lazy(() => import('./features/tableau/Tableau').then((m) => ({ default: m.Tableau })));
const Badges = lazy(() => import('./features/badges/Badges').then((m) => ({ default: m.Badges })));
const Habilitations = lazy(() => import('./features/entreprises/Habilitations').then((m) => ({ default: m.Habilitations })));
const Materiel = lazy(() => import('./features/materiel/Materiel').then((m) => ({ default: m.Materiel })));
const MainCourante = lazy(() => import('./features/maincourante/MainCourante').then((m) => ({ default: m.MainCourante })));
const ClesRegistre = lazy(() => import('./features/cles/ClesRegistre').then((m) => ({ default: m.ClesRegistre })));
const Administration = lazy(() => import('./features/admin/Administration').then((m) => ({ default: m.Administration })));
const Parametrage = lazy(() => import('./features/parametrage/Parametrage').then((m) => ({ default: m.Parametrage })));
const Editeur = lazy(() => import('./features/editeur/Editeur').then((m) => ({ default: m.Editeur })));
const Accueil = lazy(() => import('./features/accueil/Accueil').then((m) => ({ default: m.Accueil })));
const Live = lazy(() => import('./features/live/Live').then((m) => ({ default: m.Live })));
const PortailReferent = lazy(() => import('./features/referent/PortailReferent').then((m) => ({ default: m.PortailReferent })));
const Espaces = lazy(() => import('./features/espaces/Espaces').then((m) => ({ default: m.Espaces })));
const PreneursLive = lazy(() => import('./features/preneurs/PreneursLive').then((m) => ({ default: m.PreneursLive })));
const EntreprisesRegistre = lazy(() => import('./features/preneurs/EntreprisesRegistre').then((m) => ({ default: m.EntreprisesRegistre })));
const RolesLive = lazy(() => import('./features/parametrage/RolesLive').then((m) => ({ default: m.RolesLive })));
const ComptesLive = lazy(() => import('./features/admin/ComptesLive').then((m) => ({ default: m.ComptesLive })));
const InvitationsLive = lazy(() => import('./features/admin/InvitationsLive').then((m) => ({ default: m.InvitationsLive })));
const DesignShowcase = lazy(() => import('./DesignShowcase'));

type Vue =
  | 'espaces' | 'accueil' | 'poste' | 'tableau' | 'entreprises' | 'listes' | 'badges' | 'materiel'
  | 'maincourante' | 'cles' | 'admin' | 'parametrage' | 'editeur' | 'live' | 'referent' | 'registres' | 'design' | 'preneurs' | 'entites' | 'roles' | 'comptes' | 'invitations';

interface Dest {
  vue: Vue;
  label: string;
  court: string;
  icon: ReactNode;
  /** Pouvoir(s) donnant accès (l'un suffit). Absent = accessible à tous les connectés. */
  pouvoir?: string[];
}

const DESTINATIONS: Dest[] = [
  { vue: 'accueil', label: 'Accueil', court: 'Accueil', icon: <Home className="h-5 w-5" /> },
  { vue: 'poste', label: 'Poste de contrôle', court: 'Poste', icon: <ScanLine className="h-5 w-5" />, pouvoir: ['CONTROLER_AU_POSTE'] },
  { vue: 'materiel', label: 'Matière', court: 'Matière', icon: <Package className="h-5 w-5" />, pouvoir: ['DECLARER_MATERIEL', 'VISER_MATERIEL', 'DEMANDER_SORTIE', 'VISER_SORTIE', 'APPROUVER_SORTIE', 'RECEPTIONNER', 'VALIDER_CRENEAU', 'AUTORISER_EVACUATION', 'DEMANDER_LIVRAISON'] },
  { vue: 'tableau', label: 'Tableau de bord', court: 'Tableau', icon: <LayoutDashboard className="h-5 w-5" />, pouvoir: ['CONSULTER_TABLEAU'] },
  { vue: 'espaces', label: 'Espaces & profils', court: 'Espaces', icon: <Users className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'entreprises', label: 'Entreprises', court: 'Entreprises', icon: <Building2 className="h-5 w-5" />, pouvoir: ['DECLARER_ENTREPRISE', 'VISER_HABILITATION', 'APPROUVER_HABILITATION', 'GERER_CONDITIONS_BLOQUANTES'] },
  { vue: 'preneurs', label: 'Preneurs & emprises', court: 'Preneurs', icon: <Store className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION', 'GERER_CONDITIONS_BLOQUANTES'] },
  { vue: 'entites', label: 'Registre des entreprises', court: 'Registre', icon: <Building2 className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'roles', label: 'Rôles & pouvoirs', court: 'Rôles', icon: <KeyRound className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'comptes', label: 'Comptes internes', court: 'Comptes', icon: <Users className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'invitations', label: 'Invitations référents', court: 'Invitations', icon: <Link2 className="h-5 w-5" />, pouvoir: ['DECLARER_ENTREPRISE', 'ADMINISTRER_ORGANISATION'] },
  { vue: 'listes', label: 'Listes journalières', court: 'Listes', icon: <ClipboardList className="h-5 w-5" />, pouvoir: ['DEPOSER_LISTE', 'CONSULTER_TABLEAU'] },
  { vue: 'badges', label: 'Personnes & badges', court: 'Badges', icon: <CreditCard className="h-5 w-5" />, pouvoir: ['DELIVRER_BADGE', 'DECLARER_PERSONNEL'] },
  { vue: 'maincourante', label: 'Main courante', court: 'Main courante', icon: <BookText className="h-5 w-5" />, pouvoir: ['CONTROLER_AU_POSTE', 'CONSULTER_TABLEAU'] },
  { vue: 'cles', label: 'Clés & zones', court: 'Clés', icon: <Key className="h-5 w-5" />, pouvoir: ['DELIVRER_BADGE'] },
  { vue: 'admin', label: 'Administration', court: 'Admin', icon: <Settings className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION', 'CONSULTER_AUDIT'] },
  { vue: 'parametrage', label: 'Paramétrage', court: 'Paramétrage', icon: <SlidersHorizontal className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'editeur', label: 'Back office éditeur', court: 'Éditeur', icon: <Boxes className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'live', label: 'Console Live', court: 'Live', icon: <Cloud className="h-5 w-5" />, pouvoir: ['CONSULTER_TABLEAU'] },
  { vue: 'referent', label: 'Portail référent', court: 'Référent', icon: <Link2 className="h-5 w-5" /> },
  { vue: 'registres', label: 'Registres & exports', court: 'Registres', icon: <Table2 className="h-5 w-5" />, pouvoir: ['EXPORTER', 'CONSULTER_AUDIT'] },
  { vue: 'design', label: 'Design system', court: 'Design', icon: <Palette className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
];

/** Destinations de la barre du bas (au pouce) ; le reste va dans « Plus ». */
const PRIMAIRES: Vue[] = ['accueil', 'poste', 'materiel', 'tableau'];

const destOf = (v: Vue) => DESTINATIONS.find((d) => d.vue === v)!;

function renderVue(vue: Vue, go: (v: string) => void): ReactNode {
  switch (vue) {
    case 'espaces': return <Espaces onOpen={go} />;
    case 'preneurs': return <PreneursLive />;
    case 'entites': return <EntreprisesRegistre />;
    case 'roles': return <RolesLive />;
    case 'comptes': return <ComptesLive />;
    case 'invitations': return <InvitationsLive />;
    case 'accueil': return <Accueil onOpen={go} />;
    case 'design': return <DesignShowcase />;
    case 'tableau': return <Tableau />;
    case 'entreprises': return <Habilitations />;
    case 'listes': return <Listes />;
    case 'badges': return <Badges />;
    case 'materiel': return <Materiel />;
    case 'maincourante': return <MainCourante />;
    case 'cles': return <ClesRegistre />;
    case 'admin': return <Administration />;
    case 'parametrage': return <Parametrage />;
    case 'editeur': return <Editeur />;
    case 'live': return <Live />;
    case 'referent': return <PortailReferent />;
    case 'registres': return <Registres />;
    default: return <PosteHub />;
  }
}

export default function App() {
  const [vue, setVue] = useState<Vue>('accueil');
  const [more, setMore] = useState(false);
  const { connecte, pouvoirs } = useAuthz();

  // Interface par rôle : hors session on montre tout (démo) ; connecté, on ne
  // laisse voir que ce que les pouvoirs autorisent.
  const autorise = (d: Dest) => !connecte || !d.pouvoir || d.pouvoir.some((p) => pouvoirs.has(p));

  const go = (v: string) => {
    setVue(v as Vue);
    setMore(false);
    window.scrollTo({ top: 0 });
  };

  // Si l'écran courant n'est plus autorisé (après connexion), on ramène à l'accueil.
  useEffect(() => {
    if (connecte && !autorise(destOf(vue))) setVue('accueil');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte, vue, pouvoirs]);

  return (
    <div className="min-h-screen bg-sand-100">
      <TopBar vue={vue} />
      <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <Suspense fallback={<ChargementVue />}>{renderVue(vue, go)}</Suspense>
      </main>
      <BottomNav vue={vue} onGo={go} onMore={() => setMore(true)} moreActif={more} autorise={autorise} />
      {more && <MoreSheet vue={vue} onGo={go} onClose={() => setMore(false)} autorise={autorise} />}
    </div>
  );
}

function ChargementVue() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

/* ---------- Barre d'application (haut) ---------- */
function TopBar({ vue }: { vue: Vue }) {
  const d = destOf(vue);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-[#0A2E28] via-[#0C4238] to-[#0F5044] pt-[env(safe-area-inset-top)] shadow-soft backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Logo size="sm" className="text-white" />
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-inset ring-white/15 backdrop-blur sm:inline-flex">
            {d.court}
          </span>
          <CompteBouton />
        </div>
      </div>
    </header>
  );
}

/* ---------- Compte / connexion ---------- */
function CompteBouton() {
  const [session, setSession] = useState<Session | null>(null);
  const [ouvre, setOuvre] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session) {
    const initiale = (session.user.email ?? '?').slice(0, 1).toUpperCase();
    return (
      <button
        onClick={() => supabase.auth.signOut()}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-2.5 text-xs font-semibold text-white/90 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
        title="Se déconnecter"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-300/25 text-[11px] font-bold text-amber-100">{initiale}</span>
        <LogOut className="h-3.5 w-3.5" />
      </button>
    );
  }
  return (
    <>
      <button
        onClick={() => setOuvre(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
      >
        <LogIn className="h-3.5 w-3.5" /> Se connecter
      </button>
      {ouvre && <ConnexionSheet onClose={() => setOuvre(false)} />}
    </>
  );
}

function ConnexionSheet({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('demo@newheaven.ci');
  const [mdp, setMdp] = useState('AtlasTrace2026');
  const [err, setErr] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function connexion() {
    setEnvoi(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setEnvoi(false);
    if (error) setErr(error.message);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Connexion</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand-100 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">Une fois connecté, l'appli n'affiche que ce que votre rôle autorise.</p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Mot de passe</span>
          <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password"
            className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
        </label>

        {err && <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{err}</p>}

        <button
          onClick={connexion}
          disabled={envoi}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-forest-500 py-3 text-sm font-bold text-white shadow-soft transition-colors hover:bg-forest-600 disabled:opacity-60"
        >
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Se connecter
        </button>
        <p className="mt-3 text-center text-[11px] text-muted">Démo : <b className="text-ink">demo@newheaven.ci</b> · Direction du site</p>
      </div>
    </div>
  );
}

/* ---------- Barre d'onglets (bas, au pouce) ---------- */
function BottomNav({ vue, onGo, onMore, moreActif, autorise }: { vue: Vue; onGo: (v: string) => void; onMore: () => void; moreActif: boolean; autorise: (d: Dest) => boolean }) {
  const primaires = PRIMAIRES.map(destOf).filter(autorise);
  const surPrimaire = primaires.some((d) => d.vue === vue);
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-sand-300/50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {primaires.map((d) => (
          <Onglet key={d.vue} actif={vue === d.vue && !moreActif} label={d.court} icon={d.icon} onClick={() => onGo(d.vue)} />
        ))}
        <Onglet actif={moreActif || !surPrimaire} label="Plus" icon={<LayoutGrid className="h-5 w-5" />} onClick={onMore} />
      </div>
    </nav>
  );
}

function Onglet({ actif, label, icon, onClick }: { actif: boolean; label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-1 flex-col items-center gap-1 py-2.5">
      <span
        className={`flex h-8 w-16 items-center justify-center rounded-full transition-all duration-200 ease-premium ${
          actif ? 'bg-forest-500 text-white shadow-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]' : 'text-muted'
        }`}
      >
        {icon}
      </span>
      <span className={`text-[10px] transition-colors ${actif ? 'font-bold text-forest-700' : 'font-medium text-muted'}`}>{label}</span>
    </button>
  );
}

/* ---------- Feuille « Plus » (destinations autorisées) ---------- */
function MoreSheet({ vue, onGo, onClose, autorise }: { vue: Vue; onGo: (v: string) => void; onClose: () => void; autorise: (d: Dest) => boolean }) {
  const autres = DESTINATIONS.filter((d) => !PRIMAIRES.includes(d.vue) && autorise(d));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md animate-fade-up rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sand-300" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">Toutes les destinations</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand-100 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {autres.map((d) => {
            const actif = vue === d.vue;
            return (
              <button
                key={d.vue}
                onClick={() => onGo(d.vue)}
                className={`flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-all duration-150 ease-premium ${
                  actif ? 'bg-forest-50 ring-1 ring-forest-200' : 'bg-sand-50 ring-1 ring-sand-300/50 hover:bg-sand-100'
                }`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${actif ? 'bg-forest-500 text-white' : 'bg-white text-forest-600 ring-1 ring-sand-300/60'}`}>
                  {d.icon}
                </span>
                <span className="text-[11px] font-semibold leading-tight text-ink">{d.court}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
