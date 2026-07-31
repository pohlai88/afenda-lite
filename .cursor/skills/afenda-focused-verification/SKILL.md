---
name: afenda-focused-verification
description: Use for Afenda-Lite testing and verification lane selection, especially after code edits, test failures, timeouts, module/register changes, or when deciding between focused package checks and broad root Turbo gates. Enforces smallest reliable checks first and forbids blind reruns of broad root verification commands.
---

# Afenda Focused Verification

## Contract

Use the smallest reliable verification lane that covers the changed surface. Do not use root-wide verification as an edit-loop command.

## Lane Selection

1. Identify touched packages/apps from changed files.
2. Run package-local checks first:
   - `pnpm --filter @afenda/<package> lint`
   - `pnpm --filter @afenda/<package> typecheck`
   - `pnpm --filter @afenda/<package> test`
3. Add affected consumers only when the change crosses a package boundary.
4. Run architecture validators only when their owned surface changed:
   - module manifests, permissions, queries, commands, events, or table ownership -> `pnpm validate:modules`
   - OpenAPI source or generated API contract -> `pnpm check:openapi`
   - editor/formatter posture -> `pnpm check:editor-biome`
5. Treat root `pnpm test`, `pnpm check`, `pnpm build:check`, and broad Turbo gates as final CI-parity gates, not local diagnosis.

## Test Execution Policy

```text
Change scope
-> smallest relevant gate
-> targeted package validation
-> broader command only when justified
```

- Start with the command tied to the changed artifact, script, package, or spec.
- Use discovery first when the relevant spec is unclear.
- For `apps/web`, prefer `pnpm --filter @afenda/web lint`, `pnpm --filter @afenda/web typecheck`, and a targeted Vitest spec or pattern.
- Do not run the full `@afenda/web` test suite by default for package-governance, checker, script, or narrow UI changes.
- Do not run monorepo aggregate checks by default unless the changed dependency surface justifies them or the user explicitly asks.

## Timeout Rule

Do not use a timeout ladder.

Choose one realistic timeout upfront when a broader command is justified. If a command times out once, stop the retry loop and diagnose: inspect the command scope, narrow to the relevant package/spec/project, and look for collection hangs or open handles.

Do not restart the same broad command with a larger timeout unless the user explicitly approves that exact rerun after the timeout is reported. A silent or hanging test run is a test-health finding, not permission to keep increasing timeouts.

## ERR-NORM Lane

For errors-normalization or errors-governance work, use these gates before broader validation:

```powershell
pnpm run test:errors-boundary
pnpm run check:errors-boundary
pnpm run test:errors-semantics
pnpm run check:errors-semantics
```

Then run only the checks tied to directly touched packages:

```powershell
pnpm --filter <package> lint
pnpm --filter <package> typecheck
pnpm --filter <package> test
```

## Command Examples

Target package:

```powershell
pnpm --filter @afenda/master-data lint
pnpm --filter @afenda/master-data typecheck
pnpm --filter @afenda/master-data test
```

Affected consumer:

```powershell
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test -- organization-member-search
pnpm exec vitest list --config testing/vitest.unit.config.ts --project web
```

Architecture/register changes:

```powershell
pnpm validate:modules
```

Broad gate only when explicitly approved:

```powershell
$env:AFENDA_ALLOW_BROAD_VERIFY = "1"; pnpm test
```

## Reporting

Report verification in three buckets:

- `Focused green`: package/file checks that passed.
- `Architecture green`: validators that passed.
- `Not proven`: broad gates not run, timed out, or intentionally skipped.
