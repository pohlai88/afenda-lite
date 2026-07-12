# Afenda-Lite deprecation register (compulsory)

**Product:** **Afenda-Lite** (beta of Afenda ERP) — [doc/adr/001-afenda-lite-product-identity.md](../../../../doc/adr/001-afenda-lite-product-identity.md)  
**Authority:** [SKILL.md](SKILL.md) · always-on `agent-workflow` · FFT ADRs under `doc/frontend/adr/001*`

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
| **Client Declaration Portal** | **Afenda-Lite** | Retired | ADR `doc/adr/001` — 2026-07-12 |
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

## Closed product phases (not deprecations)

See [doc/architecture/closed-scope-register.md](../../../../doc/architecture/closed-scope-register.md):

| Item | Disposition |
|------|-------------|
| `/client` workspace product restore | Closed — stubs only; reopen checklist required |
| FFT P3 **prod** flag promotion | Closed — gate-register only |
| SaaS billing / 2FA chrome | Intentional deferred — not Identity product |

## Tenancy (hard cutover + multi-org ready)

| Retired | Replacement | Status | Notes |
|---------|-------------|--------|-------|
| Soft SQL `(organization_id IS NULL OR = $org)` dual-mode | Hard `organization_id = $org` + migration `027` | Hard-deleted | CI `check:tenancy-residue`; ADR-002; ecosystem §0 **R1** |
| `promoteLegacyFftEntry` / login FFT promote | Platform `fft.access` + write-time ensure | Hard-deleted | |
| Arbitrary `organizations[0]` / first-org DB stamp | Active → slug → sole membership; ops `--organization-id` | Retired | M1 + M4; ecosystem §0 **R2**; e2e D8 closed |
| Default org slug/name `client-declaration-portal` / `iam-check` | `afenda-lite` (or `PORTAL_ORG_*`) | Retired | Product identity ADR-001; Auth org renamed 2026-07-12; operator `afenda@admin.com` |
| Teaching “multi-org ready **not** claimed” / org-switcher as v1 non-goal | M1–M4 shipped claim in ecosystem SSOT | Retired framing | Do not re-teach soft-harden as current |
| Neon RLS / Data API as default tenant isolation on BFF | App predicates + hard SQL | Rejected framing | Ecosystem §0 **R3**; reopen only with Data API ADR |
| Schema-per-tenant tenancy model | Shared schema + `organization_id` | Rejected framing | Ecosystem §0 **R4** |
| Project-per-tenant framed as efficiency / default path | Shared schema + one Neon project | Rejected framing (D5 non-goal) | Ecosystem §0 **R5**; Neon prefers it for isolation — we do not for this product |
| Raising CU / inventing `FFT_ERP_*` placeholders to green env | Fix pooler / nulls / syncOptional policy | Rejected framing | Ecosystem §0 **R7** |
| FFT child `organization_id` denorm as v1 tenancy fix | Parent `fft_event` + `getEventById(…, org)` | Deferred (M5) | Ecosystem §0 **D4**; not a bug |

---

## How agents must behave

1. **Refuse** to remount or re-teach anything **Retired** / **Hard-deleted** / **Rejected framing**.
2. **Say Afenda-Lite** in live SSOT (README, AGENTS, ADRs, new docs) — never “Client Declaration Portal” as current.
3. **On touch**, strip live docs/code that present retired names as current (archive footnotes OK).
4. **Redirect-only** paths: keep thin shims; never attach product features.
5. **New deprecations:** add a row here in the same PR that retires them; link ADR.
6. Load this register when running `deprecation-and-migration` or when tempted to “leave legacy for convenience.”
