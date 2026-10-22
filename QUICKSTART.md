# Quickstart

Prerequisites: [uv](https://docs.astral.sh/uv/), Node.js and npm, `make`.

```
make install   # Python and frontend dependencies
make export    # data/*.json -> frontend/public/data/dashboard.json (+ JSON Schema)
make start     # Angular dev server
make check     # every check of both projects
```

`make export` reads `DATA_FILE` (default `../../data/shelly_minute_20260831_20261014.json`,
relative to `src/electricity-analysis/`). Override it with `make export DATA_FILE=...`.
The output folder is gitignored and regenerated on each run.

Without `make`:

```
cd src/electricity-analysis
uv run python -m electricity_analysis export --input ../../data/<file>.json --output ../../frontend/public/data
```
