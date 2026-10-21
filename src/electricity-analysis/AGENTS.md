# Python project — AI Agent Instructions

Reads Shelly minute data, computes the dashboard figures and exports them as JSON.
Shared rules are in the root `AGENTS.md`; this file only adds folder-specific ones.

## Start here
1. `uv sync` (from this folder, or `make install` at the root)
2. `uv run python -m electricity_analysis export --input ../../data/<file>.json --output ../../frontend/public/data`
3. Checks: `uv run ruff format --check . && uv run ruff check . && uv run ty check && uv run lint-imports && uv run pytest`

## Layers (top to bottom, enforced by `lint-imports`)
`api` → `analysis` → `ingestion` → `models`. Result models live in `models/`.

## Conventions
- Definitions (power, energy, base load, gaps, complete days) are in `docs/analysis-definitions.md`.
- A DataFrame never crosses a function boundary; public functions return Pydantic models.
- Changing a model in `models/dashboard.py` means updating the frontend interfaces in
  `frontend/src/app/models/` (the exported `dashboard.schema.json` is the reference).
- Test fixtures are synthetic: JSON files or builders in `tests/fixtures/`. Never real data.
