# Adapter map

**Like api-now for backend:** which driving adapters call which module entrypoints.  
**REST catalog / HTTP classification:** [../afenda-elite-api-contract/api-now.md](../afenda-elite-api-contract/api-now.md) · [docs/api/REST-001-rest-resources.md](../../../docs/api/REST-001-rest-resources.md)

**Path truth:** Logical names below (`app/actions`, `modules/*`) are **Target/Living shape**. Physical Target home is `apps/web/…`. Rows mark **on disk** vs **planned**. Do not recover Collapse roots.

---

## Server Actions (logical `app/actions/` → Target `apps/web/app/actions/`)

| File | Disk | Module entrypoints (typical) | Notes |
|------|------|------------------------------|-------|
| `invite-org-member.ts` | **yes** (I1.3 / I2.3 / I3.1 / N11) | Identity invite schemas + shared session permission gate (`clients.invite`) + `@afenda/auth` `inviteOrgMember` + Platform `recordRbacAudit` | Operator invite; Origin = `APP_URL`; hard-tenancy audit write |
| `assign-org-role.ts` | **yes** (I3.1 / N11) | Identity `assignOrgRole` + shared session permission gate (`org.roles.manage`) + Platform `recordRbacAudit` | Platform role assign; ActionResult + audit |
| `revoke-org-role.ts` | **yes** (I3.1 / N11) | Identity `revokeOrgRole` + shared session permission gate (`org.roles.manage`) + Platform `recordRbacAudit` | Soft-revoke; ActionResult + audit |
| `declaration-draft.ts` | **yes** (I2.4 / N11) | Declarations draft read/write + shared session permission gate (`declarations.read` / `declarations.manage`) | Client-owned org/email predicates; ActionResult; draft lock after submit |
| `submit-client-declaration.ts` | **yes** (N17) | Declarations `submitClientDeclaration` + shared session permission gate (`declarations.manage`) | Finalize under hard org+email; idempotent confirmation; ActionResult |
| `account.ts` | planned | `modules/identity/*` | Account session / Neon-owned fields |
| `admin.ts` | planned | `modules/identity/*`, platform helpers | Broader org-admin chrome (assign/revoke shipped as discrete Actions) |
| `client.ts` | planned | `modules/identity/*`, `modules/declarations/*` | Invite stamps + survey scope |
| `declarations.ts` | planned | `modules/declarations/domain/**` | Broader Declarations writes (submit shipped as discrete Action) |
| `surveys.ts` | planned | `modules/declarations/domain/**` | Draft create stamps `organizationId` |
| `fft.ts` | planned | `modules/fft/domain/**` | Feed Farm Trade |

There is **no** `app/actions/trade.ts`.

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
| GET/PUT/PATCH/POST | `/api/client/declaration-draft` | **yes** (I2.4) | `modules/declarations/api/client-declaration-draft-route` · domain `declaration-draft` |

**Allowlist rule:** Do not add web-UI list/read handlers for declarations/clients — use RSC → module domain.

---

## RSC / runners (logical)

| Surface | Pattern |
|---------|---------|
| Prefer | `app/**/page.tsx` → features / thin runner → `modules/*/domain` (under `apps/web` on Target) |
| Keep (Target) | `features/{auth,declarations,fft,org-admin}` shells (S7.4); expand with entry / richer runners under those L2 folders — Living name `organization-admin` maps to Target `org-admin` |
| N11 Tier-2 | `org-admin` → `org.roles.manage` / `clients.invite`; `declarations` → `declarations.read` (+ `declarations.manage` for draft/submit); `fft` → `fft.access`; coarse `requireRole` remains the route shell |
| N17 Declarations | RSC list `/client/declarations` + detail `/client/declarations/[assignmentId]` → `listClientAssignments` / `getClientDeclaration`; submit Action → `submitClientDeclaration` |
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
