import { supabase } from '../../lib/supabase';

/** Référentiels paramétrables (M19). Listes éditables par organisation. */
export interface Referentiel {
  id: string;
  cle: string;
  libelle: string;
  portee: 'Site' | 'Organisation';
  valeurs: string[];
  ordre: number;
}

export async function chargerReferentiels(): Promise<Referentiel[]> {
  const { data, error } = await supabase
    .from('at_referentiels')
    .select('id, cle, libelle, portee, valeurs, ordre')
    .order('ordre');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    cle: r.cle,
    libelle: r.libelle,
    portee: r.portee as 'Site' | 'Organisation',
    valeurs: (r.valeurs ?? []) as string[],
    ordre: r.ordre,
  }));
}

/** Remplace la liste de valeurs d'un référentiel (écriture gouvernée par RLS). */
export async function majReferentielValeurs(id: string, valeurs: string[]): Promise<void> {
  const { error } = await supabase.from('at_referentiels').update({ valeurs }).eq('id', id);
  if (error) throw new Error(error.message);
}

/* ===================== Chaînes de validation (M19) ===================== */

export type NatureEtape = 'VISA' | 'APPROBATION';
export interface EtapeCircuit {
  ordre: number;
  role: string;
  nature: NatureEtape;
  effetFinal: boolean;
}
export interface Circuit {
  id: string;
  cle: string;
  objet: string;
  etapes: EtapeCircuit[];
  version: number;
}

interface EtapeJson { ordre: number; role: string; nature: string; effet_final: boolean }

export async function chargerCircuits(): Promise<Circuit[]> {
  const { data, error } = await supabase
    .from('at_circuits')
    .select('id, cle, objet, etapes, version')
    .order('cle');
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    cle: c.cle,
    objet: c.objet,
    version: c.version,
    etapes: ((c.etapes ?? []) as EtapeJson[]).map((e) => ({
      ordre: e.ordre,
      role: e.role,
      nature: e.nature as NatureEtape,
      effetFinal: e.effet_final,
    })),
  }));
}

/** Enregistre une nouvelle version d'une chaîne. Le serveur exige une étape à effet final. */
export async function enregistrerCircuit(cle: string, etapes: EtapeCircuit[]): Promise<{ version: number }> {
  const payload = etapes.map((e) => ({ ordre: e.ordre, role: e.role, nature: e.nature, effet_final: e.effetFinal }));
  const { data, error } = await supabase.rpc('at_enregistrer_circuit', { p_cle: cle, p_etapes: payload });
  if (error) throw new Error(error.message);
  return data as { version: number };
}
