# HR-AUD-06 — Compensation, performance and learning emission classification

| Field | Value |
|---|---|
| Mission | **HR-AUD-06** |
| Artifact | `HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING` |
| Program | Phase 3 exit close · Slice 8.1 · Slices 3.6 / 3.7 / 3.8 |
| Scope | 62 audit-pending mutation commands · 10 forward domain-event types |
| Authority | [`00.hrm.md`](../../00.hrm.md) Phase 3 · [`00-phase3.md`](../../00-phase3.md) |

## Classification rules

1. **Master / policy / draft / intermediate mutations → `audit_only`.**
2. **Approved workforce facts with reserved platform event types → `domain_event`.**
3. **Sensitive payload ban:** events use `humanResourcesEntityPayloadSchema` only (organizationId, entityType, entityId, actorId, correlationId). No salary amounts, ratings, recommendation text, or PII in platform events.
4. **Payroll boundary:** compensation facts are upstream of `@afenda/payroll`; HR emits entity-reference events only.
5. **Privacy (3 commands):** `audit_only` under domain `privacy`; no platform privacy events.

## Forward domain-event type → command mapping

| Event type | Command(s) |
|---|---|
| `human-resources.compensation.changed.v1` | `employee-compensation.create` · `employee-compensation.end` · `compensation-review.apply-approved-result` |
| `human-resources.benefit-enrollment.changed.v1` | `benefit-enrollment.enrol` · `benefit-enrollment.end` · `benefit-enrollment.cancel` |
| `human-resources.performance-cycle.opened.v1` | `performance-cycle.open` |
| `human-resources.performance-goal.approved.v1` | `performance-goal.approve` |
| `human-resources.performance-review.finalized.v1` | `performance-review.finalize` |
| `human-resources.performance-review.reopened.v1` | `performance-review.reopen` |
| `human-resources.improvement-plan.started.v1` | `improvement-plan.open` |
| `human-resources.improvement-plan.completed.v1` | `improvement-plan.complete` |
| `human-resources.learning-assignment.created.v1` | `learning-assignment.create` |
| `human-resources.certification.expiring.v1` | `certification.expire` (legacy reclass) |

## Compensation-benefits (18)

| Command | Mode | Event type(s) | Aggregate |
|---|---|---|---|
| `benefit-plan.create` | audit_only | — | benefit_plan |
| `benefit-plan.update` | audit_only | — | benefit_plan |
| `benefit-plan.archive` | audit_only | — | benefit_plan |
| `benefit-enrollment.enrol` | domain_event | benefit-enrollment.changed.v1 | benefit_enrollment |
| `benefit-enrollment.end` | domain_event | benefit-enrollment.changed.v1 | benefit_enrollment |
| `benefit-enrollment.cancel` | domain_event | benefit-enrollment.changed.v1 | benefit_enrollment |
| `compensation-grade.create` | audit_only | — | compensation_grade |
| `compensation-grade.update` | audit_only | — | compensation_grade |
| `compensation-grade.archive` | audit_only | — | compensation_grade |
| `compensation-review.create-draft` | audit_only | — | compensation_review |
| `compensation-review.record-recommendation` | audit_only | — | compensation_review |
| `compensation-review.finalize` | audit_only | — | compensation_review |
| `compensation-review.apply-approved-result` | domain_event | compensation.changed.v1 | compensation_review |
| `employee-compensation.create` | domain_event | compensation.changed.v1 | employee_compensation |
| `employee-compensation.end` | domain_event | compensation.changed.v1 | employee_compensation |
| `salary-band.create` | audit_only | — | salary_band |
| `salary-band.supersede` | audit_only | — | salary_band |
| `salary-band.archive` | audit_only | — | salary_band |

## Performance (30)

| Command | Mode | Event type(s) | Aggregate |
|---|---|---|---|
| `performance-cycle.create` | audit_only | — | performance_cycle |
| `performance-cycle.update` | audit_only | — | performance_cycle |
| `performance-cycle.open` | domain_event | performance-cycle.opened.v1 | performance_cycle |
| `performance-cycle.close` | audit_only | — | performance_cycle |
| `performance-cycle.cancel` | audit_only | — | performance_cycle |
| `performance-cycle.add-participant` | audit_only | — | performance_cycle_participant |
| `performance-cycle.remove-participant` | audit_only | — | performance_cycle_participant |
| `performance-goal.create` | audit_only | — | performance_goal |
| `performance-goal.update` | audit_only | — | performance_goal |
| `performance-goal.submit` | audit_only | — | performance_goal |
| `performance-goal.approve` | domain_event | performance-goal.approved.v1 | performance_goal |
| `performance-goal.reject` | audit_only | — | performance_goal |
| `performance-goal.record-progress` | audit_only | — | performance_goal |
| `performance-goal.close` | audit_only | — | performance_goal |
| `performance-goal.cancel` | audit_only | — | performance_goal |
| `performance-review.start` | audit_only | — | performance_review |
| `performance-review.submit-self-assessment` | audit_only | — | performance_review |
| `performance-review.submit-manager-assessment` | audit_only | — | performance_review |
| `performance-review.return-for-correction` | audit_only | — | performance_review |
| `performance-review.acknowledge` | audit_only | — | performance_review |
| `performance-review.finalize` | domain_event | performance-review.finalized.v1 | performance_review |
| `performance-review.reopen` | domain_event | performance-review.reopened.v1 | performance_review |
| `improvement-plan.create` | audit_only | — | improvement_plan |
| `improvement-plan.open` | domain_event | improvement-plan.started.v1 | improvement_plan |
| `improvement-plan.acknowledge` | audit_only | — | improvement_plan |
| `improvement-plan.record-checkpoint` | audit_only | — | improvement_plan |
| `improvement-plan.amend` | audit_only | — | improvement_plan |
| `improvement-plan.complete` | domain_event | improvement-plan.completed.v1 | improvement_plan |
| `improvement-plan.close-unsuccessful` | audit_only | — | improvement_plan |
| `improvement-plan.cancel` | audit_only | — | improvement_plan |

## Learning (11)

| Command | Mode | Event type(s) | Aggregate |
|---|---|---|---|
| `course.create` | audit_only | — | course |
| `course.update` | audit_only | — | course |
| `course.activate` | audit_only | — | course |
| `course.archive` | audit_only | — | course |
| `session.create` | audit_only | — | learning_session |
| `session.start` | audit_only | — | learning_session |
| `session.complete` | audit_only | — | learning_session |
| `session.cancel` | audit_only | — | learning_session |
| `learning-assignment.create` | domain_event | learning-assignment.created.v1 | learning_assignment |
| `learning-assignment.enrol` | audit_only | — | learning_assignment |
| `learning-assignment.waive` | audit_only | — | learning_assignment |

## Privacy (3)

| Command | Mode | Event type(s) | Aggregate |
|---|---|---|---|
| `privacy.legal-hold.place` | audit_only | — | privacy_legal_hold |
| `privacy.legal-hold.release` | audit_only | — | privacy_legal_hold |
| `privacy.subject.anonymize` | audit_only | — | privacy_subject |

## Legacy reclass

| Command | Before | After |
|---|---|---|
| `certification.expire` | audit_only | domain_event · `certification.expiring.v1` |

## Exit claim

- **290/290** mutation-command classification
- **106/106** event catalog entries for registry `domain_event` types
- **0** HR-AUD-06 CI exemptions
- Unlocks Slices **3.6 DONE** · **3.7 DONE** · **3.8 DONE** · **Phase 3 DONE**
