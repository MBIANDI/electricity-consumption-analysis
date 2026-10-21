from pathlib import Path

import pytest

from electricity_analysis.api.cli import main

FIXTURES = Path(__file__).parent.parent / "fixtures"


def test_export_command_succeeds(tmp_path: Path) -> None:
    source = str(FIXTURES / "shelly_small.json")

    code = main(["export", "--input", source, "--output", str(tmp_path)])

    assert code == 0
    assert (tmp_path / "dashboard.json").is_file()


def test_export_command_fails_on_missing_input(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    code = main(["export", "--input", str(tmp_path / "missing.json"), "--output", str(tmp_path)])

    assert code == 1
    assert "export failed" in capsys.readouterr().err
