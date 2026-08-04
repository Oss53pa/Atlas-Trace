import { supabase } from '../../lib/supabase';

/** Référentiels paramétrables (M19). Listes éditables par organisation. */
export interface Referentiel {
  id: string;
  cle: string;
  libelle: string;
  portee: 'Site' | 'Organisation';
  valeurs: string[];
  ordre: number;
}

export async function chargerReferentiels(): Promise<Referentiel[]> {
  const { data, error } = await supabase
    .from('at_referentiels')
    .select('id, cle, libelle, portee, valeurs, ordre')
    .order('ordre');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    cle: r.cle,
    libelle: r.libelle,
    portee: r.portee as 'Site' | 'Organisation',
    valeurs: (r.valeurs ?? []) as string[],
    ordre: r.ordre,
  }));
}

/** Remplace la liste de valeurs d'un référentiel (écriture gouvernée par RLS). */
export async function majReferentielValeurs(id: string, valeurs: string[]): Promise<void> {
  const { error } = await supabase.from('at_referentiels').update({ valeurs }).eq('id', id);
  if (error) throw new Error(error.message);
}
