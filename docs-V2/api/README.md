# API contracts (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/api/README.md` |
| Authority | **Scratch** — api-and-interface-design + disk `modules/platform/schemas/**` |
| Updated | 2026-07-20 |

Stable wire contracts for mutations and RH JSON. HTTP allowlist: [rest.md](rest.md). Server Actions on disk: [actions.md](actions.md). Fetch pipeline DNA (Vierp `api-middleware` borrow/reject): [middleware-dna.md](middleware-dna.md).

---

## When which adapter

| Need | Contract | Return |
|------|----------|--------|
| UI mutation | Server Action (`'use server'`) — [actions.md](actions.md) | `ActionResult<T>` |
| UI read | RSC → domain | Typed domain result (not RH) |
| Health · Neon Auth · session | Route Handler | See [rest.md](rest.md) wire shapes |

Do not invent dashboard list GETs under `/api` for same-origin UI.

---

## ActionResult (disk)

| Layer | Path |
|-------|------|
| Kernel SSOT | `@afenda/errors` · `@afenda/errors/result` · `@afenda/errors/http` |
| Web adapters | `apps/web/modules/platform/schemas/action-result.ts` · `api-error.ts` |

| Outcome | Shape |
|---------|-------|
| Success | `{ ok: true, data: T }` |
| Failure | `{ ok: false, code, message, details? }` |
| Helpers | `actionOk` · `actionFail` · `actionFailInternal(message, correlationId)` |

Expected failures return `{ ok: false }` — throw only for unexpected bugs. Never tutorial `{ success, data }`. Error codes / safe serialize / AppError: `@afenda/errors` (no Next.js on the kernel). Closed codes include `RATE_LIMITED` (429) and `SERVICE_UNAVAILABLE` (503); Route Handlers may emit `Retry-After` via `jsonError` when `details.retryAfter` is a positive integer. Auth BFF also stamps `X-RateLimit-*` + `Server-Timing` — see [middleware-dna.md](middleware-dna.md).

---

## Boundary typing

| Rule | Detail |
|------|--------|
| External → `unknown` | Parse with Zod / owning schema before brand |
| Brands | Prefer existing API brands at the BFF boundary — no parallel shapes |
| Authz | Authenticate + authorize **inside** every Action (public endpoint) |
| Correlation | Unexpected Action failure → `actionFailInternal` with `{ correlationId }` only in `details` |

Full TS floor: [../discipline/README.md](../discipline/README.md).

---

## OpenAPI

Machine Zod→OpenAPI helpers live in `@afenda/openapi` (`zod` · `document`); web schemas re-export `z` via `modules/platform/schemas/openapi-zod.ts`. Generated artifact: [`OPEN-001-openapi.yaml`](OPEN-001-openapi.yaml) (api-now health + metrics scrape). Do **not** invent offline REST catalogues — only ship RH paths that exist on disk ([rest.md](rest.md)). Do **not** hand-edit the YAML to clear drift — fix Zod / `scripts/generate-openapi.mts`, then `pnpm openapi:generate`.

**Verified (2026-07-19):** `pnpm openapi:generate && pnpm check:openapi` exit 0 — YAML byte-matches generator (aligned with Zod; not hand-edit, not stale).

**Docs consumer:** `@afenda/docs` (`apps/docs`) loads this YAML via Fumadocs `createOpenAPI` + `generateFiles` — not product Swagger under `apps/web`; never copy into `apps/docs/openapi/`. Practices: [../docs/openapi.md](../docs/openapi.md) · automation: [../docs/automation.md](../docs/automation.md) · pack [../docs/README.md](../docs/README.md).

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No `{ success, data }` / `success: boolean` envelopes | Breaks ActionResult consumers + contracts |
| No `@afenda/api-middleware` god package | Leaf owners — see [middleware-dna.md](middleware-dna.md) |
| No RH for ordinary UI reads | Avoids BFF self-fetch waterfalls |
| No `/api/v1` versioning | One URL surface |
| No secret/stack in `details` | Safe client correlation only |

---

## Verify

```text
1. pnpm --filter @afenda/web test -- __tests__/action-result-contract.test.ts
2. Disk: modules/platform/schemas/action-result.ts · api-error.ts (no tutorial `{ success, data }` ActionResult)
3. pnpm openapi:generate && pnpm check:openapi
4. Re-probe RH inventory: disk apps/web/app/api/** ↔ rest.md
5. Re-probe Actions: disk apps/web/app/actions/** ↔ actions.md
```

Companion: [rest.md](rest.md) · [actions.md](actions.md) · [middleware-dna.md](middleware-dna.md) · [../modules/README.md](../modules/README.md) · [../nextjs/data.md](../nextjs/data.md) · [../observability/README.md](../observability/README.md) · [../observability/metrics-dna.md](../observability/metrics-dna.md).
