import { describe, it, expect } from 'vitest';
import { familleDe, primairesPour, PRIMAIRES_DEMO, type Famille } from './roles';

const set = (...p: string[]) => new Set(p);

describe('familleDe — classement d\'un rôle en une famille d\'interface', () => {
  it('DIRECTION dès qu\'un pouvoir de direction est présent', () => {
    for (const p of ['ADMINISTRER_ORGANISATION', 'CONSULTER_AUDIT', 'EXPORTER']) {
      expect(familleDe(set(p))).toBe<Famille>('DIRECTION');
    }
  });

  it('TERRAIN pour un agent au poste', () => {
    expect(familleDe(set('CONTROLER_AU_POSTE'))).toBe<Famille>('TERRAIN');
  });

  it('VALIDATION pour la chaîne de visas / créneaux', () => {
    for (const p of ['VISER_HABILITATION', 'APPROUVER_SORTIE', 'VALIDER_CRENEAU', 'CONSULTER_TABLEAU']) {
      expect(familleDe(set(p))).toBe<Famille>('VALIDATION');
    }
  });

  it('REFERENT pour les déclarations d\'entreprise', () => {
    for (const p of ['DECLARER_ENTREPRISE', 'DECLARER_PERSONNEL', 'DEPOSER_LISTE']) {
      expect(familleDe(set(p))).toBe<Famille>('REFERENT');
    }
  });

  it('BASE sans pouvoir opérationnel', () => {
    expect(familleDe(set())).toBe<Famille>('BASE');
    expect(familleDe(set('SUIVRE_INCIDENTS'))).toBe<Famille>('BASE'); // hors familles
  });

  it('respecte la priorité DIRECTION > TERRAIN > VALIDATION > REFERENT', () => {
    // Un compte cumulant plusieurs pouvoirs tombe dans la famille la plus haute.
    expect(familleDe(set('ADMINISTRER_ORGANISATION', 'CONTROLER_AU_POSTE'))).toBe('DIRECTION');
    expect(familleDe(set('CONTROLER_AU_POSTE', 'VISER_HABILITATION'))).toBe('TERRAIN');
    expect(familleDe(set('VISER_SORTIE', 'DECLARER_ENTREPRISE'))).toBe('VALIDATION');
  });
});

// Rôles réels du site (New Heaven SA) — protège contre une régression de
// classement quand on retouche les listes de pouvoirs.
describe('rôles réels → famille attendue', () => {
  const CAS: [string, string[], Famille][] = [
    ['Agent de contrôle', ['CONTROLER_AU_POSTE'], 'TERRAIN'],
    ['Chef de poste', ['CONTROLER_AU_POSTE', 'FORCER_ACCES', 'DELIVRER_BADGE', 'RECEPTIONNER', 'SUIVRE_INCIDENTS'], 'TERRAIN'],
    ['Directeur de la Construction', ['APPROUVER_HABILITATION', 'APPROUVER_SORTIE', 'AUTORISER_EVACUATION', 'CONSULTER_TABLEAU', 'SUIVRE_INCIDENTS', 'ADMINISTRER_ORGANISATION', 'EXPORTER', 'CONSULTER_AUDIT'], 'DIRECTION'],
    ['Direction du site', ['CONSULTER_TABLEAU', 'CONSULTER_AUDIT', 'EXPORTER', 'SUSPENDRE_ACCES', 'ADMINISTRER_ORGANISATION', 'SUIVRE_INCIDENTS'], 'DIRECTION'],
    ['HSE Officer', ['VISER_HABILITATION', 'VISER_SORTIE', 'DECLARER_PERSONNEL', 'SUIVRE_INCIDENTS', 'CONSULTER_TABLEAU'], 'VALIDATION'],
    ['Pilote de coordination', ['VALIDER_CRENEAU', 'GERER_CONDITIONS_BLOQUANTES', 'CONSULTER_TABLEAU'], 'VALIDATION'],
    ['Référent entreprise', ['DECLARER_ENTREPRISE', 'DECLARER_PERSONNEL', 'DEPOSER_LISTE', 'DECLARER_MATERIEL', 'DEMANDER_SORTIE', 'DEMANDER_LIVRAISON'], 'REFERENT'],
  ];
  it.each(CAS)('%s → %s', (_libelle, pouvoirs, attendu) => {
    expect(familleDe(new Set(pouvoirs))).toBe(attendu);
  });
});

describe('primairesPour — barre du bas', () => {
  it('hors session, présente l\'interface de la Direction (démo)', () => {
    expect(primairesPour(set(), false)).toEqual(PRIMAIRES_DEMO);
  });

  it('commence toujours par « accueil »', () => {
    expect(primairesPour(set('CONTROLER_AU_POSTE'), true)[0]).toBe('accueil');
    expect(primairesPour(set('ADMINISTRER_ORGANISATION'), true)[0]).toBe('accueil');
  });

  it('connecté, suit la famille du rôle', () => {
    expect(primairesPour(set('CONTROLER_AU_POSTE'), true)).toContain('poste');
    expect(primairesPour(set('DECLARER_ENTREPRISE'), true)).toContain('entreprises');
  });
});
