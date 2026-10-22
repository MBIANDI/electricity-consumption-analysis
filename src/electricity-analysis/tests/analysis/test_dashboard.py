from datetime import date, timedelta

import pytest

from electricity_analysis.analysis.dashboard import build_dashboard
from electricity_analysis.models.readings import MinuteSeries
from electricity_analysis.models.settings import AnalysisSettings
from tests.fixtures.builders import constant_series, series_from_minutes, utc

SETTINGS = AnalysisSettings()


def test_constant_power_gives_exact_energy_and_peak() -> None:
    # 600 W for two hours is exactly 1.2 kWh. 10:00 UTC is 12:00 in Paris (CEST).
    result = build_dashboard(constant_series(utc(2026, 6, 1, 10), 120, 600), SETTINGS)

    assert result.summary.total_energy_kwh == pytest.approx(1.2)
    assert result.summary.peak.power_kw == pytest.approx(0.6)
    assert result.summary.peak.timestamp_utc == utc(2026, 6, 1, 10)
    assert result.summary.peak.timestamp_local.hour == 12
    assert result.summary.peak.timestamp_local.utcoffset() == timedelta(hours=2)
    assert [p.energy_kwh for p in result.hourly] == [pytest.approx(0.6), pytest.approx(0.6)]
    assert [p.observed_minutes for p in result.hourly] == [60, 60]


def test_base_load_is_fifth_percentile_with_linear_interpolation() -> None:
    low = constant_series(utc(2026, 6, 1, 10), 5, 100)
    high = constant_series(utc(2026, 6, 1, 10, 5), 95, 1000)
    series = MinuteSeries(device_id="d", readings=low.readings + high.readings)

    result = build_dashboard(series, SETTINGS)

    # Sorted position 0.05 * 99 = 4.95: 100 + 0.95 * (1000 - 100).
    assert result.summary.base_load_w == pytest.approx(955.0)


def test_energy_is_split_across_local_midnight() -> None:
    # 21:30 UTC is 23:30 in Paris: 30 minutes on 1 June, 30 minutes on 2 June.
    result = build_dashboard(constant_series(utc(2026, 6, 1, 21, 30), 60, 600), SETTINGS)

    assert [(p.day, p.observed_minutes) for p in result.daily] == [
        (date(2026, 6, 1), 30),
        (date(2026, 6, 2), 30),
    ]
    assert [p.energy_kwh for p in result.daily] == [pytest.approx(0.3), pytest.approx(0.3)]


def test_dst_fall_back_day_has_25_hours() -> None:
    # 25 Oct 2026 in Paris runs from 22:00 UTC on the 24th for 1500 minutes.
    result = build_dashboard(constant_series(utc(2026, 10, 24, 22), 1500, 1200), SETTINGS)

    [day] = result.daily
    assert day.day == date(2026, 10, 25)
    assert (day.observed_minutes, day.expected_minutes) == (1500, 1500)
    assert day.energy_kwh == pytest.approx(30.0)
    assert len(result.hourly) == 25
    assert all(p.energy_kwh == pytest.approx(1.2) for p in result.hourly)
    assert result.quality.coverage_pct == 100.0


def test_dst_spring_forward_day_has_23_hours() -> None:
    result = build_dashboard(constant_series(utc(2026, 3, 28, 23), 1380, 1000), SETTINGS)

    [day] = result.daily
    assert day.day == date(2026, 3, 29)
    assert (day.observed_minutes, day.expected_minutes) == (1380, 1380)
    assert day.energy_kwh == pytest.approx(23.0)


def test_gap_longer_than_threshold_is_reported_and_not_filled() -> None:
    # Minutes 10..17 are missing (8 minutes); 3 readings follow.
    start = utc(2026, 6, 1, 10)
    series = series_from_minutes(start, [*range(10), 18, 19, 20], 600)

    result = build_dashboard(series, SETTINGS)

    [gap] = result.quality.gaps
    assert gap.start_utc == start + timedelta(minutes=10)
    assert gap.end_utc == start + timedelta(minutes=17)
    assert gap.missing_minutes == 8
    assert (result.quality.observed_minutes, result.quality.expected_minutes) == (13, 21)
    assert result.quality.coverage_pct == pytest.approx(13 / 21 * 100)
    assert result.summary.total_energy_kwh == pytest.approx(13 * 0.6 / 60)


def test_gap_of_exactly_threshold_is_not_listed() -> None:
    series = series_from_minutes(utc(2026, 6, 1, 10), [*range(5), *range(10, 13)], 600)

    result = build_dashboard(series, SETTINGS)

    assert result.quality.gaps == []
    assert result.quality.observed_minutes == 8


def test_average_daily_energy_uses_complete_days_only() -> None:
    day_one = constant_series(utc(2026, 5, 31, 22), 1440, 1000)  # 1 June, 24 kWh
    day_two = constant_series(utc(2026, 6, 1, 22), 1440, 2000)  # 2 June, 48 kWh
    partial = constant_series(utc(2026, 6, 2, 22), 120, 1000)  # 3 June, 2 kWh, incomplete
    series = MinuteSeries(
        device_id="d", readings=day_one.readings + day_two.readings + partial.readings
    )

    summary = build_dashboard(series, SETTINGS).summary

    assert summary.total_energy_kwh == pytest.approx(74.0)
    assert summary.complete_days == 2
    assert summary.average_daily_energy_kwh == pytest.approx(36.0)
    assert summary.peak_day == date(2026, 6, 2)
    assert summary.peak_day_energy_kwh == pytest.approx(48.0)


def test_profile_separates_weekdays_and_weekends() -> None:
    saturday = constant_series(utc(2026, 10, 24, 10), 60, 2000)  # 12:00 Paris
    monday = constant_series(utc(2026, 10, 26, 10), 60, 500)  # 11:00 Paris (CET)
    series = MinuteSeries(device_id="d", readings=saturday.readings + monday.readings)

    profile = build_dashboard(series, SETTINGS).daily_profile

    assert [(p.hour, p.mean_power_w) for p in profile.weekend] == [(12, 2000.0)]
    assert [(p.hour, p.mean_power_w) for p in profile.weekday] == [(11, 500.0)]


def _readings(*day_series: MinuteSeries) -> MinuteSeries:
    return MinuteSeries(
        device_id="d", readings=[reading for part in day_series for reading in part.readings]
    )


def test_profile_band_is_the_25th_to_75th_percentile_across_days() -> None:
    # Mon 5 to Thu 8 Oct 2026 at 12:00 Paris (10:00 UTC, CEST): day means 100, 200, 300, 500 W.
    # Linear interpolation: p25 at position 0.75 = 175 W, p75 at position 2.25 = 350 W.
    weekdays = [
        constant_series(utc(2026, 10, day, 10), 60, power)
        for day, power in [(5, 100), (6, 200), (7, 300), (8, 500)]
    ]
    saturday = constant_series(utc(2026, 10, 10, 10), 60, 1000)

    profile = build_dashboard(_readings(*weekdays, saturday), SETTINGS).daily_profile

    [weekday] = profile.weekday
    assert (weekday.hour, weekday.mean_power_w) == (12, 275.0)
    assert (weekday.band_lower_power_w, weekday.band_upper_power_w) == (175.0, 350.0)
    [weekend] = profile.weekend
    assert (weekend.band_lower_power_w, weekend.band_upper_power_w) == (1000.0, 1000.0)


def test_profile_band_uses_one_value_per_day_not_per_minute() -> None:
    # One day has 30 minutes at 100 W then 30 at 300 W in the same hour: its hour mean is 200 W.
    # Another day is constant 600 W. Per-minute percentiles would give 100 and 600 at the edges;
    # per-day values [200, 600] give p25 = 300 W and p75 = 500 W.
    first = _readings(
        constant_series(utc(2026, 10, 5, 10), 30, 100),
        constant_series(utc(2026, 10, 5, 10, 30), 30, 300),
    )
    second = constant_series(utc(2026, 10, 6, 10), 60, 600)

    [point] = build_dashboard(_readings(first, second), SETTINGS).daily_profile.weekday

    assert (point.band_lower_power_w, point.band_upper_power_w) == (300.0, 500.0)


def test_profile_counts_the_local_days_averaged_in_each_group() -> None:
    # Mon 5 and Tue 6 Oct have data in two different hours each; Sat 10 has one hour;
    # Sun 11 is absent. A day is counted once however many hours it has.
    monday = _readings(
        constant_series(utc(2026, 10, 5, 8), 60, 100),
        constant_series(utc(2026, 10, 5, 13), 60, 100),
    )
    tuesday = _readings(
        constant_series(utc(2026, 10, 6, 8), 60, 100),
        constant_series(utc(2026, 10, 6, 13), 60, 100),
    )
    saturday = constant_series(utc(2026, 10, 10, 8), 60, 100)

    profile = build_dashboard(_readings(monday, tuesday, saturday), SETTINGS).daily_profile

    assert (profile.weekday_days, profile.weekend_days) == (2, 1)


def test_profile_assigns_days_by_paris_local_date() -> None:
    # 22:30 UTC on Friday 9 Oct is 00:30 on Saturday 10 Oct in Paris: a weekend day, not a weekday.
    series = constant_series(utc(2026, 10, 9, 22, 30), 30, 100)

    profile = build_dashboard(series, SETTINGS).daily_profile

    assert (profile.weekday_days, profile.weekend_days) == (0, 1)
    assert profile.weekday == []
