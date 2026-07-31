import { useMemo, useState } from 'react';
import { Printer, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { BadgeCard, type BadgeCardData } from './BadgeCard';
import { CATEGORIES, PERSONNEL } from '../../data/badges';

const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—');

export function BadgesNominatifs() {
  const [entreprise, setEntreprise] = useState('TOUTES');
  const [toast, setToast] = useState<string | null>(null);

  const actifs = useMemo(
    () =>
      PERSONNEL.filter((p) => p.badgeStatut === 'ACTIF').filter(
        (p) => entreprise === 'TOUTES' || p.entreprise === entreprise,
      ),
    [entreprise],
  );

  const cartes: BadgeCardData[] = actifs.map((p) => {
    const cat = CATEGORIES[p.categorieId];
    return {
      numero: p.badgeNumero!,
      typeLabel: 'Nominatif',
      nom: p.nom,
      prenom: p.prenom,
      fonction: p.fonction,
      entreprise: p.entreprise,
      categorieLabel: cat.libelle,
      categorieHex: cat.hex,
      zoneLabel: cat.zoneLabel,
      validite: `Induction éch. ${fmt(p.inductionEcheance)}`,
    };
  });

  const entreprises = Array.from(new Set(PERSONNEL.map((p) => p.entreprise)));

  function imprimer() {
    setToast(`Planche d'impression générée · ${cartes.length} badge(s) · format carte CR80`);
    setTimeout(() => setToast(null), 3200);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
            <CreditCard className="h-3.5 w-3.5" /> M3 · Badges nominatifs
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">Badges nominatifs</h1>
          <p className="mt-1 text-sm text-muted">
            Format carte, charte du site, QR au recto. Le code n'est qu'une clé — la photo vaut contrôle.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Entreprise</span>
            <select
              value={entreprise}
              onChange={(e) => setEntreprise(e.target.value)}
              className="rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-forest-400"
            >
              <option value="TOUTES">Toutes</option>
              {entreprises.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={imprimer}>
            Imprimer le lot ({cartes.length})
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        {cartes.map((c) => (
          <BadgeCard key={c.numero} data={c} />
        ))}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card-lg">
            <Printer className="h-4 w-4" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
