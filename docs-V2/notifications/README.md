# In-app notifications (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/notifications/README.md` |
| Authority | **Scratch** — `@afenda/notifications` · `@afenda/db` `platform_notification` |
| Purpose | Org-scoped IN_APP inbox (Vierp WS DNA absorb/reject) |
| Updated | 2026-07-20 |

## Absorb / reject (Vierp `@vierp/notifications`)

| Absorb | Reject |
|--------|--------|
| Store port + memory test double | `ws` NotificationServer / JWT connect |
| Domain fields (type/priority/title/body/module/actionUrl/metadata/expiry) | Redis primary store |
| Payload vs persisted row | EMAIL/SMS/PUSH without transport |
| Org + user ownership on mark-read/delete | React stub hook in Platform package |
| Zod closed `IN_APP` channel | Vierp ERP templates (invoice/leave/stock) |

## First product consumer

| Field | Value |
|-------|-------|
| Surface | `assignOrgRoleAction` success path |
| Adapter | `recordOrgRoleAssignedEvent` → handler → `recordOrgRoleAssignedNotification` (identity domain) |
| Recipient | Target member (`assignment.userId`) |
| Read path | `listMyNotificationsAction` · `markNotificationReadAction` · `markAllNotificationsReadAction` · `getUnreadNotificationCountAction` (session stamps org/user; package facades direct — no pass-through domain) |

## Must not

- WebSocket / long-lived realtime server inside `@afenda/notifications`
- Redis as notification primary store
- Dual-write `platform_notification` outside `@afenda/notifications`
- Claim EMAIL/SMS/PUSH channels without a real transport in the same slice
- Package-level Next.js / `ActionResult` / `process.env`

## Verify

```bash
pnpm --filter @afenda/notifications typecheck
pnpm --filter @afenda/notifications test
pnpm --filter @afenda/db test -- tenancy
pnpm --filter @afenda/web test -- record-org-role-assigned-notification member-notifications-actions
pnpm audit:tenancy-nulls
```

DAG: [../monorepo/README.md](../monorepo/README.md). Tenancy: [../data/README.md](../data/README.md).
