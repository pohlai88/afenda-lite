# Adapter map

**Like api-now for backend:** which driving adapters call which module entrypoints.  
**REST catalog / HTTP classification:** [../afenda-elite-api-contract/api-now.md](../afenda-elite-api-contract/api-now.md) · [docs-V2/api/rest.md](../../../docs-V2/api/rest.md)

**Path truth:** Logical names below (`app/actions`, `modules/*`) are **Target/Living shape**. Physical Target home is `apps/web/…`. Rows mark **on disk** vs **planned**. Do not recover Collapse roots or wiped Declarations/FFT trees.

---

## Server Actions (logical `app/actions/` → Target `apps/web/app/actions/`)

Scratch catalogue (disk-honest): [docs-V2/api/actions.md](../../../docs-V2/api/actions.md).

| File | Disk | Module entrypoints (typical) | Notes |
|------|------|------------------------------|-------|
| `auth-credentials.ts` | **yes** | Identity `signInSchema` + `@afenda/auth` credentials | `signInAction` → `ActionResult`; `signOutAction` redirects (`void`) |
| `permission-gate.ts` | **yes** | Identity `sessionHasPermission` | Shared Action denial → `ActionFailure \| null` (not a UI mutation entry) |
| `invite-org-member.ts` | **yes** (I1.3 / I2.3 / I3.1 / N11) | Identity invite schemas + shared session permission gate (`clients.invite`) + `@afenda/auth` `inviteOrgMember` + Platform `recordRbacAudit` | Operator invite; Origin = `APP_URL`; hard-tenancy audit write |
| `assign-org-role.ts` | **yes** (I3.1 / N11) | Identity `assignOrgRole` + shared session permission gate (`org.roles.manage`) + Platform `recordRbacAudit` | Platform role assign; ActionResult + audit |
| `revoke-org-role.ts` | **yes** (I3.1 / N11) | Identity `revokeOrgRole` + shared session permission gate (`org.roles.manage`) + Platform `recordRbacAudit` | Soft-revoke; ActionResult + audit |
| `account.ts` | planned | `modules/identity/*` | Account session / Neon-owned fields |
| `admin.ts` | planned | `modules/identity/*`, platform helpers | Broader org-admin chrome — assign/revoke/invite are discrete Actions above |

**Removed (nuclear wipe — do not recreate):** `client-declaration-action-session.ts`, `declaration-draft.ts`, `submit-client-declaration.ts`, `declarations.ts`, `surveys.ts`, `fft.ts`, `client.ts` Declarations compose.

There is **no** `app/actions/trade.ts` and **no** living FFT/Declarations Actions.

**Canonical Action Zod edge (when Target tree exists):**

```typescript
import { parseSchema } from "@/modules/platform/schemas/common"
// product schema from owning modules/*/schemas
```

---

## Route Handlers (logical `app/api/`) — api-now allowlist

| Method | Path | Disk | Module helpers |
|--------|------|------|----------------|
| ALL | `/api/auth/[...path]` | **yes** | `@afenda/auth` `createAuthApiHandlers` (not `modules/identity/auth`) |
| GET | `/api/health/liveness` | **yes** (I2.4) | `modules/platform/domain/health` · `api/json-response` |
| GET | `/api/health/readiness` | **yes** (I2.4) | `modules/platform/domain/health` · `api/json-response` |
| GET | `/api/session/sync-cookies` | **yes** | `@afenda/auth` session cookie bridge (excluded from OpenAPI YAML) |
| GET | `/api/session/ensure-active-organization` | **yes** | `@afenda/auth` active-org persistence (excluded from OpenAPI YAML) |

**Removed RH:** `/api/client/declaration-draft` — not api-now.

HTTP allowlist Scratch: [docs-V2/api/rest.md](../../../docs-V2/api/rest.md).

**Allowlist rule:** Do not add web-UI list/read handlers — use RSC → module domain. Do not recreate wiped Declarations/FFT HTTP.

---

## RSC / runners (logical)

| Surface | Pattern |
|---------|---------|
| Prefer | `app/**/page.tsx` → features / thin runner → `modules/*/domain` (under `apps/web` on Target) |
| Keep (Target) | `features/{auth,org-admin}` shells; Living name `organization-admin` maps to Target `org-admin` |
| Permission codes | `org-admin` → `org.roles.manage` / `clients.invite` (catalog has **no** `declarations.*` / `fft.access`) |
| Forbidden | RSC `fetch('/api/...')` for ordinary product reads; recreate `lib/pages`; recover Collapse or wiped Declarations/FFT roots |

---

## DRY rule

```text
One port function
  ├── Server Action (UI command)
  └── Route Handler (HTTP, only when needed)
       └── same Zod · same domain call · same error codes
```

## Checklist

- [ ] New Action file maps to one primary living context (or documents adapter composition)
- [ ] New HTTP route is api-now or an explicit catalog decision
- [ ] Action and Handler for the same use-case share schema + codes
- [ ] `parseSchema` from Platform common
- [ ] No Declarations/FFT product Actions or RH reintroduced
