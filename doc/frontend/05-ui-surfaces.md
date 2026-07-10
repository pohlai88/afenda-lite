# UI surfaces checklist

Each product surface: journey phase, route, rebuild owner module, data adapter.

| Surface ID | Phase | Route | Owner (rebuild) | Read | Mutate |
|------------|-------|-------|-----------------|------|--------|
| lynx-landing | pre-login | `/` | `features/landing` | static / copy | — |
| auth-sign-in | pre-login | `/auth/sign-in` | `features/auth` | Neon UI | Neon |
| auth-sign-up | pre-login | `/auth/sign-up` | `features/auth` | Neon UI | Neon |
| auth-forgot-password | pre-login | `/auth/forgot-password` | `features/auth` | Neon UI | Neon |
| auth-reset-password | pre-login | `/auth/reset-password` | `features/auth` | Neon UI | Neon |
| auth-email-otp | pre-login | `/auth/email-otp` | `features/auth` | Neon UI | Neon |
| org-login | pre-login | `/org/login` | `lib/entry` + auth | session redirect | — |
| client-login | pre-login | `/client/login` | `features/auth` / entry | — | Neon |
| public-survey | pre-login | `/survey/[slug]` | page runner + form feature | domain | Action submit |
| public-secure-link | pre-login | `/f/[token]` | page runner | domain | Action submit |
| legacy-invite | pre-login | `/invite/[token]` | `lib/entry` | redirect | — |
| client-join | join | `/join` | `features/auth` invitation | Neon | Neon accept |
| client-onboarding | onboarding | `/client/onboarding` | `features/client-workspace` TBD | domain | `saveClientOnboardingAction` |
| client-home | client-post-login | `/client` | client-workspace TBD | domain | ACK Action |
| client-profile | client-post-login | `/client/profile` | client-workspace TBD | domain | profile Action |
| client-declare | client-post-login | `/client/declare/[id]` | client-workspace TBD | domain | draft API + submit Action |
| admin-dashboard | operator | `/dashboard` | `portal-views/operator-declarations-dashboard` | domain | create/delete Actions |
| admin-clients | operator | `/dashboard/clients` | `portal-views/operator-clients-list` | domain | invite/delete Actions |
| admin-declaration-detail | operator | `/dashboard/[id]` | `portal-views/operator-declaration-detail` | domain | survey/share Actions |
| account-settings | account | `/account/settings` | `features/account` + Neon | Neon | Neon |
| account-security | account | `/account/security` | `features/account` + Neon | Neon | Neon |
| trade-* | hot-sales | `/trade/[locale]/...` | `features/trade` | domain/trade | `app/actions/trade` |

## Client workspace decision

Until an explicit rebuild slice chooses:

1. `features/client-workspace/` (own shell), **or**  
2. `components-V2/platform-views/portal-views/client-*` (AdminCN chrome)

Do not resurrect deleted root `components/client/*`.

## Operator chrome

- Shell / nav / theme: `components-V2/platform-components` + `platform-config`  
- Screen bodies: `platform-views/portal-views/*` only  
- Auth island stays on `features/auth` + `app/auth-surface.css` — never ThemeCustomizer
