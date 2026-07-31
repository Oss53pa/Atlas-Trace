import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Palette, Table2, ClipboardList, LayoutDashboard, CreditCard, Building2,
  Package, BookText, Key, Settings, SlidersHorizontal, Boxes, Home, Cloud, Link2, Users,
  ScanLine, LayoutGrid, X,
} from 'lucide-react';
import { PosteHub } from './features/poste/PosteHub';
import { Registres } from './features/registres/Registres';
import { Listes } from './features/listes/Listes';
import { Tableau } from './features/tableau/Tableau';
import { Badges } from './features/badges/Badges';
import { Habilitations } from './features/entreprises/Habilitations';
import { Materiel } from './features/materiel/Materiel';
import { MainCourante } from './features/maincourante/MainCourante';
import { ClesRegistre } from './features/cles/ClesRegistre';
import { Administration } from './features/admin/Administration';
import { Parametrage } from './features/parametrage/Parametrage';
import { Editeur } from './features/editeur/Editeur';
import { Accueil } from './features/accueil/Accueil';
import { Live } from './features/live/Live';
import { PortailReferent } from './features/referent/PortailReferent';
import { Espaces } from './features/espaces/Espaces';
import { Logo } from './components/ui/Logo';
import DesignShowcase from './DesignShowcase';

type Vue =
  | 'espaces' | 'accueil' | 'poste' | 'tableau' | 'entreprises' | 'listes' | 'badges' | 'materiel'
  | 'maincourante' | 'cles' | 'admin' | 'parametrage' | 'editeur' | 'live' | 'referent' | 'registres' | 'design';

interface Dest { vue: Vue; label: string; court: string; icon: ReactNode }

const DESTINATIONS: Dest[] = [
  { vue: 'accueil', label: 'Accueil', court: 'Accueil', icon: <Home className="h-5 w-5" /> },
  { vue: 'poste', label: 'Poste de contrôle', court: 'Poste', icon: <ScanLine className="h-5 w-5" /> },
  { vue: 'materiel', label: 'Matière', court: 'Matière', icon: <Package className="h-5 w-5" /> },
  { vue: 'tableau', label: 'Tableau de bord', court: 'Tableau', icon: <LayoutDashboard className="h-5 w-5" /> },
  { vue: 'espaces', label: 'Espaces & profils', court: 'Espaces', icon: <Users className="h-5 w-5" /> },
  { vue: 'entreprises', label: 'Entreprises', court: 'Entreprises', icon: <Building2 className="h-5 w-5" /> },
  { vue: 'listes', label: 'Listes journalières', court: 'Listes', icon: <ClipboardList className="h-5 w-5" /> },
  { vue: 'badges', label: 'Personnes & badges', court: 'Badges', icon: <CreditCard className="h-5 w-5" /> },
  { vue: 'maincourante', label: 'Main courante', court: 'Main courante', icon: <BookText className="h-5 w-5" /> },
  { vue: 'cles', label: 'Clés & zones', court: 'Clés', icon: <Key className="h-5 w-5" /> },
  { vue: 'admin', label: 'Administration', court: 'Admin', icon: <Settings className="h-5 w-5" /> },
  { vue: 'parametrage', label: 'Paramétrage', court: 'Paramétrage', icon: <SlidersHorizontal className="h-5 w-5" /> },
  { vue: 'editeur', label: 'Back office éditeur', court: 'Éditeur', icon: <Boxes className="h-5 w-5" /> },
  { vue: 'live', label: 'Console Live', court: 'Live', icon: <Cloud className="h-5 w-5" /> },
  { vue: 'referent', label: 'Portail référent', court: 'Référent', icon: <Link2 className="h-5 w-5" /> },
  { vue: 'registres', label: 'Registres & exports', court: 'Registres', icon: <Table2 className="h-5 w-5" /> },
  { vue: 'design', label: 'Design system', court: 'Design', icon: <Palette className="h-5 w-5" /> },
];

/** Destinations de la barre du bas (au pouce) ; le reste va dans « Plus ». */
const PRIMAIRES: Vue[] = ['accueil', 'poste', 'materiel', 'tableau'];

const destOf = (v: Vue) => DESTINATIONS.find((d) => d.vue === v)!;

function renderVue(vue: Vue, go: (v: string) => void): ReactNode {
  switch (vue) {
    case 'espaces': return <Espaces onOpen={go} />;
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

  const go = (v: string) => {
    setVue(v as Vue);
    setMore(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-sand-100">
      <TopBar vue={vue} />
      <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{renderVue(vue, go)}</main>
      <BottomNav vue={vue} onGo={go} onMore={() => setMore(true)} moreActif={more} />
      {more && <MoreSheet vue={vue} onGo={go} onClose={() => setMore(false)} />}
    </div>
  );
}

/* ---------- Barre d'application (haut) ---------- */
function TopBar({ vue }: { vue: Vue }) {
  const d = destOf(vue);
  return (
    <header className="glass sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Logo size="sm" />
        <span className="rounded-full bg-sand-100/80 px-3 py-1 text-xs font-semibold text-muted ring-1 ring-sand-300/60">
          {d.court}
        </span>
      </div>
    </header>
  );
}

/* ---------- Barre d'onglets (bas, au pouce) ---------- */
function BottomNav({ vue, onGo, onMore, moreActif }: { vue: Vue; onGo: (v: string) => void; onMore: () => void; moreActif: boolean }) {
  const surPrimaire = PRIMAIRES.includes(vue);
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-sand-300/50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {PRIMAIRES.map((v) => {
          const d = destOf(v);
          const actif = vue === v && !moreActif;
          return <Onglet key={v} actif={actif} label={d.court} icon={d.icon} onClick={() => onGo(v)} />;
        })}
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

/* ---------- Feuille « Plus » (toutes les destinations) ---------- */
function MoreSheet({ vue, onGo, onClose }: { vue: Vue; onGo: (v: string) => void; onClose: () => void }) {
  const autres = DESTINATIONS.filter((d) => !PRIMAIRES.includes(d.vue));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md animate-fade-up rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card-lg ring-1 ring-sand-300/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sand-300" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">Toutes les destinations</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand-100 hover:text-ink">
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
