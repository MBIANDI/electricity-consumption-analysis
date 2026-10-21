"""Build small synthetic minute series for tests. Never real data."""

from datetime import UTC, datetime, timedelta

from electricity_analysis.models.readings import MinuteReading, MinuteSeries


def series_from_minutes(
    start_utc: datetime, minute_offsets: list[int], power_w: float
) -> MinuteSeries:
    """One reading per listed minute offset from `start_utc`, all at `power_w` on phase A."""
    return MinuteSeries(
        device_id="test-device",
        readings=[
            MinuteReading(
                timestamp_utc=start_utc + timedelta(minutes=offset),
                phase_a_power_w=power_w,
                phase_b_power_w=0,
                phase_c_power_w=0,
            )
            for offset in minute_offsets
        ],
    )


def constant_series(start_utc: datetime, minutes: int, power_w: float) -> MinuteSeries:
    """Gap-free series of `minutes` consecutive minutes."""
    return series_from_minutes(start_utc, list(range(minutes)), power_w)


def utc(year: int, month: int, day: int, hour: int = 0, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=UTC)
