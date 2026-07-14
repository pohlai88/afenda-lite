# ARCH-007 Ports and Adapters

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-007     |
| **Category**      | Architecture |
| **Version**       | 1.2.0        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Backend      |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Define Living **contract-first ports** and **driving-adapter** placement for Afenda-Lite: what each bounded context exposes, which adapters may call it, and the DRY/ Zod / auth rules that keep Actions and Route Handlers aligned.

**Method (not authority):** [afenda-elite-backend-modules](../../.cursor/skills/afenda-elite-backend-modules/SKILL.md) · [adapter-map.md](../../.cursor/skills/afenda-elite-backend-modules/adapter-map.md) · `/afenda-elite-api-contract`.

---

# 2. Scope

## 2.1 In Scope

- Port catalog shape: DeclarationsPort, ClientsPort, IdentityPort, PlatformPort, TradePort
- Logical domain ↔ adapter maps (Actions / RH / RSC runners)
- Adapter DRY rule (one port → Action and/or RH)
- Forbidden port imports; Platform `parseSchema` at Zod edge
- Action file → context map; composition at adapters only

## 2.2 Out of Scope

- Full REST path tables ([REST-001](../api/REST-001-rest-resources.md))
- OpenAPI generation ([OPEN-001](../api/OPEN-001-openapi.md) · GUIDE-015)
- Error body / ActionResult type definitions ([API-002](../api/API-002-error-contract.md) · [API-003](../api/API-003-api-types.md))
- Layer do/don't matrix ([ARCH-004](ARCH-004-backend-layers.md))
- Context import bans ([ARCH-006](ARCH-006-bounded-contexts.md))
- Next.js adapter runtime matrix ([ARCH-008](ARCH-008-next-js-adapter-map.md))
- Recovering Collapse-era product trees ([ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Ports and Adapters

**Model:** Hexagonal Modular Monolith ([ARCH-004](ARCH-004-backend-layers.md) · [ARCH-022](ARCH-022-system-overview.md)). Ports are TypeScript contracts; implementations are named exports under `modules/*/domain` (and documented identity auth helpers).

**Driving adapters (Node on Vercel):** thin RSC runners / pages, Server Actions (`app/actions/*`), Route Handlers (`app/api/*`).  
**Driven adapters:** Neon SQL, Neon Auth.

**Posture:** Paths are a **logical Living map**. After Collapse, product trees are absent until Target implement under `apps/web/**` ([ARCH-028](ARCH-028-implementation-slices.md)). Maps below describe intended wiring shape — not an on-disk claim.

### Port hard rules

| Rule | Detail |
|------|--------|
| No web/UI in ports | Ports **never** import `Request`, `next/headers`, React, or UI |
| Zod once at adapter | Product schemas in owning `modules/*/schemas`; **`parseSchema` from** `modules/platform/schemas/common` — not Declarations common ([ARCH-006](ARCH-006-bounded-contexts.md)) |
| Authz in adapter | Session + org/FFT authz **inside** every Action / mutating RH — layout/`proxy` is not enough ([ARCH-013](ARCH-013-bff-and-data-flow.md)) |
| Compose at adapter | Screens needing two contexts call two ports — do not merge domains or cross Trade ↛ Declarations |
| DRY | Same port op → same Zod → same domain call → same error codes whether Action or RH |
| Runtime | Node default for domain adapters — not Edge ([ARCH-010](ARCH-010-backend-conventions.md)) |
| Cache invalidation | Mode A: `revalidatePath` / contract `no-store` as needed. Mode B tags only after [ADR-008](adr/ADR-008-cache-components-mode-b.md) Phase 2 |

### Data-pattern pointer (mandatory)

**Link only — do not paste the tree.** Authority: [ARCH-013](ARCH-013-bff-and-data-flow.md). Deploy / Node matrix: [ARCH-010](ARCH-010-backend-conventions.md).

### Action file → primary context

| File | Primary context | Notes |
|------|-----------------|-------|
| `app/actions/account.ts` | Identity | Neon-owned account fields |
| `app/actions/admin.ts` | Identity (+ Platform RBAC ops) | Org users, roles/permissions, org switch — compose documented |
| `app/actions/client.ts` | Identity + Declarations | **Adapter composition** (invite stamp + survey scope) |
| `app/actions/declarations.ts` / `surveys.ts` | Declarations | `parseSchema` from Platform |
| `app/actions/fft.ts` | Trade (`modules/fft`) | No `app/actions/trade.ts` |

---

## DeclarationsPort

```typescript
interface DeclarationsPort {
  listDeclarations(params: ListDeclarationsParams): Promise<PaginatedResult<Declaration>>
  getDeclaration(id: DeclarationId): Promise<Declaration>
  createDeclaration(input: CreateDeclarationInput): Promise<Declaration>
  updateDeclaration(id: DeclarationId, input: UpdateDeclarationInput): Promise<Declaration>
  deleteDeclaration(id: DeclarationId): Promise<void> // idempotent
  submitAssignment(input: SubmitAssignmentInput): Promise<Submission>
  saveDraft(input: SaveDraftInput): Promise<void>
  // share / package / evidence ops as needed
}
```

| Port op | Logical domain | Driving adapters |
|---------|----------------|------------------|
| list / get | `modules/declarations/domain/surveys.ts` (+ display helpers) | RSC dashboard / org-admin runners |
| create / update / delete | `surveys.ts` | `createDraftSurveyAction`, `updateSurveyAction`, `deleteSurveyAction` |
| submit assignment | `survey-submission.ts` | `submitClientDeclarationAction`, `submitSurveyResponseAction` |
| save draft | `client-declaration-draft.ts` | draft Actions + `PUT/PATCH /api/client/declaration-draft` |
| share / package | `declaration-share-links.ts` | share Actions / panels |
| evidence | evidence-policy domain | `registerEvidenceAction` |
| client onboarding | Declarations onboarding domain | `saveClientOnboardingAction` (not an Identity port op) |

REST shapes: [REST-001](../api/REST-001-rest-resources.md) (Declarations, Assignments, Share links).

---

## ClientsPort (Declarations context)

```typescript
interface ClientsPort {
  listClients(params: ListClientsParams): Promise<PaginatedResult<ClientSummary>>
  issueInvitation(input: IssueInviteInput): Promise<void>
  removeRegistration(clientId: ClientId): Promise<void>
  deleteAssignment(assignmentId: AssignmentId): Promise<void>
}
```

| Port op | Logical domain | Adapters |
|---------|----------------|----------|
| list | `modules/declarations/domain/clients.ts` | RSC clients page |
| invite | Declarations invite + Identity stamp at **adapter** | `issueClientInviteAction` |
| remove / delete assignment | `clients.ts` | `removeClientRegistrationAction`, `deleteClientAssignmentAction` |

---

## IdentityPort

Session helpers live under `modules/identity/auth` — adapters call `require*Session` / equivalents. Neon-owned self-service password/email stay on Neon Auth UI + `/api/auth/*`.

```typescript
interface IdentityPort {
  listOrganizationUsers(): Promise<OrganizationUser[]>
  getOrganizationUser(id: UserId): Promise<OrganizationUser | null>
  createOrganizationUser(input: CreateOrganizationUserInput): Promise<{ userId: UserId }>
  importOrganizationUsers(users: CreateOrganizationUserInput[]): Promise<{
    created: number
    failed: number
    failures: Array<{ email: string; error: string }>
  }>
  updateOrganizationUser(input: UpdateOrganizationUserInput): Promise<void>
  removeOrganizationUser(userId: UserId): Promise<void>
  removeOrganizationUsers(userIds: UserId[]): Promise<{ removed: number }>
  setOrganizationUserRole(input: { userId: UserId; role: "user" | "admin" }): Promise<void>
  setOrganizationUserPassword(input: { userId: UserId; newPassword: string }): Promise<void>
  banOrganizationUser(input: { userId: UserId; banReason?: string }): Promise<void>
  banOrganizationUsers(input: {
    userIds: UserId[]
    banReason?: string
  }): Promise<{ banned: number }>
  unbanOrganizationUser(userId: UserId): Promise<void>
  listOrganizationUserSessions(userId: UserId): Promise<OrganizationUserSession[]>
  revokeOrganizationUserSessions(userId: UserId): Promise<void>
  getClientProfile(userId: string): Promise<ClientProfile | null>
  ensureClientProfileRow(userId: string): Promise<void>
  bootstrapClientAfterAuth(input: BootstrapClientAuthInput): Promise<void>
  acknowledgePortal(actorId: string): Promise<void>
}
```

| Port op | Logical module | Adapters |
|---------|----------------|----------|
| list / get users | `modules/identity/domain/organization-users.ts` | RSC org-admin users (+ Declarations profile summaries composed at adapter) |
| create / update / remove / import | `modules/identity/auth/admin.ts` | matching `*OrganizationUser*Action`s |
| role / ban / unban / password / sessions | `modules/identity/auth/admin.ts` | matching Actions |
| client profile / invite bootstrap | `client-profile.ts`, `client-invitation-bootstrap.ts` | session gates, landing, public-link routing |
| ACK / preview | `client-session`, `preview-client` | `acknowledgeClientPortalAction`, preview Actions |
| auth HTTP | Neon via `modules/identity/auth` | `/api/auth/[...path]` |

**Do not** put Declarations onboarding on IdentityPort — that is DeclarationsPort (see above). Screens may call both ports from one Action.

---

## PlatformPort

| Port op | Logical home | Adapter |
|---------|--------------|---------|
| liveness | `modules/platform/api/*` | `GET /api/health/liveness` |
| readiness | `modules/platform/api/*` | `GET /api/health/readiness` |
| shared Zod / normalize / copy | `modules/platform/schemas/common`, `normalize-email`, `copy/*` | Imported by adapters — not product domains |

Shell entitlement **compose** for nav lives in `features/portal-chrome` (frontend) using Platform/Identity types — not a second domain tree.

---

## TradePort (Feed Farm Trade)

Product: **Feed Farm Trade**. Code path: `modules/fft/domain/**` + `modules/fft/auth/*` + `modules/fft/schemas/*`.

| Concern | Detail |
|---------|--------|
| Driving UI | Server Actions in `app/actions/fft.ts` (no `trade.ts`) |
| Entitlement | Platform `fft.access` at adapter ([ARCH-006](ARCH-006-bounded-contexts.md) · [ARCH-023](ARCH-023-multi-tenancy.md)) |
| HTTP | Contract-only in [REST-001](../api/REST-001-rest-resources.md) until an external consumer needs Route Handlers |
| Ban | No Declarations imports; no `modules/trade/` |

Locks / roadmap: [FFT-MOD-001](../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md).

---

## Adapter DRY rule

```text
One port function
  ├── Server Action (UI command)  ─┐
  └── Route Handler (HTTP)        ─┴─ same Zod input, same domain call, same error codes
```

Do not implement divergent business logic in Action vs Route Handler. Prefer Actions for first-party browser mutations; add RH only when api-now / catalog requires it ([adapter-map](../../.cursor/skills/afenda-elite-backend-modules/adapter-map.md)).

### Route Handler homes (logical api-now)

| Method | Path | Module helpers |
|--------|------|----------------|
| GET | `/api/health/liveness` | Platform |
| GET | `/api/health/readiness` | Platform |
| ALL | `/api/auth/[...path]` | Identity / Neon |
| GET / PUT / PATCH | `/api/client/declaration-draft` | Declarations draft route helper |

Do not add web-UI list/read handlers for declarations/clients — use RSC → domain.

## Checklist

- [ ] New Action maps to one primary context (or documents adapter composition)  
- [ ] New HTTP route is api-now or an explicit REST catalog decision  
- [ ] Action and Handler for the same use-case share schema + error codes  
- [ ] `parseSchema` from Platform common  
- [ ] Port has no Next.js / React / UI imports  
- [ ] Trade work uses `app/actions/fft.ts` + `modules/fft`  
- [ ] In-action session + org/FFT authz + Zod  

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-004 | Backend Layers | Hexagon / adapter duties |
| ARCH-005 | Backend Folder Map | Module homes |
| ARCH-006 | Bounded Contexts | Import bans · shared Zod |
| ARCH-008 | Next.js Adapter Map | RSC / Action / RH as adapters |
| ARCH-009 | Modules Ownership Map | Inventory |
| ARCH-010 | Backend Conventions | Node · SQL · Vercel |
| ARCH-013 | BFF and Data Flow | Data-pattern SSOT |
| ARCH-022 | System Overview — Turborepo | Target `apps/web` |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Org · `fft.access` |
| ARCH-028 | Turborepo Implementation Slices | Anti-contamination |
| API-002 | Error Contract | HTTP / Action errors |
| API-004 | Schema Map | Zod ownership |
| REST-001 | REST Resources | Resource catalog |
| ADR-008 | Cache Components Mode B | Phase 2 invalidation only |
| FFT-MOD-001 | Feed Farm Trade module architecture | Trade locks |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.2.0 | 2026-07-14 | Remove pasted ARCH-013 decision tree; pointer-only to ARCH-013 / ARCH-010. |
| 1.1.2 | 2026-07-14 | Fix OPEN-001 relative link target (`OPEN-001-openapi.md`). |
| 1.1.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.1.0 | 2026-07-14 | Elite port/adapter sync: hard rules; Action map; Platform parseSchema; move onboarding off IdentityPort; TradePort first-class; api-now RH table; checklist; full References; logical-map honesty. |
| 1.0.3 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees forbidden to recover. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root `app/` / `modules/` / `features/` / `components-V2/` are **absent** after design-SSOT Collapse (`4680c91`).
- **Forbidden:** git recover of those trees — [ARCH-028](ARCH-028-implementation-slices.md).
- Implement under Target `apps/web/**` / `packages/*` only after an **explicit** implement request.
- Adapter and domain paths above are **logical** until Target product trees exist.
