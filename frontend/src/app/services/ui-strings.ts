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
  // Non-breaking hyphen (U+2011) so "week-end" is never split across two lines.
  weekday: 'Semaine',
  weekend: 'Week\u2011end',
  profile: {
    subtitle: 'Puissance moyenne par heure locale (heure de Paris).',
    legendLabel: 'Légende',
    peakAt: 'Pic à',
    chartDescription:
      "Courbes de la puissance moyenne en kW selon l'heure de la journée, en semaine et le week\u2011end",
  },
  overview: {
    totalEnergy: 'Énergie totale',
    totalEnergyDetail: 'Somme des trois phases, minutes mesurées uniquement',
    dailyAverage: 'Moyenne journalière',
    dailyAverageDetail: (days: number): string => `Sur ${days} jours complets`,
    peakPower: 'Puissance de pointe',
    baseLoad: 'Puissance de base',
    baseLoadDetail: '5e centile de la puissance par minute',
    coverage: 'Couverture des données',
    coverageDetail: (gaps: number, thresholdMinutes: number): string =>
      `${gaps} interruptions de plus de ${thresholdMinutes} min`,
  },
  consumption: {
    granularity: 'Granularité',
    daily: 'Par jour',
    hourly: 'Par heure',
    from: 'Du',
    to: 'Au',
    wholePeriod: 'Toute la période',
    emptyRange: 'Aucune donnée dans la plage sélectionnée.',
    dailyDescription: 'Énergie journalière en kWh sur la plage sélectionnée',
    hourlyDescription: 'Énergie horaire en kWh sur la plage sélectionnée',
  },
  quality: {
    subtitle:
      'Les interruptions sont signalées et jamais comblées : une minute manquante ne compte aucune énergie.',
    coverageLabel: 'Couverture :',
    dailyCoverageTitle: 'Couverture par jour (les jours incomplets sont en bleu)',
    dailyCoverageDescription: 'Pourcentage de minutes mesurées pour chaque jour de la période',
    gapsTitle: (thresholdMinutes: number): string => `Interruptions de plus de ${thresholdMinutes} minutes`,
    gapsCaption: 'Liste des interruptions de mesure',
    start: 'Début',
    end: 'Fin',
    duration: 'Durée',
    noGaps: 'Aucune interruption.',
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
