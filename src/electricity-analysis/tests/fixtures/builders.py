"""Build small synthetic minute series for tests. Never real data."""

from datetime import UTC, datetime, timedelta

from electricity_analysis.models.readings import MinuteReading, MinuteSeries


def series_from_minutes(
    start_utc: datetime, minute_offsets: list[int], power_w: float, voltage_v: float = 230.0
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
                voltage_a_v=voltage_v,
                voltage_b_v=voltage_v,
                voltage_c_v=voltage_v,
            )
            for offset in minute_offsets
        ],
    )


def constant_series(start_utc: datetime, minutes: int, power_w: float) -> MinuteSeries:
    """Gap-free series of `minutes` consecutive minutes."""
    return series_from_minutes(start_utc, list(range(minutes)), power_w)


def utc(year: int, month: int, day: int, hour: int = 0, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=UTC)


def voltage_series(start_utc: datetime, volts_by_offset: dict[int, float]) -> MinuteSeries:
    """One reading per listed minute offset, the three phases all at the given voltage."""
    return MinuteSeries(
        device_id="test-device",
        readings=[
            MinuteReading(
                timestamp_utc=start_utc + timedelta(minutes=offset),
                phase_a_power_w=100,
                phase_b_power_w=0,
                phase_c_power_w=0,
                voltage_a_v=volts,
                voltage_b_v=volts,
                voltage_c_v=volts,
            )
            for offset, volts in sorted(volts_by_offset.items())
        ],
    )
