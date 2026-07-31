import type { Badge, DonneurOrdre, Entreprise, Personne } from '../types';
import type { ContexteControle } from '../features/poste/evaluate';

/** Heure : minutes depuis minuit. 06:30 → 390, 18:30 → 1110. */
export const h = (hh: number, mm = 0) => hh * 60 + mm;

export const minutesToLabel = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const POSTE = {
  siteLabel: 'Chantier Cosmos Angré',
  posteLabel: 'Poste — Entrée principale',
  agentLabel: 'Agent M. Koné · SIS-P6',
  plage: { debut: h(6, 30), fin: h(18, 30) },
};

// --- Donneurs d'ordre (preneurs) ---
export const DONNEURS_ORDRE: DonneurOrdre[] = [
  { id: 'do1', libelle: 'Preneur — Enseigne A', bloque: false },
  { id: 'do2', libelle: 'Preneur — Boutique X', bloque: true }, // bail non signé
];

// --- Entreprises intervenantes ---
export const ENTREPRISES: Entreprise[] = [
  { id: 'e1', raisonSociale: 'Bâti-Sud', statut: 'ACTIVE', donneurOrdreId: 'do1' },
  { id: 'e2', raisonSociale: 'Aménag-Preneur K', statut: 'ACTIVE', donneurOrdreId: 'do2' },
  { id: 'e3', raisonSociale: 'Électro-CI', statut: 'SUSPENDUE' },
  { id: 'e4', raisonSociale: 'Visiteurs', statut: 'ACTIVE' },
];

// --- Personnes ---
export const PERSONNES: Personne[] = [
  { id: 'p1', nom: 'Kouadio', prenom: 'Jean', fonction: 'Chef d’équipe', entrepriseId: 'e1', regime: 'STABLE', inductionValide: true },
  { id: 'p2', nom: 'Diallo', prenom: 'Amina', fonction: 'Architecte (visite)', entrepriseId: 'e4', regime: 'TOURNANT', inductionValide: true },
  { id: 'p3', nom: 'Traoré', prenom: 'Issouf', fonction: 'Manœuvre', entrepriseId: 'e1', regime: 'TOURNANT', inductionValide: true },
  { id: 'p4', nom: 'Koffi', prenom: 'Yao', fonction: 'Électricien', entrepriseId: 'e1', regime: 'STABLE', inductionValide: true },
  { id: 'p5', nom: 'Ouattara', prenom: 'Salimata', fonction: 'Peintre', entrepriseId: 'e1', regime: 'STABLE', inductionValide: true },
  { id: 'p6', nom: 'Mensah', prenom: 'Paul', fonction: 'Câbleur', entrepriseId: 'e3', regime: 'STABLE', inductionValide: true },
  { id: 'p7', nom: 'Bamba', prenom: 'Awa', fonction: 'Aide-maçon', entrepriseId: 'e1', regime: 'TOURNANT', inductionValide: false },
  { id: 'p8', nom: 'Sarr', prenom: 'Modou', fonction: 'Menuisier', entrepriseId: 'e2', regime: 'STABLE', inductionValide: true },
  { id: 'p9', nom: 'N’Guessan', prenom: 'Éric', fonction: 'Gardien vacation', entrepriseId: 'e1', regime: 'STABLE', inductionValide: true },
  { id: 'p10', nom: 'Coulibaly', prenom: 'Fanta', fonction: 'Carreleuse', entrepriseId: 'e1', regime: 'STABLE', inductionValide: true },
  { id: 'p11', nom: 'Zerbo', prenom: 'Karim', fonction: 'Agent de nettoyage', entrepriseId: 'e2', regime: 'TOURNANT', inductionValide: true },
];

const ZONES_STD = ['circulation', 'travaux'];

// --- Badges (chaque badge illustre un cas du moteur) ---
export const BADGES: Badge[] = [
  { id: 'b1', numero: 'NOM-00142', type: 'NOMINATIF', personneId: 'p1', entrepriseId: 'e1', statut: 'ACTIF', zonesAutorisees: ZONES_STD, zoneLabel: 'Travaux · circulation', validiteFin: '2026-12-31' },
  { id: 'b2', numero: 'VIS-20260729-004', type: 'VISITEUR', personneId: 'p2', entrepriseId: 'e4', statut: 'ACTIF', zonesAutorisees: ['circulation'], zoneLabel: 'Circulation (accompagnée)', validiteFin: '2026-07-29', accompagnateur: 'M. Bance (HSE)' },
  { id: 'b3', numero: 'TMP-20260729-018', type: 'TEMPORAIRE', personneId: 'p3', entrepriseId: 'e1', statut: 'ACTIF', zonesAutorisees: ZONES_STD, zoneLabel: 'Travaux · circulation', validiteFin: '2026-07-29' },
  { id: 'b4', numero: 'NOM-00098', type: 'NOMINATIF', personneId: 'p4', entrepriseId: 'e1', statut: 'ACTIF', zonesAutorisees: ZONES_STD, zoneLabel: 'Travaux · circulation', validiteFin: '2026-07-01' },
  { id: 'b5', numero: 'NOM-00110', type: 'NOMINATIF', personneId: 'p5', entrepriseId: 'e1', statut: 'SUSPENDU', zonesAutorisees: ZONES_STD, zoneLabel: 'Travaux · circulation', validiteFin: '2026-12-31' },
  { id: 'b6', numero: 'NOM-00203', type: 'NOMINATIF', personneId: 'p6', entrepriseId: 'e3', statut: 'ACTIF', zonesAutorisees: ZONES_STD, zoneLabel: 'Travaux · circulation', validiteFin: '2026-12-31' },
  { id: 'b7', numero: 'TMP-20260729-022', type: 'TEMPORAIRE', personneId: 'p7', entrepriseId: 'e1', statut: 'ACTIF', zonesAutorisees: ZONES_STD, zoneLabel: 'Travaux · circulation', validiteFin: '2026-07-29' },
  { id: 'b8', numero: 'NOM-00187', type: 'NOMINATIF', personneId: 'p8', entrepriseId: 'e2', statut: 'ACTIF', zonesAutorisees: ['circulation', 'galerie'], empriseAutorisee: 'B12', zoneLabel: 'Galerie · cellule B12', empriseLabel: 'Cellule B12', validiteFin: '2026-12-31' },
  { id: 'b9', numero: 'NOM-00221', type: 'NOMINATIF', personneId: 'p9', entrepriseId: 'e1', statut: 'ACTIF', zonesAutorisees: ZONES_STD, zoneLabel: 'Travaux · circulation', validiteFin: '2026-12-31', plageHoraire: { debut: h(14), fin: h(18) } },
  { id: 'b10', numero: 'NOM-00156', type: 'NOMINATIF', personneId: 'p10', entrepriseId: 'e1', statut: 'ACTIF', zonesAutorisees: ZONES_STD, zoneLabel: 'Travaux · circulation', validiteFin: '2026-12-31' },
  { id: 'b11', numero: 'TMP-20260729-031', type: 'TEMPORAIRE', personneId: 'p11', entrepriseId: 'e2', statut: 'ACTIF', zonesAutorisees: ['galerie'], zoneLabel: 'Galerie uniquement', validiteFin: '2026-07-29' },
];

/** Contexte du poste au moment du contrôle (08:12, liste déposée, un présent). */
export const CONTEXTE: ContexteControle = {
  zoneControlee: 'circulation',
  dateDuJour: '2026-07-29',
  maintenantMinutes: h(8, 12),
  // Tout le monde sur la liste sauf Traoré (p3) → démontre HORS_LISTE.
  listeDuJour: new Set(['p1', 'p2', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11']),
  // Coulibaly (p10) est déjà entrée → démontre DEJA_ENTRE à une seconde entrée.
  presents: new Set(['p10']),
};

// --- Résolution d'un scan ---
export interface ScanResolu {
  badge: Badge | null;
  personne: Personne | null;
  entreprise: Entreprise | null;
  donneurOrdreBloque: boolean;
}

export function resoudreScan(badgeId: string | null): ScanResolu {
  const badge = BADGES.find((b) => b.id === badgeId) ?? null;
  if (!badge) return { badge: null, personne: null, entreprise: null, donneurOrdreBloque: false };
  const personne = PERSONNES.find((p) => p.id === badge.personneId) ?? null;
  const entreprise = ENTREPRISES.find((e) => e.id === badge.entrepriseId) ?? null;
  const donneur = entreprise?.donneurOrdreId
    ? DONNEURS_ORDRE.find((d) => d.id === entreprise.donneurOrdreId)
    : undefined;
  return { badge, personne, entreprise, donneurOrdreBloque: donneur?.bloque ?? false };
}

/** Jeux d'essai proposés dans le bandeau de simulation (remplace la caméra). */
export interface DemoScan {
  badgeId: string | null;
  attendu: string;
}
export const DEMO_SCANS: DemoScan[] = [
  { badgeId: 'b1', attendu: 'Autorisé' },
  { badgeId: 'b2', attendu: 'Visiteur' },
  { badgeId: 'b3', attendu: 'Hors liste' },
  { badgeId: 'b4', attendu: 'Expiré' },
  { badgeId: 'b5', attendu: 'Suspendu' },
  { badgeId: 'b6', attendu: 'Ent. suspendue' },
  { badgeId: 'b7', attendu: 'Induction' },
  { badgeId: 'b8', attendu: 'Autorisé (emprise)' },
  { badgeId: 'b9', attendu: 'Hors plage' },
  { badgeId: 'b10', attendu: 'Déjà entré' },
  { badgeId: 'b11', attendu: 'Hors zone' },
  { badgeId: null, attendu: 'Inconnu' },
];
