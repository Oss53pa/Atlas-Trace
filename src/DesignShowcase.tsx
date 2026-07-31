import {
  Users,
  PackageCheck,
  AlertTriangle,
  Truck,
  ScanLine,
  Check,
  X,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { Logo } from './components/ui/Logo';
import { Button } from './components/ui/Button';
import { Card, CardHeader } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { StatCard } from './components/ui/StatCard';
import { StatusBanner } from './components/ui/StatusBanner';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, value, className, dark }: { name: string; value: string; className: string; dark?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-sand-200/60 shadow-card">
      <div className={`h-16 ${className}`} />
      <div className="bg-white px-3 py-2">
        <p className={`text-xs font-semibold ${dark ? 'text-ink' : 'text-forest-700'}`}>{name}</p>
        <p className="text-[11px] font-medium text-muted">{value}</p>
      </div>
    </div>
  );
}

export default function DesignShowcase() {
  return (
    <div className="min-h-screen bg-sand-100">
      {/* En-tête */}
      <header className="border-b border-sand-200/70 bg-sand-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Logo size="md" />
          <Badge tone="forest" dot>
            Design System · V1
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        {/* Intro */}
        <div className="space-y-2">
          <p className="brand-wordmark text-4xl">Atlas Trace</p>
          <p className="max-w-2xl text-muted">
            Contrôle d'accès et traçabilité matière sur site. Fondation visuelle de l'application :
            polices Urbanist &amp; Grand Hotel, palette vert / orange sur fond sable.
          </p>
        </div>

        {/* Typographie */}
        <Section title="Typographie">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-sand-200 pb-4">
              <span className="brand-wordmark text-5xl">Atlas Trace</span>
              <Badge tone="neutral">Grand Hotel · nom de l'application</Badge>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="space-y-1">
                <p className="text-3xl font-extrabold tracking-tight text-ink">
                  Contrôle des passages au poste
                </p>
                <p className="text-base text-muted">
                  Urbanist en interface — corps de texte, titres, boutons et libellés.
                </p>
                <p className="text-sm font-medium text-muted">
                  Numéros tabulaires · 06:30 → 18:30 · AS-2026-00184
                </p>
              </div>
              <Badge tone="neutral">Urbanist · interface</Badge>
            </div>
          </Card>
        </Section>

        {/* Palette */}
        <Section title="Palette">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Swatch name="Fond" value="#FAF6EC" className="bg-sand-100" dark />
            <Swatch name="Surface" value="#FFFFFF" className="bg-white" dark />
            <Swatch name="Bordure" value="#EAE4D6" className="bg-sand-300" dark />
            <Swatch name="Teinte verte" value="#DCEAE4" className="bg-forest-100" dark />
            <Swatch name="Série médiane" value="#2E7C68" className="bg-forest-400" />
            <Swatch name="Vert pin · marque" value="#0F5044" className="bg-forest-500" />
            <Swatch name="Vert profond · scan" value="#0A2E28" className="bg-forest-800" />
            <Swatch name="Or · attente" value="#F2C14E" className="bg-amber-300" dark />
            <Swatch name="Teinte or" value="#FBEFCF" className="bg-amber-50" dark />
            <Swatch name="Encre" value="#12211D" className="bg-ink" />
            <Swatch name="Texte secondaire" value="#6F7C75" className="bg-muted" />
            <Swatch name="Refus" value="#C0392B" className="bg-danger-500" />
          </div>
        </Section>

        {/* Indicateurs — aperçu tableau de bord (M15) */}
        <Section title="Indicateurs (aperçu tableau de bord)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              tone="forest"
              label="Présents sur site"
              value={342}
              icon={<Users className="h-5 w-5" />}
              trend={{ value: '+18 depuis 6h30', direction: 'up' }}
            />
            <StatCard
              label="Entreprises sans liste"
              value={2}
              unit="/ 27"
              icon={<Building2 className="h-5 w-5" />}
              trend={{ value: 'à relancer', direction: 'flat' }}
            />
            <StatCard
              tone="amber"
              label="Badges temp. non restitués"
              value={5}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <StatCard
              label="Sorties matière (24 h)"
              value={31}
              icon={<PackageCheck className="h-5 w-5" />}
              trend={{ value: '0 sans couverture', direction: 'up' }}
            />
          </div>
        </Section>

        {/* Décision au poste (R2 / M5) */}
        <Section title="Décision au poste de contrôle">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatusBanner
              result="AUTORISE"
              reason="KOUADIO Jean · SIS-P6"
              instruction="Cellule B12 · zone travaux — laisser passer"
              icon={<Check className="h-8 w-8" strokeWidth={3} />}
            />
            <StatusBanner
              result="REFUSE"
              reason="Hors liste du jour"
              instruction="Orienter vers le référent de l'entreprise"
              icon={<X className="h-8 w-8" strokeWidth={3} />}
            />
          </div>
        </Section>

        {/* Boutons */}
        <Section title="Boutons">
          <Card className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<ScanLine className="h-4 w-4" />}>
              Scanner un badge
            </Button>
            <Button variant="accent" icon={<Truck className="h-4 w-4" />}>
              Nouvelle livraison
            </Button>
            <Button variant="danger" icon={<X className="h-4 w-4" />}>
              Refuser
            </Button>
            <Button variant="outline">Voir le registre</Button>
            <Button variant="ghost">Annuler</Button>
            <Button variant="primary" size="lg" icon={<Check className="h-5 w-5" strokeWidth={3} />}>
              Valider l'accès
            </Button>
          </Card>
        </Section>

        {/* États / badges */}
        <Section title="États & étiquettes">
          <Card className="flex flex-wrap items-center gap-2.5">
            <Badge tone="forest" dot>Active</Badge>
            <Badge tone="forest" dot>Sur site</Badge>
            <Badge tone="amber" dot>En validation</Badge>
            <Badge tone="amber" dot>Hors délai</Badge>
            <Badge tone="danger" dot>Suspendue</Badge>
            <Badge tone="danger" dot>Manquante</Badge>
            <Badge tone="neutral">Brouillon</Badge>
            <Badge tone="neutral">Clôturée</Badge>
          </Card>
        </Section>

        {/* Exemple de carte composée */}
        <Section title="Carte composée">
          <Card>
            <CardHeader
              title="Autorisation de sortie"
              subtitle="AS-2026-00184 · Entreprise Bâti-Sud"
              action={<Badge tone="forest" dot>Approuvée</Badge>}
            />
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                ['Demandeur', 'M. Traoré'],
                ['Destination', 'Dépôt Yopougon'],
                ['Lignes', '3 références'],
                ['Validité', '24 h · jusqu’au 30/07'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-muted">{label}</p>
                  <p className="font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-3 text-sm font-medium text-forest-700">
              <ShieldCheck className="h-4 w-4 shrink-0 text-forest-500" />
              Circuit : Référent → visa HSE Officer → approbation Directeur de la Construction.
            </div>
          </Card>
        </Section>

        <footer className="border-t border-sand-200 pt-6 text-sm text-muted">
          Atlas Trace · suite Atlas Studio · fondation design (maquette statique)
        </footer>
      </main>
    </div>
  );
}
