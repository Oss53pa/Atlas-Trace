import { useCallback, useEffect, useMemo, useState } from 'react';
import { Printer, CreditCard, Loader2, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { BadgeCard, type BadgeCardData } from './BadgeCard';
import { useAuthz } from '../../lib/authz';
import { useContexteSite } from '../../lib/contexte';
import { chargerBadgesNominatifs, type BadgeLive } from './api';

const fmt = (iso?: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

/** Charte des bandes de catégorie (chap. 8), par libellé de catégorie. */
const CAT: Record<string, { hex: string; zone: string }> = {
  Chantier: { hex: '#5C6B12', zone: 'Travaux · circulation' },
  Aménagement: { hex: '#C08A2A', zone: 'Galerie · circulation' },
  Visiteur: { hex: '#6A6B5F', zone: 'Circulation accompagnée' },
};
const catDe = (c: string) => CAT[c] ?? { hex: '#5C6B12', zone: c };

export function BadgesNominatifs() {
  const { connecte, chargement: authEnCours } = useAuthz();
  const ctx = useContexteSite();
  const [badges, setBadges] = useState<BadgeLive[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [entreprise, setEntreprise] = useState('TOUTES');

  const rafraichir = useCallback(async () => {
    try {
      setBadges(await chargerBadgesNominatifs());
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (!connecte) {
      setChargement(false);
      return;
    }
    rafraichir();
  }, [connecte, rafraichir]);

  const entreprises = useMemo(() => Array.from(new Set(badges.map((b) => b.entreprise))), [badges]);

  const actifs = useMemo(
    () =>
      badges
        .filter((b) => b.statut === 'ACTIF')
        .filter((b) => entreprise === 'TOUTES' || b.entreprise === entreprise),
    [badges, entreprise],
  );

  const cartes: BadgeCardData[] = actifs.map((b) => {
    const c = catDe(b.categorie);
    return {
      numero: b.numero,
      typeLabel: 'Nominatif',
      nom: b.nom,
      prenom: b.prenom,
      fonction: b.fonction,
      entreprise: b.entreprise,
      categorieLabel: b.categorie,
      categorieHex: c.hex,
      zoneLabel: c.zone,
      validite: `Induction éch. ${fmt(b.inductionEcheance)}`,
      organisation: ctx.organisation ?? '—',
      site: ctx.site ?? '—',
    };
  });

  if (authEnCours || chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!connecte) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-muted">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-card ring-1 ring-sand-200/60">
          <LogIn className="h-7 w-7" />
        </span>
        <p className="text-base font-bold text-ink">Connexion requise</p>
        <p className="text-sm">Les badges sont une donnée du site : il faut un compte pour les consulter.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
            <CreditCard className="h-3.5 w-3.5" /> Badges nominatifs
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
          <Button variant="primary" icon={<Printer className="h-4 w-4" />} disabled={cartes.length === 0} onClick={() => window.print()}>
            Imprimer le lot ({cartes.length})
          </Button>
        </div>
      </div>

      {erreur && (
        <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600 ring-1 ring-danger-100">
          {erreur}
        </p>
      )}

      {cartes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-12 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-sand-300" />
          <p className="mt-2 text-sm font-semibold text-ink">Aucun badge nominatif actif</p>
          <p className="mt-1 text-sm text-muted">Les badges nominatifs sont délivrés depuis la déclaration des personnes.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-5">
          {cartes.map((c) => (
            <BadgeCard key={c.numero} data={c} />
          ))}
        </div>
      )}
    </div>
  );
}
