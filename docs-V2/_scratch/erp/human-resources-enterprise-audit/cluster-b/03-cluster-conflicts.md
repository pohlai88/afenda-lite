# HR-AUD-02 — Cluster B conflicts (decisions vs defects)

| Field | Value |
|---|---|
| Mission | **HR-AUD-02** |
| Purpose | Separate architecture decisions from defects within time + leave |

---

## Locked decisions (not defects)

| Decision | Authority | Cluster B posture |
|---|---|---|
| Cluster B = time + leave only | [`04-domain-cluster-audit-contract.md`](../04-domain-cluster-audit-contract.md) | Prompt 2B five-domain list superseded; comp/learning/performance → HR-AUD-03 |
| Leave balance as decimal string + bigint arithmetic | `shared/leave-balance.ts` | Command + SQL CTE paths; scale 4 |
| Effective-truth matrix scoped to 33 tables | HR-XCUT-P0-002 / HR-ENT-05 | Leave policy + time calendar/policy/shift/assignments in matrix; transactional tables intentionally operational |
| Production attendance source fail-closed | HR-ENT-14 / `production-attendance-source.ts` | Inline import is supported path; external connector is composition replacement |
| Memory/Drizzle compile-time coverage guards | HR-XCUT store parity | Both adapters implement full `HumanResourcesStore` slice for leave/time |
| Time emission registry complete (59/59) | `emission-registry-parity.test.ts` | Decision to treat time as registry reference implementation |
| Leave requires WorkCalendarPort | `shared/leave-command.ts` | Cross-domain dependency by design for segment expansion |

---

## Architecture conflicts (require decision or repair)

| ID | Conflict | Classification | Resolution direction |
|---|---|---|---|
| HR-OPS-P0-001 | Leave emits events in adapters but registry empty | **Defect** | Register leave commands |
| HR-OPS-P1-001 | Overtime vs timesheet approval authority asymmetry | **Defect** | Unify authority check |
| HR-OPS-P1-002 | Leave vs time handoff permission asymmetry | **Defect / product** | Add leave handoff.read |
| HR-OPS-P1-005 | Calendar resolution tests red | **Defect or stale fixtures** | Fix assignment context test wiring |
| HR-OPS-P2-001 | Timesheet leave timezone UTC | **Defect or contract gap** | Document or derive from calendar |
| HR-OPS-P2-004 | No leave overlap DB constraint | **Design gap** | Command + optional DB guard |
| HR-XCUT-P0-002 | Matrix scope vs HR-ENT-05 wording | **Cross-cut OPEN-DECISION** | Extend matrix or exclusion register |
| HR-XCUT-P1-006 | HR decimal strings vs payroll minor-units at handoff | **Cross-cut OPEN-DECISION** | Payroll architect + HR-AUD-03 boundary |

---

## Residual dependencies on other clusters

| Dependency | Consumer | Provider cluster | Notes |
|---|---|---|---|
| `AssignmentContextQueryPort` | `employee-work-calendar-resolution.ts` | HR-AUD-01 (core assignment, org context) | Calendar tests fail when context unresolved |
| `WorkCalendarPort` | All leave commands/queries | Cluster B (time) | Internal cross-slice within package |
| `ApprovedLeaveQueryPort` | Timesheet generation | Cluster B leave handoff | Wired in production + apps/web |
| Employment active resolution | Time commands | HR-AUD-01 core employment | `shared/time-employment.ts` |
| Organization dimension keys | Calendar scope legal_entity/department | HR-AUD-01 + master-data port | Nullable keys fail closed in scope matching |
| Payroll consumption | Approved leave/time handoffs | `@afenda/payroll` / HR-AUD-03 | Handoff shapes audited here; money scale in HR-XCUT-P1-006 |

---

## Superseded authority (record only)

| Superseded | Replacement |
|---|---|
| Prompt 2B domain list (5 domains for AUD-02) | AUD-00 Cluster B (time + leave) |
| Prompt 2B special risks for compensation/learning/performance | HR-AUD-03 scope |
| `time-remaining.md` table counts if stale | Re-verified against disk in this audit |

No OPEN-DECISION registered for Prompt 2B vs AUD-00 — scope locked by user directive in plan execution.
