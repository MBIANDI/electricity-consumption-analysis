import { makeDashboard } from '../../testing/dashboard-fixture';
import {
  dailyCoverageOptions,
  dailyEnergyOptions,
  hourlyEnergyOptions,
  profileOptions,
  profileTooltip,
} from './chart-options';
import { VALUE_AXIS_STYLE } from './chart-theme';
import { CHART_COLORS } from './chart-theme';

interface BarDatum {
  value: number;
  itemStyle: { color: string };
}

describe('chart options', () => {
  const data = makeDashboard();

  it('colours only the peak day blue in the daily chart', () => {
    const options = dailyEnergyOptions(data.daily) as { series: { data: BarDatum[] }[] };

    expect(options.series[0].data.map((datum) => datum.value)).toEqual([26, 48]);
    expect(options.series[0].data.map((datum) => datum.itemStyle.color)).toEqual([
      CHART_COLORS.navy,
      CHART_COLORS.blue,
    ]);
  });

  it('plots one hourly value per point', () => {
    const options = hourlyEnergyOptions(data.hourly) as { series: { data: number[] }[] };

    expect(options.series[0].data).toEqual([0.5, 2.4, 0.7]);
  });

  it('plots the profile in kW over 24 hours with gaps for missing hours', () => {
    const options = profileOptions(data.daily_profile, data.summary.base_load_w) as {
      series: { id: string; data: (number | null)[] }[];
    };

    const line = (id: string): (number | null)[] => options.series.find((serie) => serie.id === id)?.data ?? [];
    expect(line('weekday')).toHaveLength(24);
    expect(line('weekday')[7]).toBe(0.9);
    expect(line('weekday')[19]).toBe(1.7);
    expect(line('weekday')[8]).toBeNull();
    expect(line('weekend')[12]).toBe(1.3);
  });

  it('draws the 25th–75th percentile band as a stacked area behind each line', () => {
    const options = profileOptions(data.daily_profile, data.summary.base_load_w) as {
      series: { id: string; stack?: string; data: (number | null)[]; areaStyle?: { opacity: number } }[];
    };

    const serie = (id: string) => options.series.find((candidate) => candidate.id === id);
    expect(serie('weekday-band-base')?.data[19]).toBe(1.5);
    expect(serie('weekday-band')?.data[19]).toBe(0.4);
    expect(serie('weekday-band')?.stack).toBe('weekday-band');
    expect(serie('weekday-band-base')?.stack).toBe('weekday-band');
    expect(serie('weekday-band')?.areaStyle?.opacity).toBeLessThan(0.3);
    expect(serie('weekend-band-base')?.data[12]).toBe(1.2);
    expect(serie('weekend-band')?.data[12]).toBe(0.2);
    expect(serie('weekday-band')?.data[8]).toBeNull();
  });

  it('draws the base load as a thin grey dashed line at its constant level', () => {
    const options = profileOptions(data.daily_profile, data.summary.base_load_w) as {
      series: { id: string; lineStyle: { type: string; width: number }; data: ({ value: number } | number)[] }[];
    };

    const baseLoad = options.series.find((serie) => serie.id === 'base-load');
    expect(baseLoad?.lineStyle).toMatchObject({ type: 'dashed', width: 1 });
    expect(baseLoad?.data).toHaveLength(24);
    expect(baseLoad?.data[5]).toBe(0.3);
  });

  it('flags days under 95 % coverage in blue', () => {
    const options = dailyCoverageOptions(data.daily) as { series: { data: BarDatum[] }[] };

    expect(options.series[0].data.map((datum) => datum.itemStyle.color)).toEqual([
      CHART_COLORS.blue,
      CHART_COLORS.navy,
    ]);
    expect(options.series[0].data[1].value).toBe(100);
  });

  it('marks each profile peak with a filled point and a direct label', () => {
    const options = profileOptions(data.daily_profile, data.summary.base_load_w) as {
      series: { id: string; markPoint?: { data: { coord: [string, number]; label: { formatter: string } }[] } }[];
    };

    const peak = (id: string) => options.series.find((serie) => serie.id === id)?.markPoint?.data[0];
    const weekday = peak('weekday')!;
    const weekend = peak('weekend')!;
    expect(weekday.coord).toEqual(['19\u00a0h', 1.7]);
    expect(weekday.label.formatter).toBe('1,7\u00a0kW à 19\u00a0h');
    expect(weekend.coord).toEqual(['12\u00a0h', 1.3]);
    expect(weekend.label.formatter).toBe('1,3\u00a0kW à 12\u00a0h');
  });

  it('shows a vertical crosshair and a tooltip with both values of the hour', () => {
    const options = profileOptions(data.daily_profile, data.summary.base_load_w) as {
      tooltip: { trigger: string; axisPointer: { type: string }; formatter: typeof profileTooltip };
    };

    expect(options.tooltip.trigger).toBe('axis');
    expect(options.tooltip.axisPointer.type).toBe('line');
    expect(
      options.tooltip.formatter([
        { axisValue: '6\u00a0h', seriesId: 'weekday', seriesName: 'Semaine', value: 1.7 },
        { axisValue: '6\u00a0h', seriesId: 'weekend', seriesName: 'Week\u2011end', value: 1 },
      ]),
    ).toBe('6\u00a0h — Semaine 1,7\u00a0kW, Week\u2011end 1,0\u00a0kW');
  });

  it('leaves hours without data out of the tooltip', () => {
    expect(
      profileTooltip([
        { axisValue: '8\u00a0h', seriesId: 'weekday', seriesName: 'Semaine', value: null },
        { axisValue: '8\u00a0h', seriesId: 'weekend', seriesName: 'Week\u2011end', value: 1.2 },
      ]),
    ).toBe('8\u00a0h — Week\u2011end 1,2\u00a0kW');
    expect(profileTooltip([])).toBe('');
  });

  it('labels the x axis every 3 hours but keeps the 24 ticks', () => {
    const options = profileOptions(data.daily_profile, data.summary.base_load_w) as {
      xAxis: { data: string[]; axisTick: { show: boolean; interval: number }; axisLabel: { interval: (i: number) => boolean } };
    };

    expect(options.xAxis.data).toHaveLength(24);
    expect(options.xAxis.axisTick).toMatchObject({ show: true, interval: 0 });
    const labelled = options.xAxis.data.filter((_, index) => options.xAxis.axisLabel.interval(index));
    expect(labelled).toEqual(['0', '3', '6', '9', '12', '15', '18', '21'].map((hour) => `${hour}\u00a0h`));
  });

  it('formats y-axis ticks in fr-FR', () => {
    expect(VALUE_AXIS_STYLE.axisLabel.formatter(1.5)).toBe('1,5');
  });
});
