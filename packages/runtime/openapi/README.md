# `@afenda/openapi`

**What it is** — Rank-1 Platform Zod→OpenAPI glue for Afenda-Lite: the single extended Zod instance, `{ data }` success-envelope helper, Afenda operation/document metadata stamps, and YAML emit for OPEN-001.

**What it does** — Extends Zod with `@asteasolutions/zod-to-openapi`, wraps inner response schemas as `{ data: T }`, stamps `operationId` / `x-afenda-status` / `x-afenda-document` onto generated documents, and writes generator-aligned YAML (header + stringify).

**When you need it** — Regenerating [`docs-V2/api/OPEN-001-openapi.yaml`](../../docs-V2/api/OPEN-001-openapi.yaml) from Zod, or defining RH schemas that must share the same OpenAPI-extended `z` prototype as the generator.

**Who it's for** — Root `scripts/generate-openapi.mts`, web platform schemas, and gates that consume the committed YAML. Next-free leaf: no `@afenda/*` runtime deps, no Next.js, no product Swagger UI (docs stay [`@afenda/docs`](../../apps/docs) Fumadocs).

## Consume

Workspace dependency — prefer subpaths for concern split:

```ts
import { z } from "@afenda/openapi/zod";
import {
	OPENAPI_VERSION,
	dataEnvelope,
	stampAfendaDocument,
	stampOperationMetadata,
	writeOpenApiYaml,
} from "@afenda/openapi/document";

const envelope = dataEnvelope(
	z.object({ status: z.literal("ok") }),
	"ExampleEnvelope",
);
```

Or the barrel:

```ts
import {
	OPENAPI_VERSION,
	dataEnvelope,
	z,
} from "@afenda/openapi";
```

**Living consumers:** `scripts/generate-openapi.mts` (composition root — registers paths from `apps/web` schemas); web schemas via `@/modules/platform/schemas/openapi-zod` re-export. Committed YAML + Spectral + api-now disk honesty stay at repo root (`pnpm openapi:generate` · `pnpm check:openapi`).

## Maintain

```bash
pnpm --filter @afenda/openapi lint
pnpm --filter @afenda/openapi typecheck
pnpm --filter @afenda/openapi test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/openapi` | Barrel — `z` + document helpers + registry re-exports |
| `@afenda/openapi/zod` | Single Zod instance extended for OPEN-001 generation |
| `@afenda/openapi/document` | `dataEnvelope` · metadata stamps · YAML emit · `OPENAPI_VERSION` · `OPENAPI_DOCUMENT_ID` (`x-afenda-document.id`; not the Fumadocs SchemaRecord path key in `@afenda/docs`) |

Full surface: [`src/index.ts`](./src/index.ts).

## Ownership

| Surface | Owner |
|---------|-------|
| Extended `z` · `{ data }` envelope · op/document stamps · YAML emit | `@afenda/openapi` |
| Health / error / RH Zod schemas | `apps/web/modules/platform/schemas/*` |
| Path registration composition | `scripts/generate-openapi.mts` |
| Drift · Spectral · api-now disk honesty | `scripts/check-openapi.mjs` |
| Human docs UI | [`@afenda/docs`](../../apps/docs) (Fumadocs — not product Swagger) |

**Layer:** Rank-1 Platform **leaf** (no `@afenda/*` runtime deps). Must not import Surfaces or `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Anti-goals

| Do not | Why |
|--------|-----|
| Product Swagger / Scalar under `apps/web` | Docs SSOT is `@afenda/docs` |
| Manual OAS builders (`createOpenAPISpec` / mutative path maps) | Zod registry is SSOT |
| Hand-edit committed YAML to “pass” gates | Fix Zod / generator, then regenerate |
| Import `apps/*` from this package | Packages never import apps |
| OpenAPI 3.1 bump without docs cutover | Living artifact is OAS 3.0.3 |

## Authority

| Topic | Link |
|-------|------|
| API Scratch · REST · OPEN-001 | [docs-V2/api](../../docs-V2/api/README.md) · [rest.md](../../docs-V2/api/rest.md) · [OPEN-001-openapi.yaml](../../docs-V2/api/OPEN-001-openapi.yaml) |
| Package DAG | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| API contract farm | [afenda-elite-api-contract](../../.cursor/skills/afenda-elite-api-contract/SKILL.md) · [openapi.md](../../.cursor/skills/afenda-elite-api-contract/openapi.md) |
| Official docs site | [`@afenda/docs`](../../apps/docs) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
