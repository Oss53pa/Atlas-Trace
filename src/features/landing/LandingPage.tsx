import { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck, CreditCard, ClipboardList, ScanLine, Package, BookText,
  LayoutDashboard, WifiOff, KeyRound, Store, Table2, Moon,
  Server, QrCode, GitBranch, History, Smartphone, ArrowRight, Check,
  ChevronDown, Building2, LogIn,
} from 'lucide-react';
import { Logo } from '../../components/ui/Logo';

/** URL du portail Atlas Studio — souscription & achat de l'application (hors Trace). */
const PORTAIL_ATLAS_STUDIO = 'https://atlas-studio.org/portal';
const SITE_ATLAS_STUDIO = 'https://atlas-studio.org';

interface LandingProps {
  /** Ouvre l'écran de connexion de l'application. */
  onEntrer: () => void;
}

/* ------------------------------------------------------------------ */
/* Contenu — la suite des 20 modules, résumée en 12 briques lisibles.  */
/* ------------------------------------------------------------------ */
const FONCTIONS = [
  { icon: ShieldCheck, titre: 'Habilitations entreprises', texte: "Visa HSE puis approbation de la Direction. Conditions bloquantes qui verrouillent toute la chaîne au poste tant qu'elles ne sont pas levées." },
  { icon: CreditCard, titre: 'Personnes & badges', texte: 'Badge QR à jeton signé, usage unique et à expiration. Impossible à recopier : la validité est vérifiée par le serveur, pas lue sur le badge.' },
  { icon: ClipboardList, titre: 'Liste journalière', texte: 'Chaque entreprise dépose la liste du jour depuis un portail par lien signé — sans compte. Rien à saisir au poste : la présence est déjà déclarée.' },
  { icon: ScanLine, titre: 'Poste de contrôle', texte: "Scan caméra réel à l'entrée : habilité et sur la liste → entrée ; sinon → refus. Le forçage reste possible mais motivé et tracé." },
  { icon: Package, titre: 'Traçabilité matière', texte: 'Déclaration, sorties visées puis approuvées, évacuations autorisées. Chaque mouvement porte sa preuve photo et son horodatage.' },
  { icon: BookText, titre: 'Main courante & incidents', texte: 'Journal horodaté du poste, incidents remontés en temps réel, alertes poussées vers les personnes concernées.' },
  { icon: LayoutDashboard, titre: 'Tableau de bord', texte: 'Présence en direct, entrées et refus, indicateurs du site — la situation du jour en un coup d’œil.' },
  { icon: WifiOff, titre: 'Mode dégradé', texte: "Le réseau tombe ? Le poste continue. Le contrôle d'accès reste tenu et se resynchronise au retour de la connexion." },
  { icon: KeyRound, titre: 'Rôles & pouvoirs', texte: 'Pouvoirs atomiques attribués rôle par rôle. La séparation visa ≠ approbation est garantie entre employés — jamais la même main.' },
  { icon: Store, titre: 'Preneurs & emprises', texte: "Occupants d'emprise avec leur propre chaîne d'entreprises. Leurs conditions bloquantes non levées bloquent tous leurs intervenants." },
  { icon: Table2, titre: 'Registres & exports', texte: "Piste d'audit inaltérable, registres de présence et de mouvements, exports prêts pour vos contrôles." },
  { icon: Moon, titre: 'Clôture de journée', texte: 'Fermeture propre du site en fin de journée : présences soldées, journée verrouillée, report au lendemain.' },
];

const ETAPES = [
  { n: '01', titre: 'Déclarez vos entreprises', texte: "Enregistrez les entreprises et preneurs du site, et invitez leurs référents par lien signé." },
  { n: '02', titre: 'Habilitez : visa puis approbation', texte: 'Le HSE vise, la Direction approuve. Les conditions bloquantes restent tant que rien n’est levé.' },
  { n: '03', titre: 'Liste du jour & badges', texte: 'Chaque référent dépose sa liste journalière ; les badges QR signés sont délivrés aux personnes.' },
  { n: '04', titre: 'Contrôlez au poste', texte: 'Scan à l’entrée : entrée ou refus selon l’habilitation et la liste. Tout est tracé, horodaté, prouvé.' },
];

const GARANTIES = [
  { icon: Server, titre: 'La règle vit dans le serveur', texte: "Habilitation, liste, badge, poste : la décision est appliquée côté serveur, pas par l'écran. Rien ne se contourne d'un clic." },
  { icon: QrCode, titre: 'Badge inviolable', texte: 'Jeton d’accès signé, usage unique et à expiration. Un badge recopié ne passe pas — la signature est rejetée.' },
  { icon: GitBranch, titre: 'Séparation des pouvoirs', texte: "Celui qui vise n'est pas celui qui approuve. Les pouvoirs atomiques empêchent qu'un seul rôle valide toute la chaîne." },
  { icon: History, titre: 'Tout est prouvé', texte: 'Chaque entrée, refus, forçage et mouvement matière est horodaté et conservé dans une piste d’audit inaltérable.' },
];

const FAQ = [
  { q: 'À qui s’adresse Atlas Trace ?', r: "À la maîtrise d'ouvrage (MOA) qui administre le contrôle d'accès de son site, et à toutes les entités qui y interviennent : entreprises, preneurs d'emprise, gardiennage, HSE. Chacune obéit aux mêmes règles." },
  { q: 'Faut-il installer quelque chose ?', r: "Non. Atlas Trace est une application web installable (PWA) : elle s'ajoute à l'écran d'accueil du téléphone en un lien, sans passer par un store, et fonctionne même hors ligne." },
  { q: 'Comment un badge peut-il être infalsifiable ?', r: "Le badge porte un jeton signé, à usage unique et à expiration. Au poste, c'est le serveur qui vérifie la signature — un badge recopié ou périmé est refusé." },
  { q: 'Que se passe-t-il si le réseau tombe au poste ?', r: 'Le mode dégradé prend le relais : le contrôle d’accès continue d’être tenu localement et se resynchronise dès que la connexion revient. Aucun trou dans la traçabilité.' },
  { q: 'Chacun voit-il toute l’application ?', r: "Non. L'interface n'affiche que ce que le rôle autorise. Les pouvoirs sont atomiques et attribués rôle par rôle, avec séparation stricte entre le visa et l'approbation." },
  { q: 'Comment souscrire à Atlas Trace ?', r: "L'abonnement et le déploiement se font depuis le portail Atlas Studio. Votre espace y est créé, puis l'application est activée pour votre organisation." },
];

/* Compteur qui s'anime une fois visible (chiffres produit, pas d'audience fictive). */
function Compteur({ valeur, suffixe = '' }: { valeur: number; suffixe?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (valeur === 0) { setN(0); return; }
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      const debut = performance.now();
      const duree = 1100;
      const tick = (t: number) => {
        const p = Math.min(1, (t - debut) / duree);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(valeur * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [valeur]);
  return <span ref={ref} className="tnum">{n}{suffixe}</span>;
}

const STATS = [
  { valeur: 20, suffixe: '', label: 'modules métier' },
  { valeur: 5, suffixe: '', label: 'familles de rôles' },
  { valeur: 100, suffixe: '%', label: 'installable & hors-ligne (PWA)' },
  { valeur: 0, suffixe: '', label: 'accès non habilité toléré' },
];

/* ------------------------------------------------------------------ */
export function LandingPage({ onEntrer }: LandingProps) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-sand-100 text-ink">
      {/* ---------------- Barre de navigation ---------------- */}
      <header
        className={
          'fixed inset-x-0 top-0 z-50 transition-all duration-300 ' +
          (scrolled ? 'glass shadow-soft' : 'bg-transparent')
        }
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Atlas&nbsp;Studio</span>
            <span className="text-sand-400">/</span>
            <Logo size="sm" className="text-forest-500" />
          </div>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
            <a href="#fonctions" className="transition-colors hover:text-ink">Fonctionnalités</a>
            <a href="#etapes" className="transition-colors hover:text-ink">Comment ça marche</a>
            <a href="#garanties" className="transition-colors hover:text-ink">Sécurité</a>
            <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={onEntrer}
              className="hidden rounded-full px-4 py-2 text-sm font-bold text-forest-600 transition-colors hover:bg-forest-50 sm:inline-flex"
            >
              Se connecter
            </button>
            <button
              onClick={onEntrer}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold text-ink shadow-[0_8px_22px_-10px_rgba(210,255,0,0.8)] ring-1 ring-amber-500/40 transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:bg-amber-300"
            >
              Accéder <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Hero (clair, accent Volt) ---------------- */}
      <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:pt-40">
        {/* Décor discret : lavis Volt en haut à droite, léger voile olive en bas */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(1100px 560px at 88% -12%, rgba(210,255,0,0.22), transparent 62%), radial-gradient(760px 420px at -8% 118%, rgba(174,190,106,0.20), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-5xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-sand-200 px-4 py-1.5 text-xs font-semibold text-ink/80 ring-1 ring-inset ring-sand-300">
            <ShieldCheck className="h-4 w-4 text-forest-500" />
            Contrôle d’accès & traçabilité matière · suite Atlas&nbsp;Studio
          </span>
          <h1 className="mt-6 max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight text-ink sm:text-7xl">
            Le contrôle d’accès<br className="hidden sm:block" /> de vos sites,
          </h1>
          <p className="mt-2 leading-none">
            <span className="brand-wordmark inline-block -rotate-1 rounded-lg bg-volt px-4 pb-2 pt-1 text-5xl text-ink shadow-[0_10px_30px_-12px_rgba(210,255,0,0.9)] sm:text-7xl">
              sans faille.
            </span>
          </p>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Atlas Trace verrouille l’accès à vos chantiers et sites industriels : habilitations, badges,
            poste de contrôle, traçabilité de la matière. Une règle métier imparable —
            <span className="font-semibold text-ink"> appliquée par le serveur, pas par l’écran.</span>
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button
              onClick={onEntrer}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-extrabold text-ink shadow-[0_12px_30px_-10px_rgba(210,255,0,0.85)] ring-1 ring-amber-500/40 transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:bg-amber-300 sm:w-auto"
            >
              Accéder à l’application <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#etapes"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-ink ring-1 ring-sand-300 transition-colors hover:bg-sand-50 sm:w-auto"
            >
              Voir comment ça marche
            </a>
          </div>
          <p className="mt-6 text-xs text-muted">
            Administré par la MOA · les entreprises, preneurs et employés obéissent aux mêmes règles.
          </p>
        </div>
      </section>

      {/* ---------------- Bande de chiffres (faits produit) ---------------- */}
      <section className="border-b border-sand-300 bg-sand-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-sand-50 px-6 py-8 text-center">
              <div className="text-4xl font-extrabold tracking-tight text-forest-500">
                <Compteur valeur={s.valeur} suffixe={s.suffixe} />
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Fonctionnalités ---------------- */}
      <section id="fonctions" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-forest-500">20 modules · une seule suite</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Tout le contrôle d’accès, réuni.</h2>
          <p className="mt-3 text-muted">
            De la déclaration d’une entreprise au refus au poste, chaque maillon de la chaîne est couvert — et prouvé.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FONCTIONS.map((f) => (
            <div key={f.titre} className="at-card group p-6 transition-all duration-200 ease-premium hover:-translate-y-1 hover:shadow-card-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-500 ring-1 ring-forest-100 transition-colors group-hover:bg-forest-500 group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{f.titre}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Comment ça marche ---------------- */}
      <section id="etapes" className="border-y border-sand-300 bg-sand-50 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-forest-500">La chaîne d’accès</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">De l’entreprise déclarée au poste tenu.</h2>
            <p className="mt-3 text-muted">Quatre étapes, une même règle : rien ne passe sans habilitation.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {ETAPES.map((e, i) => (
              <div key={e.n} className="relative rounded-2xl bg-white p-6 shadow-card ring-1 ring-sand-300/50">
                <span className="text-5xl font-extrabold text-forest-100">{e.n}</span>
                <h3 className="mt-2 text-base font-bold">{e.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{e.texte}</p>
                {i < ETAPES.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-sand-400 md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Ce qui rend Trace imparable ---------------- */}
      <section id="garanties" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-forest-500">La logique métier, imparable</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ce qui rend Atlas Trace
              <span className="text-forest-500"> impossible à contourner.</span>
            </h2>
            <p className="mt-4 text-muted">
              Atlas Trace n’est pas une vitrine. Le contrôle est appliqué là où il ne peut pas être esquivé :
              côté serveur. Ce que l’écran affiche ne fait qu’exécuter une décision déjà prise et tracée.
            </p>
            <button
              onClick={onEntrer}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-forest-500 px-6 py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:bg-forest-600"
            >
              Accéder à l’application <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {GARANTIES.map((g) => (
              <div key={g.titre} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-sand-300/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-volt">
                  <g.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-bold">{g.titre}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{g.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- PWA / mobile-first ---------------- */}
      <section className="px-5 pb-20">
        <div
          className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-sand-50 px-8 py-14 ring-1 ring-sand-300"
          style={{ backgroundImage: 'radial-gradient(680px 340px at 92% 0%, rgba(210,255,0,0.16), transparent 62%)' }}
        >
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr,1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-sand-200 px-3 py-1 text-xs font-semibold text-ink/80 ring-1 ring-inset ring-sand-300">
                <Smartphone className="h-4 w-4 text-forest-500" /> Pensé pour le terrain
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Sur le téléphone de l’agent, pas dans un bureau.</h2>
              <p className="mt-3 max-w-xl text-muted">
                Atlas Trace s’installe en un lien sur l’écran d’accueil — sans store — et tient le poste
                même sans réseau. L’agent scanne, décide, trace. La donnée se resynchronise toute seule.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {['Installable (PWA) sur Android et iOS', 'Fonctionne hors ligne au poste', 'Scan caméra réel des badges', 'Se resynchronise au retour du réseau'].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-ink ring-1 ring-sand-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-volt text-ink"><Check className="h-4 w-4" /></span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- Accès & souscription (via Atlas Studio) ---------------- */}
      <section className="border-y border-sand-300 bg-sand-50 px-5 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-forest-500">Accès à l’application</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Déployée pour votre organisation.</h2>
          <p className="mt-3 text-muted">
            Atlas Trace se souscrit et se déploie depuis le portail Atlas Studio. Votre espace y est créé,
            puis l’application est activée pour votre site. Vos référents et agents s’y connectent ensuite directement.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={PORTAIL_ATLAS_STUDIO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-extrabold text-ink shadow-[0_12px_30px_-10px_rgba(210,255,0,0.85)] ring-1 ring-amber-500/40 transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:bg-amber-300 sm:w-auto"
            >
              Souscrire sur Atlas Studio <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={onEntrer}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-forest-600 ring-1 ring-sand-300 transition-colors hover:bg-sand-100 sm:w-auto"
            >
              <LogIn className="h-4 w-4" /> J’ai déjà un accès
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-forest-500">Questions fréquentes</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Tout ce qu’il faut savoir.</h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-2xl bg-white px-5 py-4 shadow-card ring-1 ring-sand-300/50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink">
                {item.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------- CTA final ---------------- */}
      <section className="px-5 pb-20">
        <div
          className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-sand-50 px-8 py-16 text-center ring-1 ring-sand-300"
          style={{ backgroundImage: 'radial-gradient(700px 360px at 50% -20%, rgba(210,255,0,0.20), transparent 60%)' }}
        >
          <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Prêt à verrouiller l’accès à vos sites,
            <span className="brand-wordmark ml-2 inline-block -rotate-1 rounded-lg bg-volt px-3 pb-1 text-3xl text-ink sm:text-4xl">sans faille</span> ?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted">
            Habilitations, badges, poste de contrôle, matière — une seule application, une règle imparable.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={onEntrer}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-8 py-3.5 text-sm font-extrabold text-ink shadow-[0_12px_30px_-10px_rgba(210,255,0,0.85)] ring-1 ring-amber-500/40 transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:bg-amber-300 sm:w-auto"
            >
              Accéder à l’application <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={PORTAIL_ATLAS_STUDIO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-ink ring-1 ring-sand-300 transition-colors hover:bg-sand-100 sm:w-auto"
            >
              Souscrire sur Atlas Studio
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- Pied de page ---------------- */}
      <footer className="border-t border-sand-300 bg-sand-50 px-5 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.6fr,1fr,1fr]">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Atlas&nbsp;Studio</span>
              <span className="text-sand-400">/</span>
              <Logo size="sm" className="text-forest-500" />
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted">
              Contrôle d’accès et traçabilité matière sur site. Habilitations, badges, poste de contrôle —
              administré par la MOA, pour tous ses intervenants.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink">Produit</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><a href="#fonctions" className="hover:text-ink">Fonctionnalités</a></li>
              <li><a href="#etapes" className="hover:text-ink">Comment ça marche</a></li>
              <li><a href="#garanties" className="hover:text-ink">Sécurité</a></li>
              <li><a href="#faq" className="hover:text-ink">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink">Atlas Studio</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><a href={SITE_ATLAS_STUDIO} target="_blank" rel="noopener noreferrer" className="hover:text-ink">Toutes les applications</a></li>
              <li><a href={PORTAIL_ATLAS_STUDIO} target="_blank" rel="noopener noreferrer" className="hover:text-ink">Espace client</a></li>
              <li><button onClick={onEntrer} className="hover:text-ink">Se connecter</button></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-sand-300 pt-6 text-xs text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Atlas Studio · Atlas Trace. Tous droits réservés.</span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Une application de la suite Atlas Studio
          </span>
        </div>
      </footer>
    </div>
  );
}
