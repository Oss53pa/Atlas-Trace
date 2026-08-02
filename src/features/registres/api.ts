import { supabase } from '../../lib/supabase';

/**
 * M6 — registres & exports réels. Génération sans saisie : chaque registre lit les
 * tables réelles et produit un CSV horodaté et référencé (disponible immédiatement).
 * Les sorties non constatées (clôture M25) sont distinguées des sorties scannées.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const heure = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dateHeure = (iso: string) => new Date(iso).toLocaleString('fr-FR');

function csvEscape(v: string | number | null | undefined): string {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Déclenche le téléchargement d'un CSV horodaté et référencé (charte + entête). */
export function telechargerCSV(base: string, headers: string[], rows: (string | number | null)[][]): string {
  const d = new Date();
  const ref = `ATS-${base}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const entete = `Atlas Trace — ${base} · réf ${ref} · V1 · extrait le ${d.toLocaleString('fr-FR')} · ${rows.length} ligne(s)`;
  const corps = [entete, headers.join(';'), ...rows.map((r) => r.map(csvEscape).join(';'))].join('\r\n');
  const blob = new Blob(['﻿' + corps], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ref}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return ref;
}

/* ===================== Registre d'accès (vue à l'écran) ===================== */

export interface AccesLigne {
  id: string;
  horodatage: string;
  personneLabel: string;
  entrepriseLabel: string;
  sens: 'ENTREE' | 'SORTIE';
  resultat: 'AUTORISE' | 'REFUSE' | 'FORCE';
  motif: string | null;
  mode: string;
  constatee: boolean;
}

export async function chargerAcces(limite = 500): Promise<AccesLigne[]> {
  const { data, error } = await supabase
    .from('at_mouvements_acces')
    .select('id, horodatage, personne_label, entreprise_label, sens, resultat, motif, alerte, mode, constatee')
    .order('horodatage', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    horodatage: heure(m.horodatage),
    personneLabel: m.personne_label,
    entrepriseLabel: m.entreprise_label,
    sens: m.sens as 'ENTREE' | 'SORTIE',
    resultat: m.resultat as 'AUTORISE' | 'REFUSE' | 'FORCE',
    motif: m.motif ?? m.alerte ?? null,
    mode: m.mode,
    constatee: m.constatee,
  }));
}

/* ===================== Catalogue d'exports (chapitre 26) ===================== */

export interface RegistreExport {
  id: string;
  libelle: string;
  base: string;
  pouvoir?: string;
  charger: () => Promise<{ headers: string[]; rows: (string | number | null)[][] }>;
}

async function q<T>(table: string, cols: string, order: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(cols).order(order, { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export const EXPORTS: RegistreExport[] = [
  {
    id: 'acces', libelle: 'Entrées & sorties de personnes', base: 'ACCES', pouvoir: 'EXPORTER',
    charger: async () => {
      const rows = await chargerAcces(5000);
      return {
        headers: ['Heure', 'Personne', 'Entreprise', 'Sens', 'Résultat', 'Motif', 'Mode', 'Sortie'],
        rows: rows.map((m) => [
          m.horodatage, m.personneLabel, m.entrepriseLabel, m.sens, m.resultat, m.motif ?? '', m.mode,
          m.sens === 'SORTIE' ? (m.constatee ? 'Constatée' : 'Non constatée') : '',
        ]),
      };
    },
  },
  {
    id: 'sorties', libelle: 'Sorties de matériel', base: 'SORTIES-MATIERE', pouvoir: 'EXPORTER',
    charger: async () => {
      const data = await q<{ horodatage: string; voie: string; reference: string; libelle: string; resultat: string; motif: string | null; quantite: number | null }>(
        'at_mouvements_sortie', 'horodatage, voie, reference, libelle, resultat, motif, quantite', 'horodatage');
      return {
        headers: ['Horodatage', 'Voie', 'Référence', 'Libellé', 'Quantité', 'Résultat', 'Motif'],
        rows: data.map((m) => [dateHeure(m.horodatage), m.voie, m.reference, m.libelle, m.quantite ?? '', m.resultat, m.motif ?? '']),
      };
    },
  },
  {
    id: 'dotations', libelle: 'Dotations par entité', base: 'DOTATIONS', pouvoir: 'EXPORTER',
    charger: async () => {
      const { data, error } = await supabase
        .from('at_dotations')
        .select('quantite_presente, updated_at, entreprise:at_entreprises(raison_sociale), famille:at_familles_materiel(libelle, regime)')
        .gt('quantite_presente', 0);
      if (error) throw new Error(error.message);
      return {
        headers: ['Entreprise', 'Famille', 'Régime', 'Quantité présente', 'Mise à jour'],
        rows: (data ?? []).map((d) => {
          const e = d.entreprise as unknown as { raison_sociale: string } | null;
          const f = d.famille as unknown as { libelle: string; regime: string } | null;
          return [e?.raison_sociale ?? '—', f?.libelle ?? '—', f?.regime ?? '', d.quantite_presente, dateHeure(d.updated_at)];
        }),
      };
    },
  },
  {
    id: 'refus', libelle: 'Refus & forçages', base: 'REFUS-FORCAGES', pouvoir: 'EXPORTER',
    charger: async () => {
      const rows = (await chargerAcces(5000)).filter((m) => m.resultat !== 'AUTORISE');
      return {
        headers: ['Heure', 'Personne', 'Entreprise', 'Sens', 'Résultat', 'Motif', 'Mode'],
        rows: rows.map((m) => [m.horodatage, m.personneLabel, m.entrepriseLabel, m.sens, m.resultat, m.motif ?? '', m.mode]),
      };
    },
  },
  {
    id: 'presence', libelle: 'Registres de présence', base: 'PRESENCE', pouvoir: 'EXPORTER',
    charger: async () => {
      const data = await q<{ entreprise: string; date_liste: string; statut: string; effectif: number | null; depose_par: string | null; deposee_at: string | null }>(
        'at_listes_journalieres', 'entreprise, date_liste, statut, effectif, depose_par, deposee_at', 'date_liste');
      return {
        headers: ['Date', 'Entreprise', 'Statut', 'Effectif', 'Déposé par', 'Déposé le'],
        rows: data.map((l) => [l.date_liste, l.entreprise, l.statut, l.effectif ?? '', l.depose_par ?? '', l.deposee_at ? dateHeure(l.deposee_at) : '']),
      };
    },
  },
  {
    id: 'clotures', libelle: 'Clôtures de journée', base: 'CLOTURES', pouvoir: 'EXPORTER',
    charger: async () => {
      const data = await q<{ date_cloture: string; mode: string; declenchee_par: string; nb_sorties_non_constatees: number; nb_prolongations: number; nb_badges_temp_non_restitues: number; nb_materiels_retard: number }>(
        'at_clotures', 'date_cloture, mode, declenchee_par, nb_sorties_non_constatees, nb_prolongations, nb_badges_temp_non_restitues, nb_materiels_retard', 'date_cloture');
      return {
        headers: ['Date', 'Mode', 'Déclenchée par', 'Sorties non constatées', 'Présences prolongées', 'Badges temp. non restitués', 'Matériels en retard'],
        rows: data.map((c) => [c.date_cloture, c.mode, c.declenchee_par, c.nb_sorties_non_constatees, c.nb_prolongations, c.nb_badges_temp_non_restitues, c.nb_materiels_retard]),
      };
    },
  },
  {
    id: 'audit', libelle: 'Journal d’audit (accès restreint)', base: 'AUDIT', pouvoir: 'CONSULTER_AUDIT',
    charger: async () => {
      const data = await q<{ created_at: string; utilisateur: string; action: string; entite: string | null; appareil: string | null }>(
        'at_audit', 'created_at, utilisateur, action, entite, appareil', 'created_at');
      return {
        headers: ['Horodatage', 'Utilisateur', 'Action', 'Entité', 'Appareil'],
        rows: data.map((a) => [dateHeure(a.created_at), a.utilisateur, a.action, a.entite ?? '', a.appareil ?? '']),
      };
    },
  },
];
