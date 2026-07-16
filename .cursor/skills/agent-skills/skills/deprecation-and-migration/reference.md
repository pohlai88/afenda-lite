# Afenda-Lite deprecation register (compulsory)

**Product:** **Afenda-Lite** (beta edition of the Afenda family). **Afenda-Elite** is the battle-proven edition. Both share [DOC-001](../../../../docs/_control/DOC-001-documentation-control-standard.md) documentation control and similar infra aliasing.  
**Authority:** [SKILL.md](SKILL.md) · `/using-afenda-elite-skills` · FFT locks/roadmap under [`docs/modules/feed-farm-trade/`](../../../../docs/modules/feed-farm-trade/) (FFT-MOD-001 · FFT-MOD-010)

Status meanings:

| Status | Meaning |
|--------|---------|
| **Retired** | Replacement ships; old identity must not be taught as current |
| **Redirect-only** | HTTP/route shim OK; no product UI or dual branding |
| **Hard-deleted** | Do not `git checkout` / remount; named migrate only if user reopens |
| **Rejected framing** | Conceptual mistake — do not reintroduce in plans or docs |

---

## Product identity (Afenda-Lite)

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| **Client Declaration Portal** | **Afenda-Lite** | Retired | 2026-07-12 |
| Framing the product as “a portal” / “the portal” | Multi-module **Afenda** SaaS (Lite beta · Elite battle-proven) | Rejected framing | Modules ≠ portals |
| npm `client-declaration-portal` | `afenda-lite` | Retired | `package.json` |
| GitHub `pohlai88/iam-check` | `pohlai88/afenda-lite` | Retired | Renamed 2026-07-12 |
| Vercel project `iam-check` | `afenda-lite` | Retired | Renamed 2026-07-12 |
| Prod URL `https://iam-check.vercel.app` | `https://afenda-lite.vercel.app` | Redirect-only legacy alias | Keep until cutover; `APP_URL` is Afenda-Lite |
| Disk folder `client-declaration-portal` | `afenda-lite` | **Pending operator** | In-repo residue cleared. Detached waiter: `C:\JackProject\afenda-bolt\rename-afenda-lite.ps1` (polls until unlock). **Close this Cursor workspace**, wait for rename, reopen `C:\JackProject\afenda-bolt\afenda-lite`. Log: `rename-afenda-lite.log`. |

---

## Identity & paths (Feed Farm Trade)

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| Product/engine name **Hot Sales** | **Feed Farm Trade (FFT)** | Retired | FE ADR-001 amended 2026-07-12 |
| URL product home `/trade/*` | `/fft/*` | Redirect-only | `proxy.ts` 308; do not rebuild `/trade` UI |
| Env prefix `HOT_SALES_*` | `FFT_*` | Retired | Migrate Vercel/local; do not re-add Hot Sales keys |
| DB `hot_sales_*` tables | `fft_*` | Retired | Migration `024_fft_rename_hot_sales_tables.sql` |
| Tags `hot-sales-phase-*` | `fft-phase-*` (new work) | Footnote only | Immutable history — do not retag |

## Shell & FE residue

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| `FftShell` / locale switcher | Shared `AdminCnShell` on `/fft/*` | Hard-deleted / ban remount | AC-SH; skill DO NOT |
| Live App Router `/fft/[locale]` | Locale-free `/fft/**` | Redirect / shim only | Action arg `FFT_UI_LOCALE` for copy |
| Separate FFT chrome / “second app” | One Afenda-Lite SaaS · two modules | Rejected framing | Platform+Identity shared with Declarations |
| FFT as separate infra “course” | Shared env/Neon/auth/proxy/CI/Vercel | Rejected framing | Module domain ≠ separate stack |
| Whole `components/` tree (2026-07-11) | `features/*` / `components-V2/*` | Hard-deleted | Named migrates only |

## Module boundary (not a deprecation of Declarations)

| Rule | Meaning |
|------|---------|
| No domain imports Trade ↔ Declarations | Module boundary inside **one** Afenda-Lite platform |
| Compose at adapter if both needed | Shared shell/nav OK |
| Platform/infra changes | Update **once** for both modules |

Declarations is not “deprecated.” Treating FFT and Declarations as two platforms **is** deprecated framing. Calling the whole product a “portal” **is** deprecated framing.

## Atmosphere / auth experiments

| Retired | Replacement | Status |
|---------|-------------|--------|
| Guardian Auth / PA hero shortcuts listed in PA rejected docs | Studio login-page-02 + Neon on `/auth/*` | Rejected — see portal-atmosphere rules |
| CSS invert owls / sticker heroes | Dual assets + approved comps | Rejected |
| Vanguard keyblade unlock (`vanguard-landing` / `ritual-engine` / `lynx-landing.css`) | **The Machine** — `features/landing/the-machine-landing.*` + `machine-sensor-engine.ts` | Retired — locked 2026-07-12; lab HTML `public/lynx/lynx-the-machine.html` |

## UI design system (ADR-010 cutover)

**Authority:** [ADR-010](../../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) (supersedes [ADR-009](../../../../docs/architecture/adr/ADR-009-afenda-ui-playground-gateway.md)) · [ARCH-024 § `@afenda/ui-system`](../../../../docs/architecture/ARCH-024-package-boundaries.md#afendaui-system) · [ARCH-031](../../../../docs/architecture/ARCH-031-technology-stack-catalogue.md)

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| `@afenda/ui` package (`packages/design-system`, **base-vega**) | `@afenda/ui-system` (`packages/ui-system`, shadcn **new-york** / Radix) | Hard-deleted | ADR-010 cutover 2026-07-16; do not restore `packages/design-system` or the `@afenda/ui` name. Owned regenerable shadcn source; no external/paid registries. |
| `@afenda/ui/playground` gateway subpath as the public UI door | Flat barrel `@afenda/ui-system` + `@afenda/ui-system/styles.css` | Retired | Single public surface; no gateway indirection. Barrel-only boundary enforced by `apps/web/__tests__/ui-boundary.test.ts`. |
| `*Contract extends` gateway component types (`src/playground/types.ts`) | None — components are the contract | Retired | Do not reintroduce a curated contract type layer. |
| External / paid Shadcn Studio registries in `components.json` | Free-tier shadcn + Radix (`radix-ui`) only, no `registries` key | Rejected framing | ADR-010 § D3 — minimal third-party influence; catalog-locked `radix-ui`. |
| Package owning `@import "tailwindcss"` (`packages/design-system/src/styles/style.css`) | App owns Tailwind + `tw-animate-css` + `@source`; package owns only semantic tokens (`@afenda/ui-system/styles.css`) | Retired | ADR-010 § D4 — one Tailwind compilation owner (`apps/web/globals.css`). |
| Next.js `/playground` route harness | Absent — requires explicit Shadcn Studio MCP slice | Rejected framing | Unchanged from ADR-009 § D5; do not handroll. |

## Closed product phases (not deprecations)

**SSOT:** this section (formerly ARCH-020 — Superseded in DOC-002; stub removed). Agents must not treat these as open gaps. Completeness matrices must read **Closed (registered)** or **Intentional (registered)** — never “missing” or “TODO”. Reopen requires explicit user approval in the turn.

| Item | Disposition | Authority / reopen |
|------|-------------|-------------------|
| Collapse-era product trees (`app/`, `modules/`, `features/`, `components-V2/`, wiped ops scripts) | **Hard-deleted / ban recover** — intentional docs-first checkout contamination lock | [ARCH-028](../../../../docs/architecture/ARCH-028-implementation-slices.md) Anti-contamination lock. **Forbidden without named user approval this turn:** `git checkout` / `git restore` / `git show` / `git cat-file` / archive of `f014807` or Collapse parents used to rebuild product code. Forward product code = Target greenfield (`apps/web`, `packages/*`) only after explicit ARCH-028 implement request. |
| Collapse compose env model (`env.config` / `env.secret` / `env:compose` / `env:guard` / `env-manifest.generated`) | **Retired** — S4.1 / Checkpoint D | [ARCH-027](../../../../docs/architecture/ARCH-027-env-model.md) · [ARCH-028](../../../../docs/architecture/ARCH-028-implementation-slices.md). Replacement: `@afenda/env` + `.env.local` + `.env.example`. Forbidden: restore compose scripts or dual env systems. |
| Repo-root `components.json` pointing at Collapse `app/` / `modules/platform` / `components/ui` | **Hard-deleted** · replaced by `@afenda/ui-system` (`packages/ui-system/components.json`) | [ARCH-028](../../../../docs/architecture/ARCH-028-implementation-slices.md) S5.1 / Checkpoint E · [ARCH-031](../../../../docs/architecture/ARCH-031-technology-stack-catalogue.md) · [ADR-010](../../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md). Owned shadcn `new-york` / Radix source in `packages/ui-system` (the interim `@afenda/ui` / `packages/design-system` **base-vega** package is itself retired — see UI design system section below). Forbidden: recreate root shadcn config against banned trees; Collapse git recover. |
| `/client` workspace product restore | **Closed** — stubs only under `app/client/(workspace)/**` when Target tree exists | Reopen: explicit user letter + spec slice under `docs/architecture/` + vertical slice. Forbidden: restore Collapse-era `features/client-workspace/` or repo-root trees. |
| FFT P3 **prod** flag promotion | **Closed** — code may exist behind flags; prod enablement is ops | [FFT-MOD-008](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md). Forbidden: enable prod `FFT_*` P3 flags without MOD-008 checklist + approval. |
| SaaS billing / 2FA chrome | **Intentional deferred** — not product Identity | AdminCN `ComingSoonPanel` / plan columns are chrome only. Forbidden: invent billing fields or 2FA flows without product ADR. Neon Auth owns credential MFA if enabled. |
| Teaching ARCH-020 as Living SSOT | **Superseded** | This section + DOC-002 register row only |

**Agent rule:** Default agent mission is **not** Feed Farm Trade program reopen. Option B (reopen / promote) always needs explicit user direction.

## Tenancy (hard cutover + multi-org ready)

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| Teaching `docs/architecture/turborepo/` as the Target system docs home | [`docs/architecture/`](../../../../docs/architecture/) | Renamed | Compulsory 2026-07-13; folder is system architecture, not a Turborepo howto |
| Teaching ARCH-014 UI Surfaces as Living SSOT | [ARCH-012](../../../../docs/architecture/ARCH-012-app-router-routes.md) · [ARCH-015](../../../../docs/architecture/ARCH-015-admincn-alignment.md) / [ARCH-018](../../../../docs/architecture/ARCH-018-admincn-customization.md) / [ARCH-019](../../../../docs/architecture/ARCH-019-admincn-frontend-preflight.md) · [ui-registry](../feed-farm-trade/ui-registry.md) | Superseded | Compulsory 2026-07-14; DOC-002 register-only (stub removed); Studio/AdminCN-first — no parallel journey catalogue |
| Teaching ARCH-020 closed-scope-register as Living SSOT | [deprecation register — Closed product phases](reference.md) | Superseded | Compulsory 2026-07-13; DOC-002 register-only (stub removed) |
| Teaching ARCH-021 repository-migration-map as layout SSOT | [ARCH-022](../../../../docs/architecture/ARCH-022-system-overview.md) · [ARCH-017](../../../../docs/architecture/ARCH-017-frontend-folder-map.md) | Superseded | Compulsory 2026-07-13; DOC-002 register-only (stub removed); campaign closed |
| Teaching `docs/backend/` as a top-level docs home | [`docs/architecture/`](../../../../docs/architecture/) · [ARCH-022](../../../../docs/architecture/ARCH-022-system-overview.md) · [ARCH-023](../../../../docs/architecture/ARCH-023-multi-tenancy.md) | Moved | Compulsory 2026-07-13; `docs/adr/` deleted |
| Teaching any file under top-level `docs/adr/` (backend/frontend/turborepo) | Approved ADR home [`docs/architecture/adr/`](../../../../docs/architecture/adr/) · Living/Target ARCH · FFT spine | Hard-deleted | Compulsory 2026-07-13; top-level `docs/adr/` banned; `decisions/` folder banned (DOC-001 2.5.0) |
| Teaching `docs/frontend/` as a top-level docs home | [`docs/architecture/`](../../../../docs/architecture/) · [`docs/modules/feed-farm-trade/`](../../../../docs/modules/feed-farm-trade/) | Moved | Compulsory 2026-07-13 |
| Teaching GUIDE-007…014 (phase task guides) | [docs/api/guides/README.md](../../../../docs/api/guides/README.md) · FFT-MOD-010 · ARCH-023/026 | Hard-deleted | Compulsory 2026-07-13; do not recreate |
| Teaching GUIDE-001…004 / GUIDE-006 Living engineering guides | [docs/README.md](../../../../docs/README.md) · DOC-001/003 · AGENTS.md · [ARCH-028](../../../../docs/architecture/ARCH-028-implementation-slices.md) drift · [docs/api/guides](../../../../docs/api/guides/README.md) | Retired | Compulsory 2026-07-14; IDs Retired in DOC-002 register-only (stubs removed); do not restore to Living |
| Teaching top-level `docs/fft/` as FFT docs home | [`docs/modules/feed-farm-trade/`](../../../../docs/modules/feed-farm-trade/) | Moved | Compulsory 2026-07-13; 10-MOD spine FFT-MOD-001…010 |
| Recreating FFT depth trees (`adr/` `ops/` `spec/` `architecture/` `integrations/` `archive/`) under `docs/modules/feed-farm-trade/` | Spine-only [FFT-MOD-010](../../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | Hard-deleted | Compulsory 2026-07-13; do not `git checkout` restore; gates live in FFT-MOD-008 |
| Teaching FFT `MOD-001` / `MOD-003` as Living entry | [FFT-MOD-008](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) · [FFT-MOD-010](../../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | Superseded | Compulsory 2026-07-13; stubs remain for path safety |
| Teaching `docs/engineering/` as a docs home | [`docs/guides/`](../../../../docs/guides/README.md) (DOC-001 Guide home; engineering GUIDE-001…006 Retired) | Moved | Compulsory 2026-07-13; do not recreate `engineering/` |
| Teaching a separate ARCH-011 IAM file (or any ADR as Living SSOT) | [ARCH-023](../../../../docs/architecture/ARCH-023-multi-tenancy.md) (sole tenancy + RBAC) · [ARCH-022](../../../../docs/architecture/ARCH-022-system-overview.md) | Hard-deleted | Compulsory 2026-07-13; no ADR home; no dual IAM ARCH |
| Soft SQL `(organization_id IS NULL OR = $org)` dual-mode | Hard `organization_id = $org` + migration `027` | Hard-deleted | CI `check:tenancy-residue`; ARCH-023 Decision lock **R1** |
| `promoteLegacyFftEntry` / login FFT promote | Platform `fft.access` + write-time ensure | Hard-deleted | |
| Arbitrary `organizations[0]` / first-org DB stamp | Active → slug → sole membership; ops `--organization-id` | Retired | M1 + M4; ARCH-023 Decision lock **R2**; e2e D8 closed |
| Default org slug/name `client-declaration-portal` / `iam-check` | `afenda-lite` (or `PORTAL_ORG_*`) | Retired | Product identity in docs/README + deprecation register; Auth org renamed 2026-07-12; operator `afenda@admin.com` |
| Teaching “multi-org ready **not** claimed” / org-switcher as v1 non-goal | M1–M4 shipped claim in ecosystem SSOT | Retired framing | Do not re-teach soft-harden as current |
| Neon RLS / Data API as default tenant isolation on BFF | App predicates + hard SQL | Rejected framing | ARCH-023 **R3**; reopen only with explicit user + superseding ARCH |
| Schema-per-tenant tenancy model | Shared schema + `organization_id` | Rejected framing | Ecosystem §0 **R4** |
| Project-per-tenant framed as efficiency / default path | Shared schema + one Neon project | Rejected framing (D5 non-goal) | Ecosystem §0 **R5**; Neon prefers it for isolation — we do not for this product |
| Raising CU / inventing `FFT_ERP_*` placeholders to green env | Fix pooler / nulls / syncOptional policy | Rejected framing | Ecosystem §0 **R7** |
| FFT child `organization_id` denorm as v1 tenancy fix | Parent `fft_event` + `getEventById(…, org)` | Deferred (M5) | Ecosystem §0 **D4**; not a bug |

## Agent skills (Elite cleanup)

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| `guardian-css-audit` skill | — (atmosphere dormant; `components/` hard-deleted) | Hard-deleted | Wave 1 — [using-afenda-elite-skills](../../../using-afenda-elite-skills/SKILL.md) |
| `portal-frontend-scaffold` | `afenda-elite-frontend-scaffold` | Hard-deleted (renamed) | Wave 2 |
| `portal-backend-modules` | `afenda-elite-backend-modules` | Hard-deleted (renamed) | Wave 2 |
| `portal-api-contract` | `afenda-elite-api-contract` | Hard-deleted (renamed) | Wave 2 |
| `afenda-elite-documentation` | `afenda-elite-doc-control` | Hard-deleted (renamed) | Wave 3 |
| `afenda-elite-docs-consistency` | `afenda-elite-doc-integrity` | Hard-deleted (renamed) | Wave 3 |
| npm `check\|test\|plan\|fix:docs-consistency` | `*:doc-integrity` | Retired | Wave 3 follow-up — internal scripts renamed `docs-consistency-*.mjs` → `doc-integrity-*.mjs` |
| Invoking vendor/`using-agent-skills` as **product** entry in this repo | `/using-afenda-elite-skills` first | Retired framing | Method library stays subordinate |
| Forking every vendor phase skill to `afenda-elite-*` | Method library under Elite entry | Rejected framing | Complexity matrix |
| Afenda-Lite as Elite program ceiling / divergent `doc/` SSOT | Shared DOC-001 control · Lite = beta · Elite = battle-proven | Retired framing | Same structure; maturity differs |
| `afenda-elite-design-system` skill (Studio DNA install → promote → gateway pipeline) | [ADR-010](../../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) UI design system section (owned shadcn/Radix source; `shadcn add` → relative-import → barrel export) | Hard-deleted | 2026-07-16 — ADR-009 pipeline retired with `@afenda/ui`; do not restore the promote/gateway workflow. |
| `afenda-elite-ui-handoff` skill (UI gate: no-handroll, gateway boundary, Chrome DevTools evidence) | [ADR-010](../../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) guardrails (barrel-only boundary + consistency/interaction tests) | Hard-deleted | 2026-07-16 — gated the retired gateway; boundary now enforced by committed tests, not a skill. |
| `admincn-customization` skill (AdminCN shell / Studio blocks in `components-V2`) | [ADR-010](../../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) · `@afenda/ui-system` | Hard-deleted | 2026-07-16 — targeted retired `components-V2` / Studio registry surface. |

---

## How agents must behave

1. **Refuse** to remount or re-teach anything **Retired** / **Hard-deleted** / **Rejected framing**.
2. **Say Afenda-Lite** in this checkout’s live SSOT (README, AGENTS, new docs) — never “Client Declaration Portal” as current. Treat **Afenda-Elite** as the battle-proven edition that shares DOC-001 documentation control and similar infra — do not invent a parallel `doc/` SSOT.
3. **On touch**, strip live docs/code that present retired names as current (archive footnotes OK).
4. **Redirect-only** paths: keep thin shims; never attach product features.
5. **New deprecations:** add a row here in the same PR that retires them; link ADR.
6. Load this register when running `deprecation-and-migration` or when tempted to “leave legacy for convenience.”
7. **Skills:** enter via `/using-afenda-elite-skills`; do not restore `guardian-css-audit`.
