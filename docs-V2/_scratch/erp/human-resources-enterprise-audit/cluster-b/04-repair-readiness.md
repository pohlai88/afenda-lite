# HR-AUD-02 — Cluster B repair readiness

| Field | Value |
|---|---|
| Mission | **HR-AUD-02** |
| Rule | Ordered repair **mission names only** — no product edits in this audit |

---

## Priority order

| Order | Mission name | Findings | Rationale |
|---|---|---|---|
| 1 | HR-OPS-LEAVE-EMISSION-REGISTRY | HR-OPS-P0-001 | Blocks correlation integrity and platform projections for leave |
| 2 | HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES | HR-OPS-P1-005 | Red tests undermine calendar/leave/timesheet evidence chain |
| 3 | HR-OPS-TIME-OVERTIME-AUTHORITY | HR-OPS-P1-001 | Authorization gap on approve path |
| 4 | HR-OPS-LEAVE-HANDOFF-PERMISSION | HR-OPS-P1-002 | Payroll/integration least privilege |
| 5 | HR-OPS-TIME-TIMEZONE-HANDOFF | HR-OPS-P2-001 | Handoff correctness at timezone boundaries |
| 6 | HR-OPS-LEAVE-OVERLAP-GUARD | HR-OPS-P2-004 | Data integrity for approved absence windows |
| 7 | HR-OPS-TIME-SESSION-DETERMINISM | HR-OPS-P2-003 | Import replay stability |
| 8 | HR-ENT-03-EFFECTIVE-TRUTH extension (cluster B) | HR-OPS-P1-004, HR-XCUT-P0-002 | Matrix or exclusion register for transactional tables |
| 9 | HR-ENT-07-PRODUCT-LEAVE-ACTIONS | HR-OPS-P1-003 | Product surface — depends on auth/handoff fixes |
| 10 | HR-ENT-14-ATTENDANCE-CONNECTOR | HR-OPS-P2-005 | Optional connector beyond inline import |
| 11 | HR-OPS-TEST-LEAVE-CONCURRENCY-CLEANUP | HR-OPS-P3-001 | CI hygiene |
| 12 | HR-XCUT-HYGIENE | HR-OPS-P2-002 | Comment drift |

---

## Dependency graph

```text
HR-OPS-LEAVE-EMISSION-REGISTRY
HR-OPS-TIME-CALENDAR-RESOLUTION-FIXTURES
  └─ blocks confidence for timesheet/leave generation fixes
HR-OPS-TIME-OVERTIME-AUTHORITY
HR-OPS-LEAVE-HANDOFF-PERMISSION
  └─ before HR-ENT-07-PRODUCT-LEAVE-ACTIONS
HR-ENT-07-PRODUCT-LEAVE-ACTIONS
HR-ENT-14-ATTENDANCE-CONNECTOR (optional)
```

---

## Cross-cluster prerequisites

| Prerequisite mission | Cluster | Blocks |
|---|---|---|
| HR-ENT-02-ORG-CONTEXT (if dimension port incomplete) | HR-AUD-01 | Calendar scope legal_entity/department resolution in production |
| HR-XCUT-EMISSION-REGISTRY (package-wide) | HR-AUD-00 | Full registry gate beyond leave slice |
| Payroll handoff money contract | HR-AUD-03 + payroll | HR-XCUT-P1-006 closure |

---

## Verification ladder (post-repair)

```bash
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test -- human-resources.leave human-resources.time calendar-scope leave-policy-lineage
REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/human-resources test -- human-resources.leave.parity human-resources.time calendar-scope.parity
```

Package-wide `pnpm check:hr` blocked until pre-existing employee-relations/recruitment typecheck errors (outside Cluster B) are resolved.
