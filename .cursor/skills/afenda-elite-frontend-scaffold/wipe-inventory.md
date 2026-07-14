# Complete wipe inventory (scaffold pass)

> **Superseded for Feed Farm Trade routes (2026-07-11):** `/fft/[locale]/*` and `features/fft/*` UI listed below were wiped. Live tree is locale-free under `/fft/*` with **AdminCN shell** (not `FftShell`). Treat locale/FftShell rows as historical only — see [docs/architecture/ARCH-012-app-router-routes.md](../../../docs/architecture/ARCH-012-app-router-routes.md).

**Generated from disk.** This is what `/afenda-elite-frontend-scaffold` deletes or replaces when you say go.

Legend:

- **DELETE** — remove file
- **DELETE folder** — remove path (replaced by renamed segment in scaffold)
- **REPLACE** — delete content / rewrite as stub (same path or new param name)
- **KEEP** — do not touch

---

## Totals (approx)

| Bucket | Count | Action |
|--------|------:|--------|
| `app/**` product (excl. `api/`, `actions/`) | ~110 | DELETE or REPLACE |
| `features/**` | 74 | DELETE all |
| `components-V2/.../portal-views/**` | 10 | DELETE all |
| `components/**` (legacy root) | **0 — already absent on disk** | N/A |
| `app/api/**` | keep | KEEP |
| `app/actions/**` | keep | KEEP |
| Former `lib/**` runners | absorbed | **Gone** — live under `features/*` (see `/afenda-elite-backend-modules` residue) |

---

## A. DELETE — entire `features/` (74)

### account (4)
- `features/account/portal-account-neon-view.tsx`
- `features/account/portal-account-section-nav.tsx`
- `features/account/portal-form-section.tsx`
- `features/account/studio/form-layout-section.tsx`

### auth (20)
- `features/auth/auth-page-notices.tsx`
- `features/auth/index.ts`
- `features/auth/invitation-join-panel.interaction.test.tsx`
- `features/auth/invitation-join-panel.tsx`
- `features/auth/invitation-join-steps.tsx`
- `features/auth/notices.tsx`
- `features/auth/portal-auth-form-intro.tsx`
- `features/auth/portal-auth-neon-view.tsx`
- `features/auth/portal-auth-provider.tsx`
- `features/auth/README.md`
- `features/auth/studio-auth-login-page.tsx`
- `features/auth/studio-auth-shell.tsx`
- `features/auth/studio-invitation-join-page.tsx`
- `features/auth/studio/auth-full-background-shape.tsx`
- `features/auth/studio/icon-placeholder.tsx`
- `features/auth/studio/login-page-02-chrome.tsx`
- `features/auth/studio/logo-svg.tsx`
- `features/auth/use-join-invitation-auth-view.ts`
- `features/auth/use-mounted.ts`

### landing (6)
- `features/landing/index.ts`
- `features/landing/lynx-landing-page.tsx`
- `features/landing/the-machine-landing.tsx`
- `features/landing/the-machine-landing.css`
- `features/landing/the-machine-fonts.ts`
- `features/landing/machine-sensor-engine.ts`
- `features/landing/machine-sensor-engine.test.ts`
- `features/landing/the-machine-landing.interaction.test.tsx`

### operator (24)
- `features/organization-admin/cdp-ai-prompt-instructions.tsx`
- `features/organization-admin/client/client-access-share-panel.tsx`
- `features/organization-admin/confirm-dialog.tsx`
- `features/organization-admin/copy-access-message.tsx`
- `features/organization-admin/declaration-danger-zone.tsx`
- `features/organization-admin/declaration-delete-button.tsx`
- `features/organization-admin/declaration-manage-form.tsx`
- `features/organization-admin/declaration-settings-section.tsx`
- `features/organization-admin/declaration-share-panel.tsx`
- `features/organization-admin/form-error-alert.tsx`
- `features/organization-admin/issue-client-invite-form.tsx`
- `features/organization-admin/portal/portal-declaration-workspace.tsx`
- `features/organization-admin/portal/portal-statistics-card.tsx`
- `features/organization-admin/question-fields-editor.tsx`
- `features/organization-admin/question-sequence-badge.tsx`
- `features/organization-admin/secure-link-rotate-button.tsx`
- `features/organization-admin/form-layout-section.tsx`
- `features/organization-admin/statistics-card.tsx`
- `features/organization-admin/submission-answers.tsx`
- `features/organization-admin/survey-detail-tabs.tsx`
- `features/organization-admin/survey-metadata-fields.tsx`
- `features/organization-admin/survey-package-ingest-dialog.tsx`
- `features/organization-admin/survey-package-panel.tsx`

### portal-chrome (5)
- `features/portal-chrome/brand-favicon-sync.tsx`
- `features/portal-chrome/portal-brand-mark.tsx`
- `features/portal-chrome/portal-not-found-page.tsx`
- `features/portal-chrome/portal-route-error.tsx`
- `features/portal-chrome/theme-provider.tsx`

### trade (18)
- `features/fft/trade-admin-forms.tsx`
- `features/fft/trade-allocation-controls.tsx`
- `features/fft/trade-clone-button.tsx`
- `features/fft/trade-countdown.tsx`
- `features/fft/trade-deposit-forms.interaction.test.tsx`
- `features/fft/trade-deposit-forms.tsx`
- `features/fft/trade-erp-sync-panel.interaction.test.tsx`
- `features/fft/trade-erp-sync-panel.tsx`
- `features/fft/trade-export-panel.tsx`
- `features/fft/trade-import-panel.interaction.test.tsx`
- `features/fft/trade-import-panel.tsx`
- `features/fft/trade-locale-switcher.tsx`
- `features/fft/trade-order-form.tsx`
- `features/fft/trade-pickup-forms.interaction.test.tsx`
- `features/fft/trade-pickup-forms.tsx`
- `features/fft/trade-rbac-admin.tsx`
- `features/fft/trade-sales-member-form.tsx`
- `features/fft/trade-setup-forms.tsx`
- `features/fft/trade-shell.tsx`
- `features/fft/trade-transfer-forms.tsx`

After delete: recreate empty `features/{landing,auth,account,operator,client-workspace,portal-chrome,trade}/` with `.gitkeep` only.

---

## B. DELETE — `components-V2/platform-views/portal-views/` (10)

- `operator-clients-list.tsx`
- `operator-declaration-detail.tsx`
- `operator-declarations-dashboard.tsx`
- `portal-access-share-panel.tsx`
- `portal-client-delete-buttons.tsx`
- `portal-client-tables.tsx`
- `portal-create-declaration-button.tsx`
- `portal-declaration-submissions-table.tsx`
- `portal-declarations-table.tsx`
- `portal-invite-client-link.tsx`

---

## C. DELETE / REPLACE — product `app/**` (excl. api + actions)

### Root (REPLACE stubs; KEEP assets noted in §E)
- `app/page.tsx` — REPLACE stub
- `app/layout.tsx` — REPLACE stub (keep html/body + css import)
- `app/loading.tsx` — REPLACE
- `app/error.tsx` — REPLACE (client)
- `app/global-error.tsx` — REPLACE (client + html/body)
- `app/not-found.tsx` — REPLACE
- `app/server/actions.ts` — DELETE (legacy barrel; not `app/actions/`)

### auth
- `app/auth/[path]/page.tsx` — REPLACE
- `app/auth/[path]/loading.tsx` — REPLACE
- `app/auth/[path]/error.tsx` — REPLACE
- `app/auth/admin/page.tsx` — REPLACE
- `app/auth/admin/loading.tsx` — REPLACE

### org / join / invite / f / survey
- `app/org/login/page.tsx`, `loading.tsx`, `error.tsx` — REPLACE
- `app/join/page.tsx`, `loading.tsx`, `error.tsx` — REPLACE
- `app/invite/[token]/page.tsx`, `loading.tsx`, `error.tsx` — REPLACE
- `app/f/[token]/page.tsx`, `loading.tsx`, `error.tsx` — REPLACE
- `app/survey/[slug]/page.tsx`, `loading.tsx`, `error.tsx` — REPLACE

### client
- `app/client/error.tsx` — REPLACE or move to workspace
- `app/client/(gate)/layout.tsx` — REPLACE
- `app/client/(gate)/login/page.tsx`, `loading.tsx` — REPLACE
- `app/client/(gate)/preview-unavailable/page.tsx` — REPLACE
- `app/client/(workspace)/layout.tsx` — REPLACE
- `app/client/(workspace)/page.tsx` — REPLACE
- `app/client/(workspace)/onboarding/page.tsx`, `loading.tsx`, `error.tsx` — REPLACE
- `app/client/(workspace)/profile/page.tsx` — REPLACE
- **`app/client/(workspace)/declare/[id]/`** — DELETE folder (param rename)
  - `page.tsx`, `.gitkeep`
  - Scaffold creates `declare/[assignmentId]/` instead

### dashboard
- `app/dashboard/layout.tsx`, `loading.tsx`, `error.tsx`, `page.tsx` — REPLACE
- `app/dashboard/clients/page.tsx`, `loading.tsx` — REPLACE
- **`app/dashboard/[id]/`** — DELETE folder (param rename)
  - `page.tsx`, `loading.tsx`, `not-found.tsx`, `.gitkeep`
  - Scaffold creates `[declarationId]/` instead

### account
- `app/account/layout.tsx`, `loading.tsx`, `error.tsx`, `page.tsx` — REPLACE
- `app/account/[path]/page.tsx`, `loading.tsx`, `not-found.tsx` — REPLACE

### playground
- `app/playground/layout.tsx`, `page.tsx`, `error.tsx` — REPLACE
- `app/playground/[screenId]/page.tsx` — REPLACE
- `app/playground/coverage/page.tsx` — REPLACE
- `app/playground/hitl-review/page.tsx` — REPLACE

### trade
- `app/fft/page.tsx` — REPLACE
- `app/fft/[locale]/layout.tsx` — REPLACE
- `app/fft/[locale]/events/page.tsx` — REPLACE
- `app/fft/[locale]/my-orders/page.tsx` — REPLACE
- `app/fft/[locale]/admin/events/page.tsx` — REPLACE
- `app/fft/[locale]/admin/events/new/page.tsx` — REPLACE
- `app/fft/[locale]/admin/erp-sync/page.tsx` — REPLACE
- `app/fft/[locale]/admin/rbac/page.tsx` — REPLACE
- **`app/fft/[locale]/events/[id]/`** — DELETE folder → `[eventId]/`
- **`app/fft/[locale]/admin/events/[id]/`** — DELETE folder → `[eventId]/`
  - setup / allocation / deposits / imports / pickup `page.tsx` + `.gitkeep` each

### `.gitkeep` under wiped trees
All `app/**/.gitkeep` under product routes above — DELETE with folders; scaffold may re-add empty feature gitkeeps only.

---

## D. Root `components/`

**Already absent on disk** (`Test-Path components` → false). Do not recreate. If it reappears, DELETE the whole tree.

---

## E. KEEP (do not delete)

### app adapters
- `app/api/auth/[...path]/route.ts`
- `app/api/health/liveness/route.ts` (+ `.test.ts` if present)
- `app/api/health/readiness/route.ts` (+ `.test.ts`)
- `app/api/client/declaration-draft/route.ts` (+ `.test.ts`)
- `app/actions/account.ts`
- `app/actions/admin.ts`
- `app/actions/client.ts`
- `app/actions/declarations.ts`
- `app/actions/surveys.ts`
- `app/actions/fft.ts`

### app assets / global style (keep; layout re-imports)
- `app/globals.css`
- `app/fonts.ts`
- `app/favicon.ico`
- `app/auth-surface.css` (optional keep; unused until auth UI returns)
- `app/globals.portal-backup.css.txt` (optional — can DELETE as dead backup)

### everything else outside wipe
- `lib/**` (entire tree — transitional bin)
- `db/**`, `proxy.ts`, `messages/**`, `doc/**`, `docs/**` if present
- `e2e/**`, `testing/**`
- `components-V2/**` except `platform-views/portal-views/**` (ui/shell kept)
- `public/**`, `scripts/**`, `package.json`, config files

---

## F. Param folders removed (rename map)

| Delete path | Scaffold creates |
|-------------|------------------|
| `app/dashboard/[id]/` | `app/dashboard/[declarationId]/` |
| `app/client/(workspace)/declare/[id]/` | `…/declare/[assignmentId]/` |
| `app/fft/[locale]/events/[id]/` | `…/events/[eventId]/` |
| `app/fft/[locale]/admin/events/[id]/` | `…/admin/events/[eventId]/` |
