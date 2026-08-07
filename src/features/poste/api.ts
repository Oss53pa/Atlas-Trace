import { supabase } from '../../lib/supabase';
import { urlPhotoSignee } from '../../lib/stockage';
import type { MotifCode, Resultat, Sens } from '../../types';
import type { MotifSortieCode } from './motifs';

/**
 * Accès aux données du poste (M5).
 *
 * Le client ne décide rien : il envoie ce qu'il a scanné et le geste de l'agent,
 * le serveur tranche (at_evaluer_acces / at_enregistrer_acces) et écrit seul le
 * passage. Aucune règle d'accès ne vit ici.
 */

export interface Poste {
  id: string;
  libelle: string;
  siteLabel: string;
  agentLabel: string;
}

/** Verdict rendu par le serveur. Les champs d'identité servent au contrôle visuel. */
export interface Verdict {
  resultat: 'AUTORISE' | 'REFUSE';
  motif?: MotifCode;
  alerte?: MotifCode;
  badge_numero: string;
  badge_type?: string;
  zone_label?: string;
  accompagnateur?: string | null;
  personne_id?: string | null;
  personne_nom?: string | null;
  personne_prenom?: string | null;
  personne_label: string;
  photo_url?: string | null;
  fonction?: string | null;
  entreprise_label: string;
  sens: Sens;
}

export interface VerdictEnregistre extends Verdict {
  mouvement_id: string;
  resultat_enregistre: Resultat;
}

export interface Passage {
  id: string;
  personneLabel: string;
  badgeNumero: string;
  sens: Sens;
  resultat: Resultat;
  motif?: MotifCode;
  horodatage: string;
}

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Poste actif du site + nom de l'agent connecté (pour l'en-tête et la trace). */
export async function chargerPoste(): Promise<Poste> {
  const { data, error } = await supabase
    .from('at_postes')
    .select('id, libelle, site:at_sites(libelle)')
    .eq('statut', 'ACTIF')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Aucun poste de contrôle configuré pour ce site.');

  const { data: session } = await supabase.auth.getUser();
  const { data: moi } = await supabase
    .from('at_utilisateurs')
    .select('nom')
    .eq('user_id', session.user?.id ?? '')
    .maybeSingle();

  const site = data.site as unknown as { libelle: string } | null;
  return {
    id: data.id,
    libelle: data.libelle,
    siteLabel: site?.libelle ?? '—',
    agentLabel: moi?.nom ?? session.user?.email ?? 'Agent',
  };
}

/** Décision du serveur, sans écriture — ce que l'agent voit avant de trancher. */
export async function evaluerAcces(posteId: string, badgeRef: string, sens: Sens): Promise<Verdict> {
  const { data, error } = await supabase.rpc('at_evaluer_acces', {
    p_poste_id: posteId,
    p_badge_ref: badgeRef,
    p_sens: sens,
  });
  if (error) throw new Error(error.message);
  return data as Verdict;
}

/**
 * Geste de l'agent. Le serveur re-décide puis scelle le passage : sur VALIDER,
 * c'est son verdict qui est écrit, pas celui affiché à l'écran.
 */
export async function enregistrerAcces(p: {
  posteId: string;
  badgeRef: string;
  sens: Sens;
  action: 'VALIDER' | 'REFUSER' | 'FORCER';
  commentaire?: string;
  mode: 'EN_LIGNE' | 'HORS_LIGNE';
  photoForcage?: boolean;
  photoUrl?: string | null;
}): Promise<VerdictEnregistre> {
  const { data, error } = await supabase.rpc('at_enregistrer_acces', {
    p_poste_id: p.posteId,
    p_badge_ref: p.badgeRef,
    p_sens: p.sens,
    p_action: p.action,
    p_commentaire: p.commentaire ?? null,
    p_mode: p.mode,
    p_photo_forcage: p.photoForcage ?? false,
    p_photo_url: p.photoUrl ?? null,
  });
  if (error) throw new Error(error.message);
  return data as VerdictEnregistre;
}

/** Photo du sac/effets prise à la dernière ENTRÉE de la personne — pour comparaison à la sortie. */
export async function chargerPhotoSacEntree(personneId: string): Promise<string | null> {
  const { data } = await supabase
    .from('at_mouvements_acces')
    .select('photo_url')
    .eq('personne_id', personneId)
    .eq('sens', 'ENTREE')
    .not('photo_url', 'is', null)
    .order('horodatage', { ascending: false })
    .limit(1)
    .maybeSingle();
  const chemin = (data as { photo_url?: string | null } | null)?.photo_url;
  return chemin ? urlPhotoSignee(chemin) : null;
}

export async function derniersPassages(limite = 8): Promise<Passage[]> {
  const { data, error } = await supabase
    .from('at_mouvements_acces')
    .select('id, personne_label, badge_numero, sens, resultat, motif, horodatage')
    .order('horodatage', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    personneLabel: m.personne_label,
    badgeNumero: m.badge_numero,
    sens: m.sens as Sens,
    resultat: m.resultat as Resultat,
    motif: (m.motif ?? undefined) as MotifCode | undefined,
    horodatage: heure(m.horodatage),
  }));
}

/** Passages effectifs du jour (les refus ne comptent pas comme des passages). */
export async function compteursDuJour(): Promise<{ entrees: number; sorties: number }> {
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  const compte = async (sens: Sens) => {
    const { count, error } = await supabase
      .from('at_mouvements_acces')
      .select('id', { count: 'exact', head: true })
      .eq('sens', sens)
      .neq('resultat', 'REFUSE')
      .gte('horodatage', debut.toISOString());
    if (error) throw new Error(error.message);
    return count ?? 0;
  };
  const [entrees, sorties] = await Promise.all([compte('ENTREE'), compte('SORTIE')]);
  return { entrees, sorties };
}

/* ===================== Sorties matière (M10) ===================== */

export type Voie = 'AUTORISATION' | 'DOTATION' | 'AUCUNE';

export interface VerdictSortie {
  resultat: 'AUTORISE' | 'REFUSE';
  voie: Voie;
  motif?: MotifSortieCode;
  reference: string;
  libelle: string;
  sous_titre?: string;
  lignes?: string[];
  entreprise_label?: string;
  validite_fin?: string;
}

export interface VerdictSortieEnregistre extends VerdictSortie {
  mouvement_id: string;
  resultat_enregistre: 'AUTORISE' | 'REFUSE';
  autorisation_consommee: boolean;
}

export interface ControleSortieLigne {
  id: string;
  libelle: string;
  voie: Voie;
  resultat: 'AUTORISE' | 'REFUSE';
  heure: string;
}

export async function evaluerSortie(posteId: string, ref: string): Promise<VerdictSortie> {
  const { data, error } = await supabase.rpc('at_evaluer_sortie', { p_poste_id: posteId, p_ref: ref });
  if (error) throw new Error(error.message);
  return data as VerdictSortie;
}

export interface VerdictDotation {
  resultat: 'AUTORISE' | 'REFUSE';
  voie: 'DOTATION';
  motif?: MotifSortieCode;
  reference: string;
  libelle: string;
  entreprise_label: string;
  reste?: number;
  mouvement_id: string;
  resultat_enregistre: 'AUTORISE' | 'REFUSE';
}

/**
 * Sortie par dotation (M10 chemin 1). L'agent choisit l'entité et la famille ;
 * le serveur décrémente la dotation de façon atomique (refus si insuffisante).
 */
export async function sortirDotation(p: {
  posteId: string;
  entrepriseId: string;
  familleId: string;
  quantite: number;
  action: 'VALIDER' | 'REFUSER';
  commentaire?: string;
  mode: 'EN_LIGNE' | 'HORS_LIGNE';
  photo?: boolean;
}): Promise<VerdictDotation> {
  const { data, error } = await supabase.rpc('at_sortir_dotation', {
    p_poste_id: p.posteId,
    p_entreprise_id: p.entrepriseId,
    p_famille_id: p.familleId,
    p_quantite: p.quantite,
    p_action: p.action,
    p_commentaire: p.commentaire ?? null,
    p_mode: p.mode,
    p_photo: p.photo ?? false,
  });
  if (error) throw new Error(error.message);
  return data as VerdictDotation;
}

/** Sur VALIDER, le serveur consomme l'autorisation dans la même transaction (usage unique). */
export async function enregistrerSortie(p: {
  posteId: string;
  ref: string;
  action: 'VALIDER' | 'REFUSER';
  commentaire?: string;
  mode: 'EN_LIGNE' | 'HORS_LIGNE';
  photo?: boolean;
}): Promise<VerdictSortieEnregistre> {
  const { data, error } = await supabase.rpc('at_enregistrer_sortie', {
    p_poste_id: p.posteId,
    p_ref: p.ref,
    p_action: p.action,
    p_commentaire: p.commentaire ?? null,
    p_mode: p.mode,
    p_photo: p.photo ?? false,
  });
  if (error) throw new Error(error.message);
  return data as VerdictSortieEnregistre;
}

export async function derniersControlesSortie(limite = 8): Promise<ControleSortieLigne[]> {
  const { data, error } = await supabase
    .from('at_mouvements_sortie')
    .select('id, libelle, voie, resultat, horodatage')
    .order('horodatage', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    libelle: m.libelle,
    voie: m.voie as Voie,
    resultat: m.resultat as 'AUTORISE' | 'REFUSE',
    heure: heure(m.horodatage),
  }));
}
