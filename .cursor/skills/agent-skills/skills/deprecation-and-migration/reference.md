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
| Disk folder `client-declaration-portal` | `afenda-lite` | Pending local | Folder locked by Cursor — run `Rename-Item` after closing workspace, then reopen `C:\JackProject\afenda-bolt\afenda-lite` |

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

---

## How agents must behave

1. **Refuse** to remount or re-teach anything **Retired** / **Hard-deleted** / **Rejected framing**.
2. **Say Afenda-Lite** in live SSOT (README, AGENTS, ADRs, new docs) — never “Client Declaration Portal” as current.
3. **On touch**, strip live docs/code that present retired names as current (archive footnotes OK).
4. **Redirect-only** paths: keep thin shims; never attach product features.
5. **New deprecations:** add a row here in the same PR that retires them; link ADR.
6. Load this register when running `deprecation-and-migration` or when tempted to “leave legacy for convenience.”
