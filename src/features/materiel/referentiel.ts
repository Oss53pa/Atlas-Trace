import { useEffect, useState } from 'react';
import { chargerEntreprises, type EntrepriseOption } from './api';

/**
 * Catégories à déclaration obligatoire (référentiel du site, chap. 8 du CDC).
 * C'est de la configuration, pas de la donnée d'exploitation : à déplacer dans
 * le paramétrage du site quand M19 sera branché.
 */
export const CATEGORIES_MATERIEL = [
  'Électroportatif',
  'Appareils de mesure',
  'Câbles & cuivre',
  'Échafaudages',
  'Carburants',
];

/** Entreprises réelles du site, pour les listes déroulantes. */
export function useEntreprises(): EntrepriseOption[] {
  const [entreprises, setEntreprises] = useState<EntrepriseOption[]>([]);
  useEffect(() => {
    chargerEntreprises()
      .then(setEntreprises)
      .catch(() => setEntreprises([]));
  }, []);
  return entreprises;
}
