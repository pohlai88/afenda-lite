---
name: afenda-elite-implementation-slices
description: >-
  Runs one Afenda implement mission end-to-end: GUIDE-018 Phase I (I*), residual
  ARCH-028 (S*), or Neon Auth optimisation (N1–N18) with Neon Slice Score and
  independent closure audit. Use when the user invokes this skill, pastes a
  command-sheet / neon-command-sheet block, names PHASE_ID, SLICE_ID (S*|N*),
  or continues post-scaffold / neon-auth optimisation work.
---

# Afenda Elite — implementation slices

**Owns:** one-mission implement loop for:

| Program | Authority | IDs |
|---------|-----------|-----|
| **Phase I (current)** | GUIDE-018 operative → [slice-map.md](slice-map.md) · [command-sheet.md](command-sheet.md) | `I1.1`…`I7.*` |
| **Scaffold (closed)** | ARCH-028 operative → [slice-map.md](slice-map.md) | residual `S*` only — no inventing S9 |
| **Neon Auth optimisation** | ARCH-023 · ARCH-026 · GUIDE-018 · AGENTS · [neon-auth-slice-map](neon-auth-slice-map.md) | `N1`…`N18` — scratch discovers; score proves |

**Does not own:** FFT 2B–2D reopen, Docs ID/register invent, Collapse recovery, mass multi-phase finish, self-APPROVE of `N*`.

| File | Purpose |
|------|---------|
| [command-sheet.md](command-sheet.md) | Copy-paste blocks for `I*` / `S*` |
| [slice-map.md](slice-map.md) | `I*` / `S*` → farms · authority · verify |
| [neon-command-sheet.md](neon-command-sheet.md) | Copy-paste implement / audit / repair for `N*` |
| [neon-auth-slice-map.md](neon-auth-slice-map.md) | `N1`–`N18` → farms · floor verify · APPROVED (serial complete) |
| [neon-slice-score.md](neon-slice-score.md) | Neon QUALITY ORDER · /100% score · caps |

## When to use

```text
I*/S*: paste command-sheet OR name PHASE_ID / SLICE_ID
  → LOAD this skill → slice-map → farms → implement → verify → evidence → STOP

N*: paste neon-command-sheet OR name N1–N18
  → LOAD this skill → neon-auth-slice-map → neon-slice-score → farms
  → implement → matrix + Neon Slice Score → STOP
  → fresh chat: audit → APPROVED | REJECTED | BLOCKED
```

Not for: registering new doc IDs, FFT 2B–2D, housekeeping deletes, stacking multiple stages in one turn, claiming GUIDE “closed” as Neon APPROVED.

## Hard rules

1. **One mission per chat.** Do not start the next `I*` / `S*` / `N*` until that ID’s done bar passes (`N*` = auditor APPROVED, or explicit human waiver).
2. **Enterprise production bar only.** Shrink scope via stage size, never quality.
3. **No fake completion.** Meet exit criteria with real behavior, or stop and ask.
4. **Anti-contamination.** Greenfield under `apps/web/**` and `packages/*` only. Never restore Collapse trees from git unless the user names that recovery **this turn**.
5. **Serial order.** GUIDE-018 I1→I7; `N1`→`N18` per neon-auth-slice-map. Skipping needs an explicit user waiver this turn. Do not invent ARCH-028 S9.
6. **Baseline migrate ban.** Do not apply `packages/db` `0000_*` baseline to `br-tiny-hill-ao82jp6f`.
7. **FFT freeze.** No 2B–2D domain reopen. FFT work only inside FFT-MOD-008 Allowed envelope.
8. **Lane:** match map row. No mixed lanes.
9. **Guardian (Ops verticals):** before coding I1–I3/I5 or N5–N12 product paths — Frontend · Backend · Security perspectives.
10. **Neon evaluation:** Implementer emits Neon Slice Score only — never self-APPROVE. Independent audit chat closes `N*`.

## Agent workflow (mandatory)

```text
1. Parse PHASE_ID or SLICE_ID (I* | S* | N*). If missing → ask once, then stop.
2. Branch:
     N*  → neon-auth-slice-map row + neon-slice-score (+ neon-command-sheet if pasted)
     else → slice-map.md row (GUIDE-018 vs ARCH-028)
3. Read skill-local map/sheet for that ID (Living GUIDE-018 / ARCH-028 bodies dormant; scratch discovers for N* only).
4. LOAD each farm SKILL.md listed (in order). For N*, load neon-vendor refs when mapped.
5. Inventory disk for the primary path.
6. Implement / audit / repair per MODE — gap only for this mission.
7. Verify:
     I*/S* → map Verify commands green + evidence on GUIDE-018 / ARCH-028
     N*    → floor verify + acceptance matrix + Neon Slice Score → STOP
8. N* audit MODE only may return APPROVED / REJECTED / BLOCKED.
9. STOP. Commit only if the user asks.
```

## Session best practice (Cursor)

| Practice | Rule |
|----------|------|
| Chat | Fresh Agent chat per ID |
| Mode | Agent for implement; Plan only when cutover has a real choice |
| Attach | `/afenda-elite-implementation-slices` + **one** command-sheet or neon-command-sheet block |
| After N* score | New chat for audit; repair chat if REJECTED |

## Invoke examples

```text
/afenda-elite-implementation-slices

PHASE_ID: I3.1
```

```text
/afenda-elite-implementation-slices

SLICE_ID: N7
MODE: implement
```

Full blocks: [command-sheet.md](command-sheet.md) · [neon-command-sheet.md](neon-command-sheet.md).

## Done bar

**I* / S***

- [ ] Named ID exit criteria satisfied · Verify green · farms loaded · evidence written · no next-stage sneak-in

**N***

- [ ] Acceptance matrix filled · Neon Slice Score emitted · implementer STOP without APPROVED
- [ ] Independent audit returned APPROVED (or REJECTED/BLOCKED with findings)
- [ ] No GUIDE-inherit shortcut · no next `N*` started

## Router

Entered via [using-afenda-elite-skills](../using-afenda-elite-skills/SKILL.md). Inventory: [catalog.md](../using-afenda-elite-skills/catalog.md).
