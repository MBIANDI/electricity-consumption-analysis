# Electricity Consumption Analysis — AI Agent Instructions

## What this project does
Reads electricity consumption files, analyses them, and exposes the results
in an Angular application.

## Layout
- `src/electricity-analysis/` — Python project (uv, pandas); the importable package is
  `src/electricity-analysis/src/electricity_analysis/`. See its AGENTS.md.
- `frontend/` — Angular app (npm). See frontend/AGENTS.md.
- `data/` — personal input files, gitignored and read-only.
- `docs/` — detailed documentation. This file only states hard rules.
- Root `package.json` / `node_modules` only provide Biome for the pre-commit hook; they are
  not part of the Angular app.

## Hard rules
### Git
- No AI attribution: never add "Co-Authored-By: Claude" to commits or
  "Generated with Claude Code" to PR descriptions.
### Data
- Input files in `data/` are read-only and gitignored; never edit or copy them into `frontend/`.
- Units are kWh (energy) and kW (power); never mix them.
- Timestamps are stored in UTC, aggregated by Europe/Paris local day and displayed in Europe/Paris.
- Shelly `minute_locale` is a fixed UTC+1: never use it. See docs/data-format.md.
- Never hardcode file paths, URLs or credentials; use config or env vars.

### Package management
- Use **`uv`** for all package operations — never `pip install`
- Add a new dependency: `uv add <package>`
- Add a dev dependency: `uv add --dev <package>`

### Python (src/electricity-analysis/)
- Use `uv` only, never `pip install`. Add dependencies with `uv add`.
- Ruff `ANN` rules are enabled: annotate every function.
- `list[x]` and `x | None`, never `List[x]` or `Optional[x]`.
- Never `except Exception: pass`.
- `model_config = ConfigDict(...)` — never `class Config` in Pydantic models
- Pydantic V2 patterns only — no `.dict()`, use `.model_dump()`
- Double quotes for strings (ruff enforced)
- Tests mirror the module path under `tests/`, use exact assertions and synthetic fixtures
  only; fix a bug by first writing a test that fails.

### Imports
- Use normal top-level imports everywhere — no lazy imports needed


### Frontend (frontend/)
- TypeScript strict mode; no `any`.
- Use npm only (no pnpm/yarn). Standalone components.

## After every change
Run `make check`. It covers:
- Python: `uv run ruff check . && uv run ruff format --check . && uv run ty check &&
  uv run lint-imports && uv run pytest`
- frontend: `npm run lint && npm test && npm run build`
Zero tolerance for lint errors and test regressions.

## Architecture — layered, do not deviate
Dependencies point downward only: a layer may import from layers below it,
never from layers above. Details: docs/architecture/layers.md.

### src/electricity-analysis/ (top to bottom)
1. `api`        — exposes results to the frontend
2. `analysis`   — computations and business logic, no file or network I/O
3. `ingestion`  — reads and validates consumption files
4. `models`     — shared data schemas

### frontend/ (top to bottom)
1. `components` — UI only; never calls HttpClient directly
2. `services`   — data access and state; the only layer that calls the API
3. `models`     — TypeScript interfaces matching the API schema

Import direction is enforced by `lint-imports` (Python) in CI.
A new module goes in the lowest layer that can host it.

### Structured data — typed models everywhere
- Every public function returns a Pydantic model, never a bare `dict`, `tuple`,
  `list` of unnamed values, or raw `DataFrame`. Analysis functions return a
  result model (e.g. `ConsumptionSummary`, `PeakReport`), not loose numbers.
- Function inputs follow the same rule: a function that needs several related
  parameters takes a model, not a `dict` or `**kwargs`.
- Data is validated once, at the boundary where it enters the system: file
  ingestion, API requests, LLM output. Inside the code, only typed models
  circulate.
- A `DataFrame` may be used inside a function for computation, but it does not
  cross a function boundary. The function returns a model (e.g. a model holding a
  list of typed points).
- Result models live in `models/`, the lowest layer, so every layer can import them.
- Pydantic V2 only: `model_config = ConfigDict(...)` (never `class Config`),
  `.model_dump()` (never `.dict()`). Prefer `extra="forbid"` and frozen models for results.
- API responses are Pydantic models. The frontend `models/` interfaces mirror
  them (use the JSON Schema from `model_json_schema()` as the reference).
- Every field has a type, and fields whose meaning is not obvious have a
  `Field(description=...)`. Units go in the field name or description (`energy_kwh`, `power_kw`).

#### LLM calls
- Every LLM call goes through `pydantic-ai` with an explicit `output_type`
  (a Pydantic model); read the result from `result.output`. Never parse free text
  or `json.loads()` raw model output.
- Never rely on the default `str` output for a result the code uses. Free text is
  allowed only when shown to a user as-is.
- Keep the default `ToolOutput` mode. Use `NativeOutput` only when the provider
  supports it. Avoid `PromptedOutput`.
- Use `@agent.output_validator` + `ModelRetry` for checks Pydantic cannot express.
  Set the retry budget explicitly and never swallow validation errors.
