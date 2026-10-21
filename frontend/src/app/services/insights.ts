/** Action titles: one full French sentence per view, built from the computed numbers. */

import {
  ConsumptionSummary,
  DailyEnergyPoint,
  DailyProfile,
  DataQuality,
  HourlyEnergyPoint,
  ProfilePoint,
  SourceInfo,
} from '@models/dashboard';
import {
  formatDateTime,
  formatDayLong,
  formatDuration,
  formatHour,
  formatKw,
  formatKwh,
  formatPercent,
  formatPeriod,
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
