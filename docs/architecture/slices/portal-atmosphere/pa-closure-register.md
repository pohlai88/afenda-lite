# Portal Atmosphere — Remaining Gaps Closure Register

| Field | Value |
|-------|-------|
| **Mode** | Technical closure spec (gap registry + migration sequencing) |
| **Audience** | Engineers implementing PA slices; design reviewers historically sign-off |
| **Status** | active — code gates green; acceptance incomplete |
| **Authority** | [ADR-Portal-BG-001](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md) · [slice index](./README.md) |
| **Stability rule** | Prefer visual sign-off before production wiring; wiring shipped with adapter cutover — complete visual PNG gates (WP-1/2) before deleting legacy Storybook phantom CSS |
| **Last updated** | 2026-07-08 |

## Overview

This document is the **single inventory of what remains** after PA-P1–P9 code delivery and PA-P10 contract readiness. It lists every open gap, risk, error, and architecture drift **without omission**, collapses identical items so they are fixed once, and sequences work Stability-First.

**Decision this document enables:** choose the next PR(s) from the ordered work packages below — not from memory or partial checklists.

**Assumptions labeled:** Visual and contrast judgments require a human. Code evidence below is from repo verification on 2026-07-08 (`tsc`, portal-atmosphere unit/interaction tests, auth-boundary scripts, reliance drift, `npm run build`).

## Completeness snapshot

| Layer | Completeness | Evidence |
|-------|--------------|----------|
| Serializable contracts + components (PA-P1–P9) | **~95%** | Package under `components/portal-atmosphere/` |
| Automated gates | **100% of runnable gates** | See §Verified green |
| Acceptance proof (checklists + visual) | **~75%** | WP-0 done; G-VIS/G-MAN open |
| Production auth integration | **~90% wiring** | `PortalAuthLayout` → `PortalAtmosphere`; E2E smoke + legacy CSS purge pending |
| Design baselines on disk | **0 PNGs** | `docs/ui-evaluation/portal-atmosphere/` has README only |
| DX hygiene (WP-4) | **Done** | `testing/css-contract.ts` shared by style tests |

## Verified green (do not re-open without regression)

Treat these as closed unless a named gate fails again:

| Gate | Evidence |
|------|----------|
| Typecheck | `npx tsc --noEmit` exit 0 |
| Unit | `npm run test:portal-atmosphere` — 74 passed |
| Interaction | `npm run test:interaction -- components/portal-atmosphere` — 30 passed |
| Auth boundary + barrel guard | `npm run check:portal-atmosphere:auth-boundary` |
| Storybook auth boundary | `npm run check:storybook-auth-boundary` |
| Reliance mapping / graph | `check:reliance-*-drift` — 23/23 surfaces, 18/18 actions |
| Production build | `npm run build` success |

Identical “type error / auth import / fixture-in-barrel” findings that previously appeared across agents are **resolved** by: theme normalization, editorial↔seal cycle break, fixture deep imports, `checkProductionBarrel()`.

---

## Goals

1. Close every remaining acceptance and migration gap in a Stability-First order.
2. Eliminate identical duplicate work (same visual capture or same CSS migration listed in many slices).
3. Keep atmosphere auth-free until the dedicated wiring PR.
4. Make slice docs match code reality after each work package.

## Non-goals

- Changing Neon Auth credential, session, OTP, OAuth, or route behavior in the same PR as visual sign-off.
- Adding motion / parallax (blocked until PA-P9 static acceptance).
- Expanding `.portal-auth-*` prototype CSS (migration reference only).
- Publishing customer-facing docs or CHANGELOG (out of `technical-writing` scope here).
- Replacing reliance registries with atmosphere surfaces (atmosphere is presentation-only until wired).

## Constraints

| Constraint | Rule |
|------------|------|
| Auth boundary | Zero `@neondatabase/auth*` / session / credential imports under `components/portal-atmosphere/` |
| Token namespace | Atmosphere uses `--portal-*` only; auth card chrome stays on shadcn tokens |
| Layout API | Production composition uses PA-P8 slots: `header?`, `brand`, `accessSlot`, `layers` — never flat children for poster layout |
| Fixture API | Storybook imports `@/components/portal-atmosphere/fixtures/*` — not the production barrel |
| Viewport proof | Manual matrix: 320, 390, 768, 1024, 1280, 1440, 1920 |
| Capture storage | Dated PNGs under `docs/ui-evaluation/portal-atmosphere/` per [capture README](../../../ui-evaluation/portal-atmosphere/README.md) |

---

## Gap taxonomy (canonical IDs)

Gaps are numbered once. Slice docs that repeat the same unchecked item map to the same ID.

### G-VIS — Visual regression capture debt (identical across PA-P1–P9)

**Severity:** Required for slice acceptance · **Owner:** Design + engineer · **Blocks:** PA-P3–P9 “accepted”; unblocks confidence for PA-P10 wiring

| ID | Gap | Appears in | Fix once |
|----|-----|------------|----------|
| G-VIS-01 | No baseline PNGs on disk | PA-P2–P9 checklists; ui-evaluation dir empty of images | Capture set below |
| G-VIS-02 | Dark desktop 1440 | P2–P7, P3–P6 | `DarkDesktop` story |
| G-VIS-03 | Light desktop 1440 | P2–P7, P3–P6 | `LightDesktop` story |
| G-VIS-04 | Split-theme inversion proof | P4, P7 | `SplitTheme` story |
| G-VIS-05 | Owl dark/light treatment | P3 | Same desktop captures + owl story optional |
| G-VIS-06 | Seal below hero dark/light | P5 | Covered by G-VIS-02/03 if seal shown |
| G-VIS-07 | Access slot + full composition | P6 | Covered by G-VIS-02/03 |
| G-VIS-08 | Tablet 768 dark + light | P7, P8 | `TabletDark` / `TabletLight` |
| G-VIS-09 | Mobile 390 dark + light | P7, P8 | `MobileDark` / `MobileLight` |
| G-VIS-10 | Small mobile 320 smoke | P8 | `SmallMobileSmoke` |
| G-VIS-11 | Optional 1024 / 1280 / 1920 | P8 captureREADME | `Laptop1024Dark`, `Desktop1280Dark`, `Wide1920Dark` |
| G-VIS-12 | Re-verify captures after a11y CSS | P9 | Diff against G-VIS-01 set after PA-P9 CSS changes |

**Capture commands (single recipe for all G-VIS-*):**

```bash
npm run storybook
# Storybook title: Portal Atmosphere / Design Review
# Save under docs/ui-evaluation/portal-atmosphere/ with dated filenames
# (see docs/ui-evaluation/portal-atmosphere/README.md)
```

**Doc drift in capture README:** story path still says `Portal Atmosphere / PA-P7 Design Review` — update to `Portal Atmosphere / Design Review` when capturing (G-DOC-04).

After captures land, tick **all** visual `[ ]` items in PA-P2–P9 that refer to those viewports — do not leave identical boxes unchecked in sibling slices.

### G-MAN — Manual QA (not automatable in current CI)

| ID | Gap | Slice | Fix |
|----|-----|-------|-----|
| G-MAN-01 | No horizontal overflow 320–1920 | P8 | Storybook viewport matrix + DevTools overflow check |
| G-MAN-02 | Contrast review for placeholder access slot | P9 | Human APCA/contrast review on dark + light |
| G-MAN-03 | Access usable without excess scroll at 390 | P8 | Manual scroll test on `MobileDark`/`MobileLight` |
| G-MAN-04 | Reduced-motion screenshot if any transition remains | P9 | Emulate `prefers-reduced-motion` — expect no motion enablement |
| G-MAN-05 | 1280/1440 owl/hero consistency feel | P3, P4 | Human review against reference PNGs in `public/brand/heroes/` |

### G-DOC — Documentation / checklist drift (identical status lies)

| ID | Gap | Path | Fix |
|----|-----|------|-----|
| G-DOC-01 | Slice checklists still clutter near-certain code items as `[ ]` while code exists (token parity, aria-hidden, no auth imports, etc.) | `pa-p1`–`pa-p6`, `pa-p7` code-gates | After automated proof, mark code-verified items `[x]` and leave only visual/manual open |
| G-DOC-02 | PA-P7 acceptance still unchecked for Storybook load / boundary despite green scripts | `pa-p7-preview-fixtures.md` | Tick automated items; leave PNG items open |
| G-DOC-03 | PA-P10 contract checklist items unfinished vs contract file already shipped | `pa-p10-auth-integration-readiness.md` | Split: tick contract/doc items; leave wiring items open |
| G-DOC-04 | Capture README story title mismatch | `docs/ui-evaluation/portal-atmosphere/README.md` | **Closed** — title is `Portal Atmosphere / Design Review` |
| G-DOC-05 | PA-P2 docs historically mentioned `data-theme` vs code `data-portal-theme` | `pa-p2-background-layers.md` | **Closed** — wording uses `data-portal-theme` |
| G-DOC-06 | PA-P5 historically implied `showSeal` on `PortalAtmosphere` | `pa-p5-seal-line.md` | **Closed** — documented on `PortalSealLine` / preview |
| G-DOC-07 | Duplicate Windows path copies of slice docs in tools (same content) | N/A agent view | Maintain one path; no duplicate files to delete if FS is single |

### G-MIG — Production dual-stack / auth migration (PA-P10 follow-up PR)

**Severity:** Critical for production morphology · **Must not** ship as drive-by in visual-only PRs

| ID | Gap | Location | Fix |
|----|-----|----------|-----|
| G-MIG-01 | `PortalAuthLayout` does not compose `PortalAtmosphere` | `components/portal-auth-layout.tsx` | **Closed** — thin adapter with PA-P8 slots |
| G-MIG-02 | Parallel phantom owl stack | `portal-auth-brand-scene.tsx` + `.portal-auth-phantom-*` | **Adapter closed**; Storybook evaluation tales still mount phantom |
| G-MIG-03 | Parallel atmosphere / gridlines | `.portal-auth-atmosphere`, `.portal-auth-gridlines` | Unused by adapter — purge after visual sign-off |
| G-MIG-04 | Parallel hero CSS (`.portal-hero-word` without BEM) | `app/globals.css` | Unused by adapter — purge after visual sign-off |
| G-MIG-05 | Parallel seal | `.portal-auth-seal-line` | **Closed** — invite brand uses `PortalSealLine` |
| G-MIG-06 | Hardcoded editorial / seal strings outside contracts | layout + invite brand | **Closed** for default brand + invite seal |
| G-MIG-07 | Theme dual mechanism | `theme-provider` + atmosphere | **Closed** — adapter bridges `resolvedTheme` → `theme` |
| G-MIG-08 | Real AuthView in slot + Pattern A/B heading | Follow-up | Pattern A default; invite brand uses own h1 (replaces brand slot) |
| G-MIG-09 | Remove migrated `.portal-auth-*` visual rules | `app/globals.css` | Open — keep until Storybook phantom stories migrate |
| G-MIG-10 | E2E smoke + visual with real auth | Follow-up | Open |

**Canonical composition (wiring target):**

```tsx
<PortalAtmosphere
  theme={theme}
  header={toolbar}
  layers={<PortalGuardianOwl showOwl />}
  brand={
    <>
      <PortalEditorialHero theme={theme} />
      <PortalSealLine showSeal />
    </>
  }
  accessSlot={<PortalAccessSlot>{children}</PortalAccessSlot>}
/>
```

### G-PERF — Performance / CSS scope debt (accepted until G-MIG)

| ID | Gap | Risk | Stability-First action |
|----|-----|------|------------------------|
| G-PERF-01 | Full atmosphere CSS imported on all routes via `app/globals.css` | Parse/paint cost on non-auth pages | **Accept** until G-MIG-01; then consider route-scoped import only if profiling shows material cost |
| G-PERF-02 | Owl blur / blend / drop-shadow overdraw | Mobile GPU jank | Already capped width ≤100vw in PA-P8; re-profile after wiring |
| G-PERF-03 | `:has()` seal selectors | Style invalidation | Accept; prefer not expanding `:has()` further |
| G-PERF-04 | Decorative owl `priority` image | LCP contention when mounted | Review `priority` in wiring PR when auth routes are only consumers |

### G-DX — Developer experience debt (optional, after G-VIS / G-MIG)

| ID | Gap | Fix |
|----|-----|-----|
| G-DX-01 | Duplicate helpers in `check-portal-atmosphere-auth-boundary.mjs` and `check-storybook-auth-boundary.mjs` | Extract `scripts/lib/auth-boundary-scan.mjs` |
| G-DX-02 | Nine CSS tests reimplement `stripCssComments` + `readFileSync` | **Closed** — `testing/css-contract.ts` |
| G-DX-03 | Fixture source-scan tests overlap boundary scripts | Keep composition assertions; drop forbidden-import duplication |
| G-DX-04 | Three inert access mocks (placeholder, sample card, auth-shell MockNeon) | Document ownership; consolidate only if copy drifts |
| G-DX-05 | `header` slot unused outside unit tests | Keep for PA-P10 toolbar; no delete |

### G-ARCH — Architectural accounting (not runtime bugs)

| ID | Gap | Note |
|----|-----|------|
| G-ARCH-01 | Atmosphere absent from reliance-mapping surfaces | **Expected** until production routes compose atmosphere — do not force registry entries for Storybook-only packages |
| G-ARCH-02 | Zero production TSX consumers of `PortalAtmosphere` | **Closed** — `PortalAuthLayout` composes atmosphere on `/auth/*` |
| G-ARCH-03 | PAMotion still prohibited | Do not propose motion ADR until G-VIS + G-MAN closed for PA-P9 |

---

## Stability-First work packages

Execute in order. Do not skip forward into G-MIG while G-VIS/G-MAN blockers for P7–P9 remain unsigned unless an explicit product override notes risk.

### WP-0 — Doc truth (half-day, low risk)

**Closes:** G-DOC-01–G-DOC-06 (partial), G-DOC-04

1. Update capture README story title (G-DOC-04).
2. In PA-P1–P7, mark checklist items that are already proven by green automated gates as `[x]`.
3. Leave every G-VIS / G-MAN item `[ ]`.
4. In PA-P10 readiness: tick contract/doc deliverables; leave G-MIG checklist open.

**Validation:** Doc-only PR review; re-run `npm run check:portal-atmosphere:auth-boundary`.

### WP-1 — Visual baseline campaign (design-gated)

**Closes:** G-VIS-01–G-VIS-12 (capture), enables ticking visual boxes in P2–P9

1. Run Storybook; capture dated baselines per ui-evaluation README.
2. Include mandatory: dark/light desktop, split, tablet, mobile, 320 smoke.
3. Optional: 1024 / 1280 / 1920 for overflow confidence (supports G-MAN-01).
4. Tick identical visual checkboxes across slices in **one** follow-up docs commit.

**Validation:** Files exist under `docs/ui-evaluation/portal-atmosphere/`; design sign-off recorded in PR or design channel.

### WP-2 — Manual matrix + a11y contrast

**Closes:** G-MAN-01–G-MAN-05

1. Overflow matrix at all seven widths.
2. Placeholder contrast on dark + light.
3. Mobile access-first usability.
4. Reduced-motion spot-check (no motion expected).

**Validation:** Notes attached to PR or evidence log; tick PA-P8/P9 manual items.

### WP-3 — Production auth wiring (separate PR)

**Closes:** G-MIG-01–G-MIG-10; may address G-PERF-01/04

**Prerequisite:** WP-1 completed (or explicit risk acceptance).

1. Implement adapter composition from integration contract.
2. Bridge theme.
3. Remove parallel visual CSS after parity.
4. E2E smoke + real-auth visual captures.

**Rollback:** Revert adapter only; leave `components/portal-atmosphere/` intact; restore prototype CSS only for emergency.

**Validation:**

```bash
npm run check:portal-atmosphere
npm run check:portal-atmosphere:auth-boundary
npm run test:e2e:smoke
npm run build
```

### WP-4 — DX hygiene (optional)

**Closes:** G-DX-01–G-DX-03

No production behavior change. Defer if WP-3 is active.

---

## Identical-error collapsing rules

When a future review lists any of the following, map them and **do not** open parallel tickets:

| Recurring report | Canonical ID |
|------------------|--------------|
| “Missing desktop/tablet/mobile screenshots” | G-VIS-01…10 |
| “Horizontal overflow unproven” | G-MAN-01 |
| “Placeholder contrast unchecked” | G-MAN-02 |
| “Auth layout still on globals phantom CSS” | G-MIG-01–05 |
| “Copy duplicated TRUTH / IS / PROTECTED / seal” | G-MIG-06 |
| “Atmosphere CSS on every page” | G-PERF-01 |
| “Fixtures exported from barrel” | Closed — regenerate if `checkProductionBarrel` fails |
| “Theme/inversion mismatch on DOM” | Closed — `normalizePortalThemeSelection` |
| “Editorial/seal import cycle” | Closed — seal resolve at composition |

---

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shipping G-MIG before visual sign-off | Medium | High — wrong baseline burned into production | WP order; require WP-1 or written override |
| Dual CSS class collisions (legacy `.portal-hero-word` vs BEM) | High until WP-3 | Medium — theme/style fights | Delete legacy rules only after adapter cutover |
| Approving PA slices “implemented” without PNGs | High | High — false design acceptance | Keep status `ready-for-review` / captures-pending until G-VIS closed |
| Scope creep into Neon Auth behavior in WP-3 | Medium | Critical | Forbidden list in integration contract; boundary scripts |
| Silent overflow regression after CSS tweaks | Medium | Medium | Re-run G-MAN-01 after any responsive/seal/owl CSS change |

---

## Rollout and rollback

| Package | Rollout | Rollback |
|---------|---------|----------|
| WP-0 | Docs-only merge | Revert docs commit |
| WP-1 | Add PNG binaries + tick checklists | Remove unapproved PNGs; un-tick |
| WP-2 | Evidence notes + checklist ticks | Re-open checklist items |
| WP-3 | Feature-flag or single adapter PR; E2E required | Revert adapter; restore `.portal-auth-*` visuals if emergency |
| WP-4 | Script-only | Revert extract |

---

## Open questions

1. **Who signs visual baselines?** Design lead vs engineer self-approve — name owner before WP-1.
2. **Theme source of truth after WP-3:** Does atmosphere read only from adapter props, or also sync from `next-themes` / `.dark`?
3. **Invitation/join brand panel:** Same WP-3 PR or later — currently also duplicates editorial copy (G-MIG-06).
4. **Route-scoped CSS:** After WP-3, is G-PERF-01 worth a follow-up or leave global import for Storybook parity?

---

## Slice ↔ gap map (no omission)

| Slice | Code package | Open IDs | Closed by code (tick in WP-0) |
|-------|--------------|----------|-------------------------------|
| PA-P0 | ADR | — | Accepted |
| PA-P1 | Tokens + contracts | G-DOC checklist truth | Token parity, barrel contracts, no auth — auto-proven |
| PA-P2 | Background layers | G-VIS-02/03, G-MAN-05 | Layers exist, tokens, no auth |
| PA-P3 | Owl | G-VIS-05, G-MAN-05, owl feel checklists | Component + aria tests |
| PA-P4 | Hero | G-VIS-02–04, inversion feel | Inversion contracts + a11y tests |
| PA-P5 | Seal | G-VIS-06, G-DOC-06 | Seal component + resolvePortalSealText |
| PA-P6 | Access slot | G-VIS-07 | Placeholder + boundary |
| PA-P7 | Fixtures | G-VIS-01–10, G-DOC-02/04 | Fixture authority + boundary scripts |
| PA-P8 | Responsive | G-VIS-08–11, G-MAN-01/03 | Responsive CSS + stories + build |
| PA-P9 | A11y | G-MAN-02/04, G-VIS-12 | a11y CSS + interaction tests |
| PA-P10 readiness | Contract + sample | G-DOC-03; G-MIG-* open | Contract docs + auth-slot sample |
| Legacy auth shell | Outside package | G-MIG-*, G-PERF-01 | Unchanged until WP-3 |

---

## Definition of done (closure register)

This register is **fully closed** when:

- [x] WP-0 merged (checklist truth + G-DOC-04/05/06 prose)
- [ ] WP-1 PNGs landed and approved (G-VIS-*)
- [ ] WP-2 manual matrix + contrast signed (G-MAN-*)
- [x] WP-3 adapter shipped (`PortalAuthLayout` → `PortalAtmosphere`) — E2E + CSS retirement open
- [x] WP-4 DX hygiene (`testing/css-contract.ts`)
- [ ] Slice statuses reflect visual acceptance without pending conflicts
- [ ] No open Critical/Required IDs remain on this page

Optional next: retire Storybook-only `PortalAuthPhantomOwl` + orphaned `.portal-auth-phantom-*` / `.portal-hero-*` rules after G-VIS sign-off.

---

## Related commands

```bash
npm run check:portal-atmosphere
npm run check:portal-atmosphere:auth-boundary
npm run check:storybook-auth-boundary
npm run storybook
npm run build
npm run test:e2e:smoke   # after WP-3 only
```

## Route-outs (kept out of this doc)

- Customer help / onboarding → `user-guide-writing`
- Public API docs → `api-documentation`
- CHANGELOG / release notes → `changelog-maintenance`
- Slide decks → `presentation-builder`
