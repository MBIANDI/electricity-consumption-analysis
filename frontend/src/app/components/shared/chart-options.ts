/** Pure builders of ECharts options for the dashboard charts. */

import type { EChartsCoreOption } from 'echarts/core';
import {
  DailyEnergyPoint,
  DailyProfile,
  HourlyEnergyPoint,
  ProfilePoint,
} from '@models/dashboard';
import {
  formatDayShort,
  formatHour,
  formatHourLabel,
  formatKw,
  formatKwh,
  formatPercent,
  formatWatts,
  wattsToKilowatts,
} from '@services/format';
import { peakOf } from '@services/insights';
import { UI } from '@services/ui-strings';
import {
  CATEGORY_AXIS_STYLE,
  CHART_COLORS,
  CHART_FONT,
  TOOLTIP_STYLE,
  VALUE_AXIS_STYLE,
} from './chart-theme';

const GRID = { left: 56, right: 24, top: 32, bottom: 36 };
const COMPLETE_DAY_COVERAGE_PCT = 95;

function peakLabel(text: string, color: string = CHART_COLORS.blue): object {
  return {
    show: true,
    formatter: text,
    color,
    fontFamily: CHART_FONT,
    fontWeight: 'bold',
    fontSize: 12,
  };
}

/** Daily energy as bars; the peak day is the only blue bar and carries a direct label. */
export function dailyEnergyOptions(days: readonly DailyEnergyPoint[]): EChartsCoreOption {
  const peak = peakOf(days, (day) => day.energy_kwh);
  return {
    animation: false,
    grid: GRID,
    tooltip: {
      ...TOOLTIP_STYLE,
      valueFormatter: (value: number) => formatKwh(value, 2),
    },
    xAxis: { ...CATEGORY_AXIS_STYLE, data: days.map((day) => formatDayShort(day.day)) },
    yAxis: { ...VALUE_AXIS_STYLE, name: 'kWh', min: 0 },
    series: [
      {
        name: 'Énergie journalière',
        type: 'bar',
        barMaxWidth: 18,
        data: days.map((day) => ({
          value: day.energy_kwh,
          itemStyle: { color: day === peak ? CHART_COLORS.blue : CHART_COLORS.navy },
        })),
        markPoint:
          peak === undefined
            ? undefined
            : {
                symbolSize: 0,
                data: [
                  {
                    coord: [formatDayShort(peak.day), peak.energy_kwh],
                    label: peakLabel(`Pic : ${formatKwh(peak.energy_kwh)}`),
                  },
                ],
                label: { position: 'top', offset: [0, -12] },
              },
      },
    ],
  };
}

/** Hourly energy as a thin line; the peak hour is marked in blue with a direct label. */
export function hourlyEnergyOptions(hours: readonly HourlyEnergyPoint[]): EChartsCoreOption {
  const peak = peakOf(hours, (hour) => hour.energy_kwh);
  return {
    animation: false,
    grid: GRID,
    tooltip: {
      ...TOOLTIP_STYLE,
      valueFormatter: (value: number) => formatKwh(value, 2),
    },
    xAxis: {
      ...CATEGORY_AXIS_STYLE,
      data: hours.map((hour) => formatHourLabel(hour.start_utc)),
      axisLabel: { ...CATEGORY_AXIS_STYLE.axisLabel, hideOverlap: true },
    },
    yAxis: { ...VALUE_AXIS_STYLE, name: 'kWh', min: 0 },
    series: [
      {
        name: 'Énergie horaire',
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { color: CHART_COLORS.navy, width: 1 },
        itemStyle: { color: CHART_COLORS.navy },
        data: hours.map((hour) => hour.energy_kwh),
        markPoint:
          peak === undefined
            ? undefined
            : {
                symbol: 'circle',
                symbolSize: 9,
                itemStyle: { color: CHART_COLORS.blue },
                data: [
                  {
                    coord: [formatHourLabel(peak.start_utc), peak.energy_kwh],
                    label: peakLabel(`Pic : ${formatKwh(peak.energy_kwh, 2)}`),
                  },
                ],
                label: { position: 'top', offset: [0, -4] },
              },
      },
    ],
  };
}

interface ProfileLine {
  id: string;
  name: string;
  color: string;
  dashed: boolean;
}

const BASE_LOAD_ID = 'base-load';

const PROFILE_LINES: readonly ProfileLine[] = [
  { id: 'weekday', name: UI.weekday, color: CHART_COLORS.navy, dashed: false },
  { id: 'weekend', name: UI.weekend, color: CHART_COLORS.blue, dashed: true },
];

/** The part of an ECharts axis-tooltip item that the profile tooltip reads. */
export interface AxisTooltipItem {
  axisValue: string;
  seriesId: string;
  seriesName: string;
  value: number | null | undefined;
}

/** `6 h — Semaine 1,7 kW, Week-end 1,0 kW`; hours without data are left out. */
export function profileTooltip(items: readonly AxisTooltipItem[]): string {
  const lines = items.filter(
    (item) => PROFILE_LINES.some((line) => line.id === item.seriesId) && typeof item.value === 'number',
  );
  if (lines.length === 0) {
    return '';
  }
  return `${lines[0].axisValue} — ${lines.map((item) => `${item.seriesName} ${formatKw(item.value as number)}`).join(', ')}`;
}

const BAND_OPACITY = 0.14;

/**
 * Mean power by hour of day: solid navy for weekdays, dashed blue for weekends, each over a light
 * tint of its 25th–75th percentile band. A thin grey dashed line marks the base load. The legend is
 * HTML (see the profile view); each peak is a filled point with a direct label; hovering shows a
 * vertical crosshair and both values. Labels every 3 hours, with a tick for each of the 24 hours.
 */
export function profileOptions(profile: DailyProfile, baseLoadW: number): EChartsCoreOption {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const pointsById: Record<string, DailyProfile['weekday']> = {
    weekday: profile.weekday,
    weekend: profile.weekend,
  };
  /** One value per hour of the day, `null` where the profile has no point; converted to kW. */
  const perHour = (
    points: DailyProfile['weekday'],
    value: (point: ProfilePoint) => number,
  ): (number | null)[] => {
    const byHour = new Map(points.map((point) => [point.hour, wattsToKilowatts(value(point))]));
    return hours.map((hour) => byHour.get(hour) ?? null);
  };
  const hidden = { silent: true, showSymbol: false, symbol: 'none', lineStyle: { opacity: 0 } };
  // The band is two stacked areas: an invisible one up to the lower edge, then the visible spread.
  const band = ({ id, color }: ProfileLine): object[] => {
    const points = pointsById[id] ?? [];
    const lower = perHour(points, (point) => point.band_lower_power_w);
    // Spread computed in W then converted, so the stacked value carries no float noise.
    const spread = perHour(points, (point) => point.band_upper_power_w - point.band_lower_power_w);
    return [
      { ...hidden, id: `${id}-band-base`, type: 'line', stack: `${id}-band`, data: lower },
      {
        ...hidden,
        id: `${id}-band`,
        type: 'line',
        stack: `${id}-band`,
        areaStyle: { color, opacity: BAND_OPACITY },
        data: spread,
      },
    ];
  };
  const line = ({ id, name, color, dashed }: ProfileLine): object => {
    const points = pointsById[id] ?? [];
    const peak = peakOf(points, (point) => point.mean_power_w);
    return {
      id,
      name,
      type: 'line',
      showSymbol: false,
      lineStyle: { color, width: 2, type: dashed ? 'dashed' : 'solid' },
      itemStyle: { color },
      data: perHour(points, (point) => point.mean_power_w),
      markPoint:
        peak === undefined
          ? undefined
          : {
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: { color },
              label: { position: 'top', offset: [0, -2] },
              data: [
                {
                  coord: [formatHour(peak.hour), wattsToKilowatts(peak.mean_power_w)],
                  label: peakLabel(
                    `${formatKw(wattsToKilowatts(peak.mean_power_w))} à ${formatHour(peak.hour)}`,
                    color,
                  ),
                },
              ],
            },
    };
  };
  const baseLoad = {
    id: BASE_LOAD_ID,
    name: UI.profile.baseLoadLabel,
    type: 'line',
    silent: true,
    // ECharts draws a point label only on a symbol: keep one of size 0 so the label shows.
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 0,
    lineStyle: { color: CHART_COLORS.textSecondary, width: 1, type: 'dashed' },
    data: hours.map((hour) =>
      hour === 0
        ? {
            value: wattsToKilowatts(baseLoadW),
            label: {
              show: true,
              position: 'top',
              align: 'left',
              formatter: `${UI.profile.baseLoadLabel} : ${formatWatts(baseLoadW)}`,
              color: CHART_COLORS.textSecondary,
              fontFamily: CHART_FONT,
              fontSize: 12,
            },
          }
        : wattsToKilowatts(baseLoadW),
    ),
  };
  return {
    animation: false,
    grid: { ...GRID, right: 8 },
    tooltip: {
      ...TOOLTIP_STYLE,
      axisPointer: { type: 'line', lineStyle: { color: CHART_COLORS.navy, width: 1, type: 'solid' } },
      formatter: (items: AxisTooltipItem[]): string => profileTooltip(items),
    },
    xAxis: {
      ...CATEGORY_AXIS_STYLE,
      boundaryGap: false,
      data: hours.map(formatHour),
      axisTick: { show: true, interval: 0, alignWithLabel: true },
      axisLabel: { ...CATEGORY_AXIS_STYLE.axisLabel, interval: (index: number): boolean => index % 3 === 0 },
    },
    yAxis: { ...VALUE_AXIS_STYLE, name: 'kW', min: 0 },
    series: [...PROFILE_LINES.flatMap(band), ...PROFILE_LINES.map(line), baseLoad],
  };
}

/** Share of expected minutes observed per day; days below the completeness threshold are blue. */
export function dailyCoverageOptions(days: readonly DailyEnergyPoint[]): EChartsCoreOption {
  const coverage = (day: DailyEnergyPoint): number => (day.observed_minutes / day.expected_minutes) * 100;
  return {
    animation: false,
    grid: GRID,
    tooltip: {
      ...TOOLTIP_STYLE,
      valueFormatter: (value: number) => formatPercent(value),
    },
    xAxis: { ...CATEGORY_AXIS_STYLE, data: days.map((day) => formatDayShort(day.day)) },
    yAxis: { ...VALUE_AXIS_STYLE, name: '%', min: 0, max: 100, interval: 25 },
    series: [
      {
        name: 'Couverture journalière',
        type: 'bar',
        barMaxWidth: 18,
        data: days.map((day) => ({
          value: coverage(day),
          itemStyle: {
            color: coverage(day) < COMPLETE_DAY_COVERAGE_PCT ? CHART_COLORS.blue : CHART_COLORS.navy,
          },
        })),
      },
    ],
  };
}
