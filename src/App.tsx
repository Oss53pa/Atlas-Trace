import { useState } from 'react';
import { MonitorSmartphone, Palette, Table2, ClipboardList, LayoutDashboard, CreditCard, Building2, Package, BookText, Key, Settings, SlidersHorizontal, Boxes, Home } from 'lucide-react';
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
import DesignShowcase from './DesignShowcase';

type Vue = 'accueil' | 'poste' | 'tableau' | 'entreprises' | 'listes' | 'badges' | 'materiel' | 'maincourante' | 'cles' | 'admin' | 'parametrage' | 'editeur' | 'registres' | 'design';

export default function App() {
  const [vue, setVue] = useState<Vue>('accueil');

  if (vue === 'accueil') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Accueil onOpen={(v) => setVue(v as Vue)} />
      </div>
    );
  }

  if (vue === 'design') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <DesignShowcase />
      </div>
    );
  }

  if (vue === 'tableau') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Tableau />
      </div>
    );
  }

  if (vue === 'entreprises') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Habilitations />
      </div>
    );
  }

  if (vue === 'listes') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Listes />
      </div>
    );
  }

  if (vue === 'badges') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Badges />
      </div>
    );
  }

  if (vue === 'materiel') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Materiel />
      </div>
    );
  }

  if (vue === 'maincourante') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <MainCourante />
      </div>
    );
  }

  if (vue === 'cles') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <ClesRegistre />
      </div>
    );
  }

  if (vue === 'admin') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Administration />
      </div>
    );
  }

  if (vue === 'parametrage') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Parametrage />
      </div>
    );
  }

  if (vue === 'editeur') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Editeur />
      </div>
    );
  }

  if (vue === 'registres') {
    return (
      <div className="relative">
        <Basculeur vue={vue} onChange={setVue} />
        <Registres />
      </div>
    );
  }

  return (
    <div className="relative">
      <Basculeur vue={vue} onChange={setVue} />
      <PosteHub />
    </div>
  );
}

function Basculeur({ vue, onChange }: { vue: Vue; onChange: (v: Vue) => void }) {
  const onglet = (v: Vue, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => onChange(v)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        vue === v ? 'bg-forest-500 text-white' : 'text-muted'
      }`}
    >
      {icon}
      {label}
    </button>
  );
  return (
    <div className="fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap justify-end gap-1 rounded-3xl bg-white/90 p-1 shadow-card ring-1 ring-sand-300 backdrop-blur">
      {onglet('accueil', 'Accueil', <Home className="h-3.5 w-3.5" />)}
      {onglet('poste', 'Poste', <MonitorSmartphone className="h-3.5 w-3.5" />)}
      {onglet('tableau', 'Tableau', <LayoutDashboard className="h-3.5 w-3.5" />)}
      {onglet('entreprises', 'Entreprises', <Building2 className="h-3.5 w-3.5" />)}
      {onglet('listes', 'Listes', <ClipboardList className="h-3.5 w-3.5" />)}
      {onglet('badges', 'Badges', <CreditCard className="h-3.5 w-3.5" />)}
      {onglet('materiel', 'Matériel', <Package className="h-3.5 w-3.5" />)}
      {onglet('maincourante', 'Main courante', <BookText className="h-3.5 w-3.5" />)}
      {onglet('cles', 'Clés', <Key className="h-3.5 w-3.5" />)}
      {onglet('admin', 'Admin', <Settings className="h-3.5 w-3.5" />)}
      {onglet('parametrage', 'Paramétrage', <SlidersHorizontal className="h-3.5 w-3.5" />)}
      {onglet('editeur', 'Éditeur', <Boxes className="h-3.5 w-3.5" />)}
      {onglet('registres', 'Registres', <Table2 className="h-3.5 w-3.5" />)}
      {onglet('design', 'Design', <Palette className="h-3.5 w-3.5" />)}
    </div>
  );
}
