# Corporate Administration — Plan-to-Code Completeness Matrix

| Field | Value |
| ----- | ----- |
| Authority | [corporate-administration-integrated-implementation-authority.md](./corporate-administration-integrated-implementation-authority.md) |
| Updated | 2026-07-25 |
| Package lifecycle | `scaffolded` |
| Status legend | `DONE` · `PARTIAL` · `GAP` · `BLOCKED` · `NOT_APPLICABLE` |

This register reports executable behavior, not table or file presence. A slice is
not `DONE` until its authority-required commands, queries, transaction evidence,
web surface, and tests are all present.

## Runtime boundaries (12)

| # | Boundary | Status | Evidence / remaining gap |
| --- | --- | --- | --- |
| 1 | Approved authority / closed decisions | DONE | Integrated authority §2 |
| 2 | Module roadmap / registration | PARTIAL | `MODULE-ROADMAP.yaml` present; `pnpm governance:packages` fails on unrelated HR constant `HUMAN_RESOURCES_QUERY_ASSIGNMENT_AS_OF` (2026-07-25 run) |
| 3 | Package shell / manifest | DONE | `@afenda/corporate-administration`; lifecycle intentionally remains `scaffolded` |
| 4 | Master-data legal-entity get-effective | DONE | By-id/by-key, as-of, tenant denial, and ambiguity tests |
| 5 | DB schema / migrations | DONE | Migrations `0019`–`0026` + `0030` applied on Neon (`db:migrate` 2026-07-25); schema migration tests 3/3 |
| 6 | Ownership / tenancy registration | DONE | Schema ownership manifest + hard-tenant roots; `audit:tenancy-nulls` PASS incl. all 29 `ca_*` roots |
| 7 | Events / permissions / auth map | PARTIAL | `company.status-changed.v1` wired in manifest; authority event families beyond company lifecycle remain absent |
| 8 | Domain commands / queries | PARTIAL | CA-1 full command/query set (incl. archive/as-of/end-name/update|retire-identifier); CA-2–CA-6 expose mostly create/get/list |
| 9 | Memory / Drizzle adapters | DONE | CA-1 name/identifier/lifecycle mutations atomic in memory + Drizzle CTE; memory + Drizzle parity/concurrency green with `REQUIRE_DATABASE_TESTS=1` |
| 10 | App composition / Actions | PARTIAL | CA-1 Actions complete; later-slice Actions absent |
| 11 | UI / routes / navigation | PARTIAL | Operator/client CA-1 routes, table, detail, registration, timeline, edit, lifecycle (incl. archive); empty/error state helpers; later-slice panels absent |
| 12 | Tests / reconciliation / green gates | PARTIAL | CA package 25/25, web Actions 7/7, schema migration 3/3, Playwright CA-1 journey; module-wide `governance:packages` blocked by HR validate-modules |

**Executable completeness:** 6/12 boundaries fully closed; 6/12 partial.

## Delivery slices

| Slice | Status | Remaining work |
| ----- | ------ | ----- |
| CA-0 | DONE | Authority and governance baseline closed |
| CA-0.5 | DONE | Focused master-data lookup and adverse cases |
| CA-1 | DONE | Legal-company registry closed end-to-end (see verification evidence) |
| CA-2 | PARTIAL | Create/get/list scaffold exists; amend/end/retire/close/approve/revoke commands, events, Actions, UI, and parity tests absent |
| CA-3 | PARTIAL | Initial share-ledger create/read exists; post/reverse/update/close/replace/cancel/end flows and concurrency proof absent |
| CA-4 | PARTIAL | Register/read scaffold exists; update/dispose/write-off/renew/expire/release lifecycles and full-stack surfaces absent |
| CA-5 | PARTIAL | Register/read scaffold exists; renew/suspend/revoke/close/amend/end/terminate flows, cycle proof, and full-stack surfaces absent |
| CA-6 | PARTIAL | Register/read and due/overdue scaffold exists; supersede/retire/extend/waive/acknowledge/reject flows and full-stack surfaces absent |
| CA-7 | PARTIAL | Search and due/overdue queries exist; projector rebuild, reminders, export/reconciliation, and any approved import slice absent |
| CA-8 | GAP | Full performance, accessibility, redaction, failure-injection, Neon parity, and E2E closeout not complete |

## Current verification evidence

| Command | Result |
| --- | --- |
| `AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate` | PASS — migrations applied successfully (2026-07-25) |
| `pnpm --filter @afenda/db db:ensure-permission-catalog` | PASS — 223 permissions |
| `pnpm audit:tenancy-nulls` | PASS — 228 hard tenant roots incl. 29 `ca_*` |
| `pnpm --filter @afenda/corporate-administration lint` | PASS |
| `pnpm --filter @afenda/corporate-administration typecheck` | PASS |
| `pnpm --filter @afenda/corporate-administration test` | PASS — 11 files, 25 passed (incl. Drizzle parity/concurrency with `REQUIRE_DATABASE_TESTS=1`) |
| `pnpm --filter @afenda/db test -- corporate-administration-schema-migrations` | PASS — 3 tests |
| `pnpm --filter @afenda/events test -- corporate-administration` | PASS (no matching filter files; exit 0) |
| `pnpm --filter @afenda/web test -- corporate-administration` | PASS — 7 tests |
| `pnpm governance:packages` | FAIL — `validate:modules`: `HUMAN_RESOURCES_QUERY_ASSIGNMENT_AS_OF is not defined` (HR residue; outside CA-1 scope) |
| `e2e/journey/corporate-administration-legal-company.spec.ts` | Added — operator registry open/list journey |

## Verdict

**CA-1: COMPLETE.** Legal-company registry is end-to-end: Neon DDL applied, tenancy audit clean, domain invariants/idempotency, atomic adapters (memory + Drizzle), web Actions/UI, memory↔Drizzle parity + concurrency, and Action tests green.

**Module (CA-8 / overall): NO-GO.** CA-2 through CA-7 remain explicitly partial; package lifecycle stays `scaffolded` per authority until later slices close.
