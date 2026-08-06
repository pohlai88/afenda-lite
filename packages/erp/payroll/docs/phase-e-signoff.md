# Phase E — production evidence and sign-off checklist

**Status:** engineering evidence pack started 2026-08-06; **not** a promotion claim  
**Modules:** `@afenda/human-resources` · `@afenda/payroll` (both `lifecycle: "scaffolded"`)  
**Authority:** bridging Phase E · [PRODUCTION_READINESS.md](../PRODUCTION_READINESS.md) · [HR PRODUCTION_READINESS.md](../../human-resources/PRODUCTION_READINESS.md) · [ops-runbooks.md](./ops-runbooks.md)

Do not set either module to `active` / `preview` / `beta` / `production` until every gate below has a named owner, dated evidence link, and independent review where required.

## Gate matrix

| # | Gate | Owner role | Evidence link (fill at sign-off) | Status |
| --- | --- | --- | --- | --- |
| E1 | HR promotion criteria list present and honest | HR package owner | [HR PRODUCTION_READINESS.md § Promotion criteria](../../human-resources/PRODUCTION_READINESS.md#promotion-criteria-scaffolded--active) | Engineering present |
| E2 | Payroll production-readiness control present | Payroll package owner | [PRODUCTION_READINESS.md](../PRODUCTION_READINESS.md) | Engineering present |
| E3 | A2 calculator sourcing decision recorded | Payroll / finance | [hr-payroll-decisions.md A2](./hr-payroll-decisions.md) — build in-house; ledger `statutory-source-ledger.ts` | **CLOSED** (sourcing) |
| E4 | MY/VN calculator pack reviewer approval | Qualified payroll/tax reviewer | Registry `productionApproval: approved` with `reviewedBy`, `reviewedAt`, jurisdictions + reviewed rule-pack fixtures | **OPEN** — packs are `awaiting_review` |
| E5 | A3 counsel retention clocks cited | Counsel + Privacy | Citation record linked from decisions register; erasure automation remains forbidden until then | **OPEN** (posture closed; citations open) |
| E6 | A4 settlement authority + D2 ingress live | Payroll / Payments / Accounting | Decisions A4 + settlement-ingress feature + app drain handlers | Engineering present |
| E7 | Ops runbooks published | Ops / Payroll | [ops-runbooks.md](./ops-runbooks.md) | Engineering present |
| E8 | D0–D7 capsules closed in code with tests | HR + Payroll | Decisions register + package tests (`pnpm check:payroll`, `pnpm check:hr`) — **memory adapter only**; the Drizzle/Neon parity cases self-skip without `DATABASE_URL` + `REQUIRE_DATABASE_TESTS=1` (`__tests__/helpers/payroll-neon-parity.ts`) | Engineering present (memory-only evidence) |
| E9 | Ops-gated DDL applied on target (`0049`, `0051`–`0056`) | Neon ops (PL-S9) | Migration ledger rows on the approved branch | **OPEN** — `0051`–`0056` unapplied everywhere; `0049` is claimed applied on a **preview** branch only (B5 parity loop) and is unverified from here. `pnpm db:check` runs with `DATABASE_URL` unset and asserts the journal, never a live schema |
| E10 | `pnpm governance:packages` green on the promotion revision | Platform | Local command output with date (see § Local evidence). `pnpm validate:modules` **self-skips** in this checkout — the retired module-roadmap trunk it validated is gone — so it is not evidence of anything | Required at promotion |
| E11 | Independent readiness review | Independent reviewer (not implementer) | Written APPROVED / REJECTED with findings | **OPEN** |
| E12 | Manifest lifecycle change (only after E1–E11) | Module owners | Same PR deletes scaffolded posture and records activation evidence | **FORBIDDEN** until E1–E11 |

## Local evidence recorded 2026-08-06

No continuous-integration evidence exists for this revision: the repository's
GitHub Actions billing is locked, so no workflow run has executed. Every row
below is a **local** command run by the implementer on Windows against this
working tree — it is not independent review (E11) and not CI.

| Command | Result (2026-08-06) | What it does not prove |
| --- | --- | --- |
| `pnpm check:hr` | 144 files / 1180 tests passed | Memory adapter only; no Neon-backed HR case ran |
| `pnpm check:payroll` | 36 files / 320 tests passed | Drizzle parity lane self-skipped (`adapters = ["memory"]`) |
| `pnpm governance:packages` | OK — lifecycle-coupling, erp-symmetry, emission-drain, cross-import, architecture-debt (2 fixtures, target zero) | Governance fixtures are source-derived; they do not exercise a database |
| `pnpm db:check` | journal + additive policy OK | Ran with `DATABASE_URL` unset — no live schema was inspected, nothing was migrated |
| `pnpm validate:modules` | **skipped** — the script reports it has no module roadmap left to validate | Produces no signal at all in this checkout |
| `pnpm check:docs-trunk-ban` | ok (0/6 banned trunks on disk) | Docs hygiene only |

## Bridging Phase E items deliberately not satisfied

| Bridging item | State here | Why |
| --- | --- | --- |
| 3 — "replace the `synth.v1` caveat with the approved-calculator evidence from A2" | **Not done** | A2 sourcing closed (in-house MY/VN packs shipped at `ce509e2e`), but all eight jurisdiction calculators carry `productionApproval: { status: "awaiting_review" }` (`calculator-jurisdiction-packs.ts`) and `isStatutoryProductionReady()` returns `false`. There is no approved-calculator evidence to substitute. |
| 5 — "both manifests updated" | **Not done, on purpose** | Both manifests stay `lifecycle: "scaffolded"`. Updating them is E12, which is forbidden until E1–E11 close. |
| 6 — "sign-off record — date, owner, evidence link for each gate" | Template only | Owner columns hold **roles**, not names. No promotion attempt has been signed; the record below is unfilled by design. |

## Sign-off record (copy per promotion attempt)

```text
Promotion attempt id:
Date (UTC):
HR revision (git SHA):
Payroll revision (git SHA):
App composition revision (git SHA):

E3 A2 sourcing: CLOSED — evidence:
E4 Pack approval: APPROVED | REJECTED — named reviewer: — reviewedAt: — jurisdictions:
E5 Counsel clocks: CITED | OPEN — named counsel: — citation:
E9 Migrations applied: list + ledger proof (which target branch, which SHA):
E10 governance:packages: PASS output attached — command, machine, date:
    CI run link: NONE EXPECTED while GitHub Actions billing is locked; do not
    write "CI green" without a workflow run URL.
E11 Independent review: APPROVED | REJECTED — named reviewer (not implementer): — findings:

Decision: PROMOTE | HOLD
Named promoter:
Date signed (UTC):
```

## Explicit non-claims

- Closing this checklist file is not Module Enterprise Readiness.
- Registering `awaiting_review` calculators is not production statutory activation.
- Green unit/parity tests are not lifecycle promotion.
- Ops migrate without pack approval does not authorize live MY/VN withholding.
- A3 retention clocks are **not** counsel-confirmed. Nothing in this pack, the
  decisions register, or either readiness control establishes a legal retention
  basis; the restriction-not-erasure posture is an engineering decision awaiting
  citation.
- Local command output is not CI evidence and is not independent review.
- No Neon-backed parity case has run for this revision, so nothing here proves
  Drizzle/SQL behaviour on a live schema.
