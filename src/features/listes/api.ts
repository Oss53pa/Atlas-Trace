import { supabase } from '../../lib/supabase';
import type { DepotEntreprise, StatutListe } from '../../data/listes';

/**
 * M4 — lecture réelle du registre de présence (encadrement).
 * Le suivi croise les entreprises du site avec les registres déposés du jour :
 * une entreprise sans registre apparaît « non déposé » (indicatif, jamais bloquant).
 */

const heure = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

export interface SuiviRegistre {
  dateLabel: string;
  depots: DepotEntreprise[];
}

export async function chargerRegistres(): Promise<SuiviRegistre> {
  // Registres déposés, du plus récent au plus ancien : on retient la dernière journée connue.
  const { data: listes, error } = await supabase
    .from('at_listes_journalieres')
    .select('entreprise, statut, effectif, depose_par, deposee_at, date_liste')
    .order('date_liste', { ascending: false });
  if (error) throw new Error(error.message);

  const { data: ents, error: e2 } = await supabase
    .from('at_entreprises')
    .select('raison_sociale')
    .order('raison_sociale');
  if (e2) throw new Error(e2.message);

  const jour = listes?.[0]?.date_liste ?? null;
  const duJour = (listes ?? []).filter((l) => l.date_liste === jour);
  const parEntreprise = new Map(duJour.map((l) => [l.entreprise, l]));

  const noms = new Set<string>([
    ...(ents ?? []).map((e) => e.raison_sociale),
    ...duJour.map((l) => l.entreprise),
  ]);

  const depots: DepotEntreprise[] = [...noms].sort((a, b) => a.localeCompare(b, 'fr')).map((nom) => {
    const l = parEntreprise.get(nom);
    if (!l) {
      return { entreprise: nom, statut: 'MANQUANTE' as StatutListe, effectif: null, heureDepot: null, auteur: null };
    }
    const statut: StatutListe = l.statut === 'HORS_DELAI' ? 'HORS_DELAI' : 'DEPOSEE';
    return {
      entreprise: nom,
      statut,
      effectif: l.effectif ?? null,
      heureDepot: heure(l.deposee_at),
      auteur: l.depose_par ?? null,
    };
  });

  const dateLabel = jour
    ? new Date(jour + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Aucun registre déposé';

  return { dateLabel, depots };
}
