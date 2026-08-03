import { supabase } from '../../lib/supabase';

/** Tableau de bord (M15) — agrégat serveur, lecture seule, borné à l'organisation.
 *  Toutes les valeurs viennent des tables live ; rien n'est inventé. */
export interface TableauBord {
  present: number;
  declare: number;
  ecart: number;
  sorties_attente: number;
  preavis_jour: number;
  badges_actifs: number;
  controles: { autorises: number; refus: number; forcages: number };
  anomalies: { total: number; vehicules: number; evacuations: number; sorties_refusees: number };
  presence: { entreprise: string; declare: number; entre: number }[];
  passages: { heure: string; entrees: number; sorties: number }[];
  entreprises_sans_liste: number;
}

export async function chargerTableauBord(): Promise<TableauBord> {
  const { data, error } = await supabase.rpc('at_tableau_bord');
  if (error) throw new Error(error.message);
  return data as TableauBord;
}
