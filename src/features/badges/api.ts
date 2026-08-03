import { supabase } from '../../lib/supabase';

/** Badges (M3). Nominatifs = lecture (déclaration Phase 4) ; temporaires =
 *  génération par lot + cycle de vie via RPC serveur. */

export type BadgeStatut = 'ACTIF' | 'SUSPENDU' | 'BLOQUE' | 'GENERE' | 'REMIS' | 'RESTITUE';

export interface BadgeLive {
  id: string;
  numero: string;
  type: string;
  categorie: string;
  statut: BadgeStatut;
  nom: string;
  prenom: string;
  fonction: string;
  entreprise: string;
  inductionEcheance?: string | null;
  accompagnateur?: string | null;
  pieceRetenue?: string | null;
}

interface PersonneJoin { nom: string; prenom: string; fonction: string | null; induction_echeance: string | null }
interface EntrepriseJoin { raison_sociale: string }

const SELECT =
  'id, numero, type, categorie, statut, accompagnateur, piece_retenue, personne:at_personnes(nom, prenom, fonction, induction_echeance), entreprise:at_entreprises(raison_sociale)';

function mapBadge(b: Record<string, unknown>): BadgeLive {
  const p = b.personne as unknown as PersonneJoin | null;
  const e = b.entreprise as unknown as EntrepriseJoin | null;
  return {
    id: b.id as string,
    numero: b.numero as string,
    type: b.type as string,
    categorie: (b.categorie as string) ?? '—',
    statut: b.statut as BadgeStatut,
    nom: p?.nom ?? '—',
    prenom: p?.prenom ?? '',
    fonction: p?.fonction ?? '',
    entreprise: e?.raison_sociale ?? '—',
    inductionEcheance: p?.induction_echeance ?? null,
    accompagnateur: (b.accompagnateur as string) ?? null,
    pieceRetenue: (b.piece_retenue as string) ?? null,
  };
}

export async function chargerBadgesNominatifs(): Promise<BadgeLive[]> {
  const { data, error } = await supabase
    .from('at_badges')
    .select(SELECT)
    .eq('type', 'NOMINATIF')
    .order('numero');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBadge);
}

export async function chargerBadgesTemporaires(): Promise<BadgeLive[]> {
  const { data, error } = await supabase
    .from('at_badges')
    .select(SELECT)
    .eq('type', 'TEMPORAIRE')
    .order('numero');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBadge);
}

export async function chargerVisiteurs(): Promise<BadgeLive[]> {
  const { data, error } = await supabase
    .from('at_badges')
    .select(SELECT)
    .eq('type', 'VISITEUR')
    .order('numero');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBadge);
}

export async function genererBadgesTemporaires(): Promise<{ generes: number }> {
  const { data, error } = await supabase.rpc('at_generer_badges_temporaires');
  if (error) throw new Error(error.message);
  return data as { generes: number };
}

export async function remettreBadge(id: string, piece: string): Promise<void> {
  const { error } = await supabase.rpc('at_remettre_badge', { p_id: id, p_piece: piece });
  if (error) throw new Error(error.message);
}

export async function restituerBadge(id: string): Promise<void> {
  const { error } = await supabase.rpc('at_restituer_badge', { p_id: id });
  if (error) throw new Error(error.message);
}
