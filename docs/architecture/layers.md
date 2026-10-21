# Layers

Dependencies point downward only.

## Python (`src/electricity-analysis/src/electricity_analysis/`)
| Layer | Role |
| --- | --- |
| `api` | CLI and export: writes `dashboard.json` and its JSON Schema |
| `analysis` | Computations, no file or network I/O |
| `ingestion` | Reads and validates the Shelly file (the validation boundary) |
| `models` | Pydantic schemas shared by all layers |

The `layers` contract in `pyproject.toml` fails `uv run lint-imports` on any upward import.

## Frontend (`frontend/src/app/`)
`components` → `services` → `models`. Only services read `dashboard.json`.
