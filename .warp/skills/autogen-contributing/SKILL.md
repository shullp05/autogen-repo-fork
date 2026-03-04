---
name: autogen-contributing
description: >
  Contributing guidelines and standards for the AutoGen repository.
  Use when: writing docstrings, submitting PRs, reviewing code, writing tests,
  understanding versioning, following the triage process, or adding new public
  APIs to the AutoGen framework. Triggers on: contributing, PR, pull request,
  docstring, code review, versioning, release, triage.
---

# AutoGen Contributing Guidelines

## PR Workflow
1. Create a feature branch from `main`
2. Implement changes following code style guidelines below
3. Run `poe check` from `python/` to verify all CI checks pass
4. Submit PR - CLA bot will guide you through signing if needed
5. Address reviewer feedback

## Docstring Standard
Google-style with Sphinx RST format. Required for all public classes/functions:

```python
class MyAgent(Agent):
    """Short description of the agent.

    Longer description if needed.

    Args:
        param1 (str): Description of param1.
        param2 (Optional[int]): Description with default.

    Raises:
        ValueError: When param1 is empty.

    Examples:

        .. code-block:: python

            agent = MyAgent(param1="hello")

    .. versionadded:: v0.4.x

       Added in this version.
    """
```

Rules:
- Use `:class:~fully.qualified.ClassName` for cross-references
- Prefix with `~` for shorter rendered names
- Include `.. versionadded::` / `.. versionchanged::` for new/changed APIs
- Code examples in docstrings are validated by Pyright

## Testing Standards
- Use pytest with fixtures for dependencies
- Mock external calls with `autogen_ext.models.replay.ReplayChatCompletionClient`
- Skip external API tests: `@pytest.mark.skipif(not os.environ.get("OPENAI_API_KEY"), ...)`
- Never reduce test coverage percentage
- No `unittest` - use `pytest` exclusively

## Code Style
- Ruff formatter + linter (line-length=120, target py310)
- Select rules: E, F, W, B, Q, I, ASYNC, T20
- Ban `unittest` imports (use pytest)

## Versioning
- All `autogen-*` packages versioned together
- Minor bump (0.X.0) = breaking changes
- Patch bump (0.0.X) = features/bugfixes

## Labels for Issues
- `proj-*` - Project-specific
- `documentation` - Doc-related
- `x-lang` - Cross-language
- `dotnet` - .NET specific
- `needs-triage` - New issues awaiting review
- `awaiting-op-response` - Waiting on reporter
