# CA-2.5 Evidence — Votes, Resolutions, Minutes and Implementation Actions

Date: 2026-08-02
Implementation status: `COMPLETE`
Closure status: `BLOCKED`

The CA-2.5 governance-decision implementation is delivered and verified within
the available execution lanes. Final CA-2.5 and Phase 2 closure remain blocked
because the living acceptance contract also requires a full authenticated Phase
2 journey, adapter parity, failure injection, browser accessibility, Neon
atomicity/concurrency and a 14/14 phase-close matrix. Those lanes are not all
green.

## Implementation

- Existing CA-owned tables remain authoritative:
  `ca_meeting_vote`, `ca_resolution`, `ca_resolution_action`.
- Existing package commands, queries, memory/Drizzle stores, permissions,
  events, mutation ownership and hard-tenant roots remain in place.
- Normalized the meeting and resolution source-document ports to the canonical
  branded `OrganizationId`; consumers no longer erase tenant identity at this
  internal boundary.
- Added one Model B app composition capability that composes the existing
  company, governance, meeting and resolution stores. No production fallback or
  second runtime style was introduced.
- Added authenticated, permission-gated Server Actions for meeting votes,
  adopted resolutions, implementation assignments/completions and minutes
  documents. Transport coercion stays at the Action boundary; vote arithmetic,
  chronology, status, tenancy, idempotency, audit and event decisions remain in
  `@afenda/corporate-administration`.
- Added a persisted RSC/client workspace for meetings, resolutions, minutes and
  implementation actions using the flat `@afenda/ui-system` barrel. The browser
  never supplies `organizationId` or actor identity.
- Added focused Action and static interaction/accessibility contract tests for
  session stamping, forged-tenant rejection, redacted Action projections,
  labelled forms and read-only permission behavior.

## Working-tree baseline

- Branch: `agent/harden-kernels-and-audit-boundaries`
- Commit: `6664e648dfd4e0a3b587a97a1650fe55e7b1a7f0`
- Pre-existing unrelated changes preserved: Human Resources implementation
  files, generated command/query registers and unrelated metrics governance
  findings.
- No commit or push performed.

## Verification

| Command | Exit | Evidence |
|---|---:|---|
| `pnpm exec biome check <9 changed CA/app/test files>` | 0 | 9 files checked; no fixes required |
| `pnpm --filter @afenda/corporate-administration test -- __tests__/resolutions/ca-2.5-resolutions-contract-and-memory.test.ts` | 0 | 1 file passed; 3 tests passed |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration/governance-decision-actions.test.ts __tests__/corporate-administration/governance-decision-workspace.test.ts` | 0 | 2 files passed; 5 tests passed |
| `pnpm --filter @afenda/web typecheck` | 0 | TypeScript passed |
| `pnpm --filter @afenda/web exec vitest run --config ../../testing/vitest.unit.config.ts --project web compose-redflags compose-suitability compose-gate-ids ui-boundary tailwind-emit --reporter=verbose` | 0 | 5 files passed; 24 tests passed |
| `pnpm --filter @afenda/corporate-administration check` | 0 | lint/typecheck passed; 46 files passed, 1 skipped; 262 tests passed, 18 skipped |
| `pnpm --filter @afenda/web build` | 0 | Next.js production build passed; `/client/corporate-administration` compiled |
| `pnpm --filter @afenda/web lint` | 1 | Blocked by pre-existing stale `apps/web/app/actions/hr-compensation.ts`; HR is outside this mission |
| `pnpm validate:modules` | 1 | Blocked by three pre-existing bare `@afenda/metrics` imports outside CA |
| `pnpm governance:packages` | 1 | Delegates to the same failing `validate:modules` gate |
| `git diff --check` | 0 | No whitespace errors |

Database environment presence was checked without printing values:
`DATABASE_URL=false`; `NEON_CA_0_4_DEMO_DATABASE_URL=false`. Therefore the
required Neon parity, rollback, natural-key race and failure-injection lanes are
`BLOCKED`, not passed.

## Fourteen-boundary acceptance matrix

| # | Boundary | Status | Direct evidence | Remaining gap |
|---:|---|---|---|---|
| 1 | Authority and ownership | DONE | CA package remains sole `ca_*` mutator; app uses package commands/queries | None in this slice |
| 2 | Catalog and dependency governance | BLOCKED | CA exports and app package edges typecheck | Global `validate:modules` fails on unrelated metrics imports |
| 3 | Public package contracts | DONE | Branded organization boundary, canonical schemas and root commands/queries compile | None in this slice |
| 4 | Reference and peer boundaries | DONE | Source documents use a CA port; app has no peer table writes or deep package imports | None in this slice |
| 5 | Schema and migrations | BLOCKED | Existing CA-2.5 schema/migration tests remain in the package baseline | No database URL; no fresh/upgrade rehearsal; production migrations 0034–0046 intentionally not applied |
| 6 | Tenancy and data isolation | PARTIAL | Memory cross-tenant test and forged browser-tenant rejection pass | Real Neon cross-tenant read/write evidence unavailable |
| 7 | Authorization, approvals and SoD | PARTIAL | `resolution.read/manage` visibility and Action/package fail-closed checks are wired | Authenticated browser permission journey and full protected-role SoD evidence absent |
| 8 | Domain behavior and historical truth | DONE | Vote thresholds, chronology, effective resolution history, minutes and action completion tests pass | None in the memory/domain lane |
| 9 | Idempotency, concurrency and atomicity | BLOCKED | Canonical durable-command runtime remains the sole mutation path | CA-2.5-specific Neon rollback, replay/conflict, stale-write and simultaneous race evidence unavailable |
| 10 | Events, audit and privacy | PARTIAL | Existing registered event/audit/outbox path retained; Action response redaction test passes | Neon same-transaction evidence and full serialized UI/log leakage scan remain |
| 11 | Adapter parity and database semantics | BLOCKED | Memory adapter behavior is green; Drizzle composition typechecks | Required Drizzle/Neon shared scenarios cannot run without database URL |
| 12 | App composition and Server Actions | DONE | Model B factory, session-stamped Actions, `ActionResult` mapping, targeted revalidation and production build pass | None in the app contract lane |
| 13 | UI, journeys and accessibility | PARTIAL | Flat-barrel UI, labelled forms, permission-disabled fieldsets and UI governance tests pass | Authenticated production-composed browser journey and browser accessibility lane absent |
| 14 | Operations and production readiness | BLOCKED | Production build and focused package/UI gates pass | Global governance baseline, migration rehearsal, recovery, performance and Neon evidence remain |

## Migration impact

- No schema or migration file changed.
- No production migration was applied.
- Migrations `0034` through `0046` remain outside this mission in the separate
  cross-domain deployment-review lane. This evidence does not approve or imply
  inventory/checksum review, backup/restore, staging rehearsal, compatibility,
  lock estimates, domain approvals, verification, rollback/roll-forward or a
  maintenance window.

## Next eligible activity

Continue only the missing CA-2.5 closure evidence. Do not reimplement the
delivered governance-decision workflows. `CA-3.1` is not eligible because its
dependency is **Phase 2 DONE**, and Phase 2 cannot close until every matrix row
above is `DONE` (or explicitly permitted `NOT_APPLICABLE`). Do not start
CA-3.1.
