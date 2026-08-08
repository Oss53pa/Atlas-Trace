import { supabase } from '../../lib/supabase';

/** Tableau de bord (M15) — agrégat serveur, lecture seule, borné à l'organisation.
 *  Toutes les valeurs viennent des tables live ; rien n'est inventé.
 *  Période paramétrable (24 h / 7 j / 30 j) : tendances vs période précédente,
 *  série temporelle (sparkline) et panneaux incidents / dotations / clés. */

export type Periode = 1 | 7 | 30;

export interface SeriePoint {
  label: string;
  entrees: number;
  sorties: number;
  refus: number;
}

export interface TableauBord {
  periode_jours: number;
  present: number;
  declare: number;
  ecart: number;
  entrees: number;
  sorties_attente: number;
  preavis_jour: number;
  badges_actifs: number;
  /** Autorisations véhicule expirant sous 7 jours (encore actives). */
  vehicules_expirant: number;
  controles: { autorises: number; refus: number; forcages: number };
  anomalies: { total: number; vehicules: number; evacuations: number; sorties_refusees: number };
  incidents: { total: number; ouverts: number; majeurs: number };
  dotations: { entreprises: number; quantite: number };
  cles: { sorties: number; total: number };
  /** Mêmes indicateurs sur la période précédente de même durée — pour les tendances ▲▼. */
  precedent: { autorises: number; refus: number; forcages: number; anomalies: number; entrees: number; incidents: number };
  presence: { entreprise: string; declare: number; entre: number }[];
  passages: { heure: string; entrees: number; sorties: number }[];
  serie: SeriePoint[];
  entreprises_sans_liste: number;
}

export async function chargerTableauBord(jours: Periode = 1): Promise<TableauBord> {
  const { data, error } = await supabase.rpc('at_tableau_bord', { p_jours: jours });
  if (error) throw new Error(error.message);
  return data as TableauBord;
}
