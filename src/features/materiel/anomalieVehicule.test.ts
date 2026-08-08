import { describe, it, expect } from 'vitest';
import { estAnomalieVehicule } from './api';

describe('estAnomalieVehicule — entré vide, ressort chargé, sans couverture', () => {
  it('anomalie : SORTIE, entré VIDE, ressort CHARGE, sans couverture', () => {
    expect(estAnomalieVehicule({ sens: 'SORTIE', etatEntree: 'VIDE', etatSortie: 'CHARGE' })).toBe(true);
    expect(estAnomalieVehicule({ sens: 'SORTIE', etatEntree: 'VIDE', etatSortie: 'CHARGE', couverture: '' })).toBe(true);
  });

  it('couverture blancs = pas de couverture (miroir du nullif/btrim serveur)', () => {
    expect(estAnomalieVehicule({ sens: 'SORTIE', etatEntree: 'VIDE', etatSortie: 'CHARGE', couverture: '   ' })).toBe(true);
  });

  it('pas d\'anomalie si la sortie est couverte', () => {
    expect(estAnomalieVehicule({ sens: 'SORTIE', etatEntree: 'VIDE', etatSortie: 'CHARGE', couverture: 'BS-2026-014' })).toBe(false);
  });

  it('pas d\'anomalie si le véhicule était entré chargé', () => {
    expect(estAnomalieVehicule({ sens: 'SORTIE', etatEntree: 'CHARGE', etatSortie: 'CHARGE' })).toBe(false);
  });

  it('pas d\'anomalie si le véhicule ressort à vide', () => {
    expect(estAnomalieVehicule({ sens: 'SORTIE', etatEntree: 'VIDE', etatSortie: 'VIDE' })).toBe(false);
  });

  it('jamais d\'anomalie à l\'entrée (règle propre à la sortie)', () => {
    expect(estAnomalieVehicule({ sens: 'ENTREE', etatEntree: 'VIDE', etatSortie: 'CHARGE' })).toBe(false);
  });

  it('pas d\'anomalie si l\'état d\'entrée est inconnu (null)', () => {
    expect(estAnomalieVehicule({ sens: 'SORTIE', etatEntree: null, etatSortie: 'CHARGE' })).toBe(false);
  });
});
