/** Every fixed UI string of the application. Dynamic sentences live in `insights.ts`. */

export const UI = {
  appTitle: "Analyse de la consommation d'électricité",
  homeLinkName: 'Accueil',
  navLabel: 'Vues du tableau de bord',
  views: {
    consumption: 'Consommation',
    profile: 'Profil journalier',
    quality: 'Qualité des données',
  },
  status: {
    loading: 'Chargement des données…',
    errorTitle: 'Impossible de charger les données du tableau de bord.',
    errorHint: 'Générez le fichier avec',
    errorHintEnd: ', puis réessayez.',
    retry: 'Réessayer',
    empty: 'Aucune donnée de consommation à afficher.',
  },
} as const;
