# docs-V2 (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/README.md` |
| Authority | **Scratch** — using-agent-skills phases + MCP (read-only) + disk under `apps/web/**` · `packages/*` |
| Purpose | Lean full-stack E2E architecture packs (read → mutate → ship) |
| Updated | 2026-07-19 |

No controlled-document register. No links outside this tree into other doc homes. When product code changes, re-probe MCP (`get_routes` · `get_errors` · Neon/Vercel read tools).

**Naming:** pack entry = `README.md`; topic files = `kebab-case.md` (no SCREAMING_CASE). Scratch has no `{ID}-` prefix.

---

## Packs

| Pack | Entry | Owning skill phase |
|------|-------|--------------------|
| System overview | [system/README.md](system/README.md) | context-engineering · documentation-and-adrs |
| Auth + session | [auth/README.md](auth/README.md) | security-and-hardening |
| Tenancy + domains | [tenancy/README.md](tenancy/README.md) | security / shipping boundary |
| Data layer | [data/README.md](data/README.md) | planning dependency graph |
| API contracts | [api/README.md](api/README.md) | api-and-interface-design |
| HTTP Route Handlers | [api/rest.md](api/rest.md) | api-and-interface-design |
| Next.js App Router | [nextjs/README.md](nextjs/README.md) | incremental FE + App Router |
| UI consume | [nextjs/ui.md](nextjs/ui.md) | frontend-ui-engineering |
| Monorepo boundaries | [monorepo/README.md](monorepo/README.md) | package DAG context |
| Coding discipline | [discipline/README.md](discipline/README.md) | typed boundary floor |
| Testing | [testing/README.md](testing/README.md) | test-driven-development |
| Lint | [lint/README.md](lint/README.md) | ci-cd-and-automation |
| Deploy + launch | [deploy/README.md](deploy/README.md) | shipping-and-launch |
| Observability | [observability/README.md](observability/README.md) | observability-and-instrumentation |

---

## E2E read order (skill sequence)

1. [system/README.md](system/README.md) — context · env · module ownership  
2. [auth/README.md](auth/README.md) → [tenancy/README.md](tenancy/README.md) → [data/README.md](data/README.md) — secure foundation  
3. [api/README.md](api/README.md) → [api/rest.md](api/rest.md) → [nextjs/README.md](nextjs/README.md) (incl. [ui.md](nextjs/ui.md)) — interface + UI  
4. [monorepo/README.md](monorepo/README.md) → [discipline/README.md](discipline/README.md) — build hygiene  
5. [testing/README.md](testing/README.md) → [lint/README.md](lint/README.md) — verify  
6. [deploy/README.md](deploy/README.md) → [observability/README.md](observability/README.md) — ship + watch  

Author meta only (off path): [nextjs/compare.md](nextjs/compare.md).

---

## Adapter (one line)

| Need | Adapter |
|------|---------|
| UI read | RSC → `modules/*/domain` |
| UI mutation | Server Action (`'use server'`) — authz + Zod inside → `ActionResult<T>` |
| Health · Neon Auth · session bridges · draft XHR | Route Handler under `/api` |

RH JSON success: `{ "data": T }`. RH JSON failure: `{ "error": { "code", "message", "details?" } }`. Session/auth bridges: redirect / plain-text. Actions: `{ ok: true \| false, … }` — see [api/README.md](api/README.md).
