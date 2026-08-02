import { supabase } from '../../lib/supabase';

/**
 * M25 — clôture de journée. Le serveur bascule les présences restantes en sortie
 * non constatée, solde l'appairage, confirme par silence les lignes portail en
 * attente (M4) et passe en retard les matériels « repart le soir » non sortis.
 */

export interface Present {
  personneId: string;
  label: string;
  entreprise: string;
  heure: string;
}

export interface EtatCloture {
  date: string;
  posteLabel: string;
  presents: Present[];
  nbPresents: number;
  badgesTempNonRestitues: number;
  materielsRepartNonSortis: number;
  dejaCloture: boolean;
}

export interface ResumeCloture {
  sortiesNonConstatees: number;
  prolongations: number;
  confirmeesParSilence: number;
  materielsRetard: number;
  badgesTempNonRestitues: number;
}

export async function etatCloture(posteId: string): Promise<EtatCloture> {
  const { data, error } = await supabase.rpc('at_etat_cloture', { p_poste_id: posteId });
  if (error) throw new Error(error.message);
  const d = data as {
    date: string; poste_label: string;
    presents: { personne_id: string; label: string; entreprise: string; heure: string }[];
    nb_presents: number; badges_temp_non_restitues: number; materiels_repart_non_sortis: number; deja_cloture: boolean;
  };
  return {
    date: d.date,
    posteLabel: d.poste_label,
    presents: (d.presents ?? []).map((p) => ({ personneId: p.personne_id, label: p.label, entreprise: p.entreprise, heure: p.heure })),
    nbPresents: d.nb_presents,
    badgesTempNonRestitues: d.badges_temp_non_restitues,
    materielsRepartNonSortis: d.materiels_repart_non_sortis,
    dejaCloture: d.deja_cloture,
  };
}

export async function cloturerJournee(
  posteId: string,
  prolongations: { personne_id: string; motif: string }[],
): Promise<ResumeCloture> {
  const { data, error } = await supabase.rpc('at_cloturer_journee', {
    p_poste_id: posteId,
    p_mode: 'MANUEL',
    p_prolongations: prolongations,
  });
  if (error) throw new Error(error.message);
  const d = data as {
    sorties_non_constatees: number; prolongations: number; confirmees_par_silence: number;
    materiels_retard: number; badges_temp_non_restitues: number;
  };
  return {
    sortiesNonConstatees: d.sorties_non_constatees,
    prolongations: d.prolongations,
    confirmeesParSilence: d.confirmees_par_silence,
    materielsRetard: d.materiels_retard,
    badgesTempNonRestitues: d.badges_temp_non_restitues,
  };
}
