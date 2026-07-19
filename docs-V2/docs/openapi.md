# Fumadocs OpenAPI consumer (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/openapi.md` |
| Authority | **Scratch** — `afenda-elite-api-contract` · disk `apps/docs/lib/openapi.server.ts` · [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) |
| Audience | Engineers changing api-now HTTP or the docs OpenAPI UI |
| Updated | 2026-07-19 |

---

## SSOT split

| Artifact | Owns | Must not |
|----------|------|----------|
| Zod schemas + handlers | `apps/web/modules/**` · `apps/web/app/api/**` | Live in MDX |
| Generated OAS | [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) | Hand-edit forever |
| Fumadocs consumer | `apps/docs` — `createOpenAPI` + `generateFiles` MDX | Own a second YAML |
| Spectral / drift gate | `pnpm check:openapi` | Skip after HTTP shape change |

Never invent contract-only REST in YAML. Never add Swagger under `apps/web`.

---

## Document-id contract

**One string** shared by `createOpenAPI`, generated MDX `document=` / `_openapi.preload`, generator assert, and wire tests:

```text
../../docs-V2/api/OPEN-001-openapi.yaml
```

Resolved from **apps/docs cwd**. Export: `OPENAPI_DOCUMENT_ID` + `openapi` from `lib/openapi.server.ts`.

If Fumadocs cannot resolve the path, **stop** — do not copy YAML into `apps/docs/openapi/` (dual SSOT) and do not add a symlink shim.

---

## Wire (disk)

| File | Duty |
|------|------|
| `apps/docs/lib/openapi.server.ts` | `createOpenAPI({ input: [OPENAPI_DOCUMENT_ID] })` |
| `apps/docs/lib/source.ts` | `openapi.loaderPlugin()` |
| `apps/docs/scripts/generate-openapi-docs.mts` | `generateFiles({ input: openapi, … })` |
| `apps/docs/app/docs/[[...slug]]/page.tsx` | `preloadOpenAPIPage` → `OpenAPIPreloadProvider` |
| `apps/docs/components/api-page.tsx` | Client `createOpenAPIPage` reads preload from context |
| `apps/docs/app/global.css` | `fumadocs-openapi/css/preset.css` + Tailwind `@source` |

### Why preload provider

`createOpenAPIPage` needs schema data at render. Passing functions/props across the RSC→client boundary breaks SSG. Pattern: server awaits `openapi.preloadOpenAPIPage(page)`, then wraps MDX in `OpenAPIPreloadProvider` with `preloaded={result.preloaded}` so the client page reads context. Skipping this yields prerender errors (`bundled` / undefined preload).

---

## Scope (api-now)

**In YAML / docs UI:** health liveness · readiness · declaration-draft GET/PUT/PATCH/POST.

**Excluded (on disk, not in YAML):** `/api/auth/*` · `/api/session/*` (redirect / plain-text bridges).

---

## After api-now HTTP / envelope change

```bash
pnpm openapi:generate
pnpm check:openapi
pnpm --filter @afenda/docs generate:openapi-docs
pnpm --filter @afenda/docs lint:links
pnpm --filter @afenda/docs test
pnpm --filter @afenda/docs build
```

Full automation narrative: [automation.md](automation.md).

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Second copy of YAML under `apps/docs/openapi/` | Dual SSOT |
| Hand-edit generated op MDX forever | Drift vs `generateFiles` |
| Product Swagger route | API contract ban |
| Contract-only ops without consumer | Invented catalogue |
| `generateFiles({ input: ['./x.yaml'] })` without server | Breaks fumadocs-openapi v10+ |

Companion: [`../api/README.md`](../api/README.md) · [content.md](content.md) · [automation.md](automation.md) · skill `afenda-elite-api-contract/openapi.md`.
