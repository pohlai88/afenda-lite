# HR-AUD-06 — Compensation, performance and learning cluster scorecard

| Field | Value |
|---|---|
| Mission | **HR-AUD-06 domain-depth** (Slice 8.1) |
| Cluster | C subset — compensation-benefits · performance · learning |
| Audit date | 2026-07-26 |
| Type | Audit only — no product edits |
| Evidence pack | [`cluster-c/`](cluster-c/) |
| Emission classification (frozen) | [`HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md`](HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md) |
| Baseline | HR-AUD-00 (`00–04`) |

## Executive verdict

The compensation, performance, and learning domains have **strong package-layer depth** and **product Server Actions** for compensation, benefits, compensation review, performance, and learning (including `activateCourseAction`). Phase 3 **emission classification is DONE** for these domains (consume-only). **Repair 2026-07-26** closed HR-CPL-P1-001 (activate export), HR-CPL-P1-002 (product Actions), and HR-CPL-P1-004 (sensitive prefixes). Residual: **Drizzle parity unevaluated** in audit session (13 skipped), **payroll handoff money boundary** (HR-XCUT-P1-006), Phase 2 sensitive-runner consolidation (HR-CPL-P2-002).

**Prior scorecard state:** all three domains **Unaudited** on every axis ([`42-five-axis-domain-scorecard.md`](42-five-axis-domain-scorecard.md)).

---

## Five-axis domain scorecard

Axes: **Pass** · **Partial** · **Gap** · **Fail** · **N/A** · **Unaudited** — Overall = weakest blocking axis.

| Domain | Contract | Correctness | Authz/Privacy | Parity | Evidence | Overall |
|---|---|---|---|---|---|---|
| **compensation-benefits** | Pass | Pass | Partial | Partial† | Pass | **Partial** |
| **performance** | Pass | Pass | Partial | Partial† | Pass | **Partial** |
| **learning** | Pass | Pass | Pass | Partial† | Pass | **Partial** |

† **Parity Partial:** memory parity green; Drizzle parity suites exist but **14 tests skipped** without `DATABASE_URL` / `REQUIRE_DATABASE_TESTS=1` in audit session — structure Pass, execution Partial.

### Axis evidence (one line each)

| Domain | Contract | Correctness | Authz/Privacy | Parity | Evidence |
|---|---|---|---|---|---|
| compensation-benefits | 21 commands + 7 full DDL tables + adapters aligned | Band overlap, review finalize, handoff, event emission tested | Tiered `hr.compensation` policy + sensitive prefixes; Phase 2 runner consolidation open | Memory parity pass; Drizzle skipped | `hr-compensation.ts` + `hr-benefits.ts` + `hr-compensation-review.ts` + contract tests green |
| performance | 30 commands + 9 DDL tables + adapters aligned | Cycle/goal/review/PIP workflows + authz + confidential redaction tested | Sensitive prefixes + manager scope | Memory parity pass; Drizzle skipped | `hr-performance.ts` + contract tests green |
| learning | Aligned incl. `activateCourse` public export | Course/session/assignment/completion/certification lifecycle tested | `hr.learning` policy + sensitive-operation prefixes | Memory parity pass; Drizzle skipped | `hr-learning.ts` incl. `activateCourseAction` |

---

## HR-ENT-* coverage (cluster-relevant)

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| HR-ENT-06 | Contextual and field authorization | **Partial** | Compensation tiered projection; performance confidential.read; learning subject scope; sensitive prefix gaps |
| HR-ENT-07 | Privacy / retention | **Partial** | Subject collector includes comp/perf/learning entities; consumes closed privacy port |
| HR-ENT-12 | HR product surfaces | **Partial** | Compensation/benefits/review + performance + learning Actions; UI routes forward Phase 8/9 |
| HR-ENT-16-COMP | Compensation domain depth | **Partial** | This pack — was unaudited-depth |
| HR-ENT-16-PERF | Performance domain depth | **Partial** | This pack — was unaudited-depth |
| HR-ENT-16-LEARN | Learning domain depth | **Partial** | This pack — was unaudited-depth |
| HR-ENT-18 | Package quality gates | **Partial** | Typecheck green; Drizzle parity unevaluated in session |

Payroll boundary (Phase 8): handoff query tested in package; **HR-XCUT-P1-006** remains open until Slice 8.7 cross-package parity.

---

## Score delta summary

| Domain | Before (42 scorecard) | After | Delta driver |
|---|---|---|---|
| compensation-benefits | Unaudited (all axes) | **Partial** overall | Strong package tests; Evidence **Pass** (Actions + tests); Parity Partial (Drizzle skipped) |
| performance | Unaudited (all axes) | **Partial** overall | Deepest workflow tests; Evidence **Pass**; Parity Partial |
| learning | Unaudited (all axes) | **Partial** overall | Contract **Pass** (activate export closed); Evidence **Pass** |

---

## Material finding IDs

| Domain | Primary findings |
|---|---|
| compensation-benefits | HR-CPL-P1-003, HR-CPL-P2-002, HR-XCUT-P1-006 |
| performance | HR-CPL-P1-003 |
| learning | HR-CPL-P1-003 |
| all three | HR-CPL-P1-003 (parity evidence) |

---

## Verification evidence

```bash
pnpm --filter @afenda/human-resources typecheck
# Exit 0 (2026-07-26 repair)

pnpm --filter @afenda/human-resources test -- compensation-benefits human-resources.learning
# Exit 0 — 64 passed, 13 skipped (2026-07-26 repair)

pnpm --filter @afenda/web typecheck
# Exit 0 (2026-07-26 repair)

pnpm --filter @afenda/web test -- --project web __tests__/hr-compensation-actions.test.ts __tests__/hr-benefits-actions.test.ts __tests__/hr-compensation-review-actions.test.ts __tests__/hr-performance-actions.test.ts
# Exit 0 — 8 passed (2026-07-26 repair)
```

Related artifacts: [`cluster-c/01-domain-findings.md`](cluster-c/01-domain-findings.md) · [`cluster-c/04-repair-readiness.md`](cluster-c/04-repair-readiness.md)

---

## Residual (honest)

- Phase 8 product slices (8.2–8.9) not started — audit does not claim compensation product complete
- Phase 9 performance product slice not started
- Emission matrix DONE ≠ enterprise-ready for these domains
- Do not claim MOD readiness (HR-ENT-17)
