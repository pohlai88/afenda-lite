# `@afenda/auth`

Rank-1 Platform Neon Auth adapter for Afenda-Lite: session reads, edge session proxy, Auth BFF handlers, Path A credential sign-in/sign-out, org invitations, and organization-console primitives — **server-only** on the root barrel.

Use this package from `apps/web` (proxy, route handlers, Server Actions, auth features) and sibling Platform packages such as `@afenda/admin`. Browser Neon Auth UI talks through `@afenda/auth/client` only. Password-reset and invite **mail** is Zoho SMTP configured in the Neon Auth console (`smtp.zoho.com`) — not app-side SMTP. Join entry is `/join?invitationId=…`. Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import by export path:

```ts
// Server (root barrel — `server-only`)
import {
  createSessionProxy,
  createAuthApiHandlers,
  getSession,
  requireRole,
  inviteOrgMember,
  signInWithEmail,
  buildJoinUrl,
  JOIN_PATH,
} from "@afenda/auth";

// Client Components / Neon Auth UI only
import {
  getBrowserAuthClient,
  AUTH_LOGIN_PATH,
  parseJoinInvitationQuery,
} from "@afenda/auth/client";
```

**Living consumers:** `apps/web` — `proxy.ts` (`createSessionProxy`); `/api/auth/[...path]` (`createAuthApiHandlers`); session RH helpers; `features/auth` + org-admin Actions (`getSession` · `requireRole` · Path A forms via `/client`). `@afenda/admin` org-console calls organization primitives from this package (Neon SDK ownership stays here).

**Hard facts (ops, not duplicated locks)**

| Topic | Fact |
|-------|------|
| Identity plane | Neon Auth only — no second IdP |
| Path A | Custom sign-in/sign-up UI via this package is allowed |
| Invites | `inviteOrgMember` · join URL under production `APP_URL` → `/join?invitationId=…` |
| Edge gate | `apps/web/proxy.ts` — do not invent `middleware.ts` |
| Env | `import { env } from "@afenda/env"` — never raw `process.env` for product config |

## Maintain

```bash
pnpm --filter @afenda/auth lint
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

Companion ops (repo root): `pnpm validate:neon-env`.

## Exports

| Path | Role |
|------|------|
| `@afenda/auth` | Server barrel (`server-only`): session · proxy · BFF · credentials · invites · org console · paths · `requireRole` · types `AuthBootstrap` · `CredentialAuthResult` · invite/org `Result` outcomes |
| `@afenda/auth/client` | Browser Neon Auth client (`getBrowserAuthClient`) + shared path/join/post-login helpers — Client Components only |

Invite / org-console primitives return `@afenda/errors` `Result` (closed `ErrorCode`). Web Server Actions map to `ActionResult` at the boundary — do not add a `{ success }` envelope or a `./middleware` subpath.

**Peer deps:** `next` ≥16 · `react` ≥19. **Runtime deps:** `@afenda/env` · `@afenda/errors` · `@afenda/http` · `@afenda/logger` · `@afenda/rate-limit` · `@neondatabase/auth` · `server-only`.

## Ownership

| Surface | Owner |
|---------|-------|
| Neon Auth SDK client · session · BFF · proxy · invites · Path A credentials · org membership primitives | `@afenda/auth` |
| Org-console orchestration · RBAC audit SSOT · health/usage | `@afenda/admin` |
| Session-gate policy matcher · auth UI shells · ActionResult adapters | `apps/web` |
| Typed product env | `@afenda/env` |

**Layer:** Rank-1 Platform (`@afenda/env` · `@afenda/errors` · `@afenda/http` · `@afenda/logger` · `@afenda/rate-limit`). Must not import Surfaces or `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: a second identity provider, app-side SMTP for Neon Auth mail, Portal Atmosphere restore, dual Neon Auth org clients, client UI under the server barrel, or tenancy models beyond shared-schema organization scope (never multi-DB / project-per-tenant isolation).

**Reference DNA (`_reference/packages/auth` / `@vierp/auth`) — hard reject (do not port):**

| Reject | Why |
|--------|-----|
| Keycloak / OIDC JWKS verify (`jose` remote certs) | Neon Auth owns session verification |
| Browser `sessionStorage` access/refresh tokens | XSS surface; Neon uses httpOnly cookies |
| Classic Next `middleware` + `withAuth` HOF | Edge gate is `apps/web/proxy.ts` + `createSessionProxy` |
| Trust inbound `x-user-*` headers as identity | Spoofable; use Neon session APIs |
| `{ success: false, error }` JSON | Adapter failures use `@afenda/errors` `Result`; web maps to `ActionResult` |
| Raw `SSO_*` / `process.env` | `@afenda/env` only |
| Hard-coded ERP role → permission strings | ARCH-023 permissions live in `apps/web/modules/identity` |
| Soft `tenantId \|\| 'default'` | Hard org tenancy — never invent a default tenant |

Structural ideas already remapped here: explicit `Result` failure codes on invite/org-console primitives; server vs `./client` subpaths (no `./middleware` export).

## Authority

| Topic | Link |
|-------|------|
| Auth surfaces · mail · join · proxy | [docs-V2/auth](../../docs-V2/auth/README.md) |
| Invite vs Auth UI origins | [docs-V2/tenancy/urls.md](../../docs-V2/tenancy/urls.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../../docs-V2/tenancy/README.md) |
| Package DAG | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Neon Auth ops skill | [`.agents/skills/neon`](../../.agents/skills/neon/SKILL.md) |
| Neon Auth `N*` map | [neon-auth-slice-map](../../.cursor/skills/afenda-elite-implementation-slices/neon-auth-slice-map.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
