import { makeDashboard } from '../../testing/dashboard-fixture';
import {
  dailyCoverageOptions,
  dailyEnergyOptions,
  hourlyEnergyOptions,
  profileOptions,
} from './chart-options';
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
});
