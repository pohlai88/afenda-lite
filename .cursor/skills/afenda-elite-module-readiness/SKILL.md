---
name: afenda-elite-module-readiness
description: >-
  Module evidence ledgers and Module Enterprise Readiness claim rules. Use when
  updating *-MOD-009 / *-MOD-010, recording PASS/FAIL/BLOCKED evidence, checking
  whether a module is claimable, or when the user mentions Module Enterprise
  Readiness, MOD-002 evidence, or afenda-elite-module-readiness.
---

# Afenda Elite — module readiness

**SSOT:** [MOD-002](../../../docs/modules/MOD-002-modules-index.md) §3 (Module Enterprise Readiness Standard). This skill operationalizes claim and evidence rules — it does not replace the controlled module pack.

```text
LOAD:
  docs/modules/MOD-002-modules-index.md          # §3 claim rules · §3.5 roles · §3.7 evidence schema
  docs/modules/<slug>/*-MOD-009-*.md             # evidence ledger + verify commands
  docs/modules/<slug>/*-MOD-010-*.md             # claims / gaps / readiness summary only
  owning *-MOD-001…008 Enterprise requirements   # AC text lives once here
SKIP:
  scratch QG-01…18 as skill or gate authority
  inventing PASS from prose, wiring, or historical narrative
  Afenda-Lite / Afenda-Elite edition or release certification from one module
  redefining AC text inside MOD-009
  copying full requirement or evidence tables into MOD-010
  retired env:compose as Living evidence (ARCH-027 — use @afenda/env + .env.local)
PLACE:
  evidence rows → *-MOD-009 only
  claim narrative → *-MOD-010 only
VERIFY:
  pnpm check:module-quality   # module pack + evidence join
  header Version/Updated ↔ Change Log ↔ DOC-002
```

Cite `term.afenda-elite`. Lifecycle edits still go through [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md). Integrity conflicts → [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md).

## Scope lock

| In scope | Out of scope |
|----------|--------------|
| Structured MOD-009 evidence table semantics | Scratch REQ quality gates (QG-*) as authority |
| MOD-002 claim rules for **Module Enterprise Readiness** | Certifying Afenda-Lite, Afenda-Elite, or a release |
| Role split: AC owners 001–008 · evidence 009 · claims 010 | Platform testing-pyramid policy rewrite (AGENTS.md) |
| Docs-first vs Target honesty when commands cannot run | Reopening FFT 2B–2D or product code without ARCH-028 implement |

**Claim name:** Module Enterprise Readiness. Passing one module does **not** certify an edition or release ([MOD-002](../../../docs/modules/MOD-002-modules-index.md) §3.3).

## Independent axes

Document **lifecycle** (`Draft` → `Living`, Control State) ≠ **readiness**. A Living MOD may correctly report `FAIL`, `BLOCKED`, or `NOT EVIDENCED`. Living documentation completeness never authorizes a readiness claim.

| Dimension | Allowed values |
|-----------|----------------|
| Applicability | `Core` · `Conditional` · `Out of Scope` |
| Activation | `Enabled` · `Disabled` · `Uncontracted` |
| Evidence | `PASS` · `FAIL` · `BLOCKED` · `NOT EVIDENCED` · `NOT ENABLED` |

## Claim rules (mandatory)

From MOD-002 §3.3 — apply literally.

**Before evidence evaluation — active-profile dimension coverage (MOD-002 §3.3 Quality profiles):**

- Every pack activates **Enterprise Core**.
- Optional profiles are only those declared on MOD-010 via `**Quality profiles:** <comma-separated profiles>` (exact marker).
- Each active dimension (Enterprise Core · every declared optional profile) requires **at least one AC** in its **sole owning role** (MOD-002 dimension→owner table). A missing dimension is **not claimable** — do not treat an empty set of rows as vacuously passing.

Then evaluate existing in-claim rows:

1. Every `Core` criterion must be `Enabled` and `PASS`.
2. An `Enabled` Conditional criterion must be `PASS`.
3. A `Disabled` or `Uncontracted` Conditional criterion may be `NOT ENABLED` only when fail-closed behavior has recorded evidence; otherwise it is `NOT EVIDENCED`.
4. `Out of Scope` requires an owning rationale/authority and is excluded from the claim.
5. Any mandatory `FAIL`, `BLOCKED`, or `NOT EVIDENCED` blocks a readiness claim.
6. Do not infer `PASS` from prose, historical claims, wiring, or reduced-viability narrative. Missing or stale runtime evidence defaults to `NOT EVIDENCED`.

MOD-010 may say **Claimable** only when active-profile dimension coverage holds **and** every in-claim row satisfies the evidence rules above.

## Evidence table (MOD-009)

Every Living `*-MOD-009` has exactly one structured table with columns **in this order** (MOD-002 §3.7):

| AC-ID | Owner MOD | Profile | Quality Dimension | Applicability | Activation | Evidence | Evidence Reference | Evidence Revision | Evidence Date | Blocker / Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| Evidence | Required columns |
|----------|------------------|
| `PASS` | Evidence Reference · Revision · ISO Date |
| `NOT ENABLED` | Fail-closed reference · Revision · Date · Rationale |
| Non-`PASS` | Blocker / Rationale |

Validator joins every AC in 001–008 to exactly one 009 row (no orphans, no missing). Structural validation may pass while readiness remains **Not claimable**.

## Agent procedure

1. **Identify module** — catalog row in MOD-002 §3.1; load that slug’s MOD-009 + MOD-010.
2. **Confirm active profiles + dimension coverage** — Enterprise Core plus every optional profile declared on MOD-010; each active dimension has ≥1 AC in its sole owning role. Stop claimability if a dimension is missing (do not wait for the validator alone).
3. **Confirm AC ownership** — criterion text only in 001–008; 009 records result state; 010 summarizes claims/gaps.
4. **Run or attempt verify commands** listed in MOD-009. On docs-first checkout, absent product trees → record `BLOCKED` with command path + revision + date ([ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md)). Do not recover wiped Collapse roots.
5. **Update evidence rows** — never invent `PASS`. Prefer `NOT EVIDENCED` when evidence is missing or stale.
6. **Env-related ACs** — cite [ARCH-027](../../../docs/architecture/ARCH-027-env-model.md) only:
   - `@afenda/env` + `.env.local` (compose retired at S4.1 / Checkpoint D).
7. **Claims** — update MOD-010 readiness aggregation only after coverage + 009 rows are honest; do not paste the full ledger into 010.
8. **Verify** — `pnpm check:module-quality`; fix join/ownership/schema findings before closing Control State.

## Concrete module example — Feed Farm Trade

Primary example pack (do not treat historical compose notes as Living commands):

| Doc | Role |
|-----|------|
| [FFT-MOD-009](../../../docs/modules/feed-farm-trade/FFT-MOD-009-verification.md) | Evidence ledger + verify commands (ARCH-027 env) |
| [FFT-MOD-010](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | Claims / gaps / roadmap |
| [FFT-MOD-003](../../../docs/modules/feed-farm-trade/FFT-MOD-003-tech-stack.md) · [FFT-MOD-008](../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) | Flags / ops; env evidence points here |

FFT domain farm gates remain [feed-farm-trade](../feed-farm-trade/SKILL.md). This skill owns **evidence/claim semantics**, not FFT product reopen.

## Hard rules

1. **MOD-002 is authority** — skills and domain farms must not invent alternate claim enums or evidence columns.
2. **No edition certification** — module claim ≠ Lite/Elite release certification.
3. **No scratch QG authority** — `docs/scratch/` may inform discovery only.
4. **No inferred PASS** — wiring, Living prose, and historical tags are not runtime evidence.
5. **Env evidence = ARCH-027** — `@afenda/env` + `.env.local`; compose is retired.
6. **Doc control still applies** — ID approval, DOC-002 rows, Control State via doc-control.

## Verification

- [ ] Loaded MOD-002 §3 before changing 009/010 claim language
- [ ] Enterprise Core + every declared optional profile; each active dimension has ≥1 AC in its sole owning role
- [ ] Every Core / in-claim Conditional AC has a 009 row
- [ ] No `PASS` without reference + revision + ISO date
- [ ] Env ACs cite ARCH-027 (`@afenda/env` + `.env.local`, not compose)
- [ ] MOD-010 claim matches coverage + 009 (Claimable only when rules pass)
- [ ] `pnpm check:module-quality` clean for the touched pack

