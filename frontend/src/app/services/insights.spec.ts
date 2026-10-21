import { makeDashboard } from '../testing/dashboard-fixture';
import {
  dailyConsumptionTitle,
  hourlyConsumptionTitle,
  overviewTitle,
  peakOf,
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
      'En semaine, la consommation culmine à 19 h, à 1,7 kW ; le week-end, à 12 h, à 1,3 kW.',
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
});
