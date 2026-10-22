import pytest
from pydantic import ValidationError

from electricity_analysis.models.settings import AnalysisSettings


def test_profile_band_defaults_to_the_interquartile_range() -> None:
    settings = AnalysisSettings()

    assert (settings.profile_band_lower_percentile, settings.profile_band_upper_percentile) == (
        25.0,
        75.0,
    )


def test_profile_band_edges_must_be_ordered() -> None:
    with pytest.raises(ValidationError, match="must be below"):
        AnalysisSettings(profile_band_lower_percentile=60, profile_band_upper_percentile=60)
