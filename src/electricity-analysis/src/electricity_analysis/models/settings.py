"""Analysis settings shared by every layer."""

from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AnalysisSettings(BaseModel):
    """Tunable parameters of the analysis, with documented defaults."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    timezone: str = Field(default="Europe/Paris", description="IANA zone used for local days.")
    base_load_percentile: float = Field(
        default=5.0,
        gt=0,
        lt=100,
        description="Percentile of minute power (percent) that defines the base load.",
    )
    gap_threshold_minutes: int = Field(
        default=5,
        ge=1,
        description="A run of missing minutes is reported as a gap when strictly longer.",
    )
    complete_day_min_coverage_pct: float = Field(
        default=95.0,
        gt=0,
        le=100,
        description="Minimum minute coverage (percent) for a local day to count as complete.",
    )
    profile_band_lower_percentile: float = Field(
        default=25.0,
        ge=0,
        le=100,
        description="Lower edge (percent) of the daily-profile band, across days.",
    )
    profile_band_upper_percentile: float = Field(
        default=75.0,
        ge=0,
        le=100,
        description="Upper edge (percent) of the daily-profile band, across days.",
    )

    @model_validator(mode="after")
    def _band_edges_are_ordered(self) -> Self:
        if self.profile_band_lower_percentile >= self.profile_band_upper_percentile:
            message = "profile_band_lower_percentile must be below profile_band_upper_percentile"
            raise ValueError(message)
        return self
