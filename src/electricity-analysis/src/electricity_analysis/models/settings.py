"""Analysis settings shared by every layer."""

from pydantic import BaseModel, ConfigDict, Field


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
