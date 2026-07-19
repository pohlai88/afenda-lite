# Exact `app/` route tree

Generate this tree for greenfield scaffold. Every `page.tsx` is a stub RSC.

## Living checkout overlay

ARCH-028 Checkpoint S7.2/G cut the current deployable web tree to route
groups. For the operator admin surface, the living path is:

```text
app/
  (operator)/
    layout.tsx        # requireRole("operator")
    loading.tsx
    error.tsx         # client segment error
    not-found.tsx
    admin/
      page.tsx        # thin RSC → features/org-admin/OrgAdminShell
```

Checklist for this living `/admin` segment:

- URL: `/admin`
- Folder: `app/(operator)/admin/page.tsx`
- Page stays thin; product UI lives in `features/org-admin`
- No `route.ts` in the segment
- No dynamic params
- No `runtime = "edge"`
- No imports from `@/lib/**`, `@/app/actions`, or `@/modules/**` in `page.tsx`
- Parent `(operator)/layout.tsx` owns coarse `requireRole("operator")`; feature shell may also fail-close defensively

**Next.js rules for this tree:**

- Root `layout.tsx` / `global-error.tsx` include `<html>` + `<body>`
- Every `error.tsx` / `global-error.tsx` is `'use client'` (see [stubs.md](stubs.md))
- Dynamic folders use descriptive names — never `[id]` — names match [boundaries.md](boundaries.md) identity map
- Declarations + FFT product route trees are **removed** — do not scaffold `/fft/**`, `/client/declarations`, or declaration-draft RH
- `/join` uses `searchParams`, not a dynamic segment
- `CLIENT_HOME` = `/client` (workspace shell — not Declarations product)
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
    users/
      page.tsx
      loading.tsx
      [userId]/
        page.tsx
        loading.tsx
        not-found.tsx
    roles/
      page.tsx
      loading.tsx
    permissions/
      page.tsx
      loading.tsx
    [declarationId]/
      page.tsx
      loading.tsx
      not-found.tsx
      # brand: DeclarationId — never overloaded [id]

  account/
    layout.tsx
    loading.tsx
    error.tsx
    page.tsx
    [path]/
      page.tsx
      loading.tsx
      not-found.tsx

  # REMOVED (nuclear wipe) — do not scaffold:
  # fft/** · client declare/declarations · survey/** · f/** · playground/**

  # DO NOT relocate / wipe in scaffold
  api/
    auth/[...path]/route.ts
    health/liveness/route.ts
    health/readiness/route.ts
  actions/
    account.ts
    admin.ts
```

## URL checklist (living)

| URL | Folder |
|-----|--------|
| `/` | public / landing |
| `/auth/:path` | auth island |
| `/join` | join page |
| `/admin` | `app/(operator)/admin/page.tsx` |
| `/client` | client workspace (`CLIENT_HOME`) |
| `/client/login` | client gate |
| `/client/dashboard` | client workspace (when present) |

## Removed URLs (do not document as living)

`/fft/**`, `/client/declarations/**`, `/client/declare/**`, `/survey/**`, `/f/**`, `/dashboard/[declarationId]`, `/playground/**`, `/api/client/declaration-draft`
