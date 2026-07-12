# Feed Farm Trade — Phase 0 development spec — Shell

| Field | Value |
|-------|-------|
| **Doc type** | Technical spec (phase-scoped) — write-first, evaluation baseline |
| **Phase** | P0 — Shell (MVP prerequisite) per [001R](adr/001R-feed-farm-trade-roadmap.md) |
| **Build authorization** | Open — P0 is a standing requirement, not gated |
| **Decision locks** | [001-feed-farm-trade.md](adr/001-feed-farm-trade.md) |
| **Architecture** | [001A-feed-farm-trade-architecture.md](adr/001A-feed-farm-trade-architecture.md) |
| **Roadmap / gaps** | [001R-feed-farm-trade-roadmap.md](adr/001R-feed-farm-trade-roadmap.md) |
| **Agent skill** | [`.cursor/skills/feed-farm-trade`](../../.cursor/skills/feed-farm-trade/SKILL.md) |

> **How to use this document:** Written independent of current implementation status, so it can serve as a fixed evaluation baseline. Fill in the **Evaluation checklist** at the end against the live codebase — do not edit the requirement rows to match what exists; record findings only in the **Result** column.

---

## Purpose

Establish the platform entry gate and shared AdminCN chrome for Feed Farm Trade before any commerce feature exists. Every other phase (P1–P3) depends on this gate being correct — a hole here compromises every feature built on top of it.

## Scope

**In:** layout-level access gate, entitlement resolution, nav visibility, locale-free routing, deny behavior for anonymous / unentitled / org-admin-only users.

**Out:** any event/order/allocation feature (P1), UI polish beyond AdminCN defaults (P2), ops flags (P3), customer portal, `FftShell`, locale switcher, `/fft/[locale]`.

## Preconditions

None — this is the first phase. It depends only on Identity (session) and Platform (shell/nav config), per the bounded-context map in [001A](adr/001A-feed-farm-trade-architecture.md).

## Actors and permission model

| Actor | Expected outcome |
|-------|-------------------|
| Anonymous visitor | Redirected to sign-in before reaching `/fft/*` |
| Signed-in user without trade entitlement | Session valid elsewhere in the portal; `/fft/*` denied; Feed Farm Trade nav item hidden |
| Signed-in user with trade entitlement (`fft`) | `/fft/*` renders under AdminCN; nav item visible |
| Org admin without trade entitlement | Declarations/Account still work; `/fft/*` still denied — **org admin alone never grants trade access** |

Entitlement code: `fft`, resolved by `features/portal-chrome/resolve-shell-access.ts` (platform `fft.access`). Session/permission resolution: `modules/fft/auth/fft-session.ts` (`requireFftAccess`).

## Architecture touchpoints

| Concern | Path | Responsibility |
|---------|------|-----------------|
| Layout gate | `app/fft/layout.tsx` | Calls `requireFftAccess`, wraps children in `AdminCnShell` |
| Entitlement | `modules/platform/shell/access.ts` | Resolves module visibility for nav + guards |
| Session | `modules/fft/auth/fft-session.ts` | FFT access resolution / deny |
| Nav | `components-V2/platform-config/navConfig.tsx` | `moduleId: feed-farm-trade` entry |
| Chrome | `components-V2/platform-components/AdminCnShell` | Shared shell — never `FftShell` |
| Route root | `app/fft/page.tsx` | Redirect to `/fft/events` |

## Functional requirements

| ID | Requirement |
|----|-------------|
| F-ACC-01 | `/fft/*` is reachable only through `requireFftAccess`; no route bypasses the layout gate |
| F-ACC-02 | The Feed Farm Trade nav entry renders only when the signed-in user is entitled (`fft`) |
| F-ACC-03 | Every `/fft/*` page renders inside the shared `AdminCnShell` — no bespoke chrome |
| F-ACC-04 | A request with no session is redirected to sign-in before any trade data loads |
| F-ACC-05 | All `/fft` URLs are locale-free — no `/fft/[locale]/...` segment exists or is reachable |

## Acceptance criteria

| AC | Pass when |
|----|-----------|
| AC-ACC-01 | User without trade permission hits `/fft` → denied, and the Feed Farm Trade nav item is not rendered anywhere in the shell |
| AC-ACC-02 | User with trade permission hits `/fft` → AdminCN shell renders with the Feed Farm Trade nav item visible and highlighted |
| AC-ACC-03 | Org admin without trade allowlist/RBAC: Declarations (`/dashboard`) still accessible; `/fft` still denied |
| AC-ACC-04 | Anonymous request to any `/fft/*` path → redirected to sign-in, not a 500 or blank page |
| AC-SH-01 | No component under `features/fft` or `app/fft/**` imports or renders `FftShell` |
| AC-SH-02 | No component under `features/fft` or `app/fft/**` imports or renders a locale switcher |
| AC-SH-03 | Nav and page copy read **"Feed Farm Trade"**, never "Feed Farm Trade", and there is no visual/DOM bleed from Declarations chrome |

## Verification plan

| Check | Method |
|-------|--------|
| Entitlement resolution | Unit tests on `modules/platform/shell/access.ts` (`resolveShellAccess`) |
| FFT session deny paths | Unit tests on `modules/fft/auth/fft-session.ts` |
| No locale residue on disk | `Get-ChildItem -Recurse app/fft` (or `find app/fft`) must contain no `[locale]` segment |
| No `FftShell` / locale switcher references | `rg "FftShell|locale-switcher" features/fft app/fft` returns no matches |
| Manual QA — denied path | Sign in as a non-entitled user; confirm `/fft` denies and nav item is absent |
| Manual QA — allowed path | Sign in as an entitled user; confirm AdminCN renders with Feed Farm Trade nav highlighted |

## Evaluation checklist

Use this table to grade the live codebase. Leave **Result** blank until evaluated; do not pre-fill.

| AC / Req ID | Requirement | Expected evidence | Result |
|-------------|-------------|--------------------|--------|
| F-ACC-01 / AC-ACC-01..02 | Layout gate enforced | `app/fft/layout.tsx` calls `requireFftAccess` before rendering children | **PASS** — `requireFftAccess` + `AdminCnShell` (EVALUATE_P1_MVP 2026-07-11) |
| F-ACC-02 | Nav visibility gated | `navConfig.tsx` entry conditioned on `fft` entitlement | **PASS** — `moduleId: feed-farm-trade` |
| F-ACC-03 / AC-SH-03 | AdminCN-only chrome | No custom shell component in `app/fft/**` or `features/fft` | **PASS** — AdminCN only; no FftShell product mount |
| F-ACC-04 / AC-ACC-04 | Anonymous deny | Proxy/session guard redirects before data fetch | **PASS** — `fft-session` unit + layout gate |
| F-ACC-05 / AC-SH-01..02 | Locale-free, no residue | No `app/fft/[locale]` directory; no `FftShell` / locale switcher imports | **PASS** — product locale-free; redirect-only `[locale]/[[...path]]` shim (no FftShell) |
| AC-ACC-03 | Org admin ≠ FFT access | `requireFftAccess` does not accept admin role alone | **PASS** — entitlement / platform `fft.access` / RBAC paths in `fft-session` (not org-admin alone) |

## Risks and open questions

- **Regression risk:** reintroducing `app/fft/[locale]` or `FftShell` during unrelated refactors — guard with the `rg` check above in CI or pre-merge review.
- **Nav leak risk:** entitlement check duplicated in both layout and nav config can drift if one is updated without the other — confirm both read from `modules/platform/shell/access.ts`.
- No open product questions for this phase; it is a hard platform gate, not a design decision.

## References

- [001-feed-farm-trade.md](adr/001-feed-farm-trade.md) — decision locks
- [001A-feed-farm-trade-architecture.md](adr/001A-feed-farm-trade-architecture.md) — architecture detail
- [001R-feed-farm-trade-roadmap.md](adr/001R-feed-farm-trade-roadmap.md) — P0 section, DoD
- [12-feed-farm-trade-phase1-core-mvp.md](12-feed-farm-trade-phase1-core-mvp.md) — next phase, depends on this gate
