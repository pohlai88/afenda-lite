# OPEN-001 OpenAPI

| Field | Value |
|-------|-------|
| ID | OPEN-001 |
| Category | OPEN |
| Version | 1.1.2 |
| Status | Living |
| Owner | Backend |
| Updated | 2026-07-13 |

Human guide for the **machine OpenAPI** artifact. Enables maintainers to generate and consume OpenAPI without duplicating [REST-001](REST-001-rest-resources.md) path tables.

**Audience:** backend maintainers and docs (Fumadocs) authors.  
**Action enabled:** generate `OPEN-001-openapi.yaml` for api-now; follow forward sections below when wiring Zod imports, Fumadocs, or contract-only ops.

**Stage:** documentation / forward writing — recipes below are authoritative for the next code slices. Do not wait for a docs app or a full `modules/` checkout before treating these rules as SSOT.

## Goals

- One OpenAPI document for Afenda-Lite HTTP (no `/api/v1`)
- Fumadocs (or external HTTP clients) can consume the YAML
- Zod under `modules/*/schemas` is type SSOT; generator **must** converge on imports — inline copies are recorded mirrors until handoff lands
- Success JSON matches runtime `{ data }` envelope — SSOT [API-001](API-001-api-boundaries.md); errors stay bare `APIErrorBody` ([API-002](API-002-error-contract.md))

## Non-goals

- Duplicating REST path catalogs in this Markdown file
- Including Neon Auth (`/api/auth/*`) in portal OpenAPI
- Dumping all contract-only REST paths into the first YAML without `x-afenda-status`
- Product-embedded Swagger UI (use Fumadocs playground when wired)

## Artifact split

| Artifact | Path | Owns |
|----------|------|------|
| This guide | `docs/api/OPEN-001-openapi.md` | Promote rules, generate how-to, stack pin, forward recipes |
| Machine OAS | `docs/api/OPEN-001-openapi.yaml` | Generated OpenAPI document only |
| Generator | `scripts/generate-openapi.mts` | Emit YAML from Zod registries |
| Spectral | `.spectral.yaml` | Lint rules |

Human path SSOT stays [REST-001](REST-001-rest-resources.md).

## When to emit / expand

Emit or expand the YAML when **any** are true:

1. **Fumadocs** (or another docs site) needs OpenAPI input
2. An external or mobile consumer needs documented HTTP
3. api-now handlers change shape (health, declaration-draft)
4. A contract-only family is approved for machine export (see Forward — contract-only)

Living bar (already met for api-now):

1. `OPEN-001-openapi.yaml` exists for **api-now** at minimum
2. Spectral (or `npm run check:openapi`) passes
3. Error schema matches [API-002](API-002-error-contract.md)
4. Success bodies use `{ data }` envelopes

## Scope of current YAML (api-now)

| Included | Excluded |
|----------|----------|
| `GET /api/health/liveness` | Neon Auth proxy |
| `GET /api/health/readiness` | FFT HTTP appendix (until FFT reopen + this guide’s contract-only rules) |
| `GET/PUT/PATCH/POST /api/client/declaration-draft` | Live playground for contract-only ops |
| Shared `APIErrorBody` + `{ data }` envelopes | |

## Forward work (recorded)

Unavailable elsewhere does not pause Living status — it is listed here for the next code slice.

| Item | Where recorded |
|------|----------------|
| Zod import handoff (drop inline mirrors) | § Forward — Zod SSOT handoff |
| Fumadocs `createOpenAPI` wire | § Forward — Fumadocs wire |
| Contract-only YAML families | § Forward — contract-only expansion |
| FFT OpenAPI | Out until FFT reopen + contract-only rules |

## Forward — Zod SSOT handoff

**Intent:** Stop duplicating schemas in `scripts/generate-openapi.mts`.

When `modules/platform/schemas/api-error.ts` and `modules/declarations/schemas/client.ts` (plus `surveyAnswersSchema` / `uuidSchema` owners in [API-004](API-004-schema-map.md)) are the implementation target:

1. Call `extendZodWithOpenApi(z)` once before any `.openapi()` enrichment.
2. Prefer importing module schemas; attach `.openapi("Name")` via `extendZodWithOpenApi` / registry — do not fork field lists.
3. Keep response **envelopes** in the generator (or a tiny `modules/platform/schemas/api-envelope.ts` if added): runtime success is always `{ data: T }`.
4. Delete inlined copies of `apiErrorBodySchema`, draft save/query, and answer map from the generator.
5. Run `npm run openapi:generate` && `npm run check:openapi`.

Inlined schemas in `scripts/generate-openapi.mts` are **recorded mirrors** of those modules — any field change in REST/API docs must update the generator in the same change until the import handoff lands.

## Forward — Fumadocs wire

**Intent:** Docs site consumes the committed YAML; does not redefine paths.

Recorded target when a Fumadocs (or equivalent) app is added:

1. Depend on `fumadocs-openapi` (version per then-current Fumadocs docs).
2. Point input at the committed machine file only:

```ts
import { createOpenAPI } from "fumadocs-openapi/server";

export const openapi = createOpenAPI({
  input: ["./docs/api/OPEN-001-openapi.yaml"],
});
```

3. Generate MDX/pages with the project’s `generateFiles` (or equivalent) into the docs app — not into `docs/api/`.
4. Playground: enable only for operations **without** `x-afenda-status: contract-only` (api-now today).
5. Do not add a product Swagger UI under the Afenda-Lite app routes.

Authority for steps 1–3: [Fumadocs OpenAPI](https://www.fumadocs.dev/docs/integrations/openapi).

## Forward — contract-only expansion

**Intent:** Machine-document REST-001 contract families without implying live Route Handlers.

Rules:

1. Human paths stay in [REST-001](REST-001-rest-resources.md); do not paste path tables into this guide.
2. When exporting a contract-only operation into YAML:
   - Set extension `x-afenda-status: contract-only`
   - Reuse `APIErrorBody` and `{ data }` success envelopes
   - Reuse Zod names from [API-004](API-004-schema-map.md)
3. Fumadocs / Spectral consumers **must not** treat `contract-only` as a live Try-it target.
4. Add one family per increment (e.g. clients, then declarations) — never dump the full REST-001 catalog in one pass.
5. FFT paths stay out until FFT program reopen + explicit OPEN expand.

## Stack pin

| Piece | Choice | Source |
|-------|--------|--------|
| OpenAPI | **3.0.3** (Fumadocs-compatible; generator V3) | [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi) + [Fumadocs OpenAPI](https://www.fumadocs.dev/docs/integrations/openapi) |
| Zod bridge | `@asteasolutions/zod-to-openapi` **^8.5.0** (Zod 4) | npm; repo `zod` ^4.4.3 |
| Lint | `@stoplight/spectral-cli` + `spectral:oas` | Spectral OAS ruleset |
| Docs UI | `fumadocs-openapi` | Forward — Fumadocs wire |
| YAML emit | `yaml` **^2** (direct dep) | `scripts/generate-openapi.mts` |

## Generate

```bash
npm run openapi:generate
npm run check:openapi
```

## Related

- Machine file: [OPEN-001-openapi.yaml](OPEN-001-openapi.yaml)
- [REST-001 Rest Resources](REST-001-rest-resources.md)
- [API-002 Error Contract](API-002-error-contract.md)
- [API-004 Schema Map](API-004-schema-map.md)
- Skills: [openapi-spec-generation](https://skills.sh/wshobson/agents/openapi-spec-generation); Fumadocs: [OpenAPI integration](https://www.fumadocs.dev/docs/integrations/openapi)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.2 | 2026-07-13 | Forward writing: record unavailable work; drop “wait for tree” hedges |
| 1.1.1 | 2026-07-13 | Point success envelope SSOT at API-001 |
| 1.1.0 | 2026-07-13 | Forward writing: Zod handoff, Fumadocs wire, contract-only expand rules |
| 1.0.1 | 2026-07-13 | Critical: `{ data }` success envelope; generator path `.mts`; Gaps for inline Zod |
| 1.0.0 | 2026-07-13 | Living: api-now YAML + generate + Spectral `check:openapi` |
| 0.2.0 | 2026-07-13 | Renamed from reserved; Fumadocs consumer; artifact split; stack pin |
| 0.1.0 | 2026-07-13 | Reserved stub; no OpenAPI body |
