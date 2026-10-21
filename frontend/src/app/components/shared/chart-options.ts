/** Pure builders of ECharts options for the dashboard charts. */

import type { EChartsCoreOption } from 'echarts/core';
import {
  DailyEnergyPoint,
  DailyProfile,
  HourlyEnergyPoint,
} from '@models/dashboard';
import {
  formatDayShort,
  formatHour,
  formatHourLabel,
  formatKw,
  formatKwh,
  formatPercent,
  wattsToKilowatts,
} from '@services/format';
import { peakOf } from '@services/insights';
import {
  CATEGORY_AXIS_STYLE,
  CHART_COLORS,
  CHART_FONT,
  TOOLTIP_STYLE,
  VALUE_AXIS_STYLE,
} from './chart-theme';

const GRID = { left: 56, right: 24, top: 32, bottom: 36 };
const COMPLETE_DAY_COVERAGE_PCT = 95;

function peakLabel(text: string): object {
  return {
    show: true,
    formatter: text,
    color: CHART_COLORS.blue,
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

/** Mean power by hour of day. Weekdays are solid navy, weekends dashed blue; no legend. */
export function profileOptions(profile: DailyProfile): EChartsCoreOption {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const series = (
    name: string,
    points: DailyProfile['weekday'],
    color: string,
    dashed: boolean,
  ): object => {
    const byHour = new Map(points.map((point) => [point.hour, point.mean_power_w]));
    return {
      name,
      type: 'line',
      showSymbol: false,
      lineStyle: { color, width: 2, type: dashed ? 'dashed' : 'solid' },
      itemStyle: { color },
      data: hours.map((hour) => {
        const power = byHour.get(hour);
        return power === undefined ? null : wattsToKilowatts(power);
      }),
      endLabel: {
        show: true,
        formatter: name,
        color,
        fontFamily: CHART_FONT,
        fontWeight: 'bold',
        fontSize: 12,
      },
    };
  };
  return {
    animation: false,
    grid: { ...GRID, right: 88 },
    tooltip: {
      ...TOOLTIP_STYLE,
      valueFormatter: (value: number) => formatKw(value, 2),
    },
    xAxis: { ...CATEGORY_AXIS_STYLE, data: hours.map(formatHour) },
    yAxis: { ...VALUE_AXIS_STYLE, name: 'kW', min: 0 },
    series: [
      series('Semaine', profile.weekday, CHART_COLORS.navy, false),
      series('Week-end', profile.weekend, CHART_COLORS.blue, true),
    ],
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
