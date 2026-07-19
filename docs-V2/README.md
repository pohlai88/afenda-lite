# docs-V2 (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/README.md` |
| Authority | **Scratch** — using-agent-skills phases + MCP (read-only) + disk under `apps/web/**` · `packages/*` |
| Purpose | Lean full-stack E2E architecture packs (read → mutate → ship) |
| Updated | 2026-07-20 |

No controlled-document register. No links outside this tree into other doc homes. When product code changes, re-probe MCP (`get_routes` · `get_errors` · Neon/Vercel read tools).

**Naming:** pack entry = `README.md`; topic files = `kebab-case.md` (no SCREAMING_CASE). Scratch has no `{ID}-` prefix.

**Hard stop:** Do **not** recreate Living controlled `docs/` (register / ARCH-* · GUIDE-* · MOD-* tree) without an explicit Docs-lane reopen + named recovery. Cutover `71176a0` made Living `docs/` absent by design; this Scratch tree is the day-to-day surface. Never recreate `doc/`.

---

## Packs

| Pack | Entry | Owning skill phase |
|------|-------|--------------------|
| System overview | [system/README.md](system/README.md) | context-engineering · documentation-and-adrs |
| Modules / ports | [modules/README.md](modules/README.md) | context-engineering · afenda-elite-backend-modules |
| Auth + session | [auth/README.md](auth/README.md) | security-and-hardening |
| Tenancy + domains | [tenancy/README.md](tenancy/README.md) | security / shipping boundary |
| Data layer | [data/README.md](data/README.md) | planning dependency graph |
| API contracts | [api/README.md](api/README.md) | api-and-interface-design |
| HTTP Route Handlers | [api/rest.md](api/rest.md) | api-and-interface-design |
| Server Actions | [api/actions.md](api/actions.md) | api-and-interface-design |
| API middleware DNA (borrow/reject) | [api/middleware-dna.md](api/middleware-dna.md) | api-and-interface-design · monorepo-discipline |
| Next.js App Router | [nextjs/README.md](nextjs/README.md) | incremental FE + App Router |
| UI consume | [nextjs/ui.md](nextjs/ui.md) | frontend-ui-engineering |
| Official docs app (`@afenda/docs`) | [docs/README.md](docs/README.md) | documentation-and-adrs · fumadocs-mdx-structure · [docs/automation.md](docs/automation.md) |
| Monorepo boundaries | [monorepo/README.md](monorepo/README.md) | package DAG context |
| pnpm workspaces / install | [pnpm/README.md](pnpm/README.md) | pnpm · monorepo-management |
| Coding discipline | [discipline/README.md](discipline/README.md) | typed boundary floor |
| Testing | [testing/README.md](testing/README.md) | test-driven-development |
| Lint | [lint/README.md](lint/README.md) | ci-cd-and-automation |
| Deploy + launch | [deploy/README.md](deploy/README.md) | shipping-and-launch |
| Observability | [observability/README.md](observability/README.md) | observability-and-instrumentation |
| Product search (Neon FTS) | [search/README.md](search/README.md) | monorepo-discipline · planning dependency graph |
| In-app notifications | [notifications/README.md](notifications/README.md) | monorepo-discipline · planning dependency graph |
| AI The Machine | [ai/README.md](ai/README.md) · [ai/ai-the-machine-dna.md](ai/ai-the-machine-dna.md) | monorepo-discipline · ai-sdk · vercel-agent |

---

## E2E read order (skill sequence)

1. [system/README.md](system/README.md) — context · env · module ownership summary  
2. [modules/README.md](modules/README.md) — bounded contexts · isolation · ports  
3. [auth/README.md](auth/README.md) → [tenancy/README.md](tenancy/README.md) → [data/README.md](data/README.md) — secure foundation  
4. [api/README.md](api/README.md) → [api/rest.md](api/rest.md) → [api/actions.md](api/actions.md) → [nextjs/README.md](nextjs/README.md) (incl. [ui.md](nextjs/ui.md)) — interface + UI  
5. [docs/README.md](docs/README.md) — Official `@afenda/docs` (OpenAPI consumer; Scratch ops — not a Living register)  
6. [monorepo/README.md](monorepo/README.md) → [pnpm/README.md](pnpm/README.md) → [discipline/README.md](discipline/README.md) — build hygiene  
7. [testing/README.md](testing/README.md) → [lint/README.md](lint/README.md) — verify  
8. [deploy/README.md](deploy/README.md) → [observability/README.md](observability/README.md) — ship + watch  

Author meta only (off path): [nextjs/compare.md](nextjs/compare.md).

---

## Adapter (one line)

| Need | Adapter |
|------|---------|
| UI read | RSC → `modules/*/domain` |
| UI mutation | Server Action (`'use server'`) — authz + Zod inside → `ActionResult<T>` |
| Health · Neon Auth · session bridges · draft XHR | Route Handler under `/api` |

RH JSON success: `{ "data": T }`. RH JSON failure: `{ "error": { "code", "message", "details?" } }`. Session/auth bridges: redirect / plain-text. Actions: `{ ok: true \| false, … }` — see [api/README.md](api/README.md).
