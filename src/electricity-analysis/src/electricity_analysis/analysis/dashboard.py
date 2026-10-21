"""Compute the dashboard figures from validated minute readings.

Definitions
- Power is the sum of the three phases, in W; energy per minute is `W / 1000 / 60` kWh.
- Days are Europe/Paris local days (configurable); timestamps stay in UTC otherwise.
- Gaps are reported, never interpolated: missing minutes contribute no energy.
"""

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pandas as pd

from electricity_analysis.models.dashboard import (
    ConsumptionSummary,
    DailyEnergyPoint,
    DailyProfile,
    DashboardData,
    DataGap,
    DataQuality,
    HourlyEnergyPoint,
    PeakPower,
    ProfilePoint,
    SourceInfo,
)
from electricity_analysis.models.readings import MinuteSeries
from electricity_analysis.models.settings import AnalysisSettings

_MINUTES_PER_HOUR = 60
_WATTS_PER_KILOWATT = 1000
_FIRST_WEEKEND_DAY = 5  # Saturday, with Monday = 0


def build_dashboard(series: MinuteSeries, settings: AnalysisSettings) -> DashboardData:
    """Aggregate a minute series into every figure shown by the dashboard."""
    zone = ZoneInfo(settings.timezone)
    frame = pd.DataFrame(
        {
            "utc": pd.to_datetime([r.timestamp_utc for r in series.readings], utc=True),
            "power_w": [r.total_power_w for r in series.readings],
        }
    )
    frame["energy_kwh"] = frame["power_w"] / _WATTS_PER_KILOWATT / _MINUTES_PER_HOUR
    local = frame["utc"].dt.tz_convert(settings.timezone)

    daily = _daily_points(frame, local, zone)
    return DashboardData(
        source=SourceInfo(
            device_id=series.device_id,
            period_start_utc=series.readings[0].timestamp_utc,
            period_end_utc=series.readings[-1].timestamp_utc,
            timezone=settings.timezone,
        ),
        summary=_summary(frame, daily, settings),
        hourly=_hourly_points(frame),
        daily=daily,
        daily_profile=_daily_profile(frame, local),
        quality=_quality(frame, settings),
    )


def _summary(
    frame: pd.DataFrame, daily: list[DailyEnergyPoint], settings: AnalysisSettings
) -> ConsumptionSummary:
    peak_row = frame.loc[frame["power_w"].idxmax()]
    peak_utc: datetime = peak_row["utc"].to_pydatetime()
    complete = [
        point
        for point in daily
        if point.observed_minutes / point.expected_minutes * 100
        >= settings.complete_day_min_coverage_pct
    ]
    peak_day = max(daily, key=lambda point: point.energy_kwh)
    return ConsumptionSummary(
        total_energy_kwh=float(frame["energy_kwh"].sum()),
        average_daily_energy_kwh=sum(p.energy_kwh for p in complete) / len(complete)
        if complete
        else 0.0,
        complete_days=len(complete),
        peak=PeakPower(
            power_kw=float(peak_row["power_w"]) / _WATTS_PER_KILOWATT,
            timestamp_utc=peak_utc,
            timestamp_local=peak_utc.astimezone(ZoneInfo(settings.timezone)),
        ),
        base_load_w=float(frame["power_w"].quantile(settings.base_load_percentile / 100)),
        peak_day=peak_day.day,
        peak_day_energy_kwh=peak_day.energy_kwh,
    )


def _hourly_points(frame: pd.DataFrame) -> list[HourlyEnergyPoint]:
    # Paris offsets are whole hours, so a UTC hour is also a local hour.
    grouped = frame.groupby(frame["utc"].dt.floor("h")).agg(
        energy_kwh=("energy_kwh", "sum"), observed_minutes=("energy_kwh", "size")
    )
    return [
        HourlyEnergyPoint(
            start_utc=start.to_pydatetime(),
            energy_kwh=float(row.energy_kwh),
            observed_minutes=int(row.observed_minutes),
        )
        for start, row in grouped.iterrows()
    ]


def _daily_points(frame: pd.DataFrame, local: pd.Series, zone: ZoneInfo) -> list[DailyEnergyPoint]:
    grouped = frame.groupby(local.dt.date).agg(
        energy_kwh=("energy_kwh", "sum"), observed_minutes=("energy_kwh", "size")
    )
    return [
        DailyEnergyPoint(
            day=day,
            energy_kwh=float(row.energy_kwh),
            observed_minutes=int(row.observed_minutes),
            expected_minutes=_minutes_in_local_day(day, zone),
        )
        for day, row in grouped.iterrows()
    ]


def _minutes_in_local_day(day: date, zone: ZoneInfo) -> int:
    """Length of a local day in minutes: 1380 and 1500 on DST change days."""
    start = datetime.combine(day, time(), tzinfo=zone).astimezone(UTC)
    end = datetime.combine(day + timedelta(days=1), time(), tzinfo=zone).astimezone(UTC)
    return int((end - start).total_seconds() // _MINUTES_PER_HOUR)


def _daily_profile(frame: pd.DataFrame, local: pd.Series) -> DailyProfile:
    is_weekend = local.dt.dayofweek >= _FIRST_WEEKEND_DAY
    means = frame.groupby([is_weekend, local.dt.hour])["power_w"].mean()

    def points(weekend: bool) -> list[ProfilePoint]:
        return [
            ProfilePoint(hour=int(hour), mean_power_w=float(value))
            for (flag, hour), value in means.items()
            if flag == weekend
        ]

    return DailyProfile(weekday=points(weekend=False), weekend=points(weekend=True))


def _quality(frame: pd.DataFrame, settings: AnalysisSettings) -> DataQuality:
    utc = frame["utc"]
    observed = len(frame)
    expected = int((utc.iloc[-1] - utc.iloc[0]).total_seconds() // _MINUTES_PER_HOUR) + 1
    missing = utc.diff().dt.total_seconds() // _MINUTES_PER_HOUR - 1
    gaps = [
        DataGap(
            start_utc=(utc.iloc[i - 1] + pd.Timedelta(minutes=1)).to_pydatetime(),
            end_utc=(utc.iloc[i] - pd.Timedelta(minutes=1)).to_pydatetime(),
            missing_minutes=int(missing.iloc[i]),
        )
        for i in missing.index[missing > settings.gap_threshold_minutes]
    ]
    return DataQuality(
        expected_minutes=expected,
        observed_minutes=observed,
        coverage_pct=observed / expected * 100,
        gap_threshold_minutes=settings.gap_threshold_minutes,
        gaps=gaps,
    )
