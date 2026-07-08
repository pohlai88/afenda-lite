# ADR-Portal-BG-001: Portal Atmosphere System

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Accepted** | 2026-07-08 |
| **Owners** | Project Lead / Design System |
| **Maturity** | MVP-to-production foundation |
| **Scope** | Background, atmospheric, editorial, and theme architecture only |
| **Out of scope** | Authentication logic, credential provider, session handling, OTP, password reset, authorization, KYC workflow logic |

**Design references**

| Theme | Asset |
|-------|-------|
| Dark (midnight vault) | [`public/brand/heroes/auth-hero-dark.png`](../../../public/brand/heroes/auth-hero-dark.png) |
| Light (archival ivory) | [`public/brand/heroes/auth-hero-light.png`](../../../public/brand/heroes/auth-hero-light.png) |

**Related docs:** [iam-check-doctrine.md](../iam-check-doctrine.md) · [portal-writing.md](../../portal-writing.md) · [s2-ui-copy-doctrine.md](../slices/s2-ui-copy-doctrine.md)

---

## Context

The Client Declaration Portal auth ingress has evolved from a generic login screen into an institutional, editorial interface. Approved direction:

- **Mysterious, editorial, luxury, quiet, credentialed, institutional, guarded**
- Not generic SaaS, cartoonish, or fake-cyber

The owl is a **background authority layer** — a guardian presence that owns the portal environment. The login card is a **secondary access chamber**. The editorial poster (`TRUTH / IS / PROTECTED`) is the primary brand moment.

### Current implementation (partial)

Visual logic already lives inside the auth shell, not as a governed design system:

| Area | Location today |
|------|----------------|
| Layout shell | [`components/portal-auth-layout.tsx`](../../../components/portal-auth-layout.tsx) |
| Guardian owl | [`components/portal-auth-brand-scene.tsx`](../../../components/portal-auth-brand-scene.tsx) |
| Atmosphere, hero, seal, slot CSS | [`app/globals.css`](../../../app/globals.css) (`.portal-auth-*`, `.portal-hero-*`) |
| Editorial + UI fonts | [`app/fonts.ts`](../../../app/fonts.ts) — Cormorant Garamond + Inter |
| Color model | OKLCH tokens in `:root` / `.dark` |

This works for a prototype but creates **theme drift risk**: auth code and visual experimentation share the same files, tokens are mixed with app-wide shadcn variables, and there is no review fixture independent of Neon Auth.

### Migration Policy

Existing visual implementation is treated as **prototype source material**, not final architecture.

Migration sequence:

1. Extract atmosphere color, typography, and layer tokens from `app/globals.css`.
2. Recreate canvas and gradient layers in `PortalBackgroundLayers`.
3. Move owl rendering into `PortalGuardianOwl`.
4. Move `TRUTH / IS / PROTECTED` into `PortalEditorialHero`.
5. Move seal copy into `PortalSealLine`.
6. Replace right-side layout positioning with `PortalAccessSlot`.
7. Add preview fixtures.
8. Only after Phase 10, inject the real auth card into the access slot.

During migration, **auth behavior must remain unchanged**. No authentication behavior, provider wiring, route handling, or credential flow may be modified while migrating visuals.

### Problem

Without a dedicated **Portal Atmosphere System**, future work may produce:

- Inconsistent owl scaling and blend modes
- Typography and inversion drift across themes
- Random decorative metadata and weak login taglines
- Auth components polluted by visual experimentation
- Fragile z-index stacking and uncontrolled motion

The background design must be **isolated, tokenized, and sliced** before further auth ecosystem work.

---

## Decision

Establish a first-class visual system named **Portal Atmosphere System** (`PortalAtmosphere`).

1. **Separate visual architecture from auth behavior.** Auth is injected into the atmosphere through a child slot and remains behaviorally independent. Atmosphere components must not import auth providers, Neon Auth views, or session logic.

2. **Adopt the design doctrine:** `TRUTH IS PROTECTED` replaces weak sign-in taglines (`Welcome back`, `Sign in to your account`, etc.). Optional seal: `SECURE · CONFIDENTIAL · VERIFIED`.

3. **Enforce theme inversion as identity mechanic** (one flipped word per theme only):

   | Theme | TRUTH | PROTECTED | Meaning |
   |-------|-------|-----------|---------|
   | Dark | Readable (normal) | Inverted | Truth visible; protection encoded |
   | Light | Inverted | Readable (normal) | Protection visible; truth requires interpretation |

   Inversion applies to editorial hero words only — never to form UI.

4. **Use OKLCH CSS variables** as the color authority. No hardcoded hex/rgb in components.

5. **Define fixed visual layers:**

   | z-index | Layer |
   |---------|-------|
   | 0 | Base canvas |
   | 1 | Atmospheric gradients |
   | 2 | Ghost owl |
   | 5 | Editorial poster text |
   | 10 | Seal / rule elements |
   | 20 | Access slot (auth chamber) |
   | 30 | Header / toolbar |

6. **Start in-repo, graduate later.** MVP lives under `components/portal-atmosphere/` (or `features/portal-atmosphere/`). Extract to `packages/portal-atmosphere/` only after tokens and API stabilize.

7. **Ship review fixtures before auth integration.** Storybook or static fixtures must allow dark, light, and split-theme approval without loading Neon Auth.

### Component API (target)

```tsx
<PortalAtmosphere theme="dark">
  <PortalAtmosphere.Header />
  <PortalAtmosphere.EditorialHero />
  <PortalAtmosphere.GuardianOwl />
  <PortalAtmosphere.AccessSlot>
    <AuthCard /> {/* auth injected later; placeholder during build-out */}
  </PortalAtmosphere.AccessSlot>
</PortalAtmosphere>
```

### Proposed components

| Component | Responsibility |
|-----------|----------------|
| `PortalAtmosphere` | Root shell, theme context |
| `PortalBackgroundLayers` | Canvas, gradients, glow fields |
| `PortalGuardianOwl` | Owl placement, opacity, blend mode |
| `PortalEditorialHero` | TRUTH / IS / PROTECTED layout |
| `PortalHeroWord` | Word rendering + flip state |
| `PortalHeroConnector` | “IS” connector with rules |
| `PortalSealLine` | Institutional seal copy |
| `PortalAccessSlot` | Positioning slot for auth card |
| `PortalThemeToggleShell` | Visual-only theme toggle placement |

### Public contracts

```ts
export type PortalAtmosphereTheme = "dark" | "light";

export type PortalInversionMode =
  | "dark-truth-readable"
  | "light-protected-readable";

export interface PortalEditorialCopy {
  truth: string;
  connector: string;
  protected: string;
  seal?: string;
}

export const DEFAULT_PORTAL_EDITORIAL_COPY = {
  truth: "TRUTH",
  connector: "IS",
  protected: "PROTECTED",
  seal: "SECURE · CONFIDENTIAL · VERIFIED",
} satisfies PortalEditorialCopy;
```

### Token families (atmosphere-owned)

```txt
--portal-bg
--portal-fg
--portal-card-adjacent
--portal-muted
--portal-border
--portal-ring
--portal-owl-line
--portal-owl-shadow
--portal-owl-highlight
--portal-hero-truth
--portal-hero-protected
--portal-hero-is
--portal-hero-rule
--portal-glow-primary
--portal-glow-soft
```

Map to existing shadcn tokens only for generic UI surfaces; atmosphere-specific semantics must remain under `--portal-*`.

### Token Ownership Rules

**Atmosphere-owned tokens** (visual environment semantics):

- `--portal-bg`
- `--portal-fg`
- `--portal-owl-*`
- `--portal-hero-*`
- `--portal-glow-*`
- `--portal-card-adjacent`

**Application / shadcn-owned tokens** (general UI primitives):

- `--background`
- `--foreground`
- `--card`
- `--border`
- `--input`
- `--ring`

Atmosphere tokens may map to app tokens where appropriate, but app tokens must not encode owl, editorial poster, or atmosphere-specific semantics.

### Typography contract

```css
--font-editorial: var(--font-cormorant), ui-serif, Georgia, serif;
--font-ui: var(--font-inter), system-ui, sans-serif;
```

Editorial font is owned by the atmosphere system. Auth forms continue on UI sans.

---

## Decision Outcome

Once accepted, this ADR becomes the governing authority for the Client Declaration Portal background, owl, editorial hero, theme atmosphere, and access-slot layout.

The **Portal Atmosphere System** becomes the only approved place for new background and editorial visual behavior.

No further changes to [`portal-auth-layout.tsx`](../../../components/portal-auth-layout.tsx), [`portal-auth-brand-scene.tsx`](../../../components/portal-auth-brand-scene.tsx), or `.portal-auth-*` CSS should expand visual behavior directly. New visual behavior must be implemented through Portal Atmosphere System slices.

Existing `portal-auth-*` layout and CSS may be used as prototype reference material, but must not continue expanding as the long-term architecture.

**Authentication behavior remains frozen until Phase 10.** No credential provider, session, OTP, OAuth, reset-password, authorization, KYC routing, or declaration submission behavior may be changed under this ADR.

---

## Alternatives considered

### A. Keep visuals embedded in `portal-auth-layout` (status quo)

**Pros:** No migration; already partially implemented.  
**Cons:** Auth and atmosphere remain coupled; harder to review design without auth; violates slice isolation for Neon Auth work.  
**Rejected:** Does not scale to production design governance.

### B. Generic shadcn login card as primary brand surface

**Pros:** Fastest path; familiar pattern.  
**Cons:** Contradicts approved mocks and institutional positioning; indistinguishable from SaaS templates.  
**Rejected:** Fails product design intent.

### C. Monorepo package from day one (`packages/portal-atmosphere/`)

**Pros:** Clean boundary; reusable across apps.  
**Cons:** Premature for a single Next.js app; adds build/tooling overhead before API stabilizes.  
**Deferred:** Start in-app; extract when Phase 9 acceptance passes.

### D. CSS-only theme file without React composition API

**Pros:** Minimal JS surface.  
**Cons:** No typed contracts, harder slot composition, weaker Storybook/fixture story.  
**Rejected:** Component API needed for access slot and optional owl/seal toggles.

---

## Consequences

### Positive

- Visual identity stabilizes before auth ecosystem changes (Neon Auth closure, join journey, account self-service).
- Design review can use fixtures and reference PNGs without credential flows.
- Token authority reduces light/dark contrast regressions.
- Auth engineers integrate against a documented slot API instead of editing layout CSS.

### Negative / trade-offs

- Short-term duplication while extracting from `globals.css` and `portal-auth-layout.tsx`.
- Two token namespaces (app shadcn + atmosphere) until mapping is documented.
- Editorial hero hidden on small viewports today (`max-lg:hidden` on brand panel) — responsive hardening is a dedicated phase.

### Risks

| Risk | Mitigation |
|------|------------|
| Inversion logic drifts from mocks | Phase 4 acceptance tied to reference PNGs |
| Owl blocks form contrast | z-index contract + scrim layer; a11y contrast slice |
| Motion added too early | Motion is prohibited until static dark, light, responsive, and accessibility acceptance has passed |
| Auth coupling reintroduced | Lint/review rule: no `@neondatabase/auth*` imports in `portal-atmosphere/` |

---

## Non-goals

Explicitly excluded from this ADR and all atmosphere phases until Phase 10 readiness:

- Authentication provider changes, credential validation, session handling
- Password reset, OTP, Google OAuth, registration logic
- KYC workflow routing, declaration submission logic
- Backend API or database schema changes
- Audit event implementation

---

## Accessibility Text Rule

The visual editorial hero is **decorative for assistive technology**. Inverted typography is intentionally difficult to read and must not be the semantic source.

The semantic heading must be:

```tsx
<h1 className="sr-only">Truth is protected</h1>
```

The visual hero words must be rendered with:

```tsx
<div aria-hidden="true">
  {/* TRUTH / IS / PROTECTED */}
</div>
```

Inverted text must never be relied on as the only accessible statement. The owl and seal line remain `aria-hidden` decorative layers.

---

## Implementation guardrails

**Must do**

- Keep visual system separate from auth
- Use OKLCH tokens; no inline color styles in JSX
- Preserve one-word-per-theme inversion rule
- Follow the [Accessibility Text Rule](#accessibility-text-rule) for hero semantics
- Respect `prefers-reduced-motion`
- Create review fixtures before auth re-wiring

**Must not do**

- Modify authentication behavior during atmosphere phases
- Flip both TRUTH and PROTECTED in the same theme
- Use pure `#000` / `#fff` as main theme surfaces
- Treat owl as mascot, game logo, or NFT character
- Add auth-specific CSS inside atmosphere components

---

## Phased roadmap

Each phase has **one primary purpose**. Dependencies are strict.

```txt
Phase 0  ADR / doctrine approval          ← this document
   ↓
Phase 1  OKLCH token foundation
   ↓
Phase 2  Static background layers
   ↓
Phase 3  Guardian owl slice
   ↓
Phase 4  Editorial hero + inversion
   ↓
Phase 5  Seal line
   ↓
Phase 6  Access slot (placeholder card)
   ↓
Phase 7  Preview fixtures (dark / light / split)
   ↓
Phase 8  Responsive hardening
   ↓
Phase 9  Accessibility and QA
   ↓
Phase 10 Auth integration readiness (document slot API; sample integration)
```

Detailed slice specs: [slices/portal-atmosphere/](../slices/portal-atmosphere/README.md).

### Phase 0 exit criteria

- [x] ADR reviewed and accepted
- [x] Dark and light reference PNGs approved
- [x] Theme inversion rule approved
- [x] Owl usage rule approved
- [x] Non-goals confirmed
- [x] Token names agreed
- [x] Slice specs published ([portal-atmosphere/](../slices/portal-atmosphere/README.md))
- [x] No auth behavior changes in this phase

---

## Visual Regression Requirement

Every phase that changes visible output must produce a **reviewable screenshot or Storybook capture**.

Required states:

- Dark desktop
- Light desktop
- Split-theme comparison
- Tablet
- Mobile
- Reduced-motion mode (where motion exists)

Phase acceptance requires **visual comparison against approved reference PNGs** ([dark](../../../public/brand/heroes/auth-hero-dark.png), [light](../../../public/brand/heroes/auth-hero-light.png)). Reference PNGs alone are not sufficient — implementation output must be captured and compared at each visible phase gate.

---

## Acceptance checklist (system stable)

The Portal Atmosphere System is **stable** when all are true:

- [x] ADR accepted
- [ ] Dark and light OKLCH palettes approved and tokenized
- [ ] Typography hierarchy matches reference mocks
- [ ] Theme inversion implemented (dark: PROTECTED inverted; light: TRUTH inverted)
- [ ] Owl layer: moonlit (dark) / embossed watermark (light); `aria-hidden`
- [ ] Background gradients and glow fields implemented
- [ ] Editorial hero, seal line, and access slot implemented
- [ ] Split-theme preview fixture available
- [ ] Mobile layout reviewed; no horizontal overflow
- [ ] Accessibility review passed (contrast, screen reader, reduced motion)
- [ ] Visual regression captures approved for all required states (dark, light, split, tablet, mobile, reduced-motion)
- [ ] No auth ecosystem changes until Phase 10

---

## Follow-up actions

| Action | Owner | When |
|--------|-------|------|
| Review and accept/reject this ADR | Project Lead / Design | Done — 2026-07-08 |
| Confirm reference PNGs match inversion intent | Design | Done — 2026-07-08 |
| Publish PA-P0–PA-P10 slice specs | Engineering | Done — 2026-07-08 |
| Create `components/portal-atmosphere/` scaffold + token files | Engineering | PA-P1 |
| Add Storybook stories: dark, light, split | Engineering | Phase 7 |
| Document auth slot integration contract | Engineering | Phase 10 |
| Wire `PortalAuthLayout` to consume `PortalAtmosphere` | Engineering | After Phase 10 only |

---

## Appendix A — Proposed file structure (MVP)

```txt
components/portal-atmosphere/
  PortalAtmosphere.tsx
  PortalBackgroundLayers.tsx
  PortalGuardianOwl.tsx
  PortalEditorialHero.tsx
  PortalHeroWord.tsx
  PortalHeroConnector.tsx
  PortalSealLine.tsx
  PortalAccessSlot.tsx
  tokens/
    portal-atmosphere.tokens.ts
    portal-atmosphere.css
    portal-atmosphere.dark.css
    portal-atmosphere.light.css
  contracts/
    portal-atmosphere.contract.ts
    portal-theme.contract.ts
    portal-editorial.contract.ts
  index.ts

stories/ui-evaluation/
  portal-atmosphere.stories.tsx   # dark / light / split fixtures
```

---

## Appendix B — Theme token direction

**Dark (midnight vault):** near-black navy canvas; ivory typography; PROTECTED spectral blue (inverted); moonlit owl; deep vault card environment; controlled cold blue glow.

**Light (archival ivory):** warm ivory canvas; deep ink navy typography; TRUTH inverted; PROTECTED champagne-stone readable; pale silver-blue embossed owl; ivory glass card environment; institutional steel blue accent.

---

## Appendix C — Motion policy (post-static only)

Motion is **prohibited** until static dark, light, responsive, and accessibility acceptance has passed (Phases 1–9 complete).

Allowed after static acceptance: slow owl glow breathing, subtle background drift, theme fade, soft desktop parallax.

Avoid: fast flicker, rotating owl, spinning text, heavy cursor effects, motion required for comprehension.

```css
@media (prefers-reduced-motion: reduce) {
  .portal-atmosphere * {
    animation: none;
    transition-duration: 0.01ms;
  }
}
```
