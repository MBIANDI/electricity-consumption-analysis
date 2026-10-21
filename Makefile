.PHONY: install check check-python check-frontend export start

PY_DIR := src/electricity-analysis
FRONTEND_DIR := frontend
# Override on the command line: make export DATA_FILE=../../data/other.json
DATA_FILE ?= ../../data/shelly_minute_20260831_20261014.json
EXPORT_DIR ?= ../../frontend/public/data

install:
	uv --directory $(PY_DIR) sync
	npm --prefix $(FRONTEND_DIR) install

# Same Python checks as the lint job in .github/workflows/ci.yaml, plus layers and tests
check: check-python check-frontend

check-python:
	uv --directory $(PY_DIR) run --no-sync ruff format --check .
	uv --directory $(PY_DIR) run --no-sync ruff check .
	uv --directory $(PY_DIR) run --no-sync ty check
	uv --directory $(PY_DIR) run --no-sync lint-imports
	uv --directory $(PY_DIR) run --no-sync pytest

check-frontend:
	npm --prefix $(FRONTEND_DIR) run lint
	npm --prefix $(FRONTEND_DIR) test
	npm --prefix $(FRONTEND_DIR) run build

# Writes dashboard.json and its JSON Schema into frontend/public/data (gitignored)
export:
	uv --directory $(PY_DIR) run --no-sync python -m electricity_analysis export --input $(DATA_FILE) --output $(EXPORT_DIR)

start:
	npm --prefix $(FRONTEND_DIR) start
