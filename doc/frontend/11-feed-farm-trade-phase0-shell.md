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

**Out:** any event/order/allocation feature (P1), UI polish beyond AdminCN defaults (P2), ops flags (P3), customer portal, `TradeShell`, locale switcher, `/trade/[locale]`.

## Preconditions

None — this is the first phase. It depends only on Identity (session) and Platform (shell/nav config), per the bounded-context map in [001A](adr/001A-feed-farm-trade-architecture.md).

## Actors and permission model

| Actor | Expected outcome |
|-------|-------------------|
| Anonymous visitor | Redirected to sign-in before reaching `/trade/*` |
| Signed-in user without trade entitlement | Session valid elsewhere in the portal; `/trade/*` denied; Feed Farm Trade nav item hidden |
| Signed-in user with trade entitlement (`feed-farm-trade`) | `/trade/*` renders under AdminCN; nav item visible |
| Org admin without trade entitlement | Declarations/Account still work; `/trade/*` still denied — **org admin alone never grants trade access** |

Entitlement code: `feed-farm-trade`, resolved by `modules/platform/shell/access.ts`. Session/permission resolution: `modules/trade/auth/trade-session.ts` (`requireTradeAccess`).

## Architecture touchpoints

| Concern | Path | Responsibility |
|---------|------|-----------------|
| Layout gate | `app/trade/layout.tsx` | Calls `requireTradeAccess`, wraps children in `AdminCnShell` |
| Entitlement | `modules/platform/shell/access.ts` | Resolves module visibility for nav + guards |
| Session | `modules/trade/auth/trade-session.ts` | Trade access resolution / deny |
| Nav | `components-V2/platform-config/navConfig.tsx` | `moduleId: feed-farm-trade` entry |
| Chrome | `components-V2/platform-components/AdminCnShell` | Shared shell — never `TradeShell` |
| Route root | `app/trade/page.tsx` | Redirect to `/trade/events` |

## Functional requirements

| ID | Requirement |
|----|-------------|
| F-ACC-01 | `/trade/*` is reachable only through `requireTradeAccess`; no route bypasses the layout gate |
| F-ACC-02 | The Feed Farm Trade nav entry renders only when the signed-in user is entitled (`feed-farm-trade`) |
| F-ACC-03 | Every `/trade/*` page renders inside the shared `AdminCnShell` — no bespoke chrome |
| F-ACC-04 | A request with no session is redirected to sign-in before any trade data loads |
| F-ACC-05 | All `/trade` URLs are locale-free — no `/trade/[locale]/...` segment exists or is reachable |

## Acceptance criteria

| AC | Pass when |
|----|-----------|
| AC-ACC-01 | User without trade permission hits `/trade` → denied, and the Feed Farm Trade nav item is not rendered anywhere in the shell |
| AC-ACC-02 | User with trade permission hits `/trade` → AdminCN shell renders with the Feed Farm Trade nav item visible and highlighted |
| AC-ACC-03 | Org admin without trade allowlist/RBAC: Declarations (`/dashboard`) still accessible; `/trade` still denied |
| AC-ACC-04 | Anonymous request to any `/trade/*` path → redirected to sign-in, not a 500 or blank page |
| AC-SH-01 | No component under `features/trade` or `app/trade/**` imports or renders `TradeShell` |
| AC-SH-02 | No component under `features/trade` or `app/trade/**` imports or renders a locale switcher |
| AC-SH-03 | Nav and page copy read **"Feed Farm Trade"**, never "Hot Sales", and there is no visual/DOM bleed from Declarations chrome |

## Verification plan

| Check | Method |
|-------|--------|
| Entitlement resolution | Unit tests on `modules/platform/shell/access.ts` (`resolveShellAccess`) |
| Trade session deny paths | Unit tests on `modules/trade/auth/trade-session.ts` |
| No locale residue on disk | `Get-ChildItem -Recurse app/trade` (or `find app/trade`) must contain no `[locale]` segment |
| No `TradeShell` / locale switcher references | `rg "TradeShell|locale-switcher" features/trade app/trade` returns no matches |
| Manual QA — denied path | Sign in as a non-entitled user; confirm `/trade` denies and nav item is absent |
| Manual QA — allowed path | Sign in as an entitled user; confirm AdminCN renders with Feed Farm Trade nav highlighted |

## Evaluation checklist

Use this table to grade the live codebase. Leave **Result** blank until evaluated; do not pre-fill.

| AC / Req ID | Requirement | Expected evidence | Result |
|-------------|-------------|--------------------|--------|
| F-ACC-01 / AC-ACC-01..02 | Layout gate enforced | `app/trade/layout.tsx` calls `requireTradeAccess` before rendering children | |
| F-ACC-02 | Nav visibility gated | `navConfig.tsx` entry conditioned on `feed-farm-trade` entitlement | |
| F-ACC-03 / AC-SH-03 | AdminCN-only chrome | No custom shell component in `app/trade/**` or `features/trade` | |
| F-ACC-04 / AC-ACC-04 | Anonymous deny | Proxy/session guard redirects before data fetch | |
| F-ACC-05 / AC-SH-01..02 | Locale-free, no residue | No `app/trade/[locale]` directory; no `TradeShell` / locale switcher imports | |
| AC-ACC-03 | Org admin ≠ trade access | `requireTradeAccess` does not accept admin role alone | |

## Risks and open questions

- **Regression risk:** reintroducing `app/trade/[locale]` or `TradeShell` during unrelated refactors — guard with the `rg` check above in CI or pre-merge review.
- **Nav leak risk:** entitlement check duplicated in both layout and nav config can drift if one is updated without the other — confirm both read from `modules/platform/shell/access.ts`.
- No open product questions for this phase; it is a hard platform gate, not a design decision.

## References

- [001-feed-farm-trade.md](adr/001-feed-farm-trade.md) — decision locks
- [001A-feed-farm-trade-architecture.md](adr/001A-feed-farm-trade-architecture.md) — architecture detail
- [001R-feed-farm-trade-roadmap.md](adr/001R-feed-farm-trade-roadmap.md) — P0 section, DoD
- [12-feed-farm-trade-phase1-core-mvp.md](12-feed-farm-trade-phase1-core-mvp.md) — next phase, depends on this gate
