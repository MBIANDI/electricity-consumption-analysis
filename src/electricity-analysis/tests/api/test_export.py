import json
from pathlib import Path

from electricity_analysis.api.export import (
    DASHBOARD_FILE,
    SCHEMA_FILE,
    ExportRequest,
    export_dashboard,
)
from electricity_analysis.models.dashboard import DashboardData

FIXTURES = Path(__file__).parent.parent / "fixtures"


def test_export_writes_dashboard_and_matching_schema(tmp_path: Path) -> None:
    output = tmp_path / "out"

    result = export_dashboard(
        ExportRequest(input_path=FIXTURES / "shelly_small.json", output_dir=output)
    )

    assert result.dashboard_path == output / DASHBOARD_FILE
    assert result.schema_path == output / SCHEMA_FILE
    dashboard = DashboardData.model_validate_json(result.dashboard_path.read_text("utf-8"))
    assert dashboard.summary.total_energy_kwh == (10 + 123) / 1000 / 60
    assert json.loads(result.schema_path.read_text("utf-8")) == DashboardData.model_json_schema(
        mode="serialization"
    )
