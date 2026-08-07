import { useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Table2, ClipboardList, LayoutDashboard, CreditCard, Building2,
  Package, BookText, Key, Settings, SlidersHorizontal, Home, Cloud, Link2, Users,
  ScanLine, LayoutGrid, X, Loader2, LogIn, LogOut, Store, KeyRound, Moon, UserPlus, Gauge, UsersRound, HelpCircle, Eye, EyeOff,
} from 'lucide-react';
import { Logo } from './components/ui/Logo';
import { AlertesTempsReel } from './components/AlertesTempsReel';
import { supabase } from './lib/supabase';
import { useAuthz } from './lib/authz';
import { primairesPour, familleDe, LONGUEUR_BARRE, type Famille } from './lib/roles';
import { CommentCaMarche } from './features/aide/CommentCaMarche';

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
const Accueil = lazy(() => import('./features/accueil/Accueil').then((m) => ({ default: m.Accueil })));
const Live = lazy(() => import('./features/live/Live').then((m) => ({ default: m.Live })));
const PortailReferent = lazy(() => import('./features/referent/PortailReferent').then((m) => ({ default: m.PortailReferent })));
const Espaces = lazy(() => import('./features/espaces/Espaces').then((m) => ({ default: m.Espaces })));
const PreneursLive = lazy(() => import('./features/preneurs/PreneursLive').then((m) => ({ default: m.PreneursLive })));
const EntreprisesRegistre = lazy(() => import('./features/preneurs/EntreprisesRegistre').then((m) => ({ default: m.EntreprisesRegistre })));
const RolesLive = lazy(() => import('./features/parametrage/RolesLive').then((m) => ({ default: m.RolesLive })));
const ComptesLive = lazy(() => import('./features/admin/ComptesLive').then((m) => ({ default: m.ComptesLive })));
const InvitationsLive = lazy(() => import('./features/admin/InvitationsLive').then((m) => ({ default: m.InvitationsLive })));
const PersonnesLive = lazy(() => import('./features/badges/PersonnesLive').then((m) => ({ default: m.PersonnesLive })));
const Cloture = lazy(() => import('./features/cloture/Cloture').then((m) => ({ default: m.Cloture })));
const InscriptionPortail = lazy(() => import('./features/inscription/InscriptionPortail').then((m) => ({ default: m.InscriptionPortail })));
const Plafonds = lazy(() => import('./features/plafonds/Plafonds').then((m) => ({ default: m.Plafonds })));
const Vivier = lazy(() => import('./features/vivier/Vivier').then((m) => ({ default: m.Vivier })));
import { ActivationCompte } from './features/admin/ActivationCompte';
import { ReinitialiserMotDePasse } from './features/admin/ReinitialiserMotDePasse';

type Vue =
  | 'espaces' | 'accueil' | 'poste' | 'tableau' | 'entreprises' | 'listes' | 'badges' | 'materiel'
  | 'maincourante' | 'cles' | 'admin' | 'parametrage' | 'live' | 'referent' | 'registres' | 'preneurs' | 'entites' | 'roles' | 'comptes' | 'invitations' | 'personnes' | 'cloture' | 'inscription' | 'plafonds' | 'vivier';

/** Familles de destinations, dans l'ordre d'affichage de la feuille « Plus ». */
type Groupe = 'terrain' | 'matiere' | 'suivi' | 'personnes' | 'organisation' | 'admin';
const GROUPES: { cle: Groupe; titre: string }[] = [
  { cle: 'terrain', titre: 'Terrain & poste' },
  { cle: 'matiere', titre: 'Matière & mouvements' },
  { cle: 'suivi', titre: 'Suivi & registres' },
  { cle: 'personnes', titre: 'Personnes & accès' },
  { cle: 'organisation', titre: 'Entreprises & preneurs' },
  { cle: 'admin', titre: 'Administration' },
];

interface Dest {
  vue: Vue;
  label: string;
  court: string;
  icon: ReactNode;
  groupe: Groupe;
  /** Pouvoir(s) donnant accès (l'un suffit). Absent = accessible à tous les connectés. */
  pouvoir?: string[];
}

const DESTINATIONS: Dest[] = [
  { vue: 'accueil', label: 'Accueil', court: 'Accueil', groupe: 'terrain', icon: <Home className="h-5 w-5" /> },
  { vue: 'poste', label: 'Poste de contrôle', court: 'Poste', groupe: 'terrain', icon: <ScanLine className="h-5 w-5" />, pouvoir: ['CONTROLER_AU_POSTE'] },
  { vue: 'inscription', label: 'Inscription au poste', court: 'Inscription', groupe: 'terrain', icon: <UserPlus className="h-5 w-5" />, pouvoir: ['CONTROLER_AU_POSTE'] },
  { vue: 'cloture', label: 'Clôture de journée', court: 'Clôture', groupe: 'terrain', icon: <Moon className="h-5 w-5" />, pouvoir: ['CLOTURER_JOURNEE', 'CONTROLER_AU_POSTE'] },
  { vue: 'maincourante', label: 'Main courante', court: 'Main courante', groupe: 'terrain', icon: <BookText className="h-5 w-5" />, pouvoir: ['CONTROLER_AU_POSTE', 'CONSULTER_TABLEAU', 'SUIVRE_INCIDENTS'] },
  { vue: 'materiel', label: 'Matière', court: 'Matière', groupe: 'matiere', icon: <Package className="h-5 w-5" />, pouvoir: ['DECLARER_MATERIEL', 'DEMANDER_SORTIE', 'VISER_SORTIE', 'APPROUVER_SORTIE', 'RECEPTIONNER', 'VALIDER_CRENEAU', 'AUTORISER_EVACUATION', 'DEMANDER_LIVRAISON'] },
  { vue: 'tableau', label: 'Tableau de bord', court: 'Tableau', groupe: 'suivi', icon: <LayoutDashboard className="h-5 w-5" />, pouvoir: ['CONSULTER_TABLEAU'] },
  { vue: 'listes', label: 'Registre de présence', court: 'Registre', groupe: 'suivi', icon: <ClipboardList className="h-5 w-5" />, pouvoir: ['DEPOSER_LISTE', 'CONSULTER_TABLEAU'] },
  { vue: 'registres', label: 'Registres & exports', court: 'Registres', groupe: 'suivi', icon: <Table2 className="h-5 w-5" />, pouvoir: ['EXPORTER', 'CONSULTER_AUDIT'] },
  { vue: 'live', label: 'Console Live', court: 'Live', groupe: 'suivi', icon: <Cloud className="h-5 w-5" />, pouvoir: ['CONSULTER_TABLEAU'] },
  { vue: 'personnes', label: 'Personnes & badges', court: 'Personnes', groupe: 'personnes', icon: <CreditCard className="h-5 w-5" />, pouvoir: ['DECLARER_PERSONNEL', 'DELIVRER_BADGE'] },
  { vue: 'badges', label: 'Impression & visiteurs', court: 'Badges', groupe: 'personnes', icon: <CreditCard className="h-5 w-5" />, pouvoir: ['DELIVRER_BADGE', 'DECLARER_PERSONNEL'] },
  { vue: 'vivier', label: 'Vivier de personnel', court: 'Vivier', groupe: 'personnes', icon: <UsersRound className="h-5 w-5" />, pouvoir: ['DECLARER_PERSONNEL', 'DEPOSER_LISTE', 'DELIVRER_BADGE'] },
  { vue: 'cles', label: 'Clés & zones', court: 'Clés', groupe: 'personnes', icon: <Key className="h-5 w-5" />, pouvoir: ['DELIVRER_BADGE'] },
  { vue: 'entreprises', label: 'Entreprises', court: 'Entreprises', groupe: 'organisation', icon: <Building2 className="h-5 w-5" />, pouvoir: ['DECLARER_ENTREPRISE', 'VISER_HABILITATION', 'APPROUVER_HABILITATION', 'GERER_CONDITIONS_BLOQUANTES'] },
  { vue: 'preneurs', label: 'Preneurs & emprises', court: 'Preneurs', groupe: 'organisation', icon: <Store className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION', 'GERER_CONDITIONS_BLOQUANTES'] },
  { vue: 'entites', label: 'Registre des entreprises', court: 'Sociétés', groupe: 'organisation', icon: <Building2 className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'invitations', label: 'Invitations référents', court: 'Invitations', groupe: 'organisation', icon: <Link2 className="h-5 w-5" />, pouvoir: ['DECLARER_ENTREPRISE', 'ADMINISTRER_ORGANISATION'] },
  { vue: 'referent', label: 'Portail référent', court: 'Référent', groupe: 'organisation', icon: <Link2 className="h-5 w-5" /> },
  { vue: 'espaces', label: 'Espaces & profils', court: 'Espaces', groupe: 'admin', icon: <Users className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'comptes', label: 'Comptes internes', court: 'Comptes', groupe: 'admin', icon: <Users className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'roles', label: 'Rôles & pouvoirs', court: 'Rôles', groupe: 'admin', icon: <KeyRound className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'plafonds', label: 'Plafonds d’effectif', court: 'Plafonds', groupe: 'admin', icon: <Gauge className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
  { vue: 'admin', label: 'Administration', court: 'Admin', groupe: 'admin', icon: <Settings className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION', 'CONSULTER_AUDIT'] },
  { vue: 'parametrage', label: 'Paramétrage', court: 'Paramétrage', groupe: 'admin', icon: <SlidersHorizontal className="h-5 w-5" />, pouvoir: ['ADMINISTRER_ORGANISATION'] },
];

const destOf = (v: Vue) => DESTINATIONS.find((d) => d.vue === v)!;

function renderVue(vue: Vue, go: (v: string) => void, primaires: Vue[]): ReactNode {
  switch (vue) {
    case 'espaces': return <Espaces onOpen={go} />;
    case 'preneurs': return <PreneursLive />;
    case 'entites': return <EntreprisesRegistre />;
    case 'roles': return <RolesLive />;
    case 'comptes': return <ComptesLive />;
    case 'invitations': return <InvitationsLive />;
    case 'personnes': return <PersonnesLive />;
    case 'cloture': return <Cloture />;
    case 'inscription': return <InscriptionPortail />;
    case 'plafonds': return <Plafonds />;
    case 'vivier': return <Vivier />;
    case 'accueil': return <Accueil onOpen={go} primaires={primaires} />;
    case 'tableau': return <Tableau />;
    case 'entreprises': return <Habilitations />;
    case 'listes': return <Listes />;
    case 'badges': return <Badges />;
    case 'materiel': return <Materiel />;
    case 'maincourante': return <MainCourante />;
    case 'cles': return <ClesRegistre />;
    case 'admin': return <Administration />;
    case 'parametrage': return <Parametrage />;
    case 'live': return <Live />;
    case 'referent': return <PortailReferent />;
    case 'registres': return <Registres />;
    default: return <PosteHub />;
  }
}

export default function App() {
  // Lien d'invitation référent (/?r=jeton) : on ouvre directement le portail.
  // Deep-link (/?vue=maincourante) : ouvert par la notification push / le pop-up.
  const [vue, setVue] = useState<Vue>(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has('r')) return 'referent';
    const v = p.get('vue');
    if (v && DESTINATIONS.some((d) => d.vue === v)) return v as Vue;
    return 'accueil';
  });
  // QR d'invitation de compte (/?invitation=jeton) : l'activation prend tout l'écran.
  const jetonInvitation = new URLSearchParams(window.location.search).get('invitation');
  // Lien de réinitialisation de mot de passe (redirectTo → ?reset=1#type=recovery).
  const [recovery, setRecovery] = useState(
    () => window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).has('reset'),
  );
  const [more, setMore] = useState(false);
  const [aide, setAide] = useState(false);
  const { connecte, pouvoirs, chargement } = useAuthz();

  // Interface par rôle : hors session on montre tout (démo) ; connecté, on ne
  // laisse voir que ce que les pouvoirs autorisent.
  const autorise = (d: Dest) => !connecte || !d.pouvoir || d.pouvoir.some((p) => pouvoirs.has(p));

  // Barre du bas composée pour la famille de rôle : on retire les destinations
  // non autorisées puis on garde les premières, si bien que la barre se complète
  // avec la suivante autorisée au lieu de rétrécir.
  const primaires = (primairesPour(pouvoirs, connecte) as Vue[])
    .filter((v) => autorise(destOf(v)))
    .slice(0, LONGUEUR_BARRE);

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

  // L'évènement PASSWORD_RECOVERY peut arriver après le montage (hash traité en asynchrone).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (jetonInvitation) return <ActivationCompte jeton={jetonInvitation} />;
  if (recovery)
    return (
      <ReinitialiserMotDePasse
        onFini={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setRecovery(false);
        }}
      />
    );

  // Portail référent : entrée publique par lien signé (/?r=jeton), sans compte.
  const lienReferent = new URLSearchParams(window.location.search).has('r');
  if (lienReferent && !connecte)
    return (
      <Suspense fallback={<EcranChargement />}>
        <PortailReferent />
      </Suspense>
    );

  // Mur d'authentification : on attend la vérification de session (pas de flash),
  // puis on exige la connexion avant tout accès à l'application.
  if (chargement) return <EcranChargement />;
  if (!connecte) return <EcranConnexion />;

  return (
    <div className="min-h-screen bg-sand-100">
      <TopBar vue={vue} onAide={() => setAide(true)} />
      <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <Suspense fallback={<ChargementVue />}>{renderVue(vue, go, primaires)}</Suspense>
      </main>
      <BottomNav vue={vue} onGo={go} onMore={() => setMore(true)} moreActif={more} primaires={primaires} />
      {more && <MoreSheet vue={vue} onGo={go} onClose={() => setMore(false)} autorise={autorise} primaires={primaires} />}
      {aide && <CommentCaMarche primaires={primaires.map(destOf)} onClose={() => setAide(false)} />}
      <AlertesTempsReel onVoir={() => go('maincourante')} />
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

/* ---------- Écran de chargement (vérification de session) ---------- */
function EcranChargement() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#282C20] via-[#3E4A0C] to-[#5C6B12]">
      <Loader2 className="h-7 w-7 animate-spin text-white/80" />
    </div>
  );
}

/* ---------- Mur d'authentification (plein écran) ---------- */
function EcranConnexion() {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [resetEnvoye, setResetEnvoye] = useState(false);
  const [voirMdp, setVoirMdp] = useState(false);

  async function connexion() {
    if (envoi) return;
    setEnvoi(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setEnvoi(false);
    // Succès : onAuthStateChange rafraîchit l'AuthzProvider → l'application s'affiche.
    if (error) setErr(error.message === 'Invalid login credentials' ? 'E-mail ou mot de passe incorrect.' : error.message);
  }

  async function premiereConnexion() {
    if (!email.trim()) {
      setErr('Saisissez d’abord votre e-mail, puis « Première connexion / mot de passe oublié ».');
      return;
    }
    setErr(null);
    // Courriel de réinitialisation propre à Atlas Trace (fonction Resend). Le lien
    // ramène ici pour définir le mot de passe — sert aussi de première connexion.
    await supabase.functions
      .invoke('mot-de-passe', { body: { email: email.trim(), app_url: window.location.origin } })
      .catch(() => {});
    setResetEnvoye(true);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#282C20] via-[#3E4A0C] to-[#5C6B12] px-5 py-10">
      <div className="animate-pulse-slow pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-volt/25 blur-3xl" />
      <div className="animate-pulse-slow pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-volt/15 blur-3xl" style={{ animationDelay: '3.5s' }} />
      <div className="relative w-full max-w-sm animate-fade-up-slow">
        <div className="mb-7 text-center">
          <Logo size="lg" className="text-white" />
          <p className="mt-2 text-sm text-white/70">Contrôle d’accès de site — connectez-vous pour continuer.</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-card-lg ring-1 ring-black/5">
          <h1 className="mb-1 text-lg font-extrabold text-ink">Connexion</h1>
          <p className="mb-5 text-xs text-muted">L’application n’affiche que ce que votre rôle autorise.</p>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-muted">Mot de passe</span>
            <div className="relative">
              <input type={voirMdp ? 'text' : 'password'} value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === 'Enter') connexion(); }}
                className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2.5 pr-10 text-sm text-ink outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" />
              <button type="button" onClick={() => setVoirMdp((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-ink"
                aria-label={voirMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {voirMdp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {err && <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600 ring-1 ring-danger-100">{err}</p>}
          {resetEnvoye && (
            <p className="mt-3 rounded-xl bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-700 ring-1 ring-forest-100">
              Si un compte existe pour cette adresse, un courriel vient d’être envoyé. Le lien ramène ici pour définir votre mot de passe.
            </p>
          )}

          <button
            onClick={connexion}
            disabled={envoi}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 text-sm font-extrabold text-ink shadow-[0_10px_28px_-10px_rgba(210,255,0,0.75)] ring-1 ring-amber-500/40 transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_14px_32px_-10px_rgba(210,255,0,0.9)] active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
          >
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Se connecter
          </button>

          <button onClick={premiereConnexion} className="mt-3 w-full text-center text-xs font-semibold text-forest-600 underline-offset-2 hover:underline">
            Première connexion / mot de passe oublié
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">Atlas Trace · accès réservé au personnel habilité</p>
      </div>
    </div>
  );
}

/* ---------- Barre d'application (haut) ---------- */
function TopBar({ vue, onAide }: { vue: Vue; onAide: () => void }) {
  const d = destOf(vue);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-[#282C20] via-[#3E4A0C] to-[#5C6B12] pt-[env(safe-area-inset-top)] shadow-soft backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Logo size="sm" className="text-white" />
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-inset ring-white/15 backdrop-blur sm:inline-flex">
            {d.court}
          </span>
          <button
            onClick={onAide}
            aria-label="Comment ça marche"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/90 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <CompteBouton />
        </div>
      </div>
    </header>
  );
}

/* ---------- Compte / connexion ---------- */
const FAMILLE_LABEL: Record<Famille, string> = {
  DIRECTION: 'Direction',
  TERRAIN: 'Poste',
  VALIDATION: 'Validation',
  REFERENT: 'Référent',
  BASE: 'Accès',
};

function CompteBouton() {
  const { connecte, pouvoirs } = useAuthz();
  const [session, setSession] = useState<Session | null>(null);
  const [ouvre, setOuvre] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session) {
    const initiale = (session.user.email ?? '?').slice(0, 1).toUpperCase();
    const role = connecte ? FAMILLE_LABEL[familleDe(pouvoirs)] : null;
    return (
      <button
        onClick={() => supabase.auth.signOut()}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-2.5 text-xs font-semibold text-white/90 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
        title="Se déconnecter"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-300/25 text-[11px] font-bold text-amber-100">{initiale}</span>
        {role && <span className="max-w-[7rem] truncate">{role}</span>}
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
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [resetEnvoye, setResetEnvoye] = useState(false);

  async function connexion() {
    setEnvoi(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setEnvoi(false);
    if (error) setErr(error.message);
    else onClose();
  }

  async function motDePasseOublie() {
    if (!email.trim()) {
      setErr('Saisissez d’abord votre e-mail, puis cliquez sur « Mot de passe oublié ».');
      return;
    }
    setErr(null);
    // Courriel de réinitialisation propre à Atlas Trace (fonction Resend), pas le
    // gabarit par défaut du projet partagé. Le lien revient ici (redirectTo).
    await supabase.functions
      .invoke('mot-de-passe', { body: { email: email.trim(), app_url: window.location.origin } })
      .catch(() => {});
    // Message neutre : on ne révèle pas si l'adresse a un compte.
    setResetEnvoye(true);
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60 sm:rounded-3xl"
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
        {resetEnvoye && (
          <p className="mt-3 rounded-xl bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-700 ring-1 ring-forest-100">
            Si un compte existe pour cette adresse, un courriel de réinitialisation vient d’être envoyé. Le lien ramène ici.
          </p>
        )}

        <button
          onClick={connexion}
          disabled={envoi}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-forest-500 py-3 text-sm font-bold text-white shadow-soft transition-colors hover:bg-forest-600 disabled:opacity-60"
        >
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Se connecter
        </button>

        <button
          onClick={motDePasseOublie}
          className="mt-3 w-full text-center text-xs font-semibold text-forest-600 underline-offset-2 hover:underline"
        >
          Mot de passe oublié ?
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Barre d'onglets (bas, au pouce) ---------- */
function BottomNav({ vue, onGo, onMore, moreActif, primaires }: { vue: Vue; onGo: (v: string) => void; onMore: () => void; moreActif: boolean; primaires: Vue[] }) {
  const dests = primaires.map(destOf);
  const surPrimaire = dests.some((d) => d.vue === vue);
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-sand-300/50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {dests.map((d) => (
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
function MoreSheet({ vue, onGo, onClose, autorise, primaires }: { vue: Vue; onGo: (v: string) => void; onClose: () => void; autorise: (d: Dest) => boolean; primaires: Vue[] }) {
  const autres = DESTINATIONS.filter((d) => !primaires.includes(d.vue) && autorise(d));
  const sections = GROUPES
    .map((g) => ({ ...g, items: autres.filter((d) => d.groupe === g.cle) }))
    .filter((g) => g.items.length > 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col animate-fade-up rounded-t-3xl bg-white shadow-card-lg ring-1 ring-sand-300/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sand-300" />
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink">Toutes les destinations</h2>
            <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand-100 hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
          {sections.map((section) => (
            <section key={section.cle}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{section.titre}</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {section.items.map((d) => {
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
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
