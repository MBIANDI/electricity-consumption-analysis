"""Validated minute-level readings, as produced by the ingestion layer."""

from datetime import UTC, datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator


class MinuteReading(BaseModel):
    """Mean active power of each phase over one minute."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    timestamp_utc: AwareDatetime = Field(description="Start of the minute, in UTC.")
    phase_a_power_w: float = Field(ge=0, description="Mean active power of phase A, in W.")
    phase_b_power_w: float = Field(ge=0, description="Mean active power of phase B, in W.")
    phase_c_power_w: float = Field(ge=0, description="Mean active power of phase C, in W.")
    voltage_a_v: float = Field(ge=0, description="Mean voltage of phase A, in V. 0 = not measured.")
    voltage_b_v: float = Field(ge=0, description="Mean voltage of phase B, in V. 0 = not measured.")
    voltage_c_v: float = Field(ge=0, description="Mean voltage of phase C, in V. 0 = not measured.")

    @field_validator("timestamp_utc")
    @classmethod
    def _to_utc(cls, value: datetime) -> datetime:
        return value.astimezone(UTC)

    @property
    def total_power_w(self) -> float:
        """Sum of the three phases, in W."""
        return self.phase_a_power_w + self.phase_b_power_w + self.phase_c_power_w

    @property
    def mean_voltage_v(self) -> float | None:
        """Mean of the phases that were measured (above 0 V), or `None` if none was.

        The meter reports 0 V for a phase it did not measure (start-up), which is not an outage.
        """
        measured = [v for v in (self.voltage_a_v, self.voltage_b_v, self.voltage_c_v) if v > 0]
        return sum(measured) / len(measured) if measured else None


class MinuteSeries(BaseModel):
    """Chronologically sorted readings of one device, without duplicate minutes."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    device_id: str = Field(description="Identifier of the meter that produced the readings.")
    readings: list[MinuteReading] = Field(min_length=1, description="Readings sorted by time.")
