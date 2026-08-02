import { supabase } from '../../lib/supabase';

/**
 * M23 — inscription au portail (au poste). Écriture serveur (SECURITY DEFINER,
 * pouvoir CONTROLER_AU_POSTE) : crée la personne (source portail), la ligne
 * EN_ATTENTE du registre du jour et le mouvement d'accès. Deux refus seulement :
 * personne suspendue, photo absente.
 */
export interface InscriptionResultat {
  resultat: 'AUTORISE' | 'REFUSE';
  motif?: 'PHOTO_MANQUANTE' | 'PERSONNE_SUSPENDUE';
  personneId?: string;
  label?: string;
  entreprise?: string;
}

export async function inscrirePortail(p: {
  posteId: string;
  entrepriseId: string;
  nom: string;
  prenom: string;
  fonction?: string;
  photoUrl: string;
  pieceType?: string;
  pieceNumero?: string;
}): Promise<InscriptionResultat> {
  const { data, error } = await supabase.rpc('at_inscrire_portail', {
    p_poste_id: p.posteId,
    p_entreprise_id: p.entrepriseId,
    p_nom: p.nom,
    p_prenom: p.prenom,
    p_fonction: p.fonction ?? null,
    p_photo_url: p.photoUrl,
    p_piece_type: p.pieceType ?? null,
    p_piece_numero: p.pieceNumero ?? null,
    p_mode: 'EN_LIGNE',
  });
  if (error) throw new Error(error.message);
  const d = data as { resultat: string; motif?: string; personne_id?: string; label?: string; entreprise?: string };
  return {
    resultat: d.resultat as 'AUTORISE' | 'REFUSE',
    motif: d.motif as InscriptionResultat['motif'],
    personneId: d.personne_id,
    label: d.label,
    entreprise: d.entreprise,
  };
}
