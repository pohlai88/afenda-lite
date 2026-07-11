# Adapter map

**Like api-now for backend:** which driving adapters exist and which module they call.  
**REST catalog / HTTP classification:** [../portal-api-contract/api-now.md](../portal-api-contract/api-now.md) · [doc/api/02-rest-resources.md](../../../doc/api/02-rest-resources.md)

---

## Server Actions (`app/actions/`)

| File | Module entrypoints (typical) | Notes |
|------|------------------------------|-------|
| `account.ts` | `modules/identity/*` | Account session / Neon-owned fields |
| `admin.ts` | `modules/identity/*`, platform helpers | Operator admin + org users (create/import/update/remove/bulk-remove/role/ban/bulk-ban/password/sessions); `parseSchema` from Platform |
| `client.ts` | `modules/identity/*`, `modules/declarations/*` | Compose at adapter — do not merge domains; `parseSchema` from Platform |
| `declarations.ts` | `modules/declarations/domain/**`, product schemas | `parseSchema` from Platform |
| `surveys.ts` | `modules/declarations/domain/**`, product schemas | `parseSchema` from Platform |
| `fft.ts` | `modules/fft/domain/**`, `modules/fft/auth/*`, `modules/fft/schemas/fft-schemas.ts` | Feed Farm Trade |

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
| GET/PUT/PATCH | `/api/client/declaration-draft` | Declarations draft domain + `modules/platform/api` draft route logic |

**No other Route Handlers exist today.** Do not add web-UI list/read handlers for declarations/clients — use RSC → module domain.

---

## RSC / runners

| Surface | Pattern |
|---------|---------|
| Prefer | `app/**/page.tsx` → features / thin runner → `modules/*/domain` |
| Transitional | `lib/pages/*`, `features/auth/entry/*` — keep while wired; do not grow for greenfield |
| Forbidden | RSC `fetch('/api/...')` for ordinary product reads |

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
