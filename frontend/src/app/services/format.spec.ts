import {
  formatDateTime,
  formatDayLong,
  formatDayShort,
  formatDuration,
  formatHour,
  formatKw,
  formatKwh,
  formatNumber,
  formatPercent,
  formatVolts,
  formatWatts,
  localDayKey,
  wattsToKilowatts,
} from './format';

/** Collapse the no-break spaces used before units so expectations stay readable. */
const plain = (text: string): string => text.replace(/\s/g, ' ');

describe('format', () => {
  it('formats numbers with fr-FR separators and units', () => {
    expect(plain(formatKwh(1018.0764, 0))).toBe('1 018 kWh');
    expect(plain(formatKwh(23.6247))).toBe('23,6 kWh');
    expect(plain(formatKw(8.6497, 2))).toBe('8,65 kW');
    expect(plain(formatWatts(329.2))).toBe('329 W');
    expect(plain(formatPercent(96.1896))).toBe('96,2 %');
    expect(plain(formatHour(19))).toBe('19 h');
  });

  it('formats axis ticks with a decimal comma', () => {
    expect(formatNumber(1.5)).toBe('1,5');
    expect(formatNumber(2)).toBe('2');
    expect(formatNumber(0.25)).toBe('0,25');
  });

  it('puts a no-break space between a number and its unit', () => {
    expect(formatKw(1.7)).toBe('1,7\u00a0kW');
    expect(formatHour(6)).toBe('6\u00a0h');
  });

  it('formats volts in fr-FR with a no-break space', () => {
    expect(formatVolts(231.4)).toBe('231,4 V');
    expect(formatVolts(198, 0)).toBe('198 V');
  });

  it('converts watts to kilowatts', () => {
    expect(wattsToKilowatts(1700)).toBe(1.7);
  });

  it('formats durations in minutes or hours and minutes', () => {
    expect(plain(formatDuration(39))).toBe('39 min');
    expect(plain(formatDuration(1209))).toBe('20 h 09');
  });

  it('computes the Paris local day of an instant', () => {
    expect(localDayKey('2026-06-01T21:30:00Z')).toBe('2026-06-01');
    expect(localDayKey('2026-06-01T22:30:00Z')).toBe('2026-06-02');
  });

  it('formats dates in French', () => {
    expect(formatDayShort('2026-10-05')).toBe('5 oct.');
    expect(formatDayLong('2026-10-05')).toBe('lundi 5 octobre');
  });

  it('displays instants in Europe/Paris', () => {
    expect(plain(formatDateTime('2026-09-13T07:43:00Z'))).toContain('09:43');
    expect(plain(formatDateTime('2026-12-13T07:43:00Z'))).toContain('08:43');
  });
});
