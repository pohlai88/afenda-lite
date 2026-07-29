---
name: afenda-package-protection
description: Protect completed Afenda package or sub-package code with a simple pre-edit token and SHA-256 hash. Use when a package is declared done and should require an explicit local env unlock before intentionally updating its protection hash.
---

# Afenda Package Protection

## Purpose

Protect a completed package or sub-package from accidental edits.

The model is intentionally simple:

1. `protect:check` computes the current package hash and compares it with `.protected.sha256`.
2. Accidental edits fail the check.
3. `protect:update` refreshes `.protected.sha256` only when a local pre-edit token is present.

The token is a local developer unlock. Store it in `.env.local` or the current
shell, never in committed files. The update script reads both locations.

## Required Workflow

Before editing a protected package:

1. Run the package protection check.
2. If it fails, stop and inspect the diff before editing.
3. For intentional changes, set `AFENDA_PROTECTED_EDIT_TOKEN` locally.
4. Make the package change.
5. Run lint, typecheck, and tests.
6. Run `protect:update` to refresh `.protected.sha256`.
7. Run `protect:check` again.
8. Confirm every protected file that supports comments has the package header.

## Package Scripts

For a package three levels below the repo root, add:

```json
{
  "protect:check": "node ../../../.cursor/skills/afenda-package-protection/scripts/protect-package-check.mjs .",
  "protect:update": "node ../../../.cursor/skills/afenda-package-protection/scripts/protect-package-update.mjs ."
}
```

Adjust the relative path for packages at another depth.

## Local Token

Use this local-only env value:

```bash
AFENDA_PROTECTED_EDIT_TOKEN=<private local value>
```

The scripts require only that the variable is present and non-empty. The value is intentionally not checked into the repo. `protect:update` reads `process.env` first, then repo-root `.env.local`.

PowerShell example:

```powershell
$env:AFENDA_PROTECTED_EDIT_TOKEN="local-edit-unlock"
pnpm --filter <package-name> protect:update
```

## Header Template

Use this header at the top of every protected source or test file that supports
comments:

```ts
/**
 * <package-name>
 * Contract: <contract-id>
 * Protected: changes require local pre-edit token and compatibility checks.
 */
```

Files that cannot safely carry comments, such as JSON, remain protected by
`.protected.sha256` but do not receive a header.
