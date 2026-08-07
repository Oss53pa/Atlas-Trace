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

/* ===================== Véhicules & mouvements (M11) ===================== */

export type StatutVehicule = 'DEHORS' | 'SUR_SITE';
export type EtatCharge = 'VIDE' | 'CHARGE';
export type ControleEffectue = 'COFFRE' | 'BENNE' | 'LES_DEUX' | 'SANS_OBJET';
export type SensVehicule = 'ENTREE' | 'SORTIE';

export interface Vehicule {
  id: string;
  entrepriseId: string;
  entreprise: string;
  immatriculation: string;
  type: string;
  chauffeur: string;
  laissezPasser: string;
  statut: StatutVehicule;
  etatEntree?: EtatCharge | null;
  natureEntree?: string | null;
  entreeAt?: string | null;
  photoEntreeUrl?: string | null;
}

export interface MouvementVehicule {
  id: string;
  immatriculation: string;
  entreprise: string;
  sens: SensVehicule;
  etat: EtatCharge;
  nature?: string | null;
  controle: ControleEffectue;
  couverture?: string | null;
  anomalie: boolean;
  force: boolean;
  agent: string;
  photo: boolean;
  horodatage: string;
}

export async function chargerVehicules(): Promise<Vehicule[]> {
  const { data, error } = await supabase
    .from('at_vehicules')
    .select('id, entreprise_id, immatriculation, type, chauffeur, laissez_passer, statut, etat_entree, nature_entree, entree_at, photo_entree_url, entreprise:at_entreprises(raison_sociale)')
    .order('immatriculation');
  if (error) throw new Error(error.message);
  return (data ?? []).map((v) => {
    const ent = v.entreprise as unknown as { raison_sociale: string } | null;
    return {
      id: v.id,
      entrepriseId: v.entreprise_id,
      entreprise: ent?.raison_sociale ?? '—',
      immatriculation: v.immatriculation,
      type: v.type,
      chauffeur: v.chauffeur,
      laissezPasser: v.laissez_passer,
      statut: v.statut as StatutVehicule,
      etatEntree: v.etat_entree as EtatCharge | null,
      natureEntree: v.nature_entree,
      entreeAt: v.entree_at,
      photoEntreeUrl: v.photo_entree_url,
    };
  });
}

export async function chargerMouvementsVehicule(limite = 12): Promise<MouvementVehicule[]> {
  const { data, error } = await supabase
    .from('at_mouvements_vehicule')
    .select('id, immatriculation, entreprise, sens, etat, nature, controle, couverture, anomalie, force, agent, photo, horodatage')
    .order('horodatage', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    immatriculation: m.immatriculation,
    entreprise: m.entreprise,
    sens: m.sens as SensVehicule,
    etat: m.etat as EtatCharge,
    nature: m.nature,
    controle: m.controle as ControleEffectue,
    couverture: m.couverture,
    anomalie: m.anomalie,
    force: m.force,
    agent: m.agent,
    photo: m.photo,
    horodatage: m.horodatage,
  }));
}

export async function enregistrerVehicule(p: {
  entrepriseId: string;
  immatriculation: string;
  type?: string;
  chauffeur?: string;
}): Promise<{ id: string; laissezPasser: string }> {
  const { data, error } = await supabase.rpc('at_enregistrer_vehicule', {
    p_entreprise_id: p.entrepriseId,
    p_immatriculation: p.immatriculation,
    p_type: p.type ?? 'Véhicule',
    p_chauffeur: p.chauffeur ?? '',
  });
  if (error) throw new Error(error.message);
  const d = data as { id: string; laissez_passer: string };
  return { id: d.id, laissezPasser: d.laissez_passer };
}

/** L'anomalie (entré vide → ressort chargé sans couverture) est décidée côté serveur. */
export async function enregistrerMouvementVehicule(p: {
  vehiculeId: string;
  sens: SensVehicule;
  etat: EtatCharge;
  controle: ControleEffectue;
  nature?: string;
  couverture?: string;
  force?: boolean;
  photo?: boolean;
  photoUrl?: string | null;
}): Promise<{ mouvementId: string; anomalie: boolean; force: boolean; statut: StatutVehicule }> {
  const { data, error } = await supabase.rpc('at_enregistrer_mouvement_vehicule', {
    p_vehicule_id: p.vehiculeId,
    p_sens: p.sens,
    p_etat: p.etat,
    p_controle: p.controle,
    p_nature: p.nature ?? null,
    p_couverture: p.couverture ?? null,
    p_force: p.force ?? false,
    p_photo: p.photo ?? false,
    p_photo_url: p.photoUrl ?? null,
  });
  if (error) throw new Error(error.message);
  const d = data as { mouvement_id: string; anomalie: boolean; force: boolean; statut: StatutVehicule };
  return { mouvementId: d.mouvement_id, anomalie: d.anomalie, force: d.force, statut: d.statut };
}

export interface OccupantVehicule { badge: string; role: 'CONDUCTEUR' | 'PASSAGER' }

/** Rattache un occupant badgé (conducteur/passager) au mouvement du véhicule. */
export async function lierOccupantVehicule(mouvementId: string, badge: string, role: 'CONDUCTEUR' | 'PASSAGER'): Promise<{ personneLabel: string; connu: boolean }> {
  const { data, error } = await supabase.rpc('at_lier_occupant_vehicule', {
    p_mouvement_id: mouvementId,
    p_badge_numero: badge,
    p_role: role,
  });
  if (error) throw new Error(error.message);
  const d = data as { personne_label: string; connu: boolean };
  return { personneLabel: d.personne_label, connu: d.connu };
}

/* ===================== Évacuations & contrôle inopiné (M14) ===================== */

export type StatutEvac = 'ACTIVE' | 'CLOTUREE';
export type ResultatControle = 'CONFORME' | 'ANOMALIE';

export interface Evacuation {
  id: string;
  numero: string;
  entreprise: string;
  nature: string;
  volume: number;
  periode: string;
  destination: string;
  immatriculations: string[];
  statut: StatutEvac;
  visee: boolean;
}

export interface ControleInopine {
  id: string;
  numeroEvac: string;
  immatriculation: string;
  agent: string;
  resultat: ResultatControle;
  photo: boolean;
  horodatage: string;
}

export async function chargerEvacuations(): Promise<Evacuation[]> {
  const { data, error } = await supabase
    .from('at_evacuations')
    .select('id, numero, nature, volume, periode, destination, immatriculations, statut, visee, entreprise:at_entreprises(raison_sociale)')
    .order('numero', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => {
    const ent = e.entreprise as unknown as { raison_sociale: string } | null;
    return {
      id: e.id,
      numero: e.numero,
      entreprise: ent?.raison_sociale ?? '—',
      nature: e.nature,
      volume: Number(e.volume),
      periode: e.periode,
      destination: e.destination,
      immatriculations: (e.immatriculations ?? []) as string[],
      statut: e.statut as StatutEvac,
      visee: e.visee,
    };
  });
}

export async function chargerControlesEvac(limite = 12): Promise<ControleInopine[]> {
  const { data, error } = await supabase
    .from('at_controles_evacuation')
    .select('id, numero_evac, immatriculation, agent, resultat, photo, horodatage')
    .order('horodatage', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    numeroEvac: c.numero_evac,
    immatriculation: c.immatriculation,
    agent: c.agent,
    resultat: c.resultat as ResultatControle,
    photo: c.photo,
    horodatage: c.horodatage,
  }));
}

export async function creerEvacuation(p: {
  entrepriseId: string;
  nature: string;
  volume: number;
  periode: string;
  destination: string;
  immatriculations: string[];
}): Promise<{ id: string; numero: string }> {
  const { data, error } = await supabase.rpc('at_creer_evacuation', {
    p_entreprise_id: p.entrepriseId,
    p_nature: p.nature,
    p_volume: p.volume,
    p_periode: p.periode,
    p_destination: p.destination,
    p_immatriculations: p.immatriculations,
  });
  if (error) throw new Error(error.message);
  return data as { id: string; numero: string };
}

/** Le serveur exige la photo du fond de benne pour clore le contrôle. */
export async function enregistrerControleEvac(p: {
  evacuationId: string;
  immatriculation: string;
  resultat: ResultatControle;
  photo: boolean;
}): Promise<{ id: string; resultat: ResultatControle }> {
  const { data, error } = await supabase.rpc('at_enregistrer_controle_evac', {
    p_evacuation_id: p.evacuationId,
    p_immatriculation: p.immatriculation,
    p_resultat: p.resultat,
    p_photo: p.photo,
  });
  if (error) throw new Error(error.message);
  return data as { id: string; resultat: ResultatControle };
}

/* ===================== Livraisons & prise en charge (M12/M13) ===================== */

export type StatutPreavis = 'SOUMIS' | 'VALIDE' | 'PRIS_EN_CHARGE' | 'REFUSE' | 'EXPIRE';

export interface Creneau {
  id: string;
  libelle: string;
  quota: number;
  utilises: number;
  ordre: number;
}

export interface Preavis {
  id: string;
  numero: string;
  entreprise: string;
  fournisseur: string;
  nature: string;
  quantitePrevue: number;
  unite: string;
  levage: boolean;
  matieresDangereuses: boolean;
  creneauId: string;
  statut: StatutPreavis;
  code?: string | null;
  derogation?: string | null;
  pecResponsable?: string | null;
  pecReserve?: string | null;
  pecAt?: string | null;
}

export async function chargerCreneaux(): Promise<Creneau[]> {
  const { data, error } = await supabase
    .from('at_creneaux_livraison')
    .select('id, libelle, quota, utilises, ordre')
    .eq('actif', true)
    .order('ordre');
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id, libelle: c.libelle, quota: c.quota, utilises: c.utilises, ordre: c.ordre,
  }));
}

export async function chargerPreavis(): Promise<Preavis[]> {
  const { data, error } = await supabase
    .from('at_preavis_livraison')
    .select('id, numero, fournisseur, nature, quantite_prevue, unite, levage, matieres_dangereuses, creneau_id, statut, code, derogation, pec_responsable, pec_reserve, pec_at, entreprise:at_entreprises(raison_sociale)')
    .order('numero', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => {
    const ent = p.entreprise as unknown as { raison_sociale: string } | null;
    return {
      id: p.id,
      numero: p.numero,
      entreprise: ent?.raison_sociale ?? '—',
      fournisseur: p.fournisseur,
      nature: p.nature,
      quantitePrevue: Number(p.quantite_prevue),
      unite: p.unite,
      levage: p.levage,
      matieresDangereuses: p.matieres_dangereuses,
      creneauId: p.creneau_id,
      statut: p.statut as StatutPreavis,
      code: p.code,
      derogation: p.derogation,
      pecResponsable: p.pec_responsable,
      pecReserve: p.pec_reserve,
      pecAt: p.pec_at,
    };
  });
}

export async function deposerPreavis(p: {
  entrepriseId: string;
  creneauId: string;
  fournisseur: string;
  nature: string;
  quantite: number;
  unite: string;
  levage: boolean;
  matieresDangereuses: boolean;
  derogation?: string;
}): Promise<{ numero: string; statut: StatutPreavis }> {
  const { data, error } = await supabase.rpc('at_deposer_preavis', {
    p_entreprise_id: p.entrepriseId,
    p_creneau_id: p.creneauId,
    p_fournisseur: p.fournisseur,
    p_nature: p.nature,
    p_quantite: p.quantite,
    p_unite: p.unite,
    p_levage: p.levage,
    p_matieres_dangereuses: p.matieresDangereuses,
    p_derogation: p.derogation ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { numero: string; statut: StatutPreavis };
}

export async function viserPreavis(id: string): Promise<{ code: string }> {
  const { data, error } = await supabase.rpc('at_viser_preavis', { p_id: id });
  if (error) throw new Error(error.message);
  return data as { code: string };
}

/** Prise en charge oui/non (M13) : le serveur exige la photo, jamais de quantité. */
export async function prendreEnCharge(id: string, reserve: string, photo: boolean): Promise<void> {
  const { error } = await supabase.rpc('at_prendre_en_charge', {
    p_id: id,
    p_reserve: reserve || null,
    p_photo: photo,
  });
  if (error) throw new Error(error.message);
}
