/** French (fr-FR) formatting of numbers, units and Europe/Paris dates. */

export const DISPLAY_TIMEZONE = 'Europe/Paris';
const LOCALE = 'fr-FR';
// No-break space between a number and its unit; Georgia and Arial both have a glyph for it.
const NBSP = String.fromCharCode(0xa0);
const MINUTES_PER_HOUR = 60;
const WATTS_PER_KILOWATT = 1000;

function number(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Number in fr-FR, at most two decimals (axis ticks). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(value);
}

export function formatKwh(value: number, fractionDigits = 1): string {
  return `${number(value, fractionDigits)}${NBSP}kWh`;
}

export function formatKw(value: number, fractionDigits = 1): string {
  return `${number(value, fractionDigits)}${NBSP}kW`;
}

/** `+0,7 kW`, with an explicit sign unless the value is zero. */
export function formatKwDelta(value: number, fractionDigits = 1): string {
  const signed = new Intl.NumberFormat(LOCALE, {
    signDisplay: 'exceptZero',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return `${signed}${NBSP}kW`;
}

export function formatWatts(value: number): string {
  return `${number(value, 0)}${NBSP}W`;
}

export function wattsToKilowatts(value: number): number {
  return value / WATTS_PER_KILOWATT;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${number(value, fractionDigits)}${NBSP}%`;
}

/** `19 h` */
export function formatHour(hour: number): string {
  return `${hour}${NBSP}h`;
}

/** `20 h 09` or `39 min` */
export function formatDuration(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes}${NBSP}min`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = String(minutes % MINUTES_PER_HOUR).padStart(2, '0');
  return `${hours}${NBSP}h${NBSP}${rest}`;
}

/** Local day key `YYYY-MM-DD` of an instant, in Europe/Paris. */
export function localDayKey(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: DISPLAY_TIMEZONE }).format(new Date(iso));
}

/** Date-only strings are anchored at noon UTC so no zone can shift the calendar day. */
function dayAsDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

/** `5 oct.` */
export function formatDayShort(day: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: DISPLAY_TIMEZONE,
  }).format(dayAsDate(day));
}

/** `lundi 5 octobre` */
export function formatDayLong(day: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: DISPLAY_TIMEZONE,
  }).format(dayAsDate(day));
}

/** `13 sept. 2026, 09:43` in Europe/Paris. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIMEZONE,
  }).format(new Date(iso));
}

/** `13 sept., 09 h` in Europe/Paris, for hourly axis labels. */
export function formatHourLabel(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIMEZONE,
  }).format(new Date(iso));
}

/** `31 août – 15 oct. 2026` */
export function formatPeriod(startIso: string, endIso: string): string {
  const start = new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: DISPLAY_TIMEZONE,
  }).format(new Date(startIso));
  const end = new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: DISPLAY_TIMEZONE,
  }).format(new Date(endIso));
  return `${start} – ${end}`;
}
