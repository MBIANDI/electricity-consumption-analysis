import { makeDashboard } from '../testing/dashboard-fixture';
import {
  dailyConsumptionTitle,
  hourlyConsumptionTitle,
  overviewTitle,
  peakOf,
  profileInsight,
  profileTitle,
  qualityTitle,
  sourceFootnote,
} from './insights';

const plain = (text: string): string => text.replace(/\s/g, ' ');

describe('insights', () => {
  const data = makeDashboard();

  it('finds the peak of a list and handles an empty list', () => {
    expect(peakOf([3, 9, 4], (value) => value)).toBe(9);
    expect(peakOf([], (value: number) => value)).toBeUndefined();
  });

  it('states the overview insight with the computed numbers', () => {
    expect(plain(overviewTitle(data.summary))).toBe(
      'Le foyer a consommé 74 kWh sur la période, soit 36,0 kWh par jour en moyenne.',
    );
  });

  it('names the peak day and the peak hour', () => {
    expect(plain(dailyConsumptionTitle(data.daily))).toBe(
      'La consommation journalière culmine le mardi 2 juin, à 48,0 kWh.',
    );
    expect(plain(hourlyConsumptionTitle(data.hourly))).toContain('à 2,40 kWh.');
  });

  it('handles empty selections', () => {
    expect(dailyConsumptionTitle([])).toBe('Aucune journée dans la plage sélectionnée.');
    expect(hourlyConsumptionTitle([])).toBe('Aucune heure dans la plage sélectionnée.');
  });

  it('states weekday and weekend peaks of the profile', () => {
    expect(plain(profileTitle(data.daily_profile))).toBe(
      'En semaine, la consommation culmine à 19 h, à 1,7 kW ; le week\u2011end, à 12 h, à 1,3 kW.',
    );
  });

  it('summarises data quality with the longest gap', () => {
    expect(plain(qualityTitle(data.quality))).toBe(
      '95,1 % des minutes sont mesurées ; 2 interruptions dépassent 5 minutes, la plus longue dure 9 h 10.',
    );
    expect(plain(qualityTitle({ ...data.quality, gaps: [] }))).toBe(
      '95,1 % des minutes sont mesurées, sans interruption de plus de 5 minutes.',
    );
  });

  it('builds the source footnote from the period in Paris time', () => {
    expect(sourceFootnote(data.source)).toBe('Source : compteur Shelly, 1 juin – 2 juin 2026');
  });

  it('ends the period on the next Paris day when the last minute is after 22:00 UTC (CEST)', () => {
    const source = {
      ...data.source,
      period_start_utc: '2026-08-31T16:33:00Z',
      period_end_utc: '2026-10-14T22:59:00Z',
    };

    expect(sourceFootnote(source)).toBe('Source : compteur Shelly, 31 août – 15 oct. 2026');
  });

  it('never splits "week-end" and keeps a no-break space before units', () => {
    const title = profileTitle(data.daily_profile);

    expect(title).toContain('week\u2011end');
    expect(title).not.toContain('week-end');
    expect(title).toContain('19\u00a0h');
    expect(title).toContain('1,7\u00a0kW');
  });

  it('compares the weekday peak hour with the same hour at the weekend, without a cause', () => {
    const profile = {
      ...data.daily_profile,
      weekday: [{ hour: 6, mean_power_w: 1705, band_lower_power_w: 0, band_upper_power_w: 0 }],
      weekend: [{ hour: 6, mean_power_w: 1044, band_lower_power_w: 0, band_upper_power_w: 0 }],
    };

    expect(profileInsight(profile)).toBe(
      'À 6 h, la puissance moyenne est de 1,7 kW en semaine contre 1,0 kW le week‑end : +0,7 kW.',
    );
  });

  it('shows a minus sign when the weekend is higher at the weekday peak hour', () => {
    const profile = {
      ...data.daily_profile,
      weekday: [{ hour: 9, mean_power_w: 1000, band_lower_power_w: 0, band_upper_power_w: 0 }],
      weekend: [{ hour: 9, mean_power_w: 1300, band_lower_power_w: 0, band_upper_power_w: 0 }],
    };

    expect(profileInsight(profile)).toBe(
      'À 9 h, la puissance moyenne est de 1,0 kW en semaine contre 1,3 kW le week‑end : -0,3 kW.',
    );
  });

  it('has no insight when the weekend has no reading at the weekday peak hour', () => {
    expect(profileInsight(data.daily_profile)).toBeUndefined();
  });
});
