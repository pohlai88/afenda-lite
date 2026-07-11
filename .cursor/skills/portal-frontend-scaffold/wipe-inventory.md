# Complete wipe inventory (scaffold pass)

> **Superseded for Hot Sales routes (2026-07-11):** `/trade/[locale]/*` and `features/trade/*` UI listed below were wiped. Live tree is locale-free under `/trade/*` with **AdminCN shell** (not `TradeShell`). Treat locale/TradeShell rows as historical only — see [doc/frontend/03-routes.md](../../../doc/frontend/03-routes.md).

**Generated from disk.** This is what `/portal-frontend-scaffold` deletes or replaces when you say go.

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
| `lib/**` | keep | KEEP (bin until later) |

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

### landing (3)
- `features/landing/index.ts`
- `features/landing/lynx-landing-page.tsx`
- `features/landing/lynx-landing.css`

### operator (24)
- `features/operator/cdp-ai-prompt-instructions.tsx`
- `features/operator/client/client-access-share-panel.tsx`
- `features/operator/confirm-dialog.tsx`
- `features/operator/copy-access-message.tsx`
- `features/operator/declaration-danger-zone.tsx`
- `features/operator/declaration-delete-button.tsx`
- `features/operator/declaration-manage-form.tsx`
- `features/operator/declaration-settings-section.tsx`
- `features/operator/declaration-share-panel.tsx`
- `features/operator/form-error-alert.tsx`
- `features/operator/issue-client-invite-form.tsx`
- `features/operator/portal/portal-declaration-workspace.tsx`
- `features/operator/portal/portal-statistics-card.tsx`
- `features/operator/question-fields-editor.tsx`
- `features/operator/question-sequence-badge.tsx`
- `features/operator/secure-link-rotate-button.tsx`
- `features/operator/shadcn-studio/blocks/form-layout-02/form-layout-section.tsx`
- `features/operator/shadcn-studio/blocks/statistics-card-03.tsx`
- `features/operator/submission-answers.tsx`
- `features/operator/survey-detail-tabs.tsx`
- `features/operator/survey-metadata-fields.tsx`
- `features/operator/survey-package-ingest-dialog.tsx`
- `features/operator/survey-package-panel.tsx`

### portal-chrome (5)
- `features/portal-chrome/brand-favicon-sync.tsx`
- `features/portal-chrome/portal-brand-mark.tsx`
- `features/portal-chrome/portal-not-found-page.tsx`
- `features/portal-chrome/portal-route-error.tsx`
- `features/portal-chrome/theme-provider.tsx`

### trade (18)
- `features/trade/trade-admin-forms.tsx`
- `features/trade/trade-allocation-controls.tsx`
- `features/trade/trade-clone-button.tsx`
- `features/trade/trade-countdown.tsx`
- `features/trade/trade-deposit-forms.interaction.test.tsx`
- `features/trade/trade-deposit-forms.tsx`
- `features/trade/trade-erp-sync-panel.interaction.test.tsx`
- `features/trade/trade-erp-sync-panel.tsx`
- `features/trade/trade-export-panel.tsx`
- `features/trade/trade-import-panel.interaction.test.tsx`
- `features/trade/trade-import-panel.tsx`
- `features/trade/trade-locale-switcher.tsx`
- `features/trade/trade-order-form.tsx`
- `features/trade/trade-pickup-forms.interaction.test.tsx`
- `features/trade/trade-pickup-forms.tsx`
- `features/trade/trade-rbac-admin.tsx`
- `features/trade/trade-sales-member-form.tsx`
- `features/trade/trade-setup-forms.tsx`
- `features/trade/trade-shell.tsx`
- `features/trade/trade-transfer-forms.tsx`

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
- `app/trade/page.tsx` — REPLACE
- `app/trade/[locale]/layout.tsx` — REPLACE
- `app/trade/[locale]/events/page.tsx` — REPLACE
- `app/trade/[locale]/my-orders/page.tsx` — REPLACE
- `app/trade/[locale]/admin/events/page.tsx` — REPLACE
- `app/trade/[locale]/admin/events/new/page.tsx` — REPLACE
- `app/trade/[locale]/admin/erp-sync/page.tsx` — REPLACE
- `app/trade/[locale]/admin/rbac/page.tsx` — REPLACE
- **`app/trade/[locale]/events/[id]/`** — DELETE folder → `[eventId]/`
- **`app/trade/[locale]/admin/events/[id]/`** — DELETE folder → `[eventId]/`
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
- `app/actions/trade.ts`

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
| `app/trade/[locale]/events/[id]/` | `…/events/[eventId]/` |
| `app/trade/[locale]/admin/events/[id]/` | `…/admin/events/[eventId]/` |
