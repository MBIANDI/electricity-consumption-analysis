"""Result models exposed to the frontend as `dashboard.json`."""

from datetime import date

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class _Result(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SourceInfo(_Result):
    """Where the data comes from."""

    device_id: str = Field(description="Identifier of the meter.")
    period_start_utc: AwareDatetime = Field(description="First minute of data, in UTC.")
    period_end_utc: AwareDatetime = Field(description="Last minute of data, in UTC.")
    timezone: str = Field(description="IANA zone used for local days and display.")


class PeakPower(_Result):
    """Highest minute-average power of the period."""

    power_kw: float = Field(description="Peak power, in kW.")
    timestamp_utc: AwareDatetime = Field(description="Start of the peak minute, in UTC.")
    timestamp_local: AwareDatetime = Field(description="Same instant in the local time zone.")


class ConsumptionSummary(_Result):
    """Headline figures of the period."""

    total_energy_kwh: float = Field(description="Energy over all observed minutes, in kWh.")
    average_daily_energy_kwh: float = Field(
        description="Mean daily energy over complete local days only, in kWh."
    )
    complete_days: int = Field(description="Number of local days used for the daily average.")
    peak: PeakPower
    base_load_w: float = Field(description="Base load: low percentile of minute power, in W.")
    peak_day: date = Field(description="Local day with the highest energy.")
    peak_day_energy_kwh: float = Field(description="Energy of the peak day, in kWh.")


class HourlyEnergyPoint(_Result):
    """Energy over one local hour."""

    start_utc: AwareDatetime = Field(description="Start of the hour, in UTC.")
    energy_kwh: float = Field(description="Energy of the observed minutes, in kWh.")
    observed_minutes: int = Field(description="Minutes with data in this hour (60 = complete).")


class DailyEnergyPoint(_Result):
    """Energy over one local day."""

    day: date = Field(description="Local calendar day.")
    energy_kwh: float = Field(description="Energy of the observed minutes, in kWh.")
    observed_minutes: int = Field(description="Minutes with data in this day.")
    expected_minutes: int = Field(description="Minutes in the local day (1380, 1440 or 1500).")


class ProfilePoint(_Result):
    """Mean power at one hour of the local day."""

    hour: int = Field(ge=0, le=23, description="Local hour of day.")
    mean_power_w: float = Field(description="Mean power over all observed minutes, in W.")


class DailyProfile(_Result):
    """Average daily profile, weekdays versus weekends."""

    weekday: list[ProfilePoint] = Field(description="Monday to Friday.")
    weekend: list[ProfilePoint] = Field(description="Saturday and Sunday.")


class DataGap(_Result):
    """A run of missing minutes."""

    start_utc: AwareDatetime = Field(description="First missing minute, in UTC.")
    end_utc: AwareDatetime = Field(description="Last missing minute, in UTC.")
    missing_minutes: int = Field(description="Number of missing minutes.")


class DataQuality(_Result):
    """How complete the data is. Gaps are reported, never filled."""

    expected_minutes: int = Field(description="Minutes between first and last reading, inclusive.")
    observed_minutes: int = Field(description="Minutes with a reading.")
    coverage_pct: float = Field(description="Observed over expected minutes, in percent.")
    gap_threshold_minutes: int = Field(description="Only gaps longer than this are listed.")
    gaps: list[DataGap] = Field(description="Gaps longer than the threshold, chronological.")


class DashboardData(_Result):
    """Everything the dashboard displays."""

    source: SourceInfo
    summary: ConsumptionSummary
    hourly: list[HourlyEnergyPoint]
    daily: list[DailyEnergyPoint]
    daily_profile: DailyProfile
    quality: DataQuality
