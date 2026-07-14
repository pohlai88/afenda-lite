---
name: afenda-elite-implementation-slices
description: >-
  Runs one Afenda implement mission end-to-end: GUIDE-018 Phase I stages (I1.1–I7)
  or residual ARCH-028 S* slices, with Elite farm skills, verify gates, and evidence.
  Use when the user invokes this skill, pastes a command-sheet block, names PHASE_ID
  (I1.1–I7) or SLICE_ID (S*), or continues post-scaffold / scaffold program work.
---

# Afenda Elite — implementation slices

**Owns:** one-mission implement loop for:

| Program | Authority | IDs |
|---------|-----------|-----|
| **Phase I (current)** | [GUIDE-018](../../../docs/guides/GUIDE-018-fullstack-e2e-integration-program.md) | `I1.1`…`I1.4` · `I2.1`… · `I3.*` · `I4` · `I5.*` · `I6.*` · `I7.*` |
| **Scaffold (closed)** | [ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md) | residual `S*` only — no inventing S9 |

**Does not own:** FFT 2B–2D reopen, Docs ID/register invent, Collapse recovery, mass multi-phase “finish I1–I7 tonight.”

| File | Purpose |
|------|---------|
| [command-sheet.md](command-sheet.md) | **Copy-paste** invoke blocks (one per chat) |
| [slice-map.md](slice-map.md) | `PHASE_ID` / `SLICE_ID` → farms · authority · verify · size |

## When to use

```text
User pastes a command-sheet block OR names PHASE_ID / SLICE_ID
  → LOAD this skill → LOAD farms from slice-map → implement → verify → evidence → STOP
```

Not for: registering new doc IDs, FFT 2B–2D, housekeeping deletes, or stacking multiple Phase I stages in one turn.

## Hard rules

1. **One mission per chat.** Do not start the next `I*` / `S*` until Acceptance + Verify for the named ID pass.
2. **Enterprise production bar only.** Shrink scope via stage size (S/M/L), never quality.
3. **No fake completion.** No shim/stub/placeholder/throw-TODO. Meet exit criteria with real behavior, or stop and ask.
4. **Anti-contamination.** Greenfield under `apps/web/**` and `packages/*` only. Never restore Collapse trees from git (incl. `git show` mining) unless the user names that recovery **this turn**.
5. **Serial order.** Follow GUIDE-018 Phase I order (I1 → I2 → …). Skipping needs an explicit user waiver this turn. ARCH-028 coding order is **closed** — do not invent S9.
6. **Baseline migrate ban.** Do not apply `packages/db` `0000_*` baseline to `br-tiny-hill-ao82jp6f`.
7. **FFT freeze.** No 2B–2D domain reopen. FFT work only inside FFT-MOD-008 Allowed envelope.
8. **Lane:** match slice-map (usually Ops). Docs/Test/Normalize for I6/I7 as mapped. No mixed lanes.
9. **Guardian (Ops verticals):** before coding I1–I3/I5 product paths — Frontend · Backend · Security perspectives (authn/authz/input/output/logging).

## Agent workflow (mandatory)

```text
1. Parse PHASE_ID or SLICE_ID from the user message (required). If missing → ask once, then stop.
2. Read slice-map.md row for that ID → note program (GUIDE-018 vs ARCH-028).
3. Read authority section:
     - Phase I → GUIDE-018 phase/stage for that ID
     - S* → ARCH-028 slice section
4. Read sibling ARCH / MOD / FFT docs named in the map.
5. LOAD each farm SKILL.md listed (in order).
6. Inventory disk: what already exists for the primary path.
7. Implement only the gap for this mission’s size budget.
8. Run Verify commands until green.
9. Update evidence:
     - Phase I → GUIDE-018 You-are-here / phase status + short Implement evidence (date · paths · verify)
     - S* → ARCH-028 Acceptance + Implement evidence
   Do not change Control State on Closed docs unless the mission is Docs-lane and the user named reopen.
10. STOP. Report: files · verify · blockers. Commit only if the user asks.
```

## Session best practice (Cursor)

| Practice | Rule |
|----------|------|
| Chat | Fresh Agent chat per `PHASE_ID` / `SLICE_ID` |
| Mode | Agent for implement; Plan only when cutover has a real choice |
| Attach | `/afenda-elite-implementation-slices` + paste **one** [command-sheet](command-sheet.md) block |
| After green | New chat for the next block; optional human commit per stage |

## Invoke examples

```text
/afenda-elite-implementation-slices

PHASE_ID: I1.1
```

```text
/afenda-elite-implementation-slices

Run GUIDE-018 I1.2 using the command sheet.
```

Full locked blocks: [command-sheet.md](command-sheet.md) § Phase I.

## Done bar

- [ ] Named `PHASE_ID` / `SLICE_ID` exit criteria satisfied
- [ ] Verify commands executed and green (paste evidence in report)
- [ ] Farm skills from slice-map were loaded before coding
- [ ] No next-stage work; no Collapse restore; no baseline migrate; no FFT 2B–2D
- [ ] Evidence written (GUIDE-018 or ARCH-028 as mapped)

## Router

Entered via [using-afenda-elite-skills](../using-afenda-elite-skills/SKILL.md). Inventory: [catalog.md](../using-afenda-elite-skills/catalog.md).
