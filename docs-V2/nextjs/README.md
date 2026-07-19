# Next.js pack (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/nextjs/README.md` |
| Authority | **Scratch** — `afenda-elite-nextjs-best-practice` + Next.js MCP (`:3000`) + disk `apps/web/**` |
| Next | 16.2.x |
| Updated | 2026-07-19 |

No dependency on legacy `docs/`. Skill companions under `.cursor/skills/afenda-elite-nextjs-best-practice/` are method aids only.

---

## Ingress

```text
apps/web/proxy.ts  →  layout  →  thin page.tsx (RSC)
  → features/* (UI)
  → app/actions/* (mutations)  OR  modules/* (reads)
  → app/api/*/route.ts  — health / Neon Auth / session only
                         (never RSC self-fetch('/api') for own product reads)
```

| Rule | Detail |
|------|--------|
| Proxy | `proxy.ts` — **not** `middleware.ts` |
| Pages | Thin compose — no domain SQL / fat JSX |
| UI imports | `import { … } from "@afenda/ui-system"` only |

---

## Reading order

| Step | File |
|------|------|
| 1 | This README |
| 2 | [architecture.md](architecture.md) |
| 3 | [folders.md](folders.md) |
| 4 | [routes.md](routes.md) |
| 5 | [data.md](data.md) |
| 6 | [ui.md](ui.md) |
| 7 | [practices.md](practices.md) |

`/api/*` inventory: [../api/rest.md](../api/rest.md). Author meta only: [compare.md](compare.md) (off default path).

---

## MCP verify

After App Router **product** edits:

```text
nextjs_index → get_routes → get_errors
```

Keep [routes.md](routes.md) aligned with the latest `get_routes` snapshot.
