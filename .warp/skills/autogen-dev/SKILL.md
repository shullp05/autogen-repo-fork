---
name: autogen-dev
description: >
  Development workflow for the AutoGen multi-agent AI framework repository.
  Use when: setting up the dev environment, running tests, linting, formatting,
  type checking (pyright/mypy), building docs, running CI checks locally,
  preparing PRs, using uv or poe tasks, creating new packages, or generating
  protobuf code. Triggers on: dev setup, test, lint, format, typecheck, docs,
  CI, uv sync, poe, pre-PR checks.
---

# AutoGen Development Workflow

## Project Structure
- `python/` - UV workspace root containing all Python packages
- `python/packages/autogen-core/` - Core interfaces: runtime, models, tools, workbench, memory, tracing
- `python/packages/autogen-agentchat/` - High-level agent/team APIs (AssistantAgent, group chats)
- `python/packages/autogen-ext/` - Extensions: model clients, code executors, MCP tools, runtimes
- `python/packages/autogen-studio/` - No-code web GUI
- `python/packages/agbench/` - Benchmarking suite
- `dotnet/` - .NET implementation
- `protos/` - Protobuf definitions

## Environment Setup
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh  # install uv if needed
cd python
uv sync --all-extras
source .venv/bin/activate
```

## Common Tasks (poethepoet)
All `poe` commands run from `python/` inside the activated venv:

- `poe format` / `poe fmt` - Format code (ruff)
- `poe lint` - Lint (ruff)
- `poe test` - Run pytest across all packages
- `poe pyright` - Type check (pyright==1.1.389)
- `poe mypy` - Type check (mypy==1.13.0)
- `poe check` - Run ALL checks (fmt + lint + pyright + mypy + docs-mypy + test + markdown-code-lint + samples-code-check)

## Documentation
- `poe docs-build` - Build Sphinx docs
- `poe docs-serve` - Auto-rebuild + serve on port 8000
- `poe docs-clean` - Remove build artifacts before full rebuild
- `poe docs-check` - Build with `--fail-on-warning`
- `poe docs-check-examples` - Validate code blocks in API references with Pyright

## Testing
- Framework: pytest + pytest-asyncio + pytest-xdist + pytest-cov
- Mock model calls with `autogen_ext.models.replay.ReplayChatCompletionClient`
- Skip external API tests: `pytest.mark.skipif` on missing env vars
- Use fixtures; never make real API/DB calls in unit tests

## Code Style
- Ruff: line-length=120, target py310
- Google-style docstrings with Sphinx RST
- Cross-references: `:class:~autogen_agentchat.AssistantAgent`
- New APIs need `.. versionadded::` / `.. versionchanged::` directives

## Pre-PR Checklist
1. `poe check` (from `python/`)
2. Tests pass, coverage not reduced
3. Docstrings on all new public APIs
4. `poe docs-clean && poe docs-build` if new modules added

## Protobuf Generation
- `poe gen-proto` - Regenerate gRPC protos for autogen-ext
- `poe gen-test-proto` - Regenerate test protos

## New Package
```bash
cd python && uv sync --python 3.12 && source .venv/bin/activate
cookiecutter ./templates/new-package/
```
