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

    @field_validator("timestamp_utc")
    @classmethod
    def _to_utc(cls, value: datetime) -> datetime:
        return value.astimezone(UTC)

    @property
    def total_power_w(self) -> float:
        """Sum of the three phases, in W."""
        return self.phase_a_power_w + self.phase_b_power_w + self.phase_c_power_w


class MinuteSeries(BaseModel):
    """Chronologically sorted readings of one device, without duplicate minutes."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    device_id: str = Field(description="Identifier of the meter that produced the readings.")
    readings: list[MinuteReading] = Field(min_length=1, description="Readings sorted by time.")
