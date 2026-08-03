import { supabase } from '../../lib/supabase';

/**
 * Main courante & incidents (M16).
 *
 * Une entrée consignée au poste part immédiatement vers la chaîne de
 * commandement : la table est publiée sur Realtime et `ecouterJournal` ouvre le
 * canal. Le HSE Officer et le Directeur de la Construction reçoivent les
 * incidents à la seconde, sans rafraîchir.
 */

export type TypeEntree = 'EVENEMENT' | 'INCIDENT';
export type Gravite = 'MINEUR' | 'MAJEUR';
export type StatutIncident = 'OUVERT' | 'CLOS';
export type Categorie =
  | 'PRISE_POSTE' | 'RONDE' | 'FORCAGE' | 'REFUS' | 'RETENUE' | 'VISITEUR' | 'CLE' | 'AUTRE';

export const CATEGORIE_LABEL: Record<Categorie, string> = {
  PRISE_POSTE: 'Prise de poste',
  RONDE: 'Ronde',
  FORCAGE: 'Forçage d’accès',
  REFUS: 'Refus consigné',
  RETENUE: 'Retenue de matériel',
  VISITEUR: 'Visiteur',
  CLE: 'Clé',
  AUTRE: 'Autre',
};

export interface Entree {
  id: string;
  numero?: string | null;
  horodatage: string;
  agent: string;
  type: TypeEntree;
  categorie: Categorie;
  titre: string;
  description: string;
  photo: boolean;
  gravite?: Gravite | null;
  statut?: StatutIncident | null;
  circonstances?: string | null;
  mesures?: string | null;
  suites?: string | null;
  closPar?: string | null;
}

const COLONNES =
  'id, numero, type, categorie, titre, description, gravite, statut, circonstances, mesures, suites, photo_url, agent, horodatage, clos_par';

type Ligne = {
  id: string; numero: string | null; type: string; categorie: string; titre: string;
  description: string; gravite: string | null; statut: string | null;
  circonstances: string | null; mesures: string | null; suites: string | null;
  photo_url: string | null; agent: string; horodatage: string; clos_par: string | null;
};

const heure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function versEntree(l: Ligne): Entree {
  return {
    id: l.id,
    numero: l.numero,
    horodatage: heure(l.horodatage),
    agent: l.agent,
    type: l.type as TypeEntree,
    categorie: l.categorie as Categorie,
    titre: l.titre,
    description: l.description,
    photo: !!l.photo_url,
    gravite: l.gravite as Gravite | null,
    statut: l.statut as StatutIncident | null,
    circonstances: l.circonstances,
    mesures: l.mesures,
    suites: l.suites,
    closPar: l.clos_par,
  };
}

export async function chargerJournal(limite = 100): Promise<Entree[]> {
  const { data, error } = await supabase
    .from('at_main_courante')
    .select(COLONNES)
    .order('horodatage', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => versEntree(l as Ligne));
}

/** Consignation au poste. Un incident majeur exige photo + circonstances + mesures (I1). */
export async function consignerEntree(p: {
  type: TypeEntree;
  categorie: Categorie;
  titre: string;
  description: string;
  gravite?: Gravite;
  photoUrl?: string;
  circonstances?: string;
  mesures?: string;
}): Promise<{ numero: string | null }> {
  const { data, error } = await supabase.rpc('at_consigner_entree', {
    p_type: p.type,
    p_categorie: p.categorie,
    p_titre: p.titre,
    p_description: p.description,
    p_gravite: p.gravite ?? null,
    p_photo_url: p.photoUrl ?? null,
    p_circonstances: p.circonstances ?? null,
    p_mesures: p.mesures ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { numero: string | null };
}

/** Rapport d'incident. La clôture exige le pouvoir SUIVRE_INCIDENTS et les trois volets. */
export async function majRapportIncident(
  id: string,
  v: { circonstances: string; mesures: string; suites: string },
  clore: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('at_maj_rapport_incident', {
    p_id: id,
    p_circonstances: v.circonstances,
    p_mesures: v.mesures,
    p_suites: v.suites,
    p_clore: clore,
  });
  if (error) throw new Error(error.message);
}

/**
 * Canal temps réel du journal. Rend la fonction de désabonnement.
 * `onEntree` est appelé à chaque insertion, `onMaj` à chaque modification.
 */
export function ecouterJournal(
  onEntree: (e: Entree) => void,
  onMaj: (e: Entree) => void,
  onEtat?: (connecte: boolean) => void,
): () => void {
  const canal = supabase
    .channel('at_main_courante')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'at_main_courante' }, (p) =>
      onEntree(versEntree(p.new as Ligne)),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'at_main_courante' }, (p) =>
      onMaj(versEntree(p.new as Ligne)),
    )
    .subscribe((statut) => onEtat?.(statut === 'SUBSCRIBED'));

  return () => {
    supabase.removeChannel(canal);
  };
}
