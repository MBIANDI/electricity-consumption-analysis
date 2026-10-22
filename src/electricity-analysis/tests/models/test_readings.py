from electricity_analysis.models.readings import MinuteReading
from tests.fixtures.builders import utc


def _reading(a: float, b: float, c: float) -> MinuteReading:
    return MinuteReading(
        timestamp_utc=utc(2026, 6, 1),
        phase_a_power_w=0,
        phase_b_power_w=0,
        phase_c_power_w=0,
        voltage_a_v=a,
        voltage_b_v=b,
        voltage_c_v=c,
    )


def test_mean_voltage_averages_the_phases() -> None:
    assert _reading(230.0, 232.0, 234.0).mean_voltage_v == 232.0


def test_a_phase_at_zero_volt_is_not_measured_and_is_left_out() -> None:
    assert _reading(0.0, 0.0, 236.0).mean_voltage_v == 236.0
    assert _reading(230.0, 0.0, 232.0).mean_voltage_v == 231.0


def test_no_measured_phase_gives_no_voltage() -> None:
    assert _reading(0.0, 0.0, 0.0).mean_voltage_v is None
