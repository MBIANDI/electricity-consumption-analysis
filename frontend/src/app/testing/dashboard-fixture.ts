import { DashboardData, VoltageQualityReport } from '@models/dashboard';

const VOLTAGE_SETTINGS = {
  nominal_v: 220,
  tolerance_pct: 10,
  excursion_merge_minutes: 5,
  lower_v: 198,
  upper_v: 242,
};

/** Voltage report with one sag below 198 V and one swell above 242 V. */
export function makeNonCompliantVoltage(): VoltageQualityReport {
  return {
    settings: VOLTAGE_SETTINGS,
    summary: {
      min_v: 190.5,
      max_v: 245.5,
      mean_v: 229.25,
      measured_minutes: 2740,
      missing_minutes: 140,
      coverage_pct: 95.1,
      time_below_range_min: 12,
      time_above_range_min: 3,
      pct_time_in_range: 99.5,
      excursion_count: 2,
      is_compliant: false,
    },
    daily: [
      { day: '2026-06-01', min_v: 190.5, mean_v: 228, max_v: 236, measured_minutes: 1300, minutes_out_of_range: 12 },
      { day: '2026-06-02', min_v: 226, mean_v: 231, max_v: 245.5, measured_minutes: 1440, minutes_out_of_range: 3 },
    ],
    excursions: [
      {
        start_local: '2026-06-01T12:10:00+02:00',
        end_local: '2026-06-01T12:21:00+02:00',
        duration_min: 12,
        out_of_range_minutes: 12,
        direction: 'below',
        worst_value_v: 190.5,
      },
      {
        start_local: '2026-06-02T19:00:00+02:00',
        end_local: '2026-06-02T19:02:00+02:00',
        duration_min: 3,
        out_of_range_minutes: 3,
        direction: 'above',
        worst_value_v: 245.5,
      },
    ],
    hourly: [
      { start_utc: '2026-06-01T10:00:00Z', min_v: 190.5, mean_v: 226, max_v: 236 },
      { start_utc: '2026-06-02T17:00:00Z', min_v: 226, mean_v: 233, max_v: 245.5 },
    ],
  };
}

/** Voltage report that never leaves the 198-242 V range. */
export function makeCompliantVoltage(): VoltageQualityReport {
  const base = makeNonCompliantVoltage();
  return {
    ...base,
    summary: {
      ...base.summary,
      min_v: 205,
      max_v: 238.5,
      time_below_range_min: 0,
      time_above_range_min: 0,
      pct_time_in_range: 100,
      excursion_count: 0,
      is_compliant: true,
    },
    daily: base.daily.map((day) => ({ ...day, minutes_out_of_range: 0 })),
    excursions: [],
  };
}

/** Small synthetic dashboard. Never real data. */
export function makeDashboard(): DashboardData {
  return {
    source: {
      device_id: 'test-device',
      period_start_utc: '2026-06-01T08:00:00Z',
      period_end_utc: '2026-06-02T21:59:00Z',
      timezone: 'Europe/Paris',
    },
    summary: {
      total_energy_kwh: 74,
      average_daily_energy_kwh: 36,
      complete_days: 2,
      peak: {
        power_kw: 2.4,
        timestamp_utc: '2026-06-02T17:00:00Z',
        timestamp_local: '2026-06-02T19:00:00+02:00',
      },
      base_load_w: 300,
      peak_day: '2026-06-02',
      peak_day_energy_kwh: 48,
    },
    hourly: [
      { start_utc: '2026-06-01T08:00:00Z', energy_kwh: 0.5, observed_minutes: 60 },
      { start_utc: '2026-06-02T17:00:00Z', energy_kwh: 2.4, observed_minutes: 60 },
      { start_utc: '2026-06-02T21:00:00Z', energy_kwh: 0.7, observed_minutes: 59 },
    ],
    daily: [
      { day: '2026-06-01', energy_kwh: 26, observed_minutes: 1300, expected_minutes: 1440 },
      { day: '2026-06-02', energy_kwh: 48, observed_minutes: 1440, expected_minutes: 1440 },
    ],
    daily_profile: {
      weekday: [
        { hour: 7, mean_power_w: 900, band_lower_power_w: 800, band_upper_power_w: 1000 },
        { hour: 19, mean_power_w: 1700, band_lower_power_w: 1500, band_upper_power_w: 1900 },
      ],
      weekend: [
        { hour: 12, mean_power_w: 1300, band_lower_power_w: 1200, band_upper_power_w: 1400 },
        { hour: 20, mean_power_w: 1000, band_lower_power_w: 900, band_upper_power_w: 1100 },
      ],
      weekday_days: 32,
      weekend_days: 13,
    },
    quality: {
      expected_minutes: 2880,
      observed_minutes: 2740,
      coverage_pct: 95.1,
      gap_threshold_minutes: 5,
      gaps: [
        {
          start_utc: '2026-06-01T10:00:00Z',
          end_utc: '2026-06-01T10:39:00Z',
          missing_minutes: 40,
        },
        {
          start_utc: '2026-06-01T14:00:00Z',
          end_utc: '2026-06-01T23:09:00Z',
          missing_minutes: 550,
        },
      ],
    },
    voltage: makeNonCompliantVoltage(),
  };
}
