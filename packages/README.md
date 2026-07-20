# `packages/`

Workspace home for **`@afenda/*`** libraries consumed by `apps/web` and (narrowly) `apps/docs`. Rank-1 Platform (with **bands**) and Rank-2 Surfaces packages live here; Application code stays under `apps/*`.

Import by package name only (`@afenda/<name>` or a declared `exports` subpath). Packages never import `apps/*`. Layer DAG and ERP governance: [docs-V2/monorepo](../docs-V2/monorepo/README.md) · [LAYERS.md](../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · [WORKSPACE-EDGE-REGISTER.yaml](../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml) · [SCHEMA-OWNERSHIP-MANIFEST.yaml](../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml).

For engineers extending Platform or Surfaces; each package README is the consume / maintain entry. Agent checkout posture: [AGENTS.md](../AGENTS.md).

**Catalog version:** `packages-catalog/2026-07-21`  
**Layout state:** Phase 1–3 complete; one-level category nesting active (`packages/<category>/<name>`).  
**ERP promotion state:** Phase 4 complete through Accounting.  
**Current roadmap:** No approved candidate modules ([MODULE-ROADMAP.yaml](../docs-V2/modules/MODULE-ROADMAP.yaml)).  
**Production evidence:** Catalog status is valid only for the repository commit whose package-governance gate passes. See [docs-V2/monorepo](../docs-V2/monorepo/README.md) § Phase status.  
**Last disk verification:** `pnpm governance:packages` OK · `2026-07-21` (re-run and stamp commit SHA after merge).

Package identity remains `@afenda/<name>` regardless of its physical category folder. Category nesting does not change package names or consumer imports. Categories are not packages — do not publish `@afenda/foundation`, `@afenda/erp`, etc. All packages are workspace-private unless a package manifest explicitly declares an approved publication policy.

Band identifiers are stable classification labels, not numeric dependency levels. Rank 1E is reserved. Rank 1X identifies constrained intelligence capabilities and does not grant lateral or unrestricted imports.

## Layers

Imports flow **down** only. No cycles. `@afenda/config` is devDep / tsconfig / Biome extend only — not a runtime import. **Bands / category folders classify and organize only; they never grant dependency rights.**

| Rank | Layer | Packages |
|------|-------|----------|
| 2 | Surfaces (R2) | [`ui-system`](./surfaces/ui-system/README.md) · [`emails`](./surfaces/emails/README.md) |
| 1 | Platform | See banded catalog below |

Application (`apps/web` · `apps/docs`) is Rank 3 — outside this folder. Physical layout: `packages/<category>/<name>/`.

## Dependency matrix

Category placement does not create dependency rights. The following is the effective package dependency direction. Every actual edge must exist in both the consumer `package.json` and [WORKSPACE-EDGE-REGISTER.yaml](../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml). The register is authoritative where this summary is insufficient. Living edges: [LAYERS.md](../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md).

| Consumer | May depend on |
|----------|---------------|
| Foundation (R1-A) | No internal `@afenda/*` runtime packages (`@afenda/env` / `@afenda/errors` are leaves; `@afenda/config` is tooling only) |
| Runtime Infrastructure (R1-B) | Foundation (`env` · `errors` where registered). Most runtime packages are leaves with no `@afenda/*` deps |
| Data Plane (R1-C) | Foundation · `@afenda/db` (for platform table stores). Same-band only via registered edges |
| Control Plane (R1-D) | Foundation · Runtime · approved Data Plane packages (`@afenda/admin` → `auth` · `db` · `env` · `errors`) |
| ERP (R1-F) | Foundation · Data Plane contracts explicitly registered (`db` · `errors` · `audit` · `events` · `search` as approved). Master-data backbone edges for transactional consumers are registered — not peer transactional ERP imports by default |
| Intelligence (R1-X) | Foundation (`errors`) and declared application-facing contracts only — no `@afenda/db`, no ERP packages |
| Surfaces (R2) | Foundation and browser-safe declared contracts only (`ui-system` must stay free of server-only / DB code) |
| Applications (R3) | Any approved package through its public exports |

Same-band imports are allowed only when listed in the edge register. One data-plane package does not automatically import another.

## Catalog

### Surfaces — Rank 2 — [`surfaces/`](./surfaces/README.md)

| Package | Runtime | Status | Role |
|---------|---------|--------|------|
| [`@afenda/ui-system`](./surfaces/ui-system/README.md) | Browser/SSR | Active | Owned-source shadcn/Radix primitives + semantic tokens (flat barrel) |
| [`@afenda/emails`](./surfaces/emails/README.md) | Node (React Email) | Active | React Email templates for app-owned mail composition |

### Platform Foundation — Rank 1A — [`foundation/`](./foundation/README.md)

| Package | Runtime | Status | Role |
|---------|---------|--------|------|
| [`@afenda/config`](./foundation/config/README.md) | Node/build | Active | Shared Biome + TypeScript bases (dev-time only) |
| [`@afenda/env`](./foundation/env/README.md) | Node/build | Active | Typed env contract (`createEnv` + Zod) — sole product env SSOT |
| [`@afenda/errors`](./foundation/errors/README.md) | Universal | Active | Transport-neutral `AppError` / codes / `Result` leaf |

### Runtime Infrastructure — Rank 1B — [`runtime/`](./runtime/README.md)

| Package | Runtime | Status | Role |
|---------|---------|--------|------|
| [`@afenda/logger`](./runtime/logger/README.md) | Node + edge emit | Active | Pino Node logger + edge-safe emit |
| [`@afenda/http`](./runtime/http/README.md) | Node/Edge by export | Active | Fetch compose · correlation · pagination · rate-limit / timing headers |
| [`@afenda/security`](./runtime/security/README.md) | Node/Edge | Active | Security headers · CSP · CORS builders |
| [`@afenda/metrics`](./runtime/metrics/README.md) | Node | Active | Prometheus registry · HTTP/DB/cache instruments |
| [`@afenda/openapi`](./runtime/openapi/README.md) | Node/build | Active | Zod→OpenAPI glue · `{ data }` envelope · YAML emit |
| [`@afenda/rate-limit`](./runtime/rate-limit/README.md) | Node | Active | Sliding-window abuse limiter (Upstash; memory = local/test only) |
| [`@afenda/cache`](./runtime/cache/README.md) | Node | Active | L1 process + Upstash Redis L2 (fail closed in production without Upstash) |

Memory adapters for rate-limit and cache are test and local-development only unless a deployment explicitly declares degraded single-instance operation. Production must fail closed or report a startup error when the required distributed backend is unavailable. Cache may fail open for availability only where designed; authorization, idempotency, and rate limiting must not depend on an unsafe local fallback.

### Data Plane — Rank 1C — [`data-plane/`](./data-plane/README.md)

| Package | Runtime | Status | Role |
|---------|---------|--------|------|
| [`@afenda/db`](./data-plane/db/README.md) | Node only | Active | Neon HTTP + Drizzle · schema representation, connectivity, migrations |
| [`@afenda/audit`](./data-plane/audit/README.md) | Node | Active | Sole `platform_audit_log` write/list/export SSOT |
| [`@afenda/events`](./data-plane/events/README.md) | Node | Active | Sole `platform_domain_event` outbox SSOT |
| [`@afenda/search`](./data-plane/search/README.md) | Node | Active | Sole `platform_search_document` Postgres FTS SSOT |
| [`@afenda/notifications`](./data-plane/notifications/README.md) | Node | Active | Sole `platform_notification` IN_APP inbox SSOT |

`@afenda/db` owns schema representation, database connectivity, and migrations. It does **not** gain business mutation ownership by hosting a table definition. Business write ownership remains with the package declared in [SCHEMA-OWNERSHIP-MANIFEST.yaml](../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml).

### Identity and Control Plane — Rank 1D — [`control-plane/`](./control-plane/README.md)

| Package | Runtime | Status | Role |
|---------|---------|--------|------|
| [`@afenda/auth`](./control-plane/auth/README.md) | Node | Active | Neon Auth adapter · session · BFF · Path A credentials |
| [`@afenda/admin`](./control-plane/admin/README.md) | Node | Active | Org-console services · RBAC audit · health / provision |

### ERP — Rank 1F — [`erp/`](./erp/README.md)

| Package | Runtime | Status | Role |
|---------|---------|--------|------|
| [`@afenda/master-data`](./erp/master-data/README.md) | Node | Active | `ref_*` + org masters (`md_party` · `md_item*` · `md_warehouse`) |
| [`@afenda/sales`](./erp/sales/README.md) | Node | Active | Sales order/line consumer (ARCH-006) |
| [`@afenda/purchasing`](./erp/purchasing/README.md) | Node | Active | Purchase order/line consumer (ARCH-006) |
| [`@afenda/inventory`](./erp/inventory/README.md) | Node | Active | Stock movement / balance / reservation sole mutator (ARCH-006) |
| [`@afenda/receiving`](./erp/receiving/README.md) | Node | Active | Goods receipt / line / discrepancy sole mutator (ARCH-006) |
| [`@afenda/fulfillment`](./erp/fulfillment/README.md) | Node | Active | Delivery / line / pick / pack / proof-of-delivery sole mutator (ARCH-006) |
| [`@afenda/receivables`](./erp/receivables/README.md) | Node | Active | Sales invoice / line / credit note / allocation / customer-balance projection sole mutator (ARCH-006) |
| [`@afenda/payables`](./erp/payables/README.md) | Node | Active | Supplier invoice / line / credit note / allocation / balance projection / three-way-match result sole mutator (ARCH-006) |
| [`@afenda/payments`](./erp/payments/README.md) | Node | Active | Payment / allocation / reversal sole mutator; refunds are payment rows with `direction = refund` (ARCH-006) |
| [`@afenda/accounting`](./erp/accounting/README.md) | Node | Active | Journal / journal line / ledger posting / accounting period / CoA / posting profile sole mutator (ARCH-006) |

Peer R1-F packages do not import each other by default. ERP peer collaboration occurs only through:

- application-injected ports (consumer-owned interface at the composition root in `apps/web`);
- registered domain events via `@afenda/events`;
- data-plane projections / approved query contracts.

An ERP package must not import another ERP package’s source, schemas, or command handlers unless a dual-control edge is approved (for example registered Inventory stock-mutation calls from Receiving/Fulfillment). Integration points are identity + events only unless the edge register says otherwise.

A package may read a foreign-owned table only through an approved query port, projection, or registered read edge. It may never insert, update, or delete a foreign-owned table. Direct table writes are allowed only inside the package named as `writeOwner` in [SCHEMA-OWNERSHIP-MANIFEST.yaml](../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml). Machine check: `pnpm governance:packages`.

### Intelligence — Rank 1X — [`intelligence/`](./intelligence/README.md)

| Package | Runtime | Status | Role |
|---------|---------|--------|------|
| [`@afenda/ai-the-machine`](./intelligence/ai-the-machine/README.md) | Node | Active | AI SDK conversational engine (prompt-only assistants) |

Production posture: no direct ERP table access; no authority derived from model output; no mutations without application-owned validated tools; organization-scoped context only; prompt and output handling follow redaction and audit policy.

## Consume

```ts
import { env } from "@afenda/env";
import { Button } from "@afenda/ui-system";
```

- Prefer package name / declared `exports` — never `../../packages/...` or `@afenda/*/src/...`
- Internal deps: `"workspace:*"` · shared externals: `"catalog:"` when listed
- New or changed workspace edges: update `package.json` **and** [WORKSPACE-EDGE-REGISTER.yaml](../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml) in the same mission
- Env: `@afenda/env` + `.env.local` — never raw `process.env` for product config
- UI: `@afenda/ui-system` barrel only — do not revive `@afenda/ui`
- Tenancy: organization-scoped rows (`organization_id`) on shared schema — never multi-DB / project-per-tenant isolation
- All organization-owned queries and mutations must receive organization context explicitly. Lookup by record ID alone is prohibited unless the query also proves organization ownership
- Cache keys, search documents, domain events, notifications, audit entries, and rate-limit identities must preserve organization boundaries where applicable

## Maintain

**Engines:** Node.js `24.x` · pnpm `>=10.33.4` (root `package.json`).

```bash
pnpm --filter @afenda/<name> lint
pnpm --filter @afenda/<name> typecheck
pnpm --filter @afenda/<name> test
pnpm --filter @afenda/<name> build   # when the package defines a build script
```

Most `@afenda/*` packages are TypeScript source consumed via workspace — `typecheck` is the compile gate when no `build` script exists. Persistence packages may add `test:contract` / integration suites as needed; do not invent empty scripts.

Add / rename packages only with a DAG update in [docs-V2/monorepo](../docs-V2/monorepo/README.md), a WORKSPACE-EDGE-REGISTER row, catalog entry here, and `CATALOG_EXPECTED_PACKAGES` in `scripts/validate-modules/checks.mjs`. Place new packages under the matching category folder; keep package identity `@afenda/<name>`.

## Production gate

A package change is production-eligible only when the repository package governance gate passes at the candidate commit:

```bash
pnpm governance:packages
pnpm exec turbo run typecheck test
```

`pnpm governance:packages` includes:

- catalog-to-disk parity
- package-name and physical-path validation
- forbidden deep-import scan
- workspace-edge register parity
- dependency DAG and cycle validation (ERP manifests)
- schema write-owner (sole-mutator) validation
- ERP authorization-port presence
- generated register drift check

The README describes intended architecture; passing evidence is the production approval. Record **Last disk verification** above after a green gate at HEAD.

## Authority

| Topic | Link |
|-------|------|
| Layer DAG · ERP governance | [docs-V2/monorepo](../docs-V2/monorepo/README.md) · [LAYERS.md](../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Workspace edges | [WORKSPACE-EDGE-REGISTER.yaml](../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml) · [PACKAGE-GOVERNANCE.md](../docs-V2/modules/PACKAGE-GOVERNANCE.md) |
| Schema write ownership | [SCHEMA-OWNERSHIP-MANIFEST.yaml](../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Module roadmap | [MODULE-ROADMAP.yaml](../docs-V2/modules/MODULE-ROADMAP.yaml) |
| pnpm · catalog | [docs-V2/pnpm](../docs-V2/pnpm/README.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../docs-V2/tenancy/README.md) |
| Repo quickstart | [README.md](../README.md) |
| Agent checkout | [AGENTS.md](../AGENTS.md) |

## Historical program evidence

The following material records how the package-governance program was executed. It is informative and non-normative:

- [packages_governance.md](../docs-V2/_scratch/packages_governance.md)

Where Scratch content conflicts with an Active governance document, the Active document prevails.
