import {
  Building2, Building, CreditCard, ClipboardList, MonitorSmartphone, Table2, LayoutDashboard,
  Tag, PackagePlus, FileOutput, PackageOpen, Truck, CalendarClock, Trash2,
  BookText, Key, Settings, SlidersHorizontal, Boxes, ArrowRight, ScanLine, WifiOff, Link2, ArrowUpRight,
} from 'lucide-react';
import { Logo } from '../../components/ui/Logo';

interface Module { code: string; nom: string; vue: string; icon: React.ReactNode }
interface Lot { titre: string; hex: string; modules: Module[] }

const LOTS: Lot[] = [
  {
    titre: 'Lot 1 — Accès & présence', hex: '#0F5044', modules: [
      { code: 'M1', nom: 'Entreprises intervenantes', vue: 'entreprises', icon: <Building2 className="h-4 w-4" /> },
      { code: 'M2', nom: 'Donneurs d’ordre & conditions', vue: 'entreprises', icon: <Building className="h-4 w-4" /> },
      { code: 'M3', nom: 'Personnes & badges', vue: 'badges', icon: <CreditCard className="h-4 w-4" /> },
      { code: 'M4', nom: 'Listes journalières', vue: 'listes', icon: <ClipboardList className="h-4 w-4" /> },
      { code: 'M5', nom: 'Contrôle au poste', vue: 'poste', icon: <MonitorSmartphone className="h-4 w-4" /> },
      { code: 'M6', nom: 'Registres & exports', vue: 'registres', icon: <Table2 className="h-4 w-4" /> },
      { code: 'M15', nom: 'Tableau de bord', vue: 'tableau', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    titre: 'Lot 2 — Matière', hex: '#C08A2A', modules: [
      { code: 'M7', nom: 'Parcs & marquage', vue: 'materiel', icon: <Tag className="h-4 w-4" /> },
      { code: 'M8', nom: 'Entrées ponctuelles', vue: 'materiel', icon: <PackagePlus className="h-4 w-4" /> },
      { code: 'M9', nom: 'Autorisations de sortie', vue: 'materiel', icon: <FileOutput className="h-4 w-4" /> },
      { code: 'M10', nom: 'Contrôle des sorties', vue: 'poste', icon: <PackageOpen className="h-4 w-4" /> },
      { code: 'M11', nom: 'Véhicules & mouvements', vue: 'materiel', icon: <Truck className="h-4 w-4" /> },
      { code: 'M12/13', nom: 'Livraisons & réception', vue: 'materiel', icon: <CalendarClock className="h-4 w-4" /> },
      { code: 'M14', nom: 'Évacuations & contrôle inopiné', vue: 'materiel', icon: <Trash2 className="h-4 w-4" /> },
    ],
  },
  {
    titre: 'Lot 3 — Exploitation', hex: '#6F7C75', modules: [
      { code: 'M16', nom: 'Main courante & incidents', vue: 'maincourante', icon: <BookText className="h-4 w-4" /> },
      { code: 'M17', nom: 'Clés & zones sensibles', vue: 'cles', icon: <Key className="h-4 w-4" /> },
      { code: 'M18', nom: 'Administration, audit & mode dégradé', vue: 'admin', icon: <Settings className="h-4 w-4" /> },
    ],
  },
  {
    titre: 'Généralisation', hex: '#A87C1E', modules: [
      { code: 'M19', nom: 'Paramétrage & modèles sectoriels', vue: 'parametrage', icon: <SlidersHorizontal className="h-4 w-4" /> },
      { code: 'M20', nom: 'Back office éditeur', vue: 'editeur', icon: <Boxes className="h-4 w-4" /> },
    ],
  },
];

const PRINCIPES = [
  { tone: 'forest', icon: <FileOutput className="h-4 w-4" />, titre: 'Règle de sortie unique', texte: 'Rien ne sort qui ne soit déclaré-marqué ou approuvé (R1).' },
  { tone: 'amber', icon: <ScanLine className="h-4 w-4" />, titre: 'La photo vaut contrôle', texte: 'Le code QR n’est qu’une clé ; la décision est humaine (R2).' },
  { tone: 'forest', icon: <WifiOff className="h-4 w-4" />, titre: 'Hors ligne de premier rang', texte: 'Le poste fonctionne sans réseau, puis synchronise (R4).' },
  { tone: 'amber', icon: <Link2 className="h-4 w-4" />, titre: 'Aucun compte externe', texte: 'Les référents accèdent par lien unique révocable (R5).' },
] as const;

export function Accueil({ onOpen }: { onOpen: (vue: string) => void }) {
  return (
    <div className="min-h-screen bg-sand-100">
      {/* Hero clair */}
      <header className="relative overflow-hidden border-b border-sand-300/70 bg-sand-50">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(60%_60%_at_15%_-10%,#DCEAE4_0%,transparent_60%),radial-gradient(45%_45%_at_100%_0%,#FBEFCF_0%,transparent_55%)]" />
        <div className="relative mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Suite Atlas Studio · maquette interactive
            </span>
            <p className="brand-wordmark mt-6 text-6xl text-forest-600 sm:text-7xl">Atlas Trace</p>
            <span className="mt-3 h-1 w-16 rounded-full bg-amber-400" />
            <p className="mt-5 max-w-2xl text-lg text-ink/80">
              Contrôle d’accès et traçabilité matière sur site. Une application de <b className="text-ink">processus</b>,
              pas de matériel — portée par les téléphones du poste, jusque dans le hors-ligne.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => onOpen('poste')} className="inline-flex items-center gap-2 rounded-xl bg-forest-500 px-5 py-3 text-sm font-bold text-white shadow-card transition-colors hover:bg-forest-600">
                <MonitorSmartphone className="h-4 w-4" /> Entrer au poste de contrôle
              </button>
              <button onClick={() => onOpen('tableau')} className="inline-flex items-center gap-2 rounded-xl border border-sand-300 bg-white px-5 py-3 text-sm font-bold text-ink shadow-card transition-colors hover:bg-sand-50">
                <LayoutDashboard className="h-4 w-4 text-amber-500" /> Voir le tableau de bord
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 pb-16 pt-10">
        {/* Principes directeurs */}
        <div className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPES.map((p) => (
            <div key={p.titre} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${p.tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-forest-50 text-forest-600'}`}>{p.icon}</span>
              <p className="mt-2 text-sm font-bold text-ink">{p.titre}</p>
              <p className="mt-0.5 text-xs text-muted">{p.texte}</p>
            </div>
          ))}
        </div>

        {/* Modules */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Les modules</h2>
            <p className="mt-1 text-sm text-muted">Cahier des charges intégralement maquetté — 20 modules. Cliquez pour ouvrir.</p>
          </div>
          <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-bold text-forest-700 ring-1 ring-forest-100">M1 → M20</span>
        </div>

        <div className="space-y-8">
          {LOTS.map((lot) => (
            <section key={lot.titre}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: lot.hex }} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink">{lot.titre}</h3>
                <span className="text-xs text-muted">· {lot.modules.length} modules</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {lot.modules.map((m) => (
                  <button key={m.code} onClick={() => onOpen(m.vue)}
                    className="group flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card ring-1 ring-sand-300/70 transition-all hover:-translate-y-0.5 hover:ring-forest-300">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: lot.hex }}>{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{m.code}</p>
                      <p className="truncate text-sm font-bold text-ink">{m.nom}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-sand-400 transition-transform group-hover:translate-x-0.5 group-hover:text-forest-500" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Accès annexes */}
        <div className="mt-10 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button onClick={() => onOpen('editeur')} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70 transition-colors hover:bg-sand-50">
            <span className="flex items-center gap-2 text-sm font-bold text-ink"><Boxes className="h-4 w-4 text-amber-500" /> Back office éditeur (Atlas Studio)</span>
            <ArrowUpRight className="h-4 w-4 text-muted" />
          </button>
          <button onClick={() => onOpen('design')} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand-300/70 transition-colors hover:bg-sand-50">
            <span className="flex items-center gap-2 text-sm font-bold text-ink"><SlidersHorizontal className="h-4 w-4 text-forest-500" /> Design system &amp; tokens</span>
            <ArrowUpRight className="h-4 w-4 text-muted" />
          </button>
        </div>

        <footer className="mt-12 flex flex-col items-center gap-3 border-t border-sand-300 pt-8 text-center">
          <Logo size="sm" />
          <p className="max-w-md text-xs text-muted">
            Atlas Trace · suite Atlas Studio — premier client pilote New Heaven SA, chantier du centre commercial Cosmos Angré, Abidjan. Maquette statique.
          </p>
        </footer>
      </div>
    </div>
  );
}
