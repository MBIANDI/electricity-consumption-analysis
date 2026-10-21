# Electricity Consumption Analysis

Reads minute-level electricity data from a Shelly Pro 3EM meter, analyses it with Python and
shows the results in an Angular dashboard (overview, consumption over time, average daily
profile, data quality).

## Prerequisites
- [uv](https://docs.astral.sh/uv/) (Python 3.13 is picked from `.python-version`)
- Node.js 24.15 or newer, with npm
- `make`
- Your Shelly export in `data/` (personal data: it is gitignored and never modified).
  The default file is `data/shelly_minute_20260831_20261014.json`.

## Run the application
```
make install   # Python and frontend dependencies
make export    # analyse the data, write frontend/public/data/dashboard.json
make start     # Angular dev server, open http://localhost:4200
```

`make export` must run before `make start`: the dashboard loads the generated
`dashboard.json`. To use another file:

```
make export DATA_FILE=../../data/other_file.json
```

(the path is relative to `src/electricity-analysis/`).

Without `make`:

```
cd src/electricity-analysis
uv sync
uv run python -m electricity_analysis export --input ../../data/<file>.json --output ../../frontend/public/data
cd ../../frontend
npm install
npm start
```

## Check the code
```
make check
```
Runs ruff, ty, import-linter and pytest for the Python project, then lint, tests and build for
the frontend. Run it after every change.

## Layout
| Path | Content |
| --- | --- |
| `src/electricity-analysis/` | Python project (uv, pandas, Pydantic); package `electricity_analysis` |
| `frontend/` | Angular app (npm, Apache ECharts) |
| `data/` | Input files, gitignored |
| `docs/` | Data format, analysis definitions, architecture |

## More
- [QUICKSTART.md](QUICKSTART.md) — short command reference
- [docs/data-format.md](docs/data-format.md) — what the Shelly file contains
- [docs/analysis-definitions.md](docs/analysis-definitions.md) — how each figure is computed
- [docs/architecture/layers.md](docs/architecture/layers.md) — layered architecture
- [AGENTS.md](AGENTS.md) — rules for AI agents working on this repository
