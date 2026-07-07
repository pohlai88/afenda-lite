# UI Evaluation Summary

**Date:** 2026-07-07  
**Scope:** 40 portal surfaces scored against shadcn studio blocks (MCP metadata).  
**Validation:** Matrix script pass + 8 Storybook comparison stories.

## Scoring criteria (weighted)

| Criterion | Weight |
|-----------|--------|
| PatternFit | 25% |
| BrandFit | 20% |
| PortalCompat | 20% |
| A11yMobile | 15% |
| ImplCost | 10% |
| Consistency | 10% |

Run `npm run evaluate:ui-matrix` to verify zero omissions.

## Top 10 highest-impact wins

| Surface | Winner | Score | Strength |
|---------|--------|-------|----------|
| `auth-sign-in` | keep-current (Neon AuthView + PortalAuthLayout) | 5.00 | strong |
| `client-onboarding` | multi-step-form-01 | 4.25 | marginal |
| `admin-clients` | datatable-component-04 | 4.65 | marginal |
| `admin-dashboard` | datatable-component-01 | 4.55 | marginal |
| `shell-dashboard` | dashboard-shell-05 | 4.25 | tie |
| `client-dashboard` | statistics-component-03 | 4.45 | marginal |
| `error-404` | error-page-02 | 4.35 | tie |
| `client-declare-empty` | empty-state-02 | 4.55 | marginal |
| `user-menu` | keep-current (PortalMemberMenu) | 4.85 | strong |
| `faq-section` | faq-component-01 | 4.45 | marginal |

## Auth & account (keep Neon)

All 7 auth/account surfaces **keep Neon `AuthView` / `AccountView`** as winners. Studio blocks (`login-page-*`, `account-settings-*`) are **layout chrome references only** — never replace auth logic.

## Orphan cleanup (6 surfaces)

All orphan components score **retire** — superseded by Neon auth and `PortalAuthLayout`.

## Ties requiring product decision

| Surface | Options | Notes |
|---------|---------|-------|
| `shell-dashboard` | dashboard-shell-05 vs keep-current | Shell block wins PatternFit; current wins ImplCost |
| `error-404` | error-page-02 vs keep-current | Equal weighted score; adopt block for consistency |
| `client-profile` | form-layout-01 vs keep-current | Already aligned via PortalFormSection |

## Storybook comparisons

```bash
npm run storybook
```

Stories under `stories/ui-evaluation/` show current vs winning candidate with `ScoreAnnotation` panels explaining criterion deltas.

## Gaps documented in matrix

- Social login slots in studio login blocks unused (Neon email/password only)
- multi-step-form-01 billing/payment steps must be stripped for onboarding
- 2FA from account-settings-06 not wired to Neon yet
- Share/submissions tabs on declaration detail need custom panels beyond shell block

## Block installation status

Direct `npx shadcn add @ss-blocks/*` returns **404** from the registry. Pattern adoption uses portal wrapper components instead:

| Matrix winner | Portal implementation |
|---------------|----------------------|
| `statistics-component-03` | [`components/portal-statistics-card.tsx`](components/portal-statistics-card.tsx) |
| `empty-state-01` | [`components/portal-empty-state.tsx`](components/portal-empty-state.tsx) |
| `empty-state-02` | [`components/portal-empty-state-cta.tsx`](components/portal-empty-state-cta.tsx) |
| `form-layout-01` | [`components/portal-form-section.tsx`](components/portal-form-section.tsx) |
| `multi-step-form-01` | [`components/client-onboarding-progress.tsx`](components/client-onboarding-progress.tsx) |
| `datatable-component-01` | [`components/org-declarations-table.tsx`](components/org-declarations-table.tsx) |
| `error-page-02` | [`components/portal-not-found-page.tsx`](components/portal-not-found-page.tsx) |

Install via MCP `/cui` when registry access is resolved.
