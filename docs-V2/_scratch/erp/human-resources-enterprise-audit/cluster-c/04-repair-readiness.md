# HR-AUD-06 — Cluster C repair readiness

| Field | Value |
|---|---|
| Mission | **HR-AUD-06 domain-depth** (Slice 8.1) |
| Rule | Ordered repair **mission names only** — no product edits in this audit |

---

## Priority order

| Order | Mission name | Findings | Rationale |
|---|---|---|---|
| 1 | ~~HR-CPL-LEARNING-COURSE-ACTIVATE-EXPORT~~ | HR-CPL-P1-001 | **Closed 2026-07-26** |
| 2 | HR-ENT-04-COMPENSATION-SENSITIVE-RUNNER | HR-CPL-P2-002 | Phase 2 residual — unify sensitive enforcement |
| 3 | ~~HR-ENT-04-AUTH-PRIVACY (learning prefixes)~~ | HR-CPL-P1-004 | **Closed 2026-07-26** |
| 4 | ~~HR-ENT-12-COMP-PRODUCT-ACTIONS~~ | HR-CPL-P1-002 | **Closed 2026-07-26** — Slice 8.9 Actions + tests |
| 5 | ~~HR-ENT-12-PERF-PRODUCT-ACTIONS~~ | HR-CPL-P1-002 | **Closed 2026-07-26** |
| 6 | HR-ENT-PAYROLL-HANDOFF-PARITY | HR-XCUT-P1-006 | Slice 8.7 — cross-package money + effective dates |
| 7 | HR-ENT-18-PARITY-CI-WIRING | HR-CPL-P1-003 | Unblock Drizzle parity evidence for cluster C |
| 8 | Phase 8.2–8.5 product slices | HR-CPL-P2-005 | Scaffold tables → full domain behavior |
| 9 | Phase 9 learning/performance slices | HR-CPL-P1-002, HR-CPL-P2-005 | Complete development/evaluation product surface |
| 10 | HR-XCUT-HYGIENE | HR-CPL-P2-003 | Optional emission inventory companion note for proposals |

---

## Dependency graph

```text
HR-CPL-LEARNING-COURSE-ACTIVATE-EXPORT
HR-ENT-04-COMPENSATION-SENSITIVE-RUNNER
  └─ before HR-ENT-12-COMP-PRODUCT-ACTIONS (consistent auth at product boundary)
HR-ENT-12-COMP-PRODUCT-ACTIONS
HR-ENT-12-PERF-PRODUCT-ACTIONS
HR-ENT-PAYROLL-HANDOFF-PARITY
  └─ requires approved compensation handoff stable (package layer already green)
HR-ENT-18-PARITY-CI-WIRING
  └─ before claiming Parity Pass on scorecard
```

---

## Cross-cluster prerequisites

| Prerequisite mission | Cluster | Blocks |
|---|---|---|
| HR-ENT-04-AUTH-PRIVACY (package-wide) | HR-AUD-00 | Sensitive runner parity shell |
| HR-XCUT-EMISSION-REGISTRY (leave slice) | HR-AUD-02 | Package-wide correlation CI — not blocking comp/perf/learning depth |
| Slice 6.6 offer → proposal accept | HR-AUD-01 | Post-accept employee compensation conversion (Slice 8.3+) |

---

## Verification ladder (post-repair)

```bash
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test -- compensation performance learning
REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/human-resources test -- human-resources.compensation-benefits.parity human-resources.performance.parity human-resources.learning.parity
```

Product slice verification (when Actions land):

```bash
pnpm --filter @afenda/web test -- hr-compensation hr-performance hr-learning
```

---

## Out of scope for repair list

- Rewriting [`HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md`](../HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md)
- Gross-to-net payroll logic inside `@afenda/human-resources`
- Talent / compliance / ER / WFP domains (HR-AUD-03)
