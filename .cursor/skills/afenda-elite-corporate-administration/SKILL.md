---
name: afenda-elite-corporate-administration
description: >-
  Implements and extends @afenda/corporate-administration from the living
  package and Corporate Administration product requirements: statutory company
  identity, governance, authority, entity records, compliance, filings, and
  operations. Investor/capital/ownership capabilities belong to Investor Relations.
disable-model-invocation: true
---

# Afenda Elite — Corporate Administration

Corporate Administration is the statutory and corporate-secretarial system of record. Its permanent product and acceptance authority is `packages/erp/corporate-administration/PRD.md`; deleted historical phase and slice packs are not execution authority.

```text
LOAD:
  companions: reference.md · verification.md
  packages/erp/corporate-administration/PRD.md
  packages/erp/corporate-administration/README.md
  packages/erp/corporate-administration/**
  packages/data-plane/db/src/schema/corporate-administration.ts  # when schema is relevant
  apps/web/lib/erp/corporate-administration-*.ts
  apps/web/app/actions/*corporate-administration* · *legal-company*
  apps/web/features/corporate-administration/**
SKIP:
  Living docs/architecture as required LOAD
  hand-editing generated module catalogs or manifest outputs
  dual-write ca_* from apps/web or peer ERP packages
  peer ERP /src imports or lateral table writes
  securities, capital, investors, shareholders, beneficial ownership, or distributions
  Model A ports-per-call alongside the composed runtime
VERIFY:
  pnpm --filter @afenda/corporate-administration lint
  pnpm --filter @afenda/corporate-administration typecheck
  pnpm --filter @afenda/corporate-administration test
  pnpm validate:modules
  pnpm governance:packages
```

## Product boundary

Corporate Administration owns legal-company identity and lifecycle, establishments, governance bodies, statutory officers, meetings and resolutions, corporate authority, mandates, company seals, administrative entity assets and instruments, group structure, agreements, non-securities corporate actions, corporate documents, statutory registers, compliance rules, filings, and operational projections.

Investor Relations owns securities, capital transactions, investors, shareholders, holdings, certificates, beneficial ownership, and distributions. CA consumes only approved public projections or events from that future bounded context.

## Hard rules

1. **Requirements first** — select one unmet requirement group from `PRD.md`; inspect living code and evidence before editing.
2. **One requirement group per mission** — deliver it vertically and stop; do not bundle unrelated product areas.
3. **Sole mutator** — only this package writes `ca_*`; tables remain registered through the package manifest and schema-ownership controls.
4. **Composed runtime** — production ports are created at the application composition root; per-call options carry trusted request facts only.
5. **Semantic ownership** — operation IDs, permissions, approval posture, events, and diagnostics derive from canonical domain registries.
6. **Feature-first placement** — business behavior lands under `src/features/<feature>` with its schema, rules, narrow store contract, and adapters; shared semantics live in `src/kernel`; assembly lives in `src/composition`.
7. **Durability** — mutations preserve parse/normalize/fingerprint, authorization, approval, idempotency, transaction, audit, outbox, and completion ordering.
8. **Approval boundary** — CA owns required-decision policy; the platform owns approval decisions and persistence. Missing production verification fails closed.
9. **Peer boundaries** — Master Data, Investor Relations, Payments, Accounting, documents, search, notifications, and signatures are consumed through approved ports/events only.
10. **History** — legally material records preserve effective time, recorded time, correction/supersession lineage, and deterministic as-of/known-at behavior.
11. **Tenancy** — every aggregate, command, query, unique key, reference, and mutation is organization-scoped.
12. **Public API** — package root plus declared subpaths only; no consumer deep imports or package-owned Next.js/UI.
13. **App boundary** — Server Actions stamp session facts, validate input, map package `Result` to `ActionResult`, and never access Drizzle directly.
14. **Quality** — enterprise production evidence only; no stub, shim, fabricated success, skipped required lane, or compile-only completion claim.

## Execution workflow

1. Read `PRD.md` and identify the smallest unmet requirement group.
2. Confirm external dependencies and current disk behavior; an unavailable prerequisite is `BLOCKED`.
3. State the canonical owner, permanent consumer surface, normalization boundary, and unavoidable consumer blast radius.
4. Implement the group across every required package, database, adapter, app, UI, test, and operational layer.
5. Run the applicable lanes in `verification.md` and update requirement status only from observed evidence.
6. Return the standard requirement-group handoff and stop.
7. Do not commit or push unless explicitly requested.

## Verification checklist

- [ ] Requirement IDs and acceptance evidence named
- [ ] Investor Relations exclusions preserved
- [ ] No peer writes or deep imports
- [ ] Package lint, typecheck, and tests green
- [ ] Database/Neon, web, accessibility, migration, recovery, and operations lanes run when applicable
- [ ] Fourteen-boundary matrix reported with no false completion
- [ ] Requirements status updated from exact commands
