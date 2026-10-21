.PHONY: check

# Same checks as the lint job in .github/workflows/ci.yaml
check:
	uv run --no-sync ruff format --check .
	uv run --no-sync ruff check .
	uv run --no-sync ty check
