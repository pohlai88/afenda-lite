---
name: afenda-elite-corporate-administration
description: >-
  Implements and extends @afenda/corporate-administration using the
  CA-GREENFIELD-ENTERPRISE-01 scratch authority — greenfield bounded context,
  ca_* sole mutator, Model B composed runtime, slice-by-slice delivery, and
  fourteen-boundary acceptance. Use when adding CA commands, schemas, store,
  migrations, Drizzle adapters, Server Actions, UI, slice CA-X.Y work, or when
  the user mentions corporate administration, legal company, ca_* tables, or
  afenda-elite-corporate-administration.
disable-model-invocation: true
---

# Afenda Elite — Corporate Administration

**SSOT for `@afenda/corporate-administration` greenfield delivery.** Mission `CA-GREENFIELD-ENTERPRISE-01` — statutory system of record, not a company profile feature.

```text
LOAD:
  companions: reference.md · verification.md
  docs-V2/_scratch/erp/corporate-administration/greenfield/
    00-CORPORATE-ADMINISTRATION-AUTHORITY.md
    02-PACKAGE-ARCHITECTURE-AND-CONTRACTS.md
    03-ROADMAP-INDEX.md
    90-VERIFICATION-ACCEPTANCE-AND-HANDOFF.md
    phase/PHASE-<N>-*.md          # active phase only
    evidence/CA-<X.Y>-EVIDENCE.md # when slice has evidence
  packages/erp/corporate-administration/**
  packages/data-plane/db/src/schema/corporate-administration.ts  # when slice touches schema
  apps/web/lib/erp/corporate-administration-*.ts
  apps/web/app/actions/*corporate-administration* · *legal-company*
  apps/web/features/corporate-administration/**
SKIP:
  Living docs/architecture as required LOAD
  pre-greenfield CA implementation or dropped ca_* tables as contracts
  hand-editing generated module catalogs / manifest outputs
  dual-write ca_* from apps/web or peer ERP packages
  peer ERP /src imports or lateral table writes
  Model A (ports per call) alongside Model B composed runtime
VERIFY:
  pnpm --filter @afenda/corporate-administration lint
  pnpm --filter @afenda/corporate-administration typecheck
  pnpm --filter @afenda/corporate-administration test
  pnpm validate:modules
  pnpm governance:packages
  # when Actions/UI touched — see verification.md § Web
```

| Doc | Purpose |
|-----|---------|
| [reference.md](reference.md) | Authority paths · phases · slice register · execution model |
| [verification.md](verification.md) | 14 boundaries · verify lanes · standard handoff |
| Scratch `greenfield/00-*` | Bounded context · identity model · greenfield reset |
| Scratch `greenfield/02-*` | Target layout · command options · ports |
| Scratch `greenfield/03-*` | Slice register · status vocabulary |
| Scratch `greenfield/90-*` | Acceptance matrix · evidence hierarchy |
| Package README | Current slice position on disk |
| [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) | Brands · Result · ActionResult at app boundary |
| [afenda-elite-backend-modules](../afenda-elite-backend-modules/SKILL.md) | Ports · composition root |
| [afenda-elite-monorepo-discipline](../afenda-elite-monorepo-discipline/SKILL.md) | DAG · exports |

## When to use

- Implementing or reviewing any CA slice (`CA-0.1` … `CA-8.6`)
- Adding commands, queries, schemas, store contracts, or adapters under `@afenda/corporate-administration`
- Corporate Administration migrations, `ca_*` schema, or tenancy hard roots
- Server Actions, routes, or UI under `features/corporate-administration`
- Phase-close verification or fourteen-boundary handoff

## Hard rules

1. **Greenfield only** — no completion claims from removed pre-greenfield CA; inspect disk before every edit.
2. **One slice per mission** — finish selected `CA-X.Y` vertically, hand off, stop; do not start the next slice unless asked.
3. **Sole mutator** — only this package writes `ca_*`; register tables in `mutation-tables.ts` + SCHEMA-OWNERSHIP-MANIFEST.
4. **Model B composed runtime** — `createCorporateAdministrationRuntime` at `apps/web/lib/erp/corporate-administration-runtime.ts`; per-call options carry request facts only; no in-package production adapter fallback.
5. **Subdomain decomposition** — schemas/types/rules/store per subdomain; root store composes narrow stores; no generic `common`/`utils`/`repository` dumps (see scratch `02-*` §1).
6. **Kernel shared primitives** — `kernel/` holds invariant helpers shared by three or more subdomains only.
7. **Command options** — `organizationId`, `actorUserId`, `correlationId`, `idempotencyKey`, `authorization` stamped at composition root; never inside payload schemas.
8. **Peer boundaries** — foreign facts via public ports, registered events, or approved read edges; never mutate `md_*`, HR, payments, or accounting tables from CA.
9. **Party vs legal company** — Master Data owns `party_id`; CA owns statutory names, legal form, status, registers; no dual-write to `md_party`.
10. **Public API** — package root + declared subpaths only; no deep `src/*` imports; no Next.js or UI in the package.
11. **Quality bar** — enterprise production only; no shim/stub/placeholder behavior, compile-only shells, or skipped required tests as evidence.
12. **Tenancy** — every aggregate, command, query, unique key, and mutation scoped by `organizationId`.
13. **Idempotency + atomicity** — fingerprint after parse/normalize; same-key replay vs conflict; domain + receipt + audit + outbox in one transaction when a slice introduces mutations.
14. **App boundary** — Actions: authz + Zod inside action, map package `Result` → `ActionResult`; UI from `@afenda/ui-system` barrel only.
15. **Status truth** — when `03-ROADMAP-INDEX`, phase doc, package README, or evidence disagree, trust disk + test output; report drift; update only the slice evidence file when closing a slice.

## Quick start (new slice)

1. Read active phase doc + slice row in [reference.md](reference.md) / scratch `03-ROADMAP-INDEX.md`.
2. Confirm dependencies (`CA-X.Y` depends on …) are `DONE` with evidence or stop.
3. Implement across every layer the slice requires (package · DB · adapters · composition · Actions · UI · tests).
4. Add or update `greenfield/evidence/CA-X.Y-EVIDENCE.md` with command output — do not mark slice `DONE` without it.
5. Run verify lanes in [verification.md](verification.md); return standard handoff §9 from scratch `90-*`.
6. Do not commit/push unless explicitly requested.

## Agent operating rules

1. Prefer **extend** subdomain folders over new root monoliths.
2. If scratch authority and disk disagree — stop (Confusion management in AGENTS.md).
3. Do not invent subpackages or nest CA under another ERP farm.
4. Unavailable `DATABASE_URL` or Neon lane → `BLOCKED`, not passed.
5. Preserve unrelated working-tree changes.
6. For UI work after capability exists — load [afenda-elite-ui-compose](../afenda-elite-ui-compose/SKILL.md) + [afenda-elite-frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md).

## Verification checklist

- [ ] Slice ID named; dependencies satisfied or mission stopped
- [ ] Changes in correct subdomain / adapter / app layer — not a root dump
- [ ] No peer writes to foreign bounded-context tables
- [ ] `pnpm --filter @afenda/corporate-administration` lint · typecheck · test green
- [ ] `pnpm validate:modules` · `pnpm governance:packages` when manifest/schema/catalog touched
- [ ] Fourteen-boundary matrix in handoff — no phase close with PARTIAL/GAP/BLOCKED
- [ ] Evidence file updated when slice closes
