# Neon Auth — command sheet (copy-paste)

**Purpose:** Paste **one** block per fresh Agent chat for `N*` missions.

**How to use**

1. Fresh Agent chat (one `SLICE_ID` per chat).
2. Attach `/afenda-elite-implementation-slices`.
3. Paste **exactly one** block below.
4. After implementer score: new chat → **Audit** block.
5. If REJECTED: new chat → **Repair** block; then Audit again.
6. Human authorizes next `N*` only after APPROVED.

**Do not** paste multiple blocks. **Do not** self-APPROVE. **Do not** treat GUIDE-018 closed as Neon APPROVED.

I*/S* blocks stay in [command-sheet.md](command-sheet.md). Score rubric: [neon-slice-score.md](neon-slice-score.md). Map: [neon-auth-slice-map.md](neon-auth-slice-map.md).

---

## Locked context (always true)

```text
PRODUCT: Afenda-Lite · QUALITY: enterprise production only
PROGRAM: Neon Auth optimisation N1–N18 (discovery = neon-auth-slice-map + neon-slice-score)
AUTHORITY: AGENTS · ARCH-023 · ARCH-026 · GUIDE-018 · ARCH-027 · map siblings (Living wins over scratch)
PATHS: apps/web/** · packages/* only
FORBID: Collapse/legacy recover · incomplete product paths · Data API as product path
FORBID: preview Neon Storage/Functions/AI Gateway without Approved slice
FORBID: app-side SMTP for Neon Auth · revert Neon Auth mail to shared provider without ARCH-026 reopen · casual branch switch · secret commit
REQUIRE: Neon Auth console Zoho SMTP (`email_provider`) for invite/reset/verify mail
FORBID: FFT 2B–2D · drizzle 0000 baseline on br-tiny-hill-ao82jp6f
DONE: Neon Slice Score + independent APPROVED only
COMMIT: only when user explicitly asks
```

---

## Universal load order (`N*`)

```text
1. SKILL.md
2. neon-auth-slice-map.md  (row for SLICE_ID)
3. neon-slice-score.md
4. Living authorities named in the row (+ AGENTS)
5. Farm SKILL.md files in LOAD order
6. Inventory disk → implement or audit → score → STOP
```

---

## Implement

```text
/using-afenda-elite-skills
/afenda-elite-implementation-slices

MODE: implement
SLICE_ID: N?
SLICE_NAME: <from neon-auth-slice-map>

Previous APPROVED: <N? or NONE>
Next (locked): <N?>

Objective: <from map / scratch slice card>
Acceptance: <paste criteria>

Rules:
- Load neon-auth-slice-map + neon-slice-score before coding
- One slice only; enterprise production quality
- Emit acceptance evidence matrix + Neon Slice Score
- Verdict: COMPLETE candidate | PARTIAL | BLOCKED | NOT STARTED
- Do not self-APPROVE; do not start next slice
- STOP after report
```

---

## Audit (independent — fresh chat)

```text
/using-afenda-elite-skills
/afenda-elite-implementation-slices

MODE: audit
SLICE_ID: N?
SLICE_NAME: <name>

Do not trust the implementer summary. Re-verify disk and commands.

Required:
1. Reload authorities + neon-auth-slice-map row + neon-slice-score
2. Inspect changed files and callers
3. Confirm no later-slice scope / incomplete product paths
4. Run floor verify from the map row
5. Recalculate Neon Slice Score from evidence
6. Return APPROVED | REJECTED — REPAIR REQUIRED | BLOCKED — EXTERNAL DEPENDENCY

Output:
- Closure verdict
- Acceptance evidence matrix
- Neon Slice Score + Path to 100%
- Drift / scope-control findings
- Security + tenancy + (if applicable) database proof
- Verification commands + results
- If APPROVED: authorize next SLICE_ID only — do not execute it
- If REJECTED: one bounded repair prompt — do not authorize next

STOP. Do not implement the next slice.
```

---

## Repair

```text
/using-afenda-elite-skills
/afenda-elite-implementation-slices

MODE: repair
SLICE_ID: N?
SLICE_NAME: <name>

Closure findings:
<paste REJECTED findings>

Rules:
- Repair listed findings only
- No next-slice work · no unrelated refactor
- Add regression tests for each repaired defect
- Re-run full floor verify for the slice
- Emit updated matrix + Neon Slice Score
- Do not self-APPROVE — request independent audit again

STOP.
```

---

## Navigate (read-only)

```text
/afenda-elite-implementation-slices

MODE: navigate
PROGRAM: neon-auth

Read neon-auth-slice-map.md.
Report: last APPROVED N* · next UNEVALUATED · farms · known Path to 100% notes.
Do not implement. Do not edit files.
```
