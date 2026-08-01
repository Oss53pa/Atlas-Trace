import type { MotifCode } from '../../types';

/** Libellé en clair + consigne d'une ligne pour l'agent (M5 : « chaque refus affiche un motif et une consigne »). */
export const MOTIFS: Record<MotifCode, { libelle: string; consigne: string }> = {
  BADGE_INCONNU: {
    libelle: 'Badge inconnu',
    consigne: 'Badge non reconnu — orienter vers le poste d’accueil.',
  },
  BADGE_EXPIRE: {
    libelle: 'Badge expiré',
    consigne: 'Renouvellement requis auprès du chef de poste.',
  },
  BADGE_SUSPENDU: {
    libelle: 'Badge suspendu',
    consigne: 'Accès bloqué — prévenir le chef de poste.',
  },
  ENTREPRISE_SUSPENDUE: {
    libelle: 'Entreprise suspendue',
    consigne: 'Aucun accès pour cette entreprise — voir la direction du site.',
  },
  DONNEUR_ORDRE_BLOQUE: {
    libelle: 'Donneur d’ordre bloqué',
    consigne: 'Condition préalable non levée — se rapprocher du référent.',
  },
  HORS_LISTE: {
    libelle: 'Hors liste du jour',
    consigne: 'Non déclaré ce matin — orienter vers le référent de l’entreprise.',
  },
  HORS_ZONE: {
    libelle: 'Hors zone autorisée',
    consigne: 'Zone non couverte par ce badge — refuser l’accès.',
  },
  HORS_EMPRISE: {
    libelle: 'Hors emprise',
    consigne: 'Cellule / secteur non autorisé pour ce badge.',
  },
  HORS_PLAGE: {
    libelle: 'Hors plage horaire',
    consigne: 'Présentation en dehors des horaires autorisés.',
  },
  DEJA_ENTRE: {
    libelle: 'Déjà entré',
    consigne: 'Aucune sortie enregistrée — vérifier le partage de badge.',
  },
  INDUCTION_EXPIREE: {
    libelle: 'Induction expirée',
    consigne: 'Induction HSE à repasser avant tout accès.',
  },
  PHOTO_NON_CONCORDANTE: {
    libelle: 'Photo non concordante',
    consigne: 'Le porteur ne correspond pas à la photo — refuser.',
  },
  SORTIE_SANS_ENTREE: {
    libelle: 'Sortie sans entrée enregistrée',
    consigne: 'Aucune entrée tracée — vérifier le partage de badge. Sortie autorisée et signalée.',
  },
};
