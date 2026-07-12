# Portal API contract — completeness (2026-07-12)

Plan authority: this skill + `api-now.md` + `doc/api/*`.

| Slice | Plan | Code | Status |
|-------|------|------|--------|
| api-now handlers only | health / auth / draft | `app/api/{health,auth,client}` | **Done** |
| No web-UI list REST | RSC → domain | No `/api/declarations` etc. | **Done** |
| ActionResult / APIErrorBody | Contract | Used at Action / Route edges | **Done** |
| `parseSchema` from Platform | Shared Zod | Actions import Platform common | **Done** |
| Branded IDs one-version | Param = brand = Zod | `DeclarationId` / `UserId` / `AssignmentId` … | **Done** |
| Draft Route Handler compose | Declarations owns | `modules/declarations/api/client-declaration-draft-route` + thin `app/api/client/declaration-draft` | **Done** |
| FFT HTTP catalog | Contract-only | Not implemented as Route Handlers | **Intentional** |
| Shared `PaginatedResult` Zod | Named gap until HTTP lists | Deferred | **Deferred** |
| Divergent Action vs HTTP for same use-case | Forbidden | Draft Action + draft Route share domain | **Done** |

## Stabilization (latest)

- Draft API runner moved out of Platform into Declarations (boundary + one-version Action/HTTP still share domain + schemas)
- Org-admin RBAC mutations stay on Server Actions (`admin.ts`), not new `/api` routes
- Soft-harden: client/FFT/survey Actions pass `organizationId` into domain (no new REST); Reliance actions **38/38** aligned

## Verify

```bash
# Only three API trees under app/api
npx tsc --noEmit
npm run check:reliance-mapping-drift
```
