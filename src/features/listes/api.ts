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

/* ===================== Registre vivant (référent) ===================== */

export type StatutConfirmation = 'CONFIRMEE' | 'EN_ATTENTE' | 'CONFIRMEE_PAR_SILENCE' | 'CONTESTEE' | 'REMPLACEE';
export type SourceLigne = 'REFERENT' | 'PORTAIL';

export interface RegistreLigne {
  id: string;
  nom: string;
  prenom: string;
  fonction?: string | null;
  present: boolean;
  tournant: boolean;
  source: SourceLigne;
  statutConfirmation: StatutConfirmation;
  sousTraitant?: string | null;
  motifContestation?: string | null;
}

export interface RegistreEntete {
  listeId: string;
  statut: string;
  effectif: number;
  entreprise: string;
  date: string;
}

/** Crée si besoin le registre du jour de l'entité et renvoie son entête. */
export async function assurerRegistre(entrepriseId: string): Promise<RegistreEntete> {
  const { data, error } = await supabase.rpc('at_registre_assurer', { p_entreprise_id: entrepriseId });
  if (error) throw new Error(error.message);
  const d = data as { liste_id: string; statut: string; effectif: number; entreprise: string; date: string };
  return { listeId: d.liste_id, statut: d.statut, effectif: d.effectif, entreprise: d.entreprise, date: d.date };
}

export async function chargerLignes(listeId: string): Promise<RegistreLigne[]> {
  const { data, error } = await supabase
    .from('at_lignes_liste')
    .select('id, nom, prenom, fonction, present, tournant, source, statut_confirmation, sous_traitant, motif_contestation')
    .eq('liste_id', listeId)
    .order('ajout_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    id: l.id,
    nom: l.nom,
    prenom: l.prenom,
    fonction: l.fonction,
    present: l.present,
    tournant: l.tournant,
    source: l.source as SourceLigne,
    statutConfirmation: l.statut_confirmation as StatutConfirmation,
    sousTraitant: l.sous_traitant,
    motifContestation: l.motif_contestation,
  }));
}

export async function ajouterLigne(p: {
  listeId: string;
  nom: string;
  prenom: string;
  fonction?: string;
  tournant?: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('at_registre_ajouter_ligne', {
    p_liste_id: p.listeId,
    p_nom: p.nom,
    p_prenom: p.prenom,
    p_fonction: p.fonction ?? null,
    p_tournant: p.tournant ?? true,
    p_source: 'REFERENT',
  });
  if (error) throw new Error(error.message);
}

export async function basculerPresent(ligneId: string, present: boolean): Promise<void> {
  const { error } = await supabase.rpc('at_registre_basculer_present', { p_ligne_id: ligneId, p_present: present });
  if (error) throw new Error(error.message);
}

export async function retirerLigne(ligneId: string): Promise<void> {
  const { error } = await supabase.rpc('at_registre_retirer_ligne', { p_ligne_id: ligneId });
  if (error) throw new Error(error.message);
}

export async function confirmerLigne(ligneId: string): Promise<void> {
  const { error } = await supabase.rpc('at_registre_confirmer_ligne', { p_ligne_id: ligneId });
  if (error) throw new Error(error.message);
}

export async function contesterLigne(ligneId: string, motif: string): Promise<void> {
  const { error } = await supabase.rpc('at_registre_contester_ligne', { p_ligne_id: ligneId, p_motif: motif });
  if (error) throw new Error(error.message);
}

export async function enregistrerRegistre(listeId: string, horsDelai: boolean): Promise<{ statut: string; effectif: number }> {
  const { data, error } = await supabase.rpc('at_registre_enregistrer', { p_liste_id: listeId, p_hors_delai: horsDelai });
  if (error) throw new Error(error.message);
  return data as { statut: string; effectif: number };
}
