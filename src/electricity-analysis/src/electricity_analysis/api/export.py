"""Export the dashboard data and its JSON Schema for the frontend."""

import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from electricity_analysis.analysis.dashboard import build_dashboard
from electricity_analysis.ingestion.shelly import read_shelly_file
from electricity_analysis.models.dashboard import DashboardData
from electricity_analysis.models.settings import AnalysisSettings

DASHBOARD_FILE = "dashboard.json"
SCHEMA_FILE = "dashboard.schema.json"


class ExportRequest(BaseModel):
    """Where to read from and write to."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    input_path: Path = Field(description="Shelly minute-level JSON file.")
    output_dir: Path = Field(description="Directory receiving the dashboard files.")
    settings: AnalysisSettings = Field(default_factory=AnalysisSettings)


class ExportResult(BaseModel):
    """Files written by an export."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    dashboard_path: Path = Field(description="Written `dashboard.json`.")
    schema_path: Path = Field(description="Written JSON Schema of the dashboard model.")


def export_dashboard(request: ExportRequest) -> ExportResult:
    """Run the whole pipeline: read and validate, analyse, write the JSON files."""
    series = read_shelly_file(request.input_path)
    dashboard = build_dashboard(series, request.settings)

    request.output_dir.mkdir(parents=True, exist_ok=True)
    dashboard_path = request.output_dir / DASHBOARD_FILE
    schema_path = request.output_dir / SCHEMA_FILE
    dashboard_path.write_text(dashboard.model_dump_json(), encoding="utf-8")
    schema_path.write_text(
        json.dumps(DashboardData.model_json_schema(), indent=2) + "\n", encoding="utf-8"
    )
    return ExportResult(dashboard_path=dashboard_path, schema_path=schema_path)
