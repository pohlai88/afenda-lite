# Adapter map

**Like api-now for backend:** which driving adapters exist and which module they call.  
**REST catalog / HTTP classification:** [../portal-api-contract/api-now.md](../portal-api-contract/api-now.md) · [doc/api/02-rest-resources.md](../../../doc/api/02-rest-resources.md)

---

## Server Actions (`app/actions/`)

| File | Module entrypoints (typical) | Notes |
|------|------------------------------|-------|
| `account.ts` | `modules/identity/*` | Account session / Neon-owned fields |
| `admin.ts` | `modules/identity/*`, platform helpers | Operator admin + org users (create/import/update/remove/bulk-remove/role/ban/bulk-ban/password/sessions) + **platform RBAC** (create/update/delete role, set permission, assign/revoke) + **`setActiveOrganizationAction`** (M1 org switch); `parseSchema` from Platform |
| `client.ts` | `modules/identity/*`, `modules/declarations/*`, `resolvePlatformOrgContext` | Invite stamps + scopes survey by org; compose at adapter |
| `declarations.ts` | `modules/declarations/domain/**`, product schemas | `parseSchema` from Platform |
| `surveys.ts` | `modules/declarations/domain/**`, product schemas, `resolvePlatformOrgContext` | Draft create stamps `organizationId` |
| `fft.ts` | `modules/fft/domain/**`, `modules/fft/auth/*`, `modules/fft/schemas/fft-schemas.ts`, `features/fft/fft-organization-context` | Feed Farm Trade; org stamp/backfill at adapter |

There is **no** `app/actions/trade.ts`.

**Canonical Action Zod edge:**

```typescript
import { parseSchema } from "@/modules/platform/schemas/common"
// product schema from owning modules/*/schemas
```

---

## Route Handlers (`app/api/`) — api-now

| Method | Path | Module helpers |
|--------|------|----------------|
| GET | `/api/health/liveness` | `modules/platform/api/*` |
| GET | `/api/health/readiness` | `modules/platform/api/*` |
| ALL | `/api/auth/[...path]` | Neon via `modules/identity/auth` |
| GET/PUT/PATCH | `/api/client/declaration-draft` | `modules/declarations/api/client-declaration-draft-route` |

**No other Route Handlers exist today.** Do not add web-UI list/read handlers for declarations/clients — use RSC → module domain.

---

## RSC / runners

| Surface | Pattern |
|---------|---------|
| Prefer | `app/**/page.tsx` → features / thin runner → `modules/*/domain` |
| Keep | `features/auth/entry/*`, `features/organization-admin/*` runners |
| Forbidden | RSC `fetch('/api/...')` for ordinary product reads; recreate `lib/pages` |

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
