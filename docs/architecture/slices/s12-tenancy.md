# S12 — Tenancy and row scope

| Field | Value |
|-------|-------|
| **Status** | planned |
| **Sequence** | 18 — only when multi-operator SaaS required; **after S17 accepted** |
| **Depends on** | S3, S17 |
| **Feeds into** | Multi-operator SaaS |

## Purpose

Replace global operator model with org/workspace scope.

**Gate:** Do not start until [S17 production acceptance closure](./s17-production-acceptance-closure.md) is accepted.

## Inputs / outputs

- **Inputs:** `organization_id` on surveys, assignments, invitations
- **Outputs:** Scoped queries; optional Neon RLS policies

## Owned files (to change)

- New migration adding `organization_id`
- Refactor `lib/surveys.ts`: `getSurveyForAdmin` → scoped operator query
- All list/mutation paths include scope predicate

## Critical control points

- Every SELECT/UPDATE includes scope predicate
- CCP-A2 evolves from env email to org membership

## Failure modes

- Cross-tenant data leak via forgotten predicate
- RLS policies before column exists (complexity without benefit)

## Required tests

- Operator A cannot read Operator B declarations
- Client assignments scoped to org

## Acceptance proof

- [ ] Product sign-off on tenant model
- [ ] Migration backfills or assigns default org
- [ ] No global `SELECT * FROM surveys` without scope

## Do not build yet

Full Neon RLS before `organization_id` column exists.

## Open question

**Assumption:** Single default org for existing deployments until SaaS launch confirmed.
