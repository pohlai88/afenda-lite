# UI Evaluation Summary

**Date:** 2026-07-08 (rescored after auth surface registry BL-08)  
**Scope:** 39 portal surfaces scored against Shadcn Studio blocks.  
**Validation:** `npm run evaluate:ui-matrix` — scoring + implementation alignment.

## Scoring criteria (weighted)

| Criterion | Weight |
|-----------|--------|
| PatternFit | 25% |
| BrandFit | 20% |
| PortalCompat | 20% |
| A11yMobile | 15% |
| ImplCost | 10% |
| Consistency | 10% |

Run `npm run evaluate:ui-matrix` for the full scored table with implementation kind and winner alignment.

## Studio adoption (2026-07-08)

| Kind | Count | Meaning |
|------|-------|---------|
| `studio-installed` | 8 | Block from `@ss-blocks/base-nova` registry |
| `portal-wrapper` | 7 | Custom `portal-*` mimicking a block pattern |
| `neon-integrated` | 14 | Neon AuthView / AccountView — keep by design |
| `hardcoded` | 10 | Custom UI; matrix may still recommend a block |

**Winner alignment:** 38/39 surfaces match matrix winner intent (see runner `ok` column).

**Needs registry install:** 13 surfaces — winner is a Studio block but implementation is wrapper or hardcoded.

## Aggregate scores (latest run)

| Metric | Value |
|--------|-------|
| Surfaces scored | 39 |
| Strong recommendation | 19 |
| Marginal | 4 |
| Tie | 16 |
| Studio-installed | 6 |
| Portal-wrapper | 6 |
| Hardcoded | 12 |
| Neon-integrated | 10 |
| Winner alignment | 34/34 |
| Needs registry install | 15 |

## Top wins (rescored)

| Surface | Winner | Score | Strength | Implementation |
|---------|--------|-------|----------|----------------|
| `admin-dashboard` | datatable-component-01 | **4.65** | strong | studio-installed |
| `admin-clients` | datatable-component-04 | **4.80** | strong | studio-installed |
| `auth-sign-in` | keep-current | 5.00 | strong | neon-integrated |
| `client-dashboard` | statistics-component-03 | 4.35 | tie | studio-installed |
| `client-profile` | form-layout-01 | 5.00 | marginal | studio-installed |
| `admin-create-declaration` | form-layout-01 | 5.00 | strong | studio-installed |
| `admin-issue-invite` | form-layout-01 | 5.00 | strong | studio-installed |

## Next installs (by matrix priority)

1. **empty-state-01 / empty-state-02** — error and empty surfaces
2. **error-page-02** — `portal-not-found-page.tsx`
3. **multi-step-form-01** — client onboarding stepper
4. **dashboard-shell-05** + **dashboard-sidebar** — operator/client shells

## Block installation

Registry URL (working):

```text
https://shadcnstudio.com/r/blocks/base-nova/{block}.json
```

Auth headers: `SHADCN_STUDIO_API_KEY` + `EMAIL` (see `components.json`).

```bash
npm run studio:install-block -- datatable-component-01
npm run studio:install-block -- datatable-component-04
npm run studio:install-block -- statistics-component-03
```

| Matrix winner | Status | Portal file |
|---------------|--------|-------------|
| `datatable-component-01` | **Installed** | `components/shadcn-studio/blocks/datatable-transaction.tsx` → `org-declarations-table.tsx` |
| `datatable-component-04` | **Installed** | `components/shadcn-studio/blocks/datatable-user.tsx` → `org-client-tables.tsx` |
| `statistics-component-03` | **Installed** | `components/shadcn-studio/blocks/statistics-card-03.tsx` → `portal-statistics-card.tsx` |
| `form-layout-01` | **Installed** | `components/shadcn-studio/blocks/form-layout-01/form-layout-section.tsx` → `portal-form-section.tsx` |
| `form-layout-02` | **Installed** | `components/shadcn-studio/blocks/form-layout-02/form-layout-section.tsx` → `declaration-settings-section.tsx` |
| `form-layout-08` | **Installed** | `components/shadcn-studio/blocks/form-layout-08/form-layout-wizard-shell.tsx` → `declaration-form.tsx` |
| `login-page-02` | **Installed (layout ref)** | `components/shadcn-studio/blocks/login-page-02/` — Storybook only; prod = Guardian + Neon |
| `empty-state-01` | **Installed + wrapper** | Studio block + `components/portal-empty-state.tsx` |
| `account-settings-01` | **Installed (chrome ref)** | `components/shadcn-studio/blocks/account-settings-01/` — Neon AccountView stays form owner |
| `dashboard-shell-05` | **Pattern** | `components/portal-declaration-workspace.tsx` → KPI row + tabbed workspace |
| `empty-state-02` | Wrapper | `components/portal-empty-state-cta.tsx` |
| `error-page-02` | Wrapper | `components/portal-not-found-page.tsx` |

**Canonical kit SSOT:** `lib/studio-canonical-kit.ts` · Storybook: `UI Evaluation/Studio Canonical Kit`.

## Auth & account (keep Neon)

All auth/account surfaces **keep Neon `AuthView` / `AccountView`**. Studio `login-page-02` / `account-settings-01` are layout/chrome references only — never replace Neon credential forms.

## Storybook comparisons

```bash
npm run storybook
```

Stories under `stories/ui-evaluation/` use `getEvaluationRow()` from `lib/ui-decision-matrix.ts`.

## Gaps documented in matrix

- Social login slots in studio login blocks unused (Neon email/password only)
- multi-step-form-01 billing/payment steps must be stripped for onboarding
- Admin dashboard KPI row uses StudioStatisticsCard (statistics-component-03)
- Share/submissions tabs on declaration detail need custom panels beyond shell block
