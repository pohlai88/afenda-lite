# `@afenda/notifications`

Rank-1 Platform in-app notifications for Afenda-Lite: org-scoped writes to `platform_notification`, list / mark-read / unread-count / purge helpers. Outcomes use `@afenda/errors` `Result` — this package does not own HTTP status lines, `NextResponse`, WebSocket servers, or Action envelopes.

**Slice-1 channel:** `IN_APP` only. Do not dual-write `platform_notification` outside this package. Do not invent EMAIL/SMS/PUSH transports here.

Use this package from Platform / app server code when a domain event must leave an in-app inbox item for a member. Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import from the root barrel:

```ts
import {
  createNotificationRecorder,
  listNotifications,
  markNotificationRead,
} from "@afenda/notifications";

const recorder = createNotificationRecorder();
const write = await recorder.record({
  organizationId,
  userId,
  type: "SUCCESS",
  priority: "MEDIUM",
  title: "Role assigned",
  body: "You were assigned Org Admin.",
  module: "identity",
  actionUrl: "/admin",
});
if (!write.ok) {
  // map Result at the adapter — do not invent { success, data }
}

const page = await listNotifications({ organizationId, userId, page: 1 });
```

Pass request-scoped `organizationId` and recipient `userId` on every write. Mark-read / delete require `organizationId` + `userId` + `id` (ownership).

**Living consumers:** `apps/web` identity `recordOrgRoleAssignedEvent` → handler → `recordOrgRoleAssignedNotification` → `assignOrgRoleAction`.

## Store

| Surface | Backend |
|---------|---------|
| Production default | `DrizzleNotificationStore` → `platform_notification` via `@afenda/db` |
| Vitest injection | `createNotificationRecorder({ store })` / query helpers `store` arg |

Every read/write/purge predicates `organization_id`. List page size capped at `MAX_NOTIFICATION_PAGE_SIZE` (100).

## Maintain

```bash
pnpm --filter @afenda/notifications lint
pnpm --filter @afenda/notifications typecheck
pnpm --filter @afenda/notifications test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `.` | Recorder, query helpers, schemas, types, Drizzle store |

## Must not

- WebSocket / JWT realtime server inside this package
- Redis primary store
- Next.js / `ActionResult` / `process.env`
- Surfaces / `apps/*` imports
- Dual-write around the package
