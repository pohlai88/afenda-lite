# Data patterns (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/nextjs/data.md` |
| Authority | **Scratch** — nextjs skill + coding-discipline floor |
| Updated | 2026-07-19 |

---

## Decision tree

```text
Need data?
├─ UI read → RSC / loader → modules/*/domain  (no /api hop)
├─ Mutation → Server Action — auth + authz + Zod inside
├─ Health / Neon Auth / session bridges → Route Handler
└─ Client read → props from RSC — never invent fetch('/api') for own product reads
```

HTTP allowlist: [../api/rest.md](../api/rest.md). Action contracts: [../api/README.md](../api/README.md).

---

## Server Action security

Every `'use server'` export is a public endpoint.

1. Parse (`unknown` → Zod)  
2. Authenticate inside the action  
3. Authorize (role / org / ownership / permission codes)  
4. Domain with trusted types  
5. Return `ActionResult<T>` · revalidate on success when UI-backed  

Optional `after()` for audit — never hide auth failures. Do not rely on `proxy.ts` / layout alone.

---

## Route Handler notes

- Named method exports  
- `await params`  
- Node default  
- Never colocate with `page.tsx`  
- JSON: `{ data }` success · bare error body — except auth/session bridges  

---

## Typing floor

TS hygiene (`unknown` · brands · casts · `ActionResult` · barrel · env): [../discipline/README.md](../discipline/README.md).

## Verify

Pack MCP: [README.md](README.md). Contracts: [../api/README.md](../api/README.md).
