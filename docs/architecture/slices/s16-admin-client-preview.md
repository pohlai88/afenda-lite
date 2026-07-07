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
3. Client shell shows **Preview mode** banner with **Return to organization** (`exitClientPreviewAction` → sign out → `/org/login`).

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
