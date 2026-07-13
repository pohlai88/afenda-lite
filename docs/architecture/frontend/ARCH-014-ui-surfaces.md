# ARCH-014 UI Surfaces

| Field | Value |
|-------|-------|
| ID | ARCH-014 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Frontend |
| Updated | 2026-07-13 |

Each product surface: journey phase, route, rebuild owner module, data adapter.

| Surface ID | Phase | Route | Owner (rebuild) | Read | Mutate |
|------------|-------|-------|-----------------|------|--------|
| lynx-landing | pre-login | `/` | `features/landing` (The Machine — Protect → Detect → React → `/auth/sign-in` or `/auth/sign-up`) | static | — |
| auth-sign-in | pre-login | `/auth/sign-in` | `features/auth` | Neon UI | Neon |
| auth-sign-up | pre-login | `/auth/sign-up` | `features/auth` | Neon UI | Neon |
| auth-forgot-password | pre-login | `/auth/forgot-password` | `features/auth` | Neon UI | Neon |
| auth-reset-password | pre-login | `/auth/reset-password` | `features/auth` | Neon UI | Neon |
| auth-email-otp | pre-login | `/auth/email-otp` | `features/auth` | Neon UI | Neon |
| org-login | pre-login | `/org/login` | `features/auth/entry` + auth | session redirect | — |
| client-login | pre-login | `/client/login` | `features/auth` / entry | — | Neon |
| public-survey | pre-login | `/survey/[slug]` | redirect-only page runner | domain | — |
| public-secure-link | pre-login | `/f/[token]` | redirect-only page runner | domain | — |
| legacy-invite | pre-login | `/invite/[token]` | `features/auth/entry` | redirect | — |
| client-join | join | `/join` | `features/auth` invitation | Neon | Neon accept |
| client-onboarding | onboarding | `/client/onboarding` | stub only — [closed-scope-register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) | — | closed |
| client-home | client-post-login | `/client` | stub only — closed-scope-register | — | closed |
| client-profile | client-post-login | `/client/profile` | stub only — closed-scope-register | — | closed |
| client-declare | client-post-login | `/client/declare/[assignmentId]` | stub only — closed-scope-register | — | closed |
| admin-dashboard | declarations module | `/dashboard` | `portal-views/organization-admin-declarations-dashboard` | domain | create/delete Actions (admin mutations) |
| admin-clients | declarations module | `/dashboard/clients` | `portal-views/organization-admin-clients-list` | domain | invite/delete Actions (admin mutations) |
| admin-declaration-detail | declarations module | `/dashboard/[declarationId]` | `portal-views/organization-admin-declaration-detail` | domain | survey/share Actions (admin mutations) |
| account-settings | declarations module | `/account/settings` | `features/account` + Neon | Neon | Neon |
| account-security | declarations module | `/account/security` | `features/account` + Neon | Neon | Neon |
| trade-* | Feed Farm Trade | `/fft/...` (locale-free) | AdminCN + `features/fft` (P1 wired; P3 placeholders); [001](../../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [001A](../../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [001R](../../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | `modules/fft` | `app/actions/fft` |

## Shell modules (SaaS)

| Module | Purpose | Routes | Entry gate | Nav |
|--------|---------|--------|------------|-----|
| `declarations` | Compliance declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` | Declarations |
| `fft` | B2B **feed & farm trade sales** for 3F businesses (Feed · Farm · Food customers — not portal org admins); downstream customer portal is a later branch | `/fft/*` | `requireFftAccess` | Feed Farm Trade |
| Admin routes | Org-admin tools | playground (local), … | `isAdminSession` | `kind: "admin"` |

Entitlement resolver: `features/portal-chrome/resolve-shell-access.ts`. Org admin ≠ Feed Farm Trade permission.

## Client workspace decision

**Closed (registered)** — see [closed-scope-register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).  
Holding stubs under `app/client/(workspace)/**` only. Do not create `features/client-workspace/` or resurrect deleted root `components/client/*` until reopen.

On reopen, choose one owner:

1. `features/client-workspace/` (own shell), **or**  
2. `components-V2/platform-views/portal-views/client-*` (AdminCN chrome)

## Operator chrome

- Shell / nav / theme: `components-V2/platform-components` + `platform-config`  
- Screen bodies: `platform-views/portal-views/*` only  
- Auth island stays on `features/auth` + `app/auth-surface.css` — never ThemeCustomizer  
- Feed Farm Trade shares the same AdminCN shell as product **Feed Farm Trade**; do not resurrect `FftShell` / locale switcher
