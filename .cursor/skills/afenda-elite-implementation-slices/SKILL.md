---
name: afenda-elite-implementation-slices
description: >-
  Runs one ARCH-028 Turborepo implementation slice end-to-end with the correct
  Elite farm skills, sibling ARCH authority, verify gates, and evidence update.
  Use when the user invokes this skill, names an ARCH-028 slice (S3.1–S8.2),
  asks for a slice command sheet, or continues Target monorepo implement after
  Checkpoint A/B.
---

# Afenda Elite — ARCH-028 implementation slices

**Owns:** one-slice implement loop for [ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md).  
**Does not own:** product domain (FFT), docs-only lifecycle, Collapse recovery, inventing packages ahead of the ordered checklist.

| File | Purpose |
|------|---------|
| [command-sheet.md](command-sheet.md) | Copy-paste invoke blocks (one slice per chat) |
| [slice-map.md](slice-map.md) | Slice → farms · sibling ARCH · verify · size |

## When to use

```text
User names a slice (e.g. S3.1) or pastes a command-sheet block
  → LOAD this skill → LOAD farms from slice-map → implement → verify → evidence → STOP
```

Not for: doc-control ID approval, FFT 2B–2D, housekeeping deletes, or “finish all remaining slices” in one turn.

## Hard rules

1. **One slice per mission.** Do not start the next `S*` or checkpoint until Acceptance + Verify for the named slice pass.
2. **Enterprise production bar only.** Shrink scope via slice size (S/M/L), never quality.
3. **No fake completion.** No shim/stub/placeholder/throw-TODO modules. Meet Acceptance with real behavior, or stop and ask.
4. **Anti-contamination.** Greenfield under `apps/web/**` and `packages/*` only. Never restore Collapse trees (`app/`, `modules/`, `features/`, `components-V2/`, root `lib/`, wiped `scripts/*`) from git history — including `git show` / `git cat-file` as an implementation seed. **Exception:** only if the user explicitly names and approves that exact recovery in **this** turn. Cutover notes that mention old paths are disposition text, not a waiver.
5. **Serial order.** Follow ARCH-028; skipped slices need an explicit user waiver in this turn.
6. **Baseline migrate ban.** Do not apply `packages/db` `0000_*` baseline to `br-tiny-hill-ao82jp6f`.
7. **FFT freeze.** No Feed Farm Trade domain/logic changes unless the named slice file list requires shell wiring — and still no 2B–2D reopen.
8. **Lane:** Ops (implement). No mixed Docs ID/register work; ARCH-028 checkbox/evidence update for *this* slice is in-scope.

## Agent workflow (mandatory)

```text
1. Parse SLICE_ID from the user message (required). If missing → ask once, then stop.
2. Read ARCH-028 section for SLICE_ID (Acceptance + Verify + Cutover notes).
3. Read [slice-map.md](slice-map.md) row → LOAD each listed farm skill SKILL.md.
4. Read sibling ARCH authority from the map (e.g. ARCH-026 for S3.x).
5. Inventory disk: what already exists for that package/app path.
6. Implement only the gap for this slice’s file budget (S = 1–2 files, M = 3–5, L = move).
7. Run Verify commands from ARCH-028 / slice-map until green.
8. Update ARCH-028: check Acceptance boxes + short Implement evidence
   (date · paths · verify result). Do not change Control State.
9. STOP. Report: files · verify · blockers. Commit only if the user asks.
```

## Session best practice (Cursor)

| Practice | Rule |
|----------|------|
| Chat | Fresh Agent chat per slice |
| Mode | Agent for implement; Plan only when cutover has a real choice (e.g. S4.1 env) |
| Attach | `/afenda-elite-implementation-slices` + `@ARCH-028` (or paste a [command-sheet](command-sheet.md) block) |
| After green | New chat for the next slice; optional human commit per slice/checkpoint |

## Invoke examples

```text
/afenda-elite-implementation-slices

SLICE_ID: S3.1
```

```text
/afenda-elite-implementation-slices

Run ARCH-028 S4.1 using the command sheet. Plan cutover only if compose retirement conflicts with disk.
```

Full locked blocks: [command-sheet.md](command-sheet.md).

## Done bar

- [ ] Named slice Acceptance boxes satisfied in ARCH-028
- [ ] Verify commands executed and green (paste evidence in report)
- [ ] Farm skills from slice-map were loaded before coding
- [ ] No next-slice work; no Collapse restore; no baseline migrate
- [ ] ARCH-028 Implement evidence row written for this slice

## Router

Entered via [using-afenda-elite-skills](../using-afenda-elite-skills/SKILL.md). Inventory: [catalog.md](../using-afenda-elite-skills/catalog.md).
