# OpenAPI execution (api-now)

**Scratch SSOT:** [docs-V2/api/rest.md](../../../docs-V2/api/rest.md) · [docs-V2/api/README.md](../../../docs-V2/api/README.md)  
**Machine file:** `docs-V2/api/OPEN-001-openapi.yaml` (generated — do not hand-maintain forever)  
**Paths SSOT:** disk `apps/web/app/api/**` + [api-now.md](api-now.md)  
**Living pack:** `docs/api/OPEN-001*` — **retired on this checkout** (do not restore without Docs-lane approval)

## Commands

```bash
pnpm openapi:generate
pnpm check:openapi
```

`check:openapi` fails on missing YAML, regenerate drift, Spectral errors, or `x-afenda-status: api-now` ops without a matching `apps/web/app/api/**/route.ts`. Hooked into `pnpm checks` via `scripts/run-checks.mjs`.

`check:doc-integrity` (Living `docs/api` scope) is **N/A** while that tree is absent — OpenAPI is gated independently.

## Artifact split

| Artifact | Owns |
|----------|------|
| `docs-V2/api/rest.md` | Human RH allowlist + wire shapes |
| `docs-V2/api/OPEN-001-openapi.yaml` | OAS 3.0.3 document only |
| `@afenda/openapi` | Extended `z` · `{ data }` envelope · metadata stamps · YAML emit |
| `scripts/generate-openapi.mts` | Path registration composition → YAML |
| `.spectral.yaml` | Lint |

## Current YAML scope (api-now)

**Include:** `GET /api/health/liveness`, `GET /api/health/readiness`, `GET /api/metrics`, `APIErrorBody`, `{ data }` envelopes.
**Exclude:** Neon Auth `/api/auth/*`, session bridges `/api/session/*` (redirect / plain-text), The Machine stream `/api/ai/chat`, contract-only REST, wiped Declarations draft / FFT HTTP.

**Disk honesty:** `pnpm check:openapi` fails if any `x-afenda-status: api-now` operation lacks `apps/web/app/api/**/route.ts`. Session bridges are allowlisted on disk but intentionally absent from YAML.

Success responses **must** be `{ data: T }`. Errors are bare `APIErrorBody`.

## When to regenerate

Any of: health / metrics handler shape change; shared error/envelope change; approved new api-now family added to YAML.

## Forward work (recorded)

| Item | Status |
|------|--------|
| Import live Zod (drop inline mirrors) | **DONE** — `@afenda/openapi` + web `openapi-zod` re-export + module schemas |
| Fumadocs SchemaRecord `input: { [OPENAPI_DOCUMENT_ID]: OPENAPI_DOCUMENT_PATH }` | **DONE** — `@afenda/docs` cwd-independent; `pnpm --filter @afenda/docs generate:openapi-docs` |
| Contract-only ops with `x-afenda-status: contract-only` | Forward — only when a real external consumer exists |

## Anti-mixing

- Do not invent offline REST catalogues in YAML
- Do not dump contract-only paths into YAML without a consumer
- Do not add product Swagger UI under Afenda-Lite app routes
- Do not retarget YAML back to deleted `docs/api/` without Docs-lane restore
