from datetime import date, timedelta

import pytest

from electricity_analysis.analysis.voltage import VoltageError, build_voltage_report
from electricity_analysis.models.settings import AnalysisSettings, VoltageSettings
from tests.fixtures.builders import utc, voltage_series

SETTINGS = AnalysisSettings()
START = utc(2026, 6, 1, 10)  # 12:00 in Paris (CEST)


def _flat(minutes: int, volts: float = 230.0) -> dict[int, float]:
    return dict.fromkeys(range(minutes), volts)


def test_limits_are_derived_from_the_nominal_value_and_tolerance() -> None:
    assert (VoltageSettings().nominal_v, VoltageSettings().tolerance_pct) == (220.0, 10.0)
    assert (VoltageSettings().lower_v, VoltageSettings().upper_v) == (198.0, 242.0)
    custom = VoltageSettings(nominal_v=230, tolerance_pct=5)
    assert (custom.lower_v, custom.upper_v) == (218.5, 241.5)


def test_values_exactly_on_the_limits_are_compliant() -> None:
    report = build_voltage_report(voltage_series(START, {0: 198.0, 1: 242.0, 2: 220.0}), SETTINGS)

    summary = report.summary
    assert (summary.time_below_range_min, summary.time_above_range_min) == (0, 0)
    assert summary.pct_time_in_range == 100.0
    assert summary.is_compliant
    assert report.excursions == []
    assert (summary.min_v, summary.max_v, summary.mean_v) == (198.0, 242.0, 220.0)


def test_just_outside_the_limits_is_a_non_conformity_in_each_direction() -> None:
    volts = {0: 197.9, 1: 230.0, 2: 230.0, 3: 230.0, 4: 230.0, 5: 230.0, 6: 242.1}
    report = build_voltage_report(voltage_series(START, volts), SETTINGS)

    assert not report.summary.is_compliant
    assert (report.summary.time_below_range_min, report.summary.time_above_range_min) == (1, 1)
    assert [(e.direction, e.worst_value_v, e.duration_min) for e in report.excursions] == [
        ("below", 197.9, 1),
        ("above", 242.1, 1),
    ]


def test_a_below_range_run_gives_one_excursion_with_paris_times() -> None:
    volts = {**_flat(30), 10: 190.0, 11: 185.0, 12: 187.5, 13: 192.0}
    report = build_voltage_report(voltage_series(START, volts), SETTINGS)

    [excursion] = report.excursions
    assert excursion.direction == "below"
    assert excursion.start_local == utc(2026, 6, 1, 10, 10)
    assert excursion.start_local.utcoffset() == timedelta(hours=2)
    assert excursion.start_local.hour == 12
    assert excursion.end_local == utc(2026, 6, 1, 10, 13)
    assert (excursion.duration_min, excursion.out_of_range_minutes) == (4, 4)
    assert excursion.worst_value_v == 185.0
    assert report.summary.time_below_range_min == 4
    assert report.summary.pct_time_in_range == (30 - 4) / 30 * 100


def test_an_above_range_run_reports_its_highest_value() -> None:
    volts = {**_flat(20), 5: 243.0, 6: 247.5, 7: 244.0}
    report = build_voltage_report(voltage_series(START, volts), SETTINGS)

    [excursion] = report.excursions
    assert (excursion.direction, excursion.worst_value_v, excursion.duration_min) == (
        "above",
        247.5,
        3,
    )
    assert report.summary.time_above_range_min == 3


def test_runs_separated_by_fewer_than_5_minutes_are_merged() -> None:
    # Out of range at minutes 0-2 and 7-9: 4 compliant minutes (3..6) in between.
    volts = {**_flat(15), 0: 190.0, 1: 190.0, 2: 190.0, 7: 180.0, 8: 190.0, 9: 190.0}
    report = build_voltage_report(voltage_series(START, volts), SETTINGS)

    [excursion] = report.excursions
    assert (excursion.duration_min, excursion.out_of_range_minutes) == (10, 6)
    assert excursion.worst_value_v == 180.0
    assert report.summary.excursion_count == 1


def test_runs_separated_by_5_minutes_or_more_stay_separate() -> None:
    # 5 compliant minutes (3..7) in between.
    volts = {**_flat(15), 0: 190.0, 1: 190.0, 2: 190.0, 8: 190.0, 9: 190.0, 10: 190.0}
    report = build_voltage_report(voltage_series(START, volts), SETTINGS)

    assert [e.duration_min for e in report.excursions] == [3, 3]
    assert report.summary.excursion_count == 2


def test_a_short_gap_between_two_runs_merges_them_and_is_not_counted_as_compliant() -> None:
    # Minutes 3..5 are missing: 3 minutes in between, so the runs merge.
    volts = {0: 190.0, 1: 190.0, 2: 190.0, 6: 190.0, 7: 190.0, 8: 230.0, 9: 230.0}
    report = build_voltage_report(voltage_series(START, volts), SETTINGS)

    [excursion] = report.excursions
    assert (excursion.duration_min, excursion.out_of_range_minutes) == (8, 5)
    assert report.summary.measured_minutes == 7
    assert report.summary.pct_time_in_range == 2 / 7 * 100


def test_a_long_gap_keeps_runs_separate_and_is_reported_as_coverage() -> None:
    volts = {0: 190.0, 1: 190.0, 12: 190.0, 13: 190.0}
    report = build_voltage_report(voltage_series(START, volts), SETTINGS)

    assert [e.duration_min for e in report.excursions] == [2, 2]
    summary = report.summary
    assert (summary.measured_minutes, summary.missing_minutes) == (4, 10)
    assert summary.coverage_pct == 4 / 14 * 100
    assert summary.pct_time_in_range == 0.0


def test_a_day_without_data_has_an_empty_point_and_is_not_interpolated() -> None:
    first = voltage_series(utc(2026, 6, 1, 10), {0: 230.0, 1: 250.0})  # 1 June
    third = voltage_series(utc(2026, 6, 3, 10), {0: 220.0, 1: 230.0})  # 3 June
    series = first.model_copy(update={"readings": first.readings + third.readings})

    daily = build_voltage_report(series, SETTINGS).daily

    assert [point.day for point in daily] == [date(2026, 6, 1), date(2026, 6, 2), date(2026, 6, 3)]
    assert (daily[0].min_v, daily[0].mean_v, daily[0].max_v) == (230.0, 240.0, 250.0)
    assert (daily[0].measured_minutes, daily[0].minutes_out_of_range) == (2, 1)
    assert (daily[1].min_v, daily[1].mean_v, daily[1].max_v) == (None, None, None)
    assert (daily[1].measured_minutes, daily[1].minutes_out_of_range) == (0, 0)
    assert (daily[2].min_v, daily[2].max_v) == (220.0, 230.0)


def test_dst_fall_back_day_is_one_local_day_of_1500_minutes() -> None:
    # 25 Oct 2026 in Paris runs from 22:00 UTC on the 24th for 1500 minutes.
    volts = {**_flat(750, 230.0), **dict.fromkeys(range(750, 1500), 250.0)}
    report = build_voltage_report(voltage_series(utc(2026, 10, 24, 22), volts), SETTINGS)

    [day] = report.daily
    assert day.day == date(2026, 10, 25)
    assert (day.measured_minutes, day.minutes_out_of_range) == (1500, 750)
    assert (day.min_v, day.mean_v, day.max_v) == (230.0, 240.0, 250.0)
    [excursion] = report.excursions
    assert excursion.duration_min == 750
    # Minute 750 is 10:30 UTC on the 25th: Paris is back on CET (UTC+1) by then.
    assert excursion.start_local.utcoffset() == timedelta(hours=1)


def test_hourly_series_gives_min_mean_max_per_utc_hour() -> None:
    volts = {**_flat(60), 5: 210.0, 6: 250.0, 60: 230.0, 61: 236.0}
    report = build_voltage_report(voltage_series(START, volts), SETTINGS)

    first, second = report.hourly
    assert first.start_utc == START
    assert (first.min_v, first.max_v) == (210.0, 250.0)
    assert second.start_utc == START + timedelta(hours=1)
    assert (second.min_v, second.mean_v, second.max_v) == (230.0, 233.0, 236.0)


def test_the_rule_comes_from_the_settings() -> None:
    settings = AnalysisSettings(voltage=VoltageSettings(nominal_v=230, tolerance_pct=5))

    report = build_voltage_report(voltage_series(START, {0: 218.4, 1: 218.5, 2: 241.5}), settings)

    assert report.settings.lower_v == 218.5
    assert [e.worst_value_v for e in report.excursions] == [218.4]


def test_a_series_without_any_usable_voltage_is_rejected() -> None:
    with pytest.raises(VoltageError, match="no usable voltage"):
        build_voltage_report(voltage_series(START, {0: 0.0, 1: 0.0}), SETTINGS)
