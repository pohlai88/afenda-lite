# OpenAPI execution (OPEN-001)

**SSOT:** [docs/api/OPEN-001-openapi.md](../../../docs/api/OPEN-001-openapi.md)  
**How-to:** [GUIDE-011](../../../docs/api/guides/GUIDE-011-generating-and-validating-openapi.md) (Draft how-to — does not override OPEN-001)  
**Machine file:** `docs/api/OPEN-001-openapi.yaml` (generated — do not hand-maintain forever)  
**Paths SSOT:** [REST-001](../../../docs/api/REST-001-rest-resources.md) — do not paste path tables here.  
**Parent:** [ARCH-029](../../../docs/architecture/ARCH-029-interface-api-architecture.md)

## Commands

```bash
npm run openapi:generate
npm run check:openapi
npm run check:doc-integrity
```

`check:openapi` fails on missing YAML, regenerate drift, or Spectral errors. Hooked into `npm run checks` via `scripts/run-checks.mjs`. After OPEN-001 markdown or Living contract changes, also run doc integrity.

## Artifact split

| Artifact | Owns |
|----------|------|
| `OPEN-001-openapi.md` | Rules, stack pin, forward recipes |
| `OPEN-001-openapi.yaml` | OAS 3.0.3 document only |
| `scripts/generate-openapi.mts` | Zod registry → YAML |
| `.spectral.yaml` | Lint |

## Current YAML scope (api-now)

**Include:** `GET /api/health/liveness`, `GET /api/health/readiness`, `GET|PUT|PATCH|POST /api/client/declaration-draft`, `APIErrorBody`, `{ data }` envelopes.  
**Exclude:** Neon Auth `/api/auth/*`, contract-only REST, FFT appendix (until reopen + contract-only rules).

Success responses **must** be `{ data: T }`. Errors are bare `APIErrorBody`.

## When to regenerate

Any of: health/draft handler shape change; shared error/envelope change; approved contract-only family added to YAML.

## Forward work (recorded — execute against OPEN-001)

| Item | Recipe in OPEN-001 |
|------|--------------------|
| Import live Zod (drop inline mirrors) | Forward — Zod SSOT handoff |
| Fumadocs `createOpenAPI({ input: ['./docs/api/OPEN-001-openapi.yaml'] })` | Forward — Fumadocs wire |
| Contract-only ops with `x-afenda-status: contract-only` | Forward — contract-only expansion (one family per increment; no live playground) |

## Anti-mixing

- Do not edit REST-001 path tables while only regenerating YAML
- Do not put OAS bodies inside OPEN-001 markdown
- Do not dump full REST-001 into YAML in one pass
- Do not add product Swagger UI under Afenda-Lite app routes
