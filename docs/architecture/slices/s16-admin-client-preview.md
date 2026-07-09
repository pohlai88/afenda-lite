# S16 — Admin client portal preview

## Purpose

Operators preview the **real** client portal (`/client/*`) using a seeded sandbox account, without duplicate preview routes or read-only form modes.

## Flow

1. Operator signs in at `/org/login` and opens the dashboard sidebar.
2. **Preview client portal** runs `startClientPreviewAction`:
   - Verifies admin session
   - Signs in with server-only `PREVIEW_CLIENT_*` credentials
   - Records `admin.client_preview_started`
   - Redirects to `/client`
   - On missing config or sign-in failure → `/client/preview-unavailable` (gate route, no workspace shell)
3. Client shell shows **Preview mode** banner with **Return to organization** (`exitClientPreviewAction` → sign out → `/org/login`).

### Local dev harness (not production client flow)

During **local development only**, `/playground` can iframe client routes with `?embed=1` for UI review. If the preview user is not seeded, `requireClientSession` may redirect embed requests to `/client/preview-unavailable?embed=1`. This behaviour is **developer tooling** — clients never use `/playground` in production.

**Registry:** `lib/playground-registry.ts` is the single source of truth for screen ids, embed paths, route file bindings, and nav groups. `scripts/check-playground-bindings-runner.ts` and `lib/playground-e2e-fixtures.ts` must stay in parity with the registry (enforced by `npm run check:playground`). See [S18 — Playground UI review harness](s18-playground-ui-review.md).

## Owned routes

| Route | Group | Purpose |
|-------|-------|---------|
| `/client/preview-unavailable` | `(gate)` | Preview sandbox missing or sign-in failed |
| `/client/login` | `(gate)` | Named client sign-in entry |
| `/client/*` (workspace) | `(workspace)` | Authenticated client shell + assignments |

## Owned files

- `app/client/(workspace)/layout.tsx` — workspace shell entry
- `lib/client-workspace-layout.tsx` — preview banner + `ClientRouteShell` handler
- `components/portal-preview-banner.tsx` — preview mode banner UI
- `app/actions/admin.ts` — `startClientPreviewAction`, `exitClientPreviewAction`
- `lib/preview-client.ts` — preview unavailable page handler

## Configuration

| Variable | Purpose |
|----------|---------|
| `PREVIEW_CLIENT_EMAIL` | Preview client login email (server-only) |
| `PREVIEW_CLIENT_PASSWORD` | Preview client password (server-only) |
| `PREVIEW_CLIENT_NAME` | Optional display name |

Run:

```bash
npm run seed:preview-client
```

Creates/updates the Neon Auth user (non-admin role), completes onboarding profile, and assigns the oldest declaration if one exists.

## Sandbox data policy

- On **production**, preview submissions write under the preview email — prefer routing operator preview via the Neon **preview** branch in non-prod environments.
- Use a dedicated preview declaration/assignment; do not point preview at live client PII.
- Re-seed resets password and profile; assignments are idempotent per email + survey.

See [preview-branch-setup.md](../../runbooks/preview-branch-setup.md).

## Audit events

- `admin.client_preview_started`
- `admin.client_preview_ended`

## Navigation

Preview is a sidebar item in the operator application shell (`sidebar-04` pattern), alongside Declarations and Client invitations.
