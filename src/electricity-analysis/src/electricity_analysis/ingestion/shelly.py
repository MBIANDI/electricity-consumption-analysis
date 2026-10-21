"""Read and validate Shelly minute-level JSON exports."""

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from electricity_analysis.models.readings import MinuteReading, MinuteSeries


class IngestionError(ValueError):
    """The input file is not a usable Shelly export."""


class _ShellyRecord(BaseModel):
    """One raw record. Unused columns are ignored: only what the analysis needs is validated."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    device_id: str
    timestamp_utc: str
    phase_a_power_w: float = Field(alias="a_act_power_moy_w_derive")
    phase_b_power_w: float = Field(alias="b_act_power_moy_w_derive")
    phase_c_power_w: float = Field(alias="c_act_power_moy_w_derive")


_RECORDS = TypeAdapter(list[_ShellyRecord])


def read_shelly_file(path: Path) -> MinuteSeries:
    """Validate a Shelly export and return its readings sorted by time.

    `minute_locale` is ignored: it is a fixed UTC+1 and not Europe/Paris.
    Raises `IngestionError` on empty input, mixed devices or duplicate minutes.
    """
    records = _RECORDS.validate_json(path.read_bytes())
    if not records:
        raise IngestionError(f"{path} contains no records")

    devices = {record.device_id for record in records}
    if len(devices) != 1:
        raise IngestionError(f"{path} mixes several devices: {sorted(devices)}")

    readings = sorted(
        (
            MinuteReading(
                timestamp_utc=record.timestamp_utc,
                phase_a_power_w=record.phase_a_power_w,
                phase_b_power_w=record.phase_b_power_w,
                phase_c_power_w=record.phase_c_power_w,
            )
            for record in records
        ),
        key=lambda reading: reading.timestamp_utc,
    )
    timestamps = [reading.timestamp_utc for reading in readings]
    if len(set(timestamps)) != len(timestamps):
        raise IngestionError(f"{path} contains duplicate minutes")

    return MinuteSeries(device_id=devices.pop(), readings=readings)
