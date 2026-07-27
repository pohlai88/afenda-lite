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

## Timeout Rule

If a broad root gate times out or fails without a narrow error, stop and report it as not proven. Do not retry with a longer timeout unless the user explicitly asks for that exact command or an operator sets `AFENDA_ALLOW_BROAD_VERIFY=1`.

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
