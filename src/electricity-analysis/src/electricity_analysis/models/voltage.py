"""Result models of the supply-voltage quality section."""

from datetime import date
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from electricity_analysis.models.settings import VoltageSettings


class _Result(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class VoltageSummary(_Result):
    """Minute-by-minute check of the voltage against the client's rule, over measured minutes."""

    min_v: float = Field(description="Lowest minute voltage, in V.")
    max_v: float = Field(description="Highest minute voltage, in V.")
    mean_v: float = Field(description="Mean minute voltage, in V.")
    measured_minutes: int = Field(description="Minutes with a usable voltage (above 0 V).")
    missing_minutes: int = Field(
        description="Minutes between the first and last reading without a usable voltage."
    )
    coverage_pct: float = Field(description="Measured over expected minutes, in percent.")
    time_below_range_min: int = Field(
        description="Measured minutes strictly below the lower limit."
    )
    time_above_range_min: int = Field(
        description="Measured minutes strictly above the upper limit."
    )
    pct_time_in_range: float = Field(
        description="Measured minutes within the limits (inclusive), in percent of measured ones."
    )
    excursion_count: int = Field(description="Number of excursions, after merging close runs.")
    is_compliant: bool = Field(description="True when no measured minute is out of range.")


class VoltageDailyPoint(_Result):
    """Voltage over one local day. Values are `None` on a day without measurement."""

    day: date = Field(description="Local calendar day.")
    min_v: float | None = Field(description="Lowest minute voltage of the day, in V.")
    mean_v: float | None = Field(description="Mean minute voltage of the day, in V.")
    max_v: float | None = Field(description="Highest minute voltage of the day, in V.")
    measured_minutes: int = Field(description="Minutes with a usable voltage in the day.")
    minutes_out_of_range: int = Field(description="Measured minutes outside the limits.")


class VoltageHourlyPoint(_Result):
    """Voltage over one hour, for the zoomed detail of the chart."""

    start_utc: AwareDatetime = Field(description="Start of the hour, in UTC.")
    min_v: float = Field(description="Lowest minute voltage of the hour, in V.")
    mean_v: float = Field(description="Mean minute voltage of the hour, in V.")
    max_v: float = Field(description="Highest minute voltage of the hour, in V.")


class VoltageExcursion(_Result):
    """A run of out-of-range minutes in one direction, merged when separated by a short pause."""

    start_local: AwareDatetime = Field(description="First out-of-range minute, in Europe/Paris.")
    end_local: AwareDatetime = Field(description="Last out-of-range minute, in Europe/Paris.")
    duration_min: int = Field(description="Minutes from the first to the last out-of-range minute.")
    out_of_range_minutes: int = Field(description="Out-of-range measured minutes in the excursion.")
    direction: Literal["below", "above"] = Field(description="Side of the range that was crossed.")
    worst_value_v: float = Field(description="Lowest (below) or highest (above) voltage, in V.")


class VoltageQualityReport(_Result):
    """Everything the supply-voltage view displays."""

    settings: VoltageSettings
    summary: VoltageSummary
    daily: list[VoltageDailyPoint] = Field(description="One point per local day, chronological.")
    excursions: list[VoltageExcursion] = Field(description="Chronological.")
    hourly: list[VoltageHourlyPoint] = Field(description="Downsampled series, one point per hour.")
