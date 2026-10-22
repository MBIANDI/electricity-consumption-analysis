/** Every fixed UI string of the application. Dynamic sentences live in `insights.ts`. */

export const UI = {
  appTitle: "Analyse de la consommation d'électricité",
  homeLinkName: 'Accueil',
  navLabel: 'Vues du tableau de bord',
  views: {
    consumption: 'Consommation',
    profile: 'Profil journalier',
    quality: 'Qualité des données',
    voltage: 'Qualité de service',
  },
  // Non-breaking hyphen (U+2011) so "week-end" is never split across two lines.
  weekday: 'Semaine',
  weekend: 'Week\u2011end',
  profile: {
    legendLabel: 'Légende',
    peakAt: 'Pic à',
    baseLoadLabel: 'Puissance de base',
    caption: 'Puissance moyenne par heure locale (heure de Paris). Zone claire : du 25e au 75e centile entre les jours.',
    dayCounts: (weekdayDays: number, weekendDays: number): string =>
      `Moyenne sur ${weekdayDays} ${weekdayDays > 1 ? 'jours' : 'jour'} de semaine ` +
      `et ${weekendDays} ${weekendDays > 1 ? 'jours' : 'jour'} de week‑end`,
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
    voltageConformity: 'Conformité de la tension',
    voltageConformityDetail: (range: string, excursions: number): string =>
      `Dans ${range} ; ${excursions} ${excursions > 1 ? 'sorties' : 'sortie'} de plage`,
    voltageLink: 'Voir la qualité de service',
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
  voltage: {
    compliant: 'Conforme',
    nonCompliant: 'Non conforme',
    verdictLabel: 'Verdict',
    note: (range: string): string =>
      `Vérification minute par minute selon la règle du client (${range}). Ce n'est pas l'évaluation ` +
      "formelle de la norme EN 50160 et elle n'atteste pas une conformité réglementaire.",
    minimum: 'Tension minimale',
    maximum: 'Tension maximale',
    mean: 'Tension moyenne',
    inRange: 'Temps dans la plage',
    inRangeDetail: (missingMinutes: number): string =>
      `Minutes mesurées uniquement ; ${missingMinutes} min sans mesure, non comptées`,
    belowLimit: (limit: string): string => `Sous la limite basse (${limit})`,
    aboveLimit: (limit: string): string => `Au-dessus de la limite haute (${limit})`,
    withinRange: 'Dans la plage',
    excursions: 'Sorties de plage',
    excursionsDetail: (below: number, above: number): string =>
      `${below} en dessous, ${above} au-dessus`,
    chartTitle: 'Tension sur la période',
    chartDescription:
      'Tension en volts sur la période : minimum, moyenne et maximum par jour, limites de la plage et sorties de plage',
    legendLabel: 'Légende',
    legendMean: 'Moyenne',
    legendBand: 'Min. – max.',
    legendLimit: 'Limites',
    legendNominal: 'Nominale',
    legendBelow: 'Sous la limite basse',
    legendAbove: 'Au-dessus de la limite haute',
    zoomHint: 'Zoomez pour voir le détail à l’heure.',
    excursionsTitle: 'Sorties de plage',
    excursionsCaption: 'Liste des sorties de la plage de tension',
    none: 'Aucune non-conformité sur la période',
    start: 'Début',
    end: 'Fin',
    duration: 'Durée',
    direction: 'Sens',
    worst: 'Valeur extrême',
    below: 'En dessous',
    above: 'Au-dessus',
    noMeasure: 'Pas de mesure',
    tooltipMean: 'Moyenne',
    tooltipRange: 'Min. – max.',
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
