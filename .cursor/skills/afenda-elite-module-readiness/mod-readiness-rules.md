# MOD-002 / MOD-009 / MOD-010 — operative readiness rules (skill-local)

Living Controlled module packs under `docs/modules/**` are **dormant** until Docs-lane reopen. This companion is the offline SSOT for Module Enterprise Readiness claim/evidence semantics. Do **not** invent Living MOD trees.

Verify when Living packs exist: `pnpm check:module-quality`.

## Scope lock

| In scope | Out of scope |
|----------|--------------|
| Structured MOD-009 evidence table semantics | Scratch QG-* as authority |
| MOD-002 claim rules for **Module Enterprise Readiness** | Certifying Afenda-Lite, Afenda-Elite, or a release |
| Role split: AC owners 001–008 · evidence 009 · claims 010 | Platform testing-pyramid policy rewrite |
| Docs-first vs Target honesty when commands cannot run | Reopening FFT 2B–2D without program reopen |

**Claim name:** Module Enterprise Readiness. Passing one module does **not** certify an edition or release.

## Independent axes

Document **lifecycle** ≠ **readiness**. A Living MOD may correctly report `FAIL`, `BLOCKED`, or `NOT EVIDENCED`.

| Dimension | Allowed values |
|-----------|----------------|
| Applicability | `Core` · `Conditional` · `Out of Scope` |
| Activation | `Enabled` · `Disabled` · `Uncontracted` |
| Evidence | `PASS` · `FAIL` · `BLOCKED` · `NOT EVIDENCED` · `NOT ENABLED` |

## Claim rules (mandatory)

**Before evidence evaluation — active-profile dimension coverage:**

- Every pack activates **Enterprise Core**.
- Optional profiles are only those declared on MOD-010 via `**Quality profiles:** <comma-separated profiles>` (exact marker).
- Each active dimension requires **at least one AC** in its **sole owning role**. A missing dimension is **not claimable**.

Then evaluate existing in-claim rows:

1. Every `Core` criterion must be `Enabled` and `PASS`.
2. An `Enabled` Conditional criterion must be `PASS`.
3. A `Disabled` or `Uncontracted` Conditional criterion may be `NOT ENABLED` only when fail-closed behavior has recorded evidence; otherwise `NOT EVIDENCED`.
4. `Out of Scope` requires an owning rationale/authority and is excluded from the claim.
5. Any mandatory `FAIL`, `BLOCKED`, or `NOT EVIDENCED` blocks a readiness claim.
6. Do not infer `PASS` from prose, historical claims, wiring, or reduced-viability narrative. Missing or stale runtime evidence defaults to `NOT EVIDENCED`.

MOD-010 may say **Claimable** only when active-profile dimension coverage holds **and** every in-claim row satisfies the evidence rules above.

## Evidence table (MOD-009)

Exactly one structured table with columns **in this order**:

| AC-ID | Owner MOD | Profile | Quality Dimension | Applicability | Activation | Evidence | Evidence Reference | Evidence Revision | Evidence Date | Blocker / Rationale |

| Evidence | Required columns |
|----------|------------------|
| `PASS` | Evidence Reference · Revision · ISO Date |
| `NOT ENABLED` | Fail-closed reference · Revision · Date · Rationale |
| Non-`PASS` | Blocker / Rationale |

Validator joins every AC in 001–008 to exactly one 009 row. Structural validation may pass while readiness remains **Not claimable**.

## Env evidence (ARCH-027 operative)

- Cite `@afenda/env` + `.env.local` only (compose retired).
- Do not treat retired compose as Living evidence.

## Checkout honesty (ARCH-028 operative)

On docs-first checkout, absent product trees → record `BLOCKED` with command path + revision + date. Do not recover wiped Collapse roots.

## Hard rules

1. MOD-002 rules (this file) are authority — do not invent alternate claim enums or evidence columns.
2. No edition certification from one module.
3. No scratch QG authority.
4. No inferred PASS.
5. Doc control still applies when Living packs restored — ID approval, DOC-002, Control State via [doc-control-rules](../afenda-elite-doc-control/doc-control-rules.md).

## FFT example (IDs only — Living bodies dormant)

| Doc ID | Role |
|--------|------|
| FFT-MOD-009 | Evidence ledger + verify commands |
| FFT-MOD-010 | Claims / gaps / roadmap |
| FFT-MOD-003 · FFT-MOD-008 | Flags / ops; env evidence points here |

Domain gates: [feed-farm-trade](../feed-farm-trade/SKILL.md).
