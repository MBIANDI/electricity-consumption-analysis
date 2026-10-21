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
    const options = profileOptions(data.daily_profile) as { series: { data: (number | null)[] }[] };

    const [weekday, weekend] = options.series.map((serie) => serie.data);
    expect(weekday).toHaveLength(24);
    expect(weekday[7]).toBe(0.9);
    expect(weekday[19]).toBe(1.7);
    expect(weekday[8]).toBeNull();
    expect(weekend[12]).toBe(1.3);
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
    const options = profileOptions(data.daily_profile) as {
      series: { id: string; markPoint: { data: { coord: [string, number]; label: { formatter: string } }[] } }[];
    };

    const [weekday, weekend] = options.series.map((serie) => serie.markPoint.data[0]);
    expect(weekday.coord).toEqual(['19\u00a0h', 1.7]);
    expect(weekday.label.formatter).toBe('1,7\u00a0kW à 19\u00a0h');
    expect(weekend.coord).toEqual(['12\u00a0h', 1.3]);
    expect(weekend.label.formatter).toBe('1,3\u00a0kW à 12\u00a0h');
  });

  it('shows a vertical crosshair and a tooltip with both values of the hour', () => {
    const options = profileOptions(data.daily_profile) as {
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
    const options = profileOptions(data.daily_profile) as {
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
