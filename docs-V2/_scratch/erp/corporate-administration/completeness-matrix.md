# Corporate Administration — Plan-to-Code Completeness Matrix

| Field | Value |
| ----- | ----- |
| Authority | [corporate-administration-integrated-implementation-authority.md](./corporate-administration-integrated-implementation-authority.md) |
| Updated | 2026-07-25 |
| Package lifecycle | `scaffolded` |
| Status legend | `DONE` · `PARTIAL` · `GAP` · `BLOCKED` · `NOT_APPLICABLE` |

This register reports executable behavior, not table or file presence. A slice is
not `DONE` until its authority-required commands, queries, transaction evidence,
web surface, and tests are all present. Slice summary also lives in authority
§12 and §15.0.

## Runtime boundaries (12) — module-wide

| # | Boundary | Status | Evidence / remaining gap |
| --- | --- | --- | --- |
| 1 | Approved authority / closed decisions | DONE | Integrated authority §2 |
| 2 | Module roadmap / registration | DONE | Roadmap + package/manifest registration present; lifecycle remains `scaffolded` |
| 3 | Package shell / manifest | DONE | `@afenda/corporate-administration`; lifecycle intentionally remains `scaffolded` |
| 4 | Master-data legal-entity get-effective | DONE | By-id/by-key, as-of, tenant denial, and ambiguity tests; CA uses public ports only |
| 5 | DB schema / migrations | DONE | Migrations `0019`–`0026`, `0030`, `0033`, `0037` on disk; schema migration tests cover 34 CA tables |
| 6 | Ownership / tenancy registration | DONE | Schema ownership manifest + hard-tenant roots include `ca_*` |
| 7 | Events / permissions / auth map | PARTIAL | CA-1–CA-4 event schemas and permission maps registered; CA-4 Drizzle same-transaction audit/outbox proof and CA-5+ remain open |
| 8 | Domain commands / queries | PARTIAL | CA-1–CA-4 full command/query sets; CA-5–CA-6 mostly create/get/list; CA-7 search/due queries |
| 9 | Memory / Drizzle adapters | PARTIAL | CA-1–CA-3 atomic audit/outbox; CA-4 memory atomicity/concurrency green and Drizzle roots/facts implemented, but CA-4 same-Neon-transaction evidence remains blocked |
| 10 | App composition / Actions | PARTIAL | CA-1–CA-4 Actions complete; CA-5–CA-7 Actions absent |
| 11 | UI / routes / navigation | PARTIAL | Operator/client CA-1 routes + Governance/Premises + Capital + four CA-4 panels; CA-5+ panels absent |
| 12 | Tests / reconciliation / green gates | PARTIAL | CA-1–CA-3 closed; CA-4 unit/DB/event/Action/interaction green, fail-closed Neon/L4 exits open; CA-5–CA-8 closeout open |

**Executable completeness:** 6/12 boundaries fully closed; 6/12 partial. Module remains **NO-GO**.

## Delivery slices

| Slice | Status | Remaining work |
| ----- | ------ | ----- |
| CA-0 | DONE | Authority and governance baseline closed |
| CA-0.5 | DONE | Focused master-data lookup and adverse cases |
| CA-1 | DONE | Legal-company registry closed end-to-end (same-tx audit/outbox, Actions, UI, parity) |
| CA-2 | DONE | Governance/premises closed: same-tx audit/outbox, advisory locks, FI/parity/concurrency, L4 journey (authority §15.1A) |
| CA-3 | DONE | Share capital vertical closed end-to-end |
| CA-4 | PARTIAL | 10/12 boundaries: all 19 lifecycles, typed subjects, hybrid facts/receipts, `0037`, events, Actions, four tabs, unit/DB/event/Action/interaction evidence; same-Neon-transaction and fail-closed Neon/L4 exits remain |
| CA-5 | PARTIAL | Register/read + bank mask + self-link deny; renew/suspend/revoke/close/amend/end/terminate, cycle proof, Actions, UI absent |
| CA-6 | PARTIAL | Register/read scaffold exists; supersede/retire/extend/waive/acknowledge/reject, Actions, due UX absent |
| CA-7 | PARTIAL | Search and due/overdue queries over live tables; projector rebuild, reminders, export/reconciliation, approved import absent |
| CA-8 | GAP | Full performance, accessibility, redaction, failure-injection, Neon parity, and E2E closeout not complete |

## Current verification evidence

| Command | Result |
| --- | --- |
| `pnpm --filter @afenda/corporate-administration typecheck` | PASS (2026-07-25 audit) |
| `pnpm --filter @afenda/corporate-administration test` | PASS — 30 passed, 10 skipped (parity/concurrency need `DATABASE_URL`) |
| `pnpm --filter @afenda/corporate-administration test -- governance` | PASS — 4 passed, 3 skipped |
| `pnpm --filter @afenda/web exec vitest run --config ../../testing/vitest.config.ts --project web corporate-administration-governance` | PASS — 5 Actions tests |
| `pnpm exec vitest run --config testing/vitest.config.ts --project interaction corporate-administration-governance` | PASS — 5 interaction tests |
| `pnpm test:e2e:journey -- corporate-administration-governance` | Unevaluated without `workerTenant` / `E2E_*` credentials (spec skips explicitly) |
| Schema/migrations on disk | `0019`–`0026`, `0030`, `0033`, `0037` present; `corporate-administration-schema-migrations` covers 34 CA tables |
| CA package domain surface | CA-1–CA-4 full; CA-5–CA-7 create/read (plus CA-3 holdings; CA-7 search/due) |
| CA-1 audit/outbox | Wired in `memory-store.ts` and `adapters/drizzle/store.ts` |
| CA-2 audit/outbox | Wired in `governance-memory-store.ts` and `adapters/drizzle/governance-store.ts` |
| Web Actions | CA-1 legal-company; CA-2 governance (19); CA-3 share capital; CA-4 property/assets/IP/insurance/charges (19) |
| UI | CA-1 shell/table/detail/lifecycle; CA-2 Governance/Premises; CA-3 Capital; CA-4 Property, Corporate assets, Intellectual property, Insurance & charges |
| Package lifecycle | Remains `scaffolded` |

Re-run exact gate commands before claiming a new slice `DONE`.

## Verdict

**CA-1: COMPLETE.** Legal-company registry is end-to-end.

**CA-2: COMPLETE.** Governance and premises vertical closed with same-tx audit/outbox, advisory locks, FI/parity/concurrency evidence, and authenticated L4 journey.

**CA-3: COMPLETE.** Share capital vertical closed end-to-end.

**CA-4: PARTIAL (10/12).** Application boundaries are implemented; Neon atomicity/concurrency and authenticated L4 proof remain blocking exits.

**Module (CA-8 / overall): NO-GO.** CA-4 through CA-7 remain partial; package lifecycle stays `scaffolded` per authority until CA-8 closeout.
