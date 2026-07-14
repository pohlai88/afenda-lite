# Adapter map

**Like api-now for backend:** which driving adapters call which module entrypoints.  
**REST catalog / HTTP classification:** [../afenda-elite-api-contract/api-now.md](../afenda-elite-api-contract/api-now.md) · [docs/api/REST-001-rest-resources.md](../../../docs/api/REST-001-rest-resources.md)

**Path truth:** Logical names below (`app/actions`, `modules/*`) are **Target/Living shape**. Physical Target home is `apps/web/…`. On this **docs-first** checkout those trees are **absent by design** — this map is ownership inventory, not a claim they are implemented today. Do not recover Collapse roots.

---

## Server Actions (logical `app/actions/` → Target `apps/web/app/actions/`)

| File | Module entrypoints (typical) | Notes |
|------|------------------------------|-------|
| `account.ts` | `modules/identity/*` | Account session / Neon-owned fields |
| `admin.ts` | `modules/identity/*`, platform helpers | Operator admin + org users + **platform RBAC** + **`setActiveOrganizationAction`**; `parseSchema` from Platform |
| `client.ts` | `modules/identity/*`, `modules/declarations/*`, `resolvePlatformOrgContext` | Invite stamps + scopes survey by org; compose at adapter |
| `declarations.ts` | `modules/declarations/domain/**`, product schemas | `parseSchema` from Platform |
| `surveys.ts` | `modules/declarations/domain/**`, product schemas, `resolvePlatformOrgContext` | Draft create stamps `organizationId` |
| `fft.ts` | `modules/fft/domain/**`, `modules/fft/auth/*`, `modules/fft/schemas/fft-schemas.ts`, FFT org context features | Feed Farm Trade; org stamp/backfill at adapter |

There is **no** `app/actions/trade.ts`.

**Canonical Action Zod edge (when Target tree exists):**

```typescript
import { parseSchema } from "@/modules/platform/schemas/common"
// product schema from owning modules/*/schemas
```

---

## Route Handlers (logical `app/api/`) — api-now allowlist

| Method | Path | Module helpers |
|--------|------|----------------|
| GET | `/api/health/liveness` | `modules/platform/api/*` |
| GET | `/api/health/readiness` | `modules/platform/api/*` |
| ALL | `/api/auth/[...path]` | Neon via `modules/identity/auth` |
| GET/PUT/PATCH | `/api/client/declaration-draft` | `modules/declarations/api/client-declaration-draft-route` |

**Allowlist rule:** Do not add web-UI list/read handlers for declarations/clients — use RSC → module domain. On docs-first, “no other handlers” means the **Living allowlist**, not a disk inventory of a deleted tree.

---

## RSC / runners (logical)

| Surface | Pattern |
|---------|---------|
| Prefer | `app/**/page.tsx` → features / thin runner → `modules/*/domain` (under `apps/web` on Target) |
| Keep (Target) | `features/{auth,declarations,fft,org-admin}` shells (S7.4); expand with entry / richer runners under those L2 folders — Living name `organization-admin` maps to Target `org-admin` |
| Forbidden | RSC `fetch('/api/...')` for ordinary product reads; recreate `lib/pages`; recover Collapse roots |

---

## DRY rule

```text
One port function
  ├── Server Action (UI command)
  └── Route Handler (HTTP, only when needed)
       └── same Zod · same domain call · same error codes
```

## Checklist

- [ ] New Action file maps to one primary context (or documents adapter composition)
- [ ] New HTTP route is api-now or an explicit catalog decision
- [ ] Action and Handler for the same use-case share schema + codes
- [ ] `parseSchema` from Platform common (not Declarations common)
- [ ] FFT work goes through `app/actions/fft.ts` + `modules/fft`
