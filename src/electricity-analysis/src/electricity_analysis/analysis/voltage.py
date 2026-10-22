"""Check the supply voltage against the client's rule, minute by minute.

Definitions
- The voltage of a minute is the mean of the phases measured that minute (above 0 V).
- A minute is out of range when it is strictly below the lower limit or strictly above the upper
  limit; the limits themselves are compliant.
- Minutes without a usable voltage are neither compliant nor non-compliant: they are reported as
  coverage and never interpolated.
- An excursion is a run of out-of-range minutes in one direction. Runs of the same direction
  separated by fewer than `excursion_merge_minutes` minutes (compliant or missing) are merged.
- This is not the formal EN 50160 assessment (10-minute means, 95 % of a week).
"""

from datetime import timedelta
from zoneinfo import ZoneInfo

import pandas as pd

from electricity_analysis.models.readings import MinuteSeries
from electricity_analysis.models.settings import AnalysisSettings, VoltageSettings
from electricity_analysis.models.voltage import (
    VoltageDailyPoint,
    VoltageExcursion,
    VoltageHourlyPoint,
    VoltageQualityReport,
    VoltageSummary,
)

_SECONDS_PER_MINUTE = 60
_PERCENT = 100


class VoltageError(ValueError):
    """The series holds no usable voltage."""


def build_voltage_report(series: MinuteSeries, settings: AnalysisSettings) -> VoltageQualityReport:
    """Summary, daily series, excursions and hourly series of the supply voltage."""
    rule = settings.voltage
    zone = ZoneInfo(settings.timezone)
    readings = [(r.timestamp_utc, r.mean_voltage_v) for r in series.readings]
    measured = [(utc, volts) for utc, volts in readings if volts is not None]
    if not measured:
        raise VoltageError("the series holds no usable voltage (every phase reads 0 V)")

    frame = pd.DataFrame(
        {
            "utc": pd.to_datetime([utc for utc, _ in measured], utc=True),
            "voltage_v": [volts for _, volts in measured],
        }
    )
    frame["below"] = frame["voltage_v"] < rule.lower_v
    frame["above"] = frame["voltage_v"] > rule.upper_v
    expected = int((readings[-1][0] - readings[0][0]).total_seconds() // _SECONDS_PER_MINUTE) + 1

    excursions = sorted(
        [
            *_excursions(frame, "below", rule, zone),
            *_excursions(frame, "above", rule, zone),
        ],
        key=lambda excursion: excursion.start_local,
    )
    return VoltageQualityReport(
        settings=rule,
        summary=_summary(frame, expected, len(excursions)),
        daily=_daily_points(frame, zone),
        excursions=excursions,
        hourly=_hourly_points(frame),
    )


def _summary(frame: pd.DataFrame, expected: int, excursion_count: int) -> VoltageSummary:
    measured = len(frame)
    below = int(frame["below"].sum())
    above = int(frame["above"].sum())
    return VoltageSummary(
        min_v=float(frame["voltage_v"].min()),
        max_v=float(frame["voltage_v"].max()),
        mean_v=float(frame["voltage_v"].mean()),
        measured_minutes=measured,
        missing_minutes=expected - measured,
        coverage_pct=measured / expected * _PERCENT,
        time_below_range_min=below,
        time_above_range_min=above,
        pct_time_in_range=(measured - below - above) / measured * _PERCENT,
        excursion_count=excursion_count,
        is_compliant=below + above == 0,
    )


def _daily_points(frame: pd.DataFrame, zone: ZoneInfo) -> list[VoltageDailyPoint]:
    days = frame["utc"].dt.tz_convert(zone).dt.date
    out_of_range = frame["below"] | frame["above"]
    grouped = frame.assign(day=days, out=out_of_range).groupby("day")
    stats = grouped["voltage_v"].agg(["min", "mean", "max", "size"])
    out_counts = grouped["out"].sum()

    points: list[VoltageDailyPoint] = []
    day = days.iloc[0]
    while day <= days.iloc[-1]:
        if day in stats.index:
            row = stats.loc[day]
            points.append(
                VoltageDailyPoint(
                    day=day,
                    min_v=float(row["min"]),
                    mean_v=float(row["mean"]),
                    max_v=float(row["max"]),
                    measured_minutes=int(row["size"]),
                    minutes_out_of_range=int(out_counts.loc[day]),
                )
            )
        else:
            points.append(
                VoltageDailyPoint(
                    day=day,
                    min_v=None,
                    mean_v=None,
                    max_v=None,
                    measured_minutes=0,
                    minutes_out_of_range=0,
                )
            )
        day += timedelta(days=1)
    return points


def _hourly_points(frame: pd.DataFrame) -> list[VoltageHourlyPoint]:
    grouped = frame.groupby(frame["utc"].dt.floor("h"))["voltage_v"].agg(["min", "mean", "max"])
    return [
        VoltageHourlyPoint(
            start_utc=start.to_pydatetime(),
            min_v=float(row["min"]),
            mean_v=float(row["mean"]),
            max_v=float(row["max"]),
        )
        for start, row in grouped.iterrows()
    ]


def _excursions(
    frame: pd.DataFrame, direction: str, rule: VoltageSettings, zone: ZoneInfo
) -> list[VoltageExcursion]:
    flagged = frame.loc[frame[direction], ["utc", "voltage_v"]]
    runs: list[list[tuple[pd.Timestamp, float]]] = []
    for utc, volts in zip(flagged["utc"], flagged["voltage_v"], strict=True):
        if runs:
            previous = runs[-1][-1][0]
            between = int((utc - previous).total_seconds() // _SECONDS_PER_MINUTE) - 1
            if between < rule.excursion_merge_minutes:
                runs[-1].append((utc, float(volts)))
                continue
        runs.append([(utc, float(volts))])

    pick = min if direction == "below" else max
    return [
        VoltageExcursion(
            start_local=run[0][0].to_pydatetime().astimezone(zone),
            end_local=run[-1][0].to_pydatetime().astimezone(zone),
            duration_min=int((run[-1][0] - run[0][0]).total_seconds() // _SECONDS_PER_MINUTE) + 1,
            out_of_range_minutes=len(run),
            direction="below" if direction == "below" else "above",
            worst_value_v=pick(volts for _, volts in run),
        )
        for run in runs
    ]
