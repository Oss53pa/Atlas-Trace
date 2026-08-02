import { supabase } from '../../lib/supabase';

/**
 * M21 — vivier de personnes par entité. Référentiel réutilisable enrichi des passages
 * (30 j / 7 j) et de la date de premier passage. Le serveur propose la bascule en
 * badge nominatif au-delà du seuil (3 passages sur 7 jours) ; la décision reste humaine.
 */
export interface VivierPersonne {
  id: string;
  nom: string;
  prenom: string;
  fonction: string | null;
  photoUrl: string | null;
  inductionStatut: string;
  regime: string;
  statut: string;
  nb30: number;
  nb7: number;
  premierPassage: string | null;
  proposeNominatif: boolean;
}

export async function chargerVivier(entrepriseId: string): Promise<VivierPersonne[]> {
  const { data, error } = await supabase.rpc('at_vivier', { p_entreprise_id: entrepriseId });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((p) => ({
    id: p.id as string,
    nom: p.nom as string,
    prenom: p.prenom as string,
    fonction: (p.fonction as string) ?? null,
    photoUrl: (p.photo_url as string) ?? null,
    inductionStatut: p.induction_statut as string,
    regime: p.regime as string,
    statut: p.statut as string,
    nb30: (p.nb_30j as number) ?? 0,
    nb7: (p.nb_7j as number) ?? 0,
    premierPassage: (p.premier_passage as string) ?? null,
    proposeNominatif: (p.propose_nominatif as boolean) ?? false,
  }));
}
