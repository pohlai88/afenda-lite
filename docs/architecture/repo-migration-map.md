# Repo migration map

**Campaign status:** `REPO_LAYOUT_CAMPAIGN_OPEN=false`  
**Layout SSOT:** [repo-layout.md](./repo-layout.md)

**Closed:** 2026-07-09 — PR13–14 barrel removal and canonical import paths applied.

---

## lib/entry

| Old path | New path | Barrel at old path | Status |
| -------- | -------- | ------------------ | ------ |
| `lib/client-sign-in-entry.ts` | `lib/entry/client-sign-in-entry.ts` | removed | closed |
| `lib/org-sign-in-entry.ts` | `lib/entry/org-sign-in-entry.ts` | removed | closed |
| `lib/client-invitation-entry.ts` | `lib/entry/client-invitation-entry.ts` | removed | closed |
| `lib/legacy-invite-entry.ts` | `lib/entry/legacy-invite-entry.ts` | removed | closed |
| `lib/open-link-entry.ts` | `lib/entry/open-link-entry.ts` | removed | closed |
| `lib/secure-link-entry.ts` | `lib/entry/secure-link-entry.ts` | removed | closed |

## lib/pages

| Old path | New path | Barrel | Status |
| -------- | -------- | ------ | ------ |
| `lib/client-dashboard-page.tsx` | `lib/pages/client-dashboard-page.tsx` | removed | closed |
| `lib/client-declare-page.tsx` | `lib/pages/client-declare-page.tsx` | removed | closed |
| `lib/client-declare-page.logic.ts` | `lib/pages/client-declare-page.logic.ts` | removed | closed |
| `lib/client-onboarding-page.tsx` | `lib/pages/client-onboarding-page.tsx` | removed | closed |
| `lib/client-profile-page.tsx` | `lib/pages/client-profile-page.tsx` | removed | closed |
| `lib/client-preview-unavailable-page.tsx` | `lib/pages/client-preview-unavailable-page.tsx` | removed | closed |
| `lib/operator-dashboard-page.ts` | `lib/pages/operator-dashboard-page.ts` | removed | closed |
| `lib/operator-clients-page.ts` | `lib/pages/operator-clients-page.ts` | removed | closed |
| `lib/operator-declaration-detail.logic.ts` | `lib/pages/operator-declaration-detail.logic.ts` | removed | closed |
| `lib/public-link-page.ts` | `lib/pages/public-link-page.ts` | removed | closed |
| `lib/playground-*-page.*` | `lib/pages/playground/` | removed | closed |

## lib/routing

| Old path | New path | Barrel | Status |
| -------- | -------- | ------ | ------ |
| `lib/portal-routes.ts` | `lib/routing/portal-routes.ts` | removed | closed |
| `lib/portal-nav-routes.ts` | `lib/routing/portal-nav-routes.ts` | removed | closed |
| `lib/portal-session-routing.ts` | `lib/routing/portal-session-routing.ts` | removed | closed |
| `lib/account-paths.ts` | `lib/routing/account-paths.ts` | removed | closed |
| `lib/not-found-routing.ts` | `lib/routing/not-found-routing.ts` | removed | closed |
| `lib/public-link-routing.ts` | `lib/routing/public-link-routing.ts` | removed | closed |
| `lib/surface-entry-points.ts` | `lib/routing/surface-entry-points.ts` | removed | closed |

## lib/domain

| Old path | New path | Barrel | Status |
| -------- | -------- | ------ | ------ |
| `lib/surveys.ts` | `lib/domain/surveys.ts` | removed | closed |
| `lib/clients.ts` | `lib/domain/clients.ts` | removed | closed |
| `lib/questions.ts` | `lib/domain/questions.ts` | removed | closed |
| `lib/audit.ts` | `lib/domain/audit.ts` | removed | closed |
| `lib/survey-submission.ts` | `lib/domain/survey-submission.ts` | removed | closed |
| `lib/neon-auth-users.ts` | `lib/domain/neon-auth-users.ts` | removed | closed |
| `lib/tokens.ts` | `lib/domain/tokens.ts` | removed | closed |
| `lib/client-declaration-draft.ts` | `lib/domain/client-declaration-draft.ts` | removed | closed |
| `lib/invite.ts` | `lib/domain/invite.ts` | removed | closed |
| `lib/evidence-policy.ts` | `lib/domain/evidence-policy.ts` | removed | closed |
| `lib/survey-package*.ts` | `lib/domain/` | removed | closed |
| `lib/declaration-*.ts` (deadlines/steps/share-links) | `lib/domain/` | removed | closed |
| `lib/operator-declaration-detail.tsx` | `lib/pages/operator-declaration-detail.tsx` | removed | closed |

## lib/copy / governance / playground

| Old path | New path | Barrel | Status |
| -------- | -------- | ------ | ------ |
| `lib/portal-copy.ts` | `lib/copy/portal-copy.ts` | removed | closed |
| `lib/portal-brand.ts` | `lib/copy/portal-brand.ts` | removed | closed |
| `lib/portal-reliance-*.ts` | `lib/governance/` | removed | closed |
| `lib/ui-decision-matrix.ts` | `lib/governance/ui-decision-matrix.ts` | removed | closed |
| `lib/playground*.ts(x)` | `lib/playground/` | removed | closed |

## components/

| Old path | New path | Barrel | Status |
| -------- | -------- | ------ | ------ |
| `components/client-*.tsx` | `components/client/` | removed | closed |
| `components/operator-*.tsx`, `components/org-*.tsx` | `components/operator/` | removed | closed |
| `components/portal-*.tsx` (root) | `components/portal/` | removed | closed |

## Legacy collapse

| Old path | New path | Status |
| -------- | -------- | ------ |
| `supabase/README.md` | `docs/legacy/supabase.md` | closed |
| `config/neon-auth.manifest.json` | `lib/auth/neon-auth.manifest.json` | closed |
| `registry/icons/icon-placeholder.tsx` | `components/svg/icon-placeholder.tsx` | closed |
| `hooks/*.ts` | `components/hooks/` | closed |

---

## Campaign close checklist

When `REPO_LAYOUT_CAMPAIGN_OPEN=false`:

- [x] All rows above are `moved` or `closed` (no `pending`)
- [x] Compatibility barrels removed; imports use new paths
- [x] `check:import-boundaries` passes
- [x] `npm run checks`, `test:unit`, `build` pass
