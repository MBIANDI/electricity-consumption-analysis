/** Action titles: one full French sentence per view, built from the computed numbers. */

import {
  ConsumptionSummary,
  DailyEnergyPoint,
  DailyProfile,
  DataQuality,
  HourlyEnergyPoint,
  ProfilePoint,
  SourceInfo,
  VoltageQualityReport,
  VoltageSettings,
} from '@models/dashboard';
import {
  formatDateTime,
  formatDayLong,
  formatDuration,
  formatHour,
  formatKw,
  formatKwDelta,
  formatNumber,
  formatKwh,
  formatPercent,
  formatPeriod,
  formatVolts,
  wattsToKilowatts,
} from './format';
import { UI } from './ui-strings';

export function peakOf<T>(points: readonly T[], value: (point: T) => number): T | undefined {
  return points.reduce<T | undefined>(
    (best, point) => (best === undefined || value(point) > value(best) ? point : best),
    undefined,
  );
}

export function overviewTitle(summary: ConsumptionSummary): string {
  return (
    `Le foyer a consommé ${formatKwh(summary.total_energy_kwh, 0)} sur la période, ` +
    `soit ${formatKwh(summary.average_daily_energy_kwh)} par jour en moyenne.`
  );
}

export function dailyConsumptionTitle(days: readonly DailyEnergyPoint[]): string {
  const peak = peakOf(days, (day) => day.energy_kwh);
  if (peak === undefined) {
    return 'Aucune journée dans la plage sélectionnée.';
  }
  return `La consommation journalière culmine le ${formatDayLong(peak.day)}, à ${formatKwh(peak.energy_kwh)}.`;
}

export function hourlyConsumptionTitle(hours: readonly HourlyEnergyPoint[]): string {
  const peak = peakOf(hours, (hour) => hour.energy_kwh);
  if (peak === undefined) {
    return 'Aucune heure dans la plage sélectionnée.';
  }
  return `La consommation horaire culmine le ${formatDateTime(peak.start_utc)}, à ${formatKwh(peak.energy_kwh, 2)}.`;
}

export function profilePeak(points: readonly ProfilePoint[]): ProfilePoint | undefined {
  return peakOf(points, (point) => point.mean_power_w);
}

export function profileTitle(profile: DailyProfile): string {
  const weekday = profilePeak(profile.weekday);
  const weekend = profilePeak(profile.weekend);
  if (weekday === undefined || weekend === undefined) {
    return 'Le profil journalier est incomplet.';
  }
  return (
    `En semaine, la consommation culmine à ${formatHour(weekday.hour)}, ` +
    `à ${formatKw(wattsToKilowatts(weekday.mean_power_w))} ; ` +
    `le ${UI.weekend.toLowerCase()}, à ${formatHour(weekend.hour)}, ` +
    `à ${formatKw(wattsToKilowatts(weekend.mean_power_w))}.`
  );
}

const WATTS_PER_TENTH_OF_KW = 100;

/** Power in kW rounded to the 0.1 kW shown on screen, so displayed figures always add up. */
function displayedKw(watts: number): number {
  return Math.round(watts / WATTS_PER_TENTH_OF_KW) / 10;
}

/**
 * One factual sentence: the weekday peak hour compared with the same hour at the weekend.
 * No cause is suggested. Empty when the weekend has no reading at that hour.
 */
export function profileInsight(profile: DailyProfile): string | undefined {
  const peak = profilePeak(profile.weekday);
  const weekend = profile.weekend.find((point) => point.hour === peak?.hour);
  if (peak === undefined || weekend === undefined) {
    return undefined;
  }
  const weekdayKw = displayedKw(peak.mean_power_w);
  const weekendKw = displayedKw(weekend.mean_power_w);
  const gap = Math.round((weekdayKw - weekendKw) * 10) / 10;
  return (
    `À ${formatHour(peak.hour)}, la puissance moyenne est de ${formatKw(weekdayKw)} en semaine ` +
    `contre ${formatKw(weekendKw)} le ${UI.weekend.toLowerCase()} : ${formatKwDelta(gap)}.`
  );
}

/** `198 à 242 V` */
export function voltageRangeText(settings: VoltageSettings): string {
  return `${formatNumber(settings.lower_v)} à ${formatVolts(settings.upper_v, 0)}`;
}

export function voltageTitle(report: VoltageQualityReport): string {
  const { summary, settings } = report;
  const range = voltageRangeText(settings);
  if (summary.is_compliant) {
    return `La tension est restée dans la plage de ${range} pendant toute la période mesurée.`;
  }
  const count = summary.excursion_count;
  return (
    `La tension est sortie de la plage de ${range} à ${count} ${count > 1 ? 'reprises' : 'reprise'} ; ` +
    `elle y est restée ${formatPercent(summary.pct_time_in_range, 2)} du temps mesuré.`
  );
}

export function qualityTitle(quality: DataQuality): string {
  const share = `${formatPercent(quality.coverage_pct)} des minutes sont mesurées`;
  if (quality.gaps.length === 0) {
    return `${share}, sans interruption de plus de ${quality.gap_threshold_minutes} minutes.`;
  }
  const longest = peakOf(quality.gaps, (gap) => gap.missing_minutes);
  return (
    `${share} ; ${quality.gaps.length} interruptions dépassent ${quality.gap_threshold_minutes} minutes, ` +
    `la plus longue dure ${formatDuration(longest?.missing_minutes ?? 0)}.`
  );
}

export function sourceFootnote(source: SourceInfo): string {
  return `Source : compteur Shelly, ${formatPeriod(source.period_start_utc, source.period_end_utc)}`;
}
