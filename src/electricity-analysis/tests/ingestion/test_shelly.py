from pathlib import Path

import pytest
from pydantic import ValidationError

from electricity_analysis.ingestion.shelly import IngestionError, read_shelly_file
from tests.fixtures.builders import utc

FIXTURES = Path(__file__).parent.parent / "fixtures"


def test_readings_are_sorted_and_phases_mapped() -> None:
    series = read_shelly_file(FIXTURES / "shelly_small.json")

    assert series.device_id == "shelly-test"
    assert [r.timestamp_utc for r in series.readings] == [
        utc(2026, 1, 1, 0, 0),
        utc(2026, 1, 1, 0, 1),
    ]
    assert [r.total_power_w for r in series.readings] == [10.0, 123.0]
    assert series.readings[1].phase_b_power_w == 20.0


def test_duplicate_minutes_are_rejected() -> None:
    with pytest.raises(IngestionError, match="duplicate"):
        read_shelly_file(FIXTURES / "shelly_duplicate.json")


def test_empty_file_is_rejected() -> None:
    with pytest.raises(IngestionError, match="no records"):
        read_shelly_file(FIXTURES / "shelly_empty.json")


def test_negative_power_is_rejected() -> None:
    with pytest.raises(ValidationError):
        read_shelly_file(FIXTURES / "shelly_negative.json")
