# Slice specs

Per-slice execution briefs. **Index and status:** [iam-check-doctrine.md §3](../iam-check-doctrine.md#3-slice-index). **Phase C order:** [§10 playbook](../iam-check-doctrine.md#10-phase-c-execution-playbook).

**Interchange format:** [survey-package-format.md](../survey-package-format.md) (CDP JSON v1).

When implementing a slice, complete its **Acceptance proof** checklist, then update status in doctrine §3.

## Files

- [s0-schema-foundation.md](./s0-schema-foundation.md) — S0
- [s1-auth-boundary.md](./s1-auth-boundary.md) — S1
- [s2-ui-copy-doctrine.md](./s2-ui-copy-doctrine.md) — S2
- [s3-operator-crud.md](./s3-operator-crud.md) — S3
- [s4-submission-engine.md](./s4-submission-engine.md) — S4
- [s5-share-access.md](./s5-share-access.md) — S5
- [s6-client-identity.md](./s6-client-identity.md) — S6
- [s7-client-assignments.md](./s7-client-assignments.md) — S7
- [s8-operator-review.md](./s8-operator-review.md) — S8
- [s9-readiness.md](./s9-readiness.md) — S9
- [s10-validation-contracts.md](./s10-validation-contracts.md) — S10
- [s11-audit-events.md](./s11-audit-events.md) — S11
- [s12-tenancy.md](./s12-tenancy.md) — S12
- [s13-ci-gate.md](./s13-ci-gate.md) — S13
- [s14-observability.md](./s14-observability.md) — S14
- [s15-e2e-journeys.md](./s15-e2e-journeys.md) — S15
- [s16-admin-client-preview.md](./s16-admin-client-preview.md) — S16 (admin client preview + operator app shell)
- [s17-production-acceptance-closure.md](./s17-production-acceptance-closure.md) — S17 (**in progress** — evidence log in spec · [TRACKING.md](../../TRACKING.md))

**Portal atmosphere (ADR-Portal-BG-001):** [portal-atmosphere/](./portal-atmosphere/README.md) — PA-P0–PA-P10

Sidebar route contract: `lib/portal-nav-routes.ts` — validated by `npm run check:nav`.
