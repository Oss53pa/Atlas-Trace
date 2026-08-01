import { supabase } from '../../lib/supabase';

/**
 * Parc matériel (M7). Les trois transitions — déclaration, marquage, visa —
 * passent par des fonctions serveur : le numéro de marquage est attribué par le
 * serveur (unicité garantie) et le visa exige le pouvoir VISER_MATERIEL.
 */

export type StatutMateriel = 'DECLARE' | 'MARQUE' | 'VISE';

export interface Materiel {
  id: string;
  entrepriseId: string;
  entreprise: string;
  designation: string;
  marque?: string | null;
  modele?: string | null;
  numeroSerie?: string | null;
  categorie: string;
  numeroMarquage: string;
  statut: StatutMateriel;
  photoMarquage: boolean;
  photoUrl?: string | null;
  visaPar?: string | null;
  visaAt?: string | null;
  echantillon: boolean;
  bordereau?: string | null;
}

export interface EntrepriseOption {
  id: string;
  raisonSociale: string;
}

/** Une ligne saisie dans le bordereau, avant attribution du marquage. */
export interface LigneBordereau {
  designation: string;
  marque?: string;
  modele?: string;
  numeroSerie?: string;
  categorie: string;
}

export async function chargerParc(): Promise<Materiel[]> {
  const { data, error } = await supabase
    .from('at_materiels')
    .select(
      'id, entreprise_id, designation, marque, modele, numero_serie, categorie, numero_marquage, statut, photo_marquage, photo_url, visa_par, visa_at, echantillon, bordereau, entreprise:at_entreprises(raison_sociale)',
    )
    .order('numero_marquage', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => {
    const ent = m.entreprise as unknown as { raison_sociale: string } | null;
    return {
      id: m.id,
      entrepriseId: m.entreprise_id,
      entreprise: ent?.raison_sociale ?? '—',
      designation: m.designation,
      marque: m.marque,
      modele: m.modele,
      numeroSerie: m.numero_serie,
      categorie: m.categorie,
      numeroMarquage: m.numero_marquage,
      statut: m.statut as StatutMateriel,
      photoMarquage: m.photo_marquage,
      photoUrl: m.photo_url,
      visaPar: m.visa_par,
      visaAt: m.visa_at,
      echantillon: m.echantillon,
      bordereau: m.bordereau,
    };
  });
}

export async function chargerEntreprises(): Promise<EntrepriseOption[]> {
  const { data, error } = await supabase
    .from('at_entreprises')
    .select('id, raison_sociale')
    .order('raison_sociale');
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({ id: e.id, raisonSociale: e.raison_sociale }));
}

/** Le serveur attribue la référence de bordereau et un marquage par ligne. */
export async function declarerBordereau(
  entrepriseId: string,
  lignes: LigneBordereau[],
): Promise<{ bordereau: string; materiels: { numero_marquage: string; designation: string }[] }> {
  const { data, error } = await supabase.rpc('at_declarer_bordereau', {
    p_entreprise_id: entrepriseId,
    p_lignes: lignes,
  });
  if (error) throw new Error(error.message);
  return data as { bordereau: string; materiels: { numero_marquage: string; designation: string }[] };
}

export async function marquerMateriel(id: string, photoUrl: string): Promise<void> {
  const { error } = await supabase.rpc('at_marquer_materiel', { p_id: id, p_photo_url: photoUrl });
  if (error) throw new Error(error.message);
}

export async function viserMateriel(id: string, echantillon: boolean): Promise<void> {
  const { error } = await supabase.rpc('at_viser_materiel', { p_id: id, p_echantillon: echantillon });
  if (error) throw new Error(error.message);
}
