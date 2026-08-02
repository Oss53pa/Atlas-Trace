import { supabase } from '../../lib/supabase';

/**
 * Matière (M7 entrée / M8 dotation). Aucune apposition physique : ce qui est déclaré
 * incrémente la dotation de la famille pour l'entité, et ressort en quelques secondes.
 * La dotation est tenue par les mouvements (jamais saisie) : elle vit dans at_dotations,
 * alimentée par la fonction serveur at_declarer_entree (SECURITY DEFINER).
 */

export type Regime = 'UNITE' | 'CONTENANT' | 'LOT';
export type StatutMateriel = 'PRESENT' | 'SORTI' | 'EN_RETARD';

export interface Famille {
  id: string;
  libelle: string;
  regime: Regime;
  sensible: boolean;
  actif: boolean;
  ordre: number;
}

export interface Dotation {
  entrepriseId: string;
  entreprise: string;
  familleId: string;
  famille: string;
  regime: Regime;
  sensible: boolean;
  quantitePresente: number;
}

export interface Materiel {
  id: string;
  entrepriseId: string;
  entreprise: string;
  familleId: string;
  famille: string;
  designation: string;
  numeroSerie?: string | null;
  quantite: number;
  statut: StatutMateriel;
  photoUrl?: string | null;
  repartLeSoir: boolean;
  dateEntree: string;
  dateSortiePrevue?: string | null;
}

export interface EntrepriseOption {
  id: string;
  raisonSociale: string;
}

export async function chargerFamilles(): Promise<Famille[]> {
  const { data, error } = await supabase
    .from('at_familles_materiel')
    .select('id, libelle, regime, sensible, actif, ordre')
    .eq('actif', true)
    .order('ordre');
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({
    id: f.id, libelle: f.libelle, regime: f.regime as Regime,
    sensible: f.sensible, actif: f.actif, ordre: f.ordre,
  }));
}

export async function chargerDotations(): Promise<Dotation[]> {
  const { data, error } = await supabase
    .from('at_dotations')
    .select('entreprise_id, famille_id, quantite_presente, entreprise:at_entreprises(raison_sociale), famille:at_familles_materiel(libelle, regime, sensible)')
    .gt('quantite_presente', 0)
    .order('quantite_presente', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => {
    const ent = d.entreprise as unknown as { raison_sociale: string } | null;
    const fam = d.famille as unknown as { libelle: string; regime: Regime; sensible: boolean } | null;
    return {
      entrepriseId: d.entreprise_id,
      entreprise: ent?.raison_sociale ?? '—',
      familleId: d.famille_id,
      famille: fam?.libelle ?? '—',
      regime: (fam?.regime ?? 'UNITE') as Regime,
      sensible: fam?.sensible ?? false,
      quantitePresente: Number(d.quantite_presente),
    };
  });
}

export async function chargerMateriels(): Promise<Materiel[]> {
  const { data, error } = await supabase
    .from('at_materiels')
    .select('id, entreprise_id, famille_id, designation, numero_serie, quantite, statut, photo_url, repart_le_soir, date_entree, date_sortie_prevue, entreprise:at_entreprises(raison_sociale), famille:at_familles_materiel(libelle)')
    .order('date_entree', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => {
    const ent = m.entreprise as unknown as { raison_sociale: string } | null;
    const fam = m.famille as unknown as { libelle: string } | null;
    return {
      id: m.id,
      entrepriseId: m.entreprise_id,
      entreprise: ent?.raison_sociale ?? '—',
      familleId: m.famille_id,
      famille: fam?.libelle ?? '—',
      designation: m.designation,
      numeroSerie: m.numero_serie,
      quantite: Number(m.quantite),
      statut: m.statut as StatutMateriel,
      photoUrl: m.photo_url,
      repartLeSoir: m.repart_le_soir,
      dateEntree: m.date_entree,
      dateSortiePrevue: m.date_sortie_prevue,
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

/** Entrée de matériel (M7). Incrémente la dotation de la famille pour l'entité. */
export async function declarerEntree(p: {
  entrepriseId: string;
  familleId: string;
  designation: string;
  quantite: number;
  numeroSerie?: string;
  photoUrl?: string;
  repartLeSoir?: boolean;
  dateSortiePrevue?: string;
}): Promise<{ id: string; famille: string; dotation: number }> {
  const { data, error } = await supabase.rpc('at_declarer_entree', {
    p_entreprise_id: p.entrepriseId,
    p_famille_id: p.familleId,
    p_designation: p.designation,
    p_quantite: p.quantite,
    p_numero_serie: p.numeroSerie ?? null,
    p_photo_url: p.photoUrl ?? null,
    p_repart_le_soir: p.repartLeSoir ?? false,
    p_date_sortie_prevue: p.dateSortiePrevue ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { id: string; famille: string; dotation: number };
}

/* ===================== Autorisations de sortie (M9) ===================== */

export type TypeSortie = 'SITE' | 'ENTREPRISE' | 'DECHETS';
export type StatutSortie = 'SOUMISE' | 'VISEE' | 'APPROUVEE' | 'REFUSEE' | 'ANNULEE';

export interface LigneSortie {
  designation: string;
  quantite: number;
  unite: string;
}

export interface Autorisation {
  id: string;
  numero: string;
  entreprise: string;
  demandeur?: string | null;
  type: TypeSortie;
  motif?: string | null;
  destination: string;
  lignes: LigneSortie[];
  vehicule?: string | null;
  statut: StatutSortie;
  visaPar?: string | null;
  approuvePar?: string | null;
  motifRefus?: string | null;
  /** Le code n'a de valeur qu'une fois approuvé (avant, c'est un jeton d'attente). */
  code?: string | null;
  validiteFin?: string | null;
  consommeeAt?: string | null;
}

export async function chargerAutorisations(): Promise<Autorisation[]> {
  const { data, error } = await supabase
    .from('at_autorisations_sortie')
    .select(
      'id, numero, code, type, motif, destination, lignes, vehicule, validite_fin, statut, demandeur, visa_par, approuve_par, motif_refus, consommee_at, entreprise:at_entreprises(raison_sociale)',
    )
    .order('numero', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => {
    const ent = a.entreprise as unknown as { raison_sociale: string } | null;
    return {
      id: a.id,
      numero: a.numero,
      entreprise: ent?.raison_sociale ?? '—',
      demandeur: a.demandeur,
      type: a.type as TypeSortie,
      motif: a.motif,
      destination: a.destination,
      lignes: (a.lignes ?? []) as LigneSortie[],
      vehicule: a.vehicule,
      statut: a.statut as StatutSortie,
      visaPar: a.visa_par,
      approuvePar: a.approuve_par,
      motifRefus: a.motif_refus,
      code: a.statut === 'APPROUVEE' ? a.code : null,
      validiteFin: a.validite_fin,
      consommeeAt: a.consommee_at,
    };
  });
}

export async function demanderSortie(p: {
  entrepriseId: string;
  type: TypeSortie;
  motif: string;
  destination: string;
  lignes: LigneSortie[];
  vehicule?: string;
}): Promise<{ numero: string }> {
  const { data, error } = await supabase.rpc('at_demander_sortie', {
    p_entreprise_id: p.entrepriseId,
    p_type: p.type,
    p_motif: p.motif,
    p_destination: p.destination,
    p_lignes: p.lignes,
    p_vehicule: p.vehicule ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { numero: string };
}

export async function viserSortie(id: string): Promise<void> {
  const { error } = await supabase.rpc('at_viser_sortie', { p_id: id });
  if (error) throw new Error(error.message);
}

/** Le serveur refuse si le même agent a posé le visa (séparation des tâches). */
export async function approuverSortie(id: string): Promise<{ code: string }> {
  const { data, error } = await supabase.rpc('at_approuver_sortie', { p_id: id });
  if (error) throw new Error(error.message);
  return data as { code: string };
}

export async function refuserSortie(id: string, motif: string): Promise<void> {
  const { error } = await supabase.rpc('at_refuser_sortie', { p_id: id, p_motif: motif });
  if (error) throw new Error(error.message);
}
