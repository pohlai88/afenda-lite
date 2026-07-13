# Afenda-Lite deprecation register (compulsory)

**Product:** **Afenda-Lite** (beta of Afenda ERP)  
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
| Framing the product as “a portal” / “the portal” | Multi-module **Afenda ERP** beta (SaaS) | Rejected framing | Modules ≠ portals |
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

## Closed product phases (not deprecations)

**SSOT:** this section (formerly [ARCH-020](../../../../docs/architecture/archive/ARCH-020-closed-scope-register.md)). Agents must not treat these as open gaps. Completeness matrices must read **Closed (registered)** or **Intentional (registered)** — never “missing” or “TODO”. Reopen requires explicit user approval in the turn.

| Item | Disposition | Authority / reopen |
|------|-------------|-------------------|
| `/client` workspace product restore | **Closed** — stubs only under `app/client/(workspace)/**` | Reopen: explicit user letter + spec slice under `docs/architecture/frontend/` + vertical slice (RSC → modules, Actions, gates). Forbidden: restore `features/client-workspace/` without reopen. |
| FFT P3 **prod** flag promotion | **Closed** — code may exist behind flags; prod enablement is ops | [FFT-MOD-008](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md). Forbidden: enable prod `FFT_*` P3 flags without MOD-008 checklist + approval. |
| SaaS billing / 2FA chrome | **Intentional deferred** — not product Identity | AdminCN `ComingSoonPanel` / plan columns are chrome only. Forbidden: invent billing fields or 2FA flows without product ADR. Neon Auth owns credential MFA if enabled. |
| Teaching ARCH-020 as Living SSOT | **Superseded** | This section + archive stub only |

**Agent rule:** Default agent mission is **not** Feed Farm Trade program reopen. Option B (reopen / promote) always needs explicit user direction.

## Tenancy (hard cutover + multi-org ready)

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| Teaching ARCH-003 multi-tenant-ecosystem as Living SSOT | [ARCH-023](../../../../docs/architecture/turborepo/ARCH-023-multi-tenancy.md) | Superseded | Compulsory 2026-07-13; archived stub `docs/architecture/archive/ARCH-003-*` |
| Teaching ARCH-020 closed-scope-register as Living SSOT | [deprecation register — Closed product phases](reference.md) | Superseded | Compulsory 2026-07-13; archived stub `docs/architecture/archive/ARCH-020-*` |
| Teaching ARCH-021 repository-migration-map as layout SSOT | [ARCH-022](../../../../docs/architecture/turborepo/ARCH-022-system-overview.md) · [ARCH-029](../../../../docs/architecture/frontend/ARCH-029-frontend-folder-map.md) | Superseded | Compulsory 2026-07-13; archived stub `docs/architecture/archive/ARCH-021-*`; campaign closed |
| Teaching `docs/backend/` as a top-level docs home | [`docs/architecture/backend/`](../../../../docs/architecture/backend/) · ADRs merged to ARCH-022 / ARCH-011 | Moved | Compulsory 2026-07-13; `docs/adr/backend/` deleted |
| Teaching ADR-001 / ADR-002 files under `docs/adr/backend/` | [ARCH-022](../../../../docs/architecture/turborepo/ARCH-022-system-overview.md) · [ARCH-011](../../../../docs/architecture/ARCH-011-platform-tenancy-rbac.md) | Hard-deleted | Compulsory 2026-07-13; stubs removed after merge |
| Teaching `docs/frontend/` as a top-level docs home | [`docs/architecture/frontend/`](../../../../docs/architecture/frontend/) · [`docs/modules/feed-farm-trade/`](../../../../docs/modules/feed-farm-trade/) | Moved | Compulsory 2026-07-13; ARCH under architecture; FFT FE ADRs merged into spine |
| Teaching ADR-003…005 under `docs/adr/frontend/` | [FFT-MOD-001](../../../../docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [FFT-MOD-010](../../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | Hard-deleted | Compulsory 2026-07-13; `docs/adr/frontend/` removed after merge |
| Teaching GUIDE-007…014 (phase task guides) | [GUIDE-006](../../../../docs/guides/GUIDE-006-guides-index.md) replacements table · FFT-MOD-010 · ARCH-011/023/026 | Hard-deleted | Compulsory 2026-07-13; do not recreate |
| Teaching top-level `docs/fft/` as FFT docs home | [`docs/modules/feed-farm-trade/`](../../../../docs/modules/feed-farm-trade/) | Moved | Compulsory 2026-07-13; 10-MOD spine FFT-MOD-001…010 |
| Recreating FFT depth trees (`adr/` `ops/` `spec/` `architecture/` `integrations/` `archive/`) under `docs/modules/feed-farm-trade/` | Spine-only [FFT-MOD-010](../../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | Hard-deleted | Compulsory 2026-07-13; do not `git checkout` restore; gates live in FFT-MOD-008 |
| Teaching FFT `MOD-001` / `MOD-003` as Living entry | [FFT-MOD-008](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) · [FFT-MOD-010](../../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) | Superseded | Compulsory 2026-07-13; stubs remain for path safety |
| Teaching `docs/engineering/` as a docs home | [`docs/guides/`](../../../../docs/guides/) (GUIDE-001…004) | Moved | Compulsory 2026-07-13; do not recreate `engineering/` |
| Teaching ADR-001 Modular Monolith + Hexagonal as a standalone Living ADR | [ARCH-022](../../../../docs/architecture/turborepo/ARCH-022-system-overview.md) § System framework | Hard-deleted | Compulsory 2026-07-13; file removed after merge |
| Teaching ADR-002 platform tenancy + RBAC as a standalone Living ADR | [ARCH-011](../../../../docs/architecture/ARCH-011-platform-tenancy-rbac.md) | Hard-deleted | Compulsory 2026-07-13; file removed after merge; folder map = ARCH-029 |
| Teaching ADR-012 shared-schema tenancy as a standalone Living ADR | [ARCH-023](../../../../docs/architecture/turborepo/ARCH-023-multi-tenancy.md) § Shared-schema | Hard-deleted | Compulsory 2026-07-13; stub removed with `docs/adr/` |
| Teaching ADR-010…014 under `docs/adr/turborepo/` (or tech-stack ADR copies) | [ARCH-022](../../../../docs/architecture/turborepo/ARCH-022-system-overview.md)…[ARCH-027](../../../../docs/architecture/turborepo/ARCH-027-env-model.md) | Hard-deleted | Compulsory 2026-07-13; entire `docs/adr/` removed after merge |
| Soft SQL `(organization_id IS NULL OR = $org)` dual-mode | Hard `organization_id = $org` + migration `027` | Hard-deleted | CI `check:tenancy-residue`; ADR-002; ARCH-023 Decision lock **R1** |
| `promoteLegacyFftEntry` / login FFT promote | Platform `fft.access` + write-time ensure | Hard-deleted | |
| Arbitrary `organizations[0]` / first-org DB stamp | Active → slug → sole membership; ops `--organization-id` | Retired | M1 + M4; ARCH-023 Decision lock **R2**; e2e D8 closed |
| Default org slug/name `client-declaration-portal` / `iam-check` | `afenda-lite` (or `PORTAL_ORG_*`) | Retired | Product identity ADR-001; Auth org renamed 2026-07-12; operator `afenda@admin.com` |
| Teaching “multi-org ready **not** claimed” / org-switcher as v1 non-goal | M1–M4 shipped claim in ecosystem SSOT | Retired framing | Do not re-teach soft-harden as current |
| Neon RLS / Data API as default tenant isolation on BFF | App predicates + hard SQL | Rejected framing | Ecosystem §0 **R3**; reopen only with Data API ADR |
| Schema-per-tenant tenancy model | Shared schema + `organization_id` | Rejected framing | Ecosystem §0 **R4** |
| Project-per-tenant framed as efficiency / default path | Shared schema + one Neon project | Rejected framing (D5 non-goal) | Ecosystem §0 **R5**; Neon prefers it for isolation — we do not for this product |
| Raising CU / inventing `FFT_ERP_*` placeholders to green env | Fix pooler / nulls / syncOptional policy | Rejected framing | Ecosystem §0 **R7** |
| FFT child `organization_id` denorm as v1 tenancy fix | Parent `fft_event` + `getEventById(…, org)` | Deferred (M5) | Ecosystem §0 **D4**; not a bug |

## Agent skills (Elite cleanup)

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| `guardian-css-audit` skill | — (atmosphere dormant; `components/` hard-deleted) | Hard-deleted | Wave 1 — [skills-architecture](../../../../doc/architecture/DOC-004-skills-architecture.md) |
| `portal-frontend-scaffold` | `afenda-elite-frontend-scaffold` | Hard-deleted (renamed) | Wave 2 |
| `portal-backend-modules` | `afenda-elite-backend-modules` | Hard-deleted (renamed) | Wave 2 |
| `portal-api-contract` | `afenda-elite-api-contract` | Hard-deleted (renamed) | Wave 2 |
| Invoking vendor/`using-agent-skills` as **product** entry in this repo | `/using-afenda-elite-skills` first | Retired framing | Method library stays subordinate |
| Forking every vendor phase skill to `afenda-elite-*` | Method library under Elite entry | Rejected framing | Complexity matrix |
| Afenda-Lite as Elite program ceiling | `term.afenda-elite` + archive Lite | Retired framing | Glossary · Elite ADRs when Accepted |

---

## How agents must behave

1. **Refuse** to remount or re-teach anything **Retired** / **Hard-deleted** / **Rejected framing**.
2. **Say Afenda-Lite** in live SSOT (README, AGENTS, ADRs, new docs) — never “Client Declaration Portal” as current. **Elite program docs** cite `term.afenda-elite` per glossary.
3. **On touch**, strip live docs/code that present retired names as current (archive footnotes OK).
4. **Redirect-only** paths: keep thin shims; never attach product features.
5. **New deprecations:** add a row here in the same PR that retires them; link ADR.
6. Load this register when running `deprecation-and-migration` or when tempted to “leave legacy for convenience.”
7. **Skills:** enter via `/using-afenda-elite-skills`; do not restore `guardian-css-audit`.
