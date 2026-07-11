# Exact `app/` route tree

Generate this tree for greenfield scaffold. Every `page.tsx` is a stub RSC.

**Next.js rules for this tree:**

- Root `layout.tsx` / `global-error.tsx` include `<html>` + `<body>`
- Every `error.tsx` / `global-error.tsx` is `'use client'` (see [stubs.md](stubs.md))
- Dynamic folders use descriptive names — never `[id]` — names match [boundaries.md](boundaries.md) identity map
- Nested trade pages receive **all** parent dynamic params in `params` (`locale` + `eventId`)
- `/join` uses `searchParams`, not a dynamic segment
- Do not add `route.ts` beside any `page.tsx`
- Do not add `@slot`, `(.)` interceptors, `template.tsx`, or `default.tsx` in v1
- Do not set `runtime = 'edge'` on these pages
- Do not add contract-only REST handlers under `app/api` for web UI reads

```text
app/
  layout.tsx
  page.tsx
  loading.tsx
  error.tsx
  global-error.tsx
  not-found.tsx

  auth/
    [path]/
      page.tsx
      loading.tsx
      error.tsx
    admin/
      page.tsx

  org/
    login/
      page.tsx
      loading.tsx

  join/
    page.tsx
    loading.tsx
    error.tsx

  invite/
    [token]/
      page.tsx
      loading.tsx

  f/
    [token]/
      page.tsx
      loading.tsx
      error.tsx

  survey/
    [slug]/
      page.tsx
      loading.tsx
      error.tsx

  client/
    (gate)/
      login/
        page.tsx
        loading.tsx
      preview-unavailable/
        page.tsx
    (workspace)/
      layout.tsx
      loading.tsx
      error.tsx
      page.tsx
      onboarding/
        page.tsx
      profile/
        page.tsx
      declare/
        [assignmentId]/
          page.tsx
          loading.tsx
          not-found.tsx

  dashboard/
    layout.tsx
    loading.tsx
    error.tsx
    page.tsx
    clients/
      page.tsx
      loading.tsx
    [declarationId]/
      page.tsx
      loading.tsx
      not-found.tsx

  account/
    layout.tsx
    loading.tsx
    error.tsx
    page.tsx
    [path]/
      page.tsx
      loading.tsx
      not-found.tsx

  trade/
    page.tsx
    [locale]/
      layout.tsx
      events/
        page.tsx
        [eventId]/
          order/
            page.tsx
      my-orders/
        page.tsx
      admin/
        events/
          page.tsx
          new/
            page.tsx
          [eventId]/
            setup/
              page.tsx
            allocation/
              page.tsx
            deposits/
              page.tsx
            imports/
              page.tsx
            pickup/
              page.tsx
        erp-sync/
          page.tsx
        rbac/
          page.tsx

  playground/
    page.tsx
    [screenId]/
      page.tsx
    coverage/
      page.tsx
    hitl-review/
      page.tsx

  # DO NOT regenerate / wipe in scaffold
  api/
    auth/[...path]/route.ts
    health/liveness/route.ts
    health/readiness/route.ts
    client/declaration-draft/route.ts
  actions/
    account.ts
    admin.ts
    client.ts
    declarations.ts
    surveys.ts
    trade.ts
```

## URL checklist

| URL | Folder |
|-----|--------|
| `/` | `app/page.tsx` |
| `/auth/:path` | `app/auth/[path]/page.tsx` |
| `/auth/admin` | `app/auth/admin/page.tsx` |
| `/org/login` | `app/org/login/page.tsx` |
| `/join` | `app/join/page.tsx` |
| `/invite/:token` | `app/invite/[token]/page.tsx` |
| `/f/:token` | `app/f/[token]/page.tsx` |
| `/survey/:slug` | `app/survey/[slug]/page.tsx` |
| `/client/login` | `app/client/(gate)/login/page.tsx` |
| `/client/preview-unavailable` | `app/client/(gate)/preview-unavailable/page.tsx` |
| `/client` | `app/client/(workspace)/page.tsx` |
| `/client/onboarding` | `app/client/(workspace)/onboarding/page.tsx` |
| `/client/profile` | `app/client/(workspace)/profile/page.tsx` |
| `/client/declare/:assignmentId` | `app/client/(workspace)/declare/[assignmentId]/page.tsx` |
| `/dashboard` | `app/dashboard/page.tsx` |
| `/dashboard/clients` | `app/dashboard/clients/page.tsx` |
| `/dashboard/:declarationId` | `app/dashboard/[declarationId]/page.tsx` |
| `/account` | `app/account/page.tsx` |
| `/account/:path` | `app/account/[path]/page.tsx` |
| `/trade` | `app/trade/page.tsx` |
| `/trade/:locale/events` | `app/trade/[locale]/events/page.tsx` |
| `/trade/:locale/events/:eventId/order` | `…/events/[eventId]/order/page.tsx` |
| `/trade/:locale/my-orders` | `…/my-orders/page.tsx` |
| `/trade/:locale/admin/events` | `…/admin/events/page.tsx` |
| `/trade/:locale/admin/events/new` | `…/admin/events/new/page.tsx` |
| `/trade/:locale/admin/events/:eventId/setup` | `…/[eventId]/setup/page.tsx` |
| `/trade/:locale/admin/events/:eventId/allocation` | `…/allocation/page.tsx` |
| `/trade/:locale/admin/events/:eventId/deposits` | `…/deposits/page.tsx` |
| `/trade/:locale/admin/events/:eventId/imports` | `…/imports/page.tsx` |
| `/trade/:locale/admin/events/:eventId/pickup` | `…/pickup/page.tsx` |
| `/trade/:locale/admin/erp-sync` | `…/admin/erp-sync/page.tsx` |
| `/trade/:locale/admin/rbac` | `…/admin/rbac/page.tsx` |
| `/playground` | `app/playground/page.tsx` |
| `/playground/:screenId` | `app/playground/[screenId]/page.tsx` |
| `/playground/coverage` | `app/playground/coverage/page.tsx` |
| `/playground/hitl-review` | `app/playground/hitl-review/page.tsx` |
