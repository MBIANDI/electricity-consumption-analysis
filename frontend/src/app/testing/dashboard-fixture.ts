import { DashboardData } from '@models/dashboard';

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
  };
}
