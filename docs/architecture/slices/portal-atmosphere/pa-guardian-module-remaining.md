# Guardian Auth module — remaining work (internal guide)

| Field | Value |
|-------|-------|
| **Status** | Active — post-merge completion checklist |
| **Date** | 2026-07-10 |
| **Audience** | Engineers + design (Storybook sign-off) |
| **Mode** | Internal guide (implementation + operator handoff) |
| **Authority** | [ADR-Auth-UI-001](../../adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) · [SPEC-B](../../specs/SPEC-B-guardian-auth-canonical-refactor.md) · [pa-guardian-auth-reference-gaps.md](./pa-guardian-auth-reference-gaps.md) |

---

## What this document enables

After Guardian PR merge to `main`, this is the **single checklist** for finishing the Guardian Auth **module** (functional shell is shipped; visual and hygiene items remain). It does not reopen Hot Sales, RBAC, or Phase 2B–2D.

---

## Shipped (do not re-litigate)

| Item | Evidence |
|------|----------|
| Method B production shell | `GuardianAuthFacade` on `/auth/*` and `/join` via `GUARDIAN_AUTH_SHELL=true` |
| Neon credential engine | `PortalAuthNeonView` in access slot — no mock `AccessVaultCard` on prod |
| Corner panel + sunrise polish | Merged @ `25a47ad` (`ui/guardian-sunrise-corner-panel`) |
| Morpho owl (single iso PNG) | `GUARDIAN_AUTH_ASSET_SET` → `guardian-dramatic-iso.png` |
| Interaction tests | `guardian-auth-facade.interaction.test.tsx` — **4/4 pass** |
| Rollback | `GUARDIAN_AUTH_SHELL=false` → `env:compose` → `sync:vercel` → redeploy |
| Gap register | [pa-guardian-auth-reference-gaps.md](./pa-guardian-auth-reference-gaps.md) |

**Out of scope for this module:** `/trade`, Hot Sales RBAC, Neon production branch policy (owned by ops gate register).

---

## Remaining — required for “module complete”

### 1. Design sign-off (human gate)

Authority: [pa-hero-quality-benchmark.md](./pa-hero-quality-benchmark.md)

| Task | Surface | Pass criterion |
|------|---------|----------------|
| Hero comp — dark | `stories/ui-evaluation/guardian-auth-facade.stories.tsx` (`ReferenceComparisonNight`) | Side-by-side @ **1024px** matches `public/brand/heroes/auth-hero-dark.png` |
| Hero comp — light | Same story (`ReferenceComparisonDay`) | Matches `auth-hero-light.png` |
| Viewport containment | `guardian-auth-viewport-containment.stories.tsx` | **100svh**, no vertical scroll @ 100% zoom |
| Morpho owl position | Desktop layout | Tune `left: 36%` (or token) only **after** comp review — see gap register |

**Owner:** Design. **Blocker:** None for prod traffic; **blocks** closing “module complete” label.

### 2. Unit test alignment (engineering) — DONE 2026-07-10

`lib/guardian-auth-facade.viewport.test.ts` — **14/14 pass**. CSS contracts aligned in `components/auth/guardian-auth-facade.css`:

- `uses sunrise day plate and sky atmosphere (not milky white)` — day plate set to `#f8efe0`
- `defines living sky cycle ambient animations (48s)` — `--guardian-sky-duration: 48s`
- `restrains chamber to vault glass (no blue fill glow on card)` — day `.access-vault` border `rgba(139, 112, 70, .20)`
- `styles production Neon slot inside access panel` — `.bg-card` `max-height: calc(100dvh - 2 * var(--g-pad-y))`

Verify:

```bash
npm run test:unit -- lib/guardian-auth-facade.viewport.test.ts
```

**Owner:** Engineering. **Status:** Closed — interaction tests remain 4/4; only design sign-off (§1) and Lane C hygiene (§3) block "module complete".

### 3. Lane C — local WIP (not in merge)

Two stashes may exist on developer machines:

| Stash | Contents |
|-------|----------|
| `Lane C guardian WIP pre-merge` | Partial auth/copy deltas — **do not** push without review |
| `local guardian WIP on main - do not mix` | Older stash from pre-rebase |

**Action:** `git stash list` → diff each stash against `main` → either drop, or branch `ui/guardian-lane-c-cleanup` and cherry-pick intentional hunks.

### 4. Hygiene (ops / optional)

| Item | Notes |
|------|-------|
| Remote branch `ui/guardian-sunrise-corner-panel` | **Deleted** after merge to `main` |
| Orphan `public/auth/owls/*-cutout.png` | Archive or delete per gap register |
| GitHub issue #1 (Hot Sales 2A ops) | **Closed** 2026-07-10 |
| GitHub CLI for future issues/PRs | `npm run gh -- …` — see [AGENTS.md](../../../AGENTS.md) § GitHub CLI |
| SPEC-B status line | **Shipped (functional)** — bump to full complete when sign-off + viewport tests green |

---

## Remaining — explicitly deferred (not module blockers)

Documented in [pa-guardian-auth-reference-gaps.md](./pa-guardian-auth-reference-gaps.md):

- Dual owl PNG cross-fade in production
- Texture / emblem PNG atmosphere
- Fade Owl / Dual Guardian / Comp Laptop prod wiring
- Google SSO UI (`manifest.ui.features.social` remains `false`)

Open SPEC-B questions still valid for a **future** spec revision:

- Social Google enablement (Neon manifest + provider)
- Experiment CSS isolation from global bundle
- `ui-decision-matrix` / UI-eval README sync if not updated in merge

---

## Validation commands (Guardian lane only)

```bash
npm run test:interaction -- components/auth/guardian-auth-facade.interaction.test.tsx
npm run test:unit -- lib/guardian-auth-facade.viewport.test.ts lib/copy/guardian-editorial-copy.test.ts
npm run storybook
# Stories: stories/ui-evaluation/guardian-auth-facade.stories.tsx
#          stories/ui-evaluation/guardian-auth-viewport-containment.stories.tsx
```

Production smoke (auth ingress, not visual):

```bash
npm run test:e2e:smoke
# Asserts /auth/sign-in and legacy admin alias — no Guardian pixel check
```

---

## Completion definition

Mark **Guardian Auth module complete** when all are true:

1. Design sign-off recorded (link Storybook story + date in gap register or ADR addendum).
2. Viewport unit tests **green** (or tests retired with documented CSS contract change).
3. Lane C stash resolved (dropped or merged via explicit PR).
4. No open P0 on `/auth/*` or `/join` in production.

Until then, status remains: **Functional ship ✅ · Visual/module closeout ⏳**

---

## Assumptions

1. `main` includes merge of `ui/guardian-sunrise-corner-panel` @ `25a47ad` (fast-forward from `ae96e59`).
2. `GUARDIAN_AUTH_SHELL=true` on Vercel production (set during Hot Sales ops; unchanged by Guardian merge).
3. Hero PNGs in `public/brand/heroes/` remain the visual SSOT until superseded by explicit design decision.

---

## Related docs

| Doc | Role |
|-----|------|
| [pa-guardian-auth-reference-gaps.md](./pa-guardian-auth-reference-gaps.md) | Morpho strategy + accepted omissions |
| [pa-hero-quality-benchmark.md](./pa-hero-quality-benchmark.md) | 1024px comp bar |
| [SPEC-B](../../specs/SPEC-B-guardian-auth-canonical-refactor.md) | Functional refactor spec |
| [ADR-Auth-UI-001](../../adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) | Method B decision |
