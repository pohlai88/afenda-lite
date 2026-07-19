# API contracts (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/api/README.md` |
| Authority | **Scratch** — api-and-interface-design + disk `modules/platform/schemas/**` |
| Updated | 2026-07-19 |

Stable wire contracts for mutations and RH JSON. HTTP allowlist: [rest.md](rest.md).

---

## When which adapter

| Need | Contract | Return |
|------|----------|--------|
| UI mutation | Server Action (`'use server'`) | `ActionResult<T>` |
| UI read | RSC → domain | Typed domain result (not RH) |
| Health · Neon Auth · session · draft XHR | Route Handler | See [rest.md](rest.md) wire shapes |

Do not invent dashboard list GETs under `/api` for same-origin UI.

---

## ActionResult (disk)

Path: `apps/web/modules/platform/schemas/action-result.ts`

| Outcome | Shape |
|---------|-------|
| Success | `{ ok: true, data: T }` |
| Failure | `{ ok: false, code, message, details? }` |
| Helpers | `actionOk` · `actionFail` · `actionFailInternal(message, correlationId)` |

Expected failures return `{ ok: false }` — throw only for unexpected bugs. Never tutorial `{ success, data }`.

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

Machine Zod helpers live under `modules/platform/schemas/openapi-zod.ts`. Do **not** invent offline REST catalogues here — only ship RH paths that exist on disk ([rest.md](rest.md)).

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No `{ success, data }` / `success: boolean` envelopes | Breaks ActionResult consumers + contracts |
| No RH for ordinary UI reads | Avoids BFF self-fetch waterfalls |
| No `/api/v1` versioning | One URL surface |
| No secret/stack in `details` | Safe client correlation only |

---

## Verify

```text
1. pnpm --filter @afenda/web exec vitest run __tests__/action-result-contract.test.ts
2. rg "success:\\s*true|\\{\\s*success" apps/web --glob "*.{ts,tsx}"
3. Disk: modules/platform/schemas/action-result.ts · api-error.ts
4. Re-probe RH inventory: Next.js MCP get_routes ↔ rest.md
```

Companion: [rest.md](rest.md) · [../nextjs/data.md](../nextjs/data.md) · [../observability/README.md](../observability/README.md).
