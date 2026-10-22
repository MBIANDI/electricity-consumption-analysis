"""Command line entry point: `python -m electricity_analysis export ...`."""

import argparse
import sys
from pathlib import Path

from pydantic import ValidationError

from electricity_analysis.analysis.voltage import VoltageError
from electricity_analysis.api.export import ExportRequest, export_dashboard
from electricity_analysis.ingestion.shelly import IngestionError


def main(argv: list[str] | None = None) -> int:
    """Run the CLI and return the process exit code."""
    parser = argparse.ArgumentParser(prog="electricity_analysis")
    commands = parser.add_subparsers(dest="command", required=True)
    export = commands.add_parser("export", help="write dashboard.json and its JSON Schema")
    export.add_argument("--input", type=Path, required=True, help="Shelly minute JSON file")
    export.add_argument("--output", type=Path, required=True, help="output directory")
    args = parser.parse_args(argv)

    try:
        result = export_dashboard(ExportRequest(input_path=args.input, output_dir=args.output))
    except (OSError, IngestionError, VoltageError, ValidationError) as error:
        print(f"export failed: {error}", file=sys.stderr)
        return 1
    print(f"wrote {result.dashboard_path}")
    print(f"wrote {result.schema_path}")
    return 0
