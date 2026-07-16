# shadcn neutral token parity + ERP enrichment proposal

Scratch only — not Living architecture. Authority for product tokens remains [`packages/ui-system/src/styles/tokens.css`](../../packages/ui-system/src/styles/tokens.css) per ADR-010.

**Hard stop:** this note does not promote Aerospace Ceramic values into `tokens.css`, does not compose `apps/web` features, and does not update Living ARCH / ADR surfaces.

**Contrast note:** Aerospace Ceramic brand lane still uses claimed APCA Lc targets in its scratch preview. This promote pass measured **WCAG 2.1 contrast ratios** only (OKLCH→sRGB + relative luminance) — no APCA Lc claims for shipped tokens.

**Brand lane:** [`aerospace-ceramic-erp-preview.html`](./aerospace-ceramic-erp-preview.html) stays scratch-only — not promoted by this alignment pass.

---

## Evidence set

| Source | Evidence |
|--------|----------|
| Registry JSON | `https://ui.shadcn.com/r/styles/new-york-v4/theme-neutral.json` |
| Registry item | `theme-neutral`, `type: registry:theme`, `cssVars.light` = 32 keys, `cssVars.dark` = 31 keys |
| CLI theme apply | `pnpm dlx shadcn@latest add @shadcn/theme-neutral` in `packages/ui-system` |
| Project config | [`packages/ui-system/components.json`](../../packages/ui-system/components.json) — `style: new-york`, `tailwind.baseColor: neutral`, `tailwind.css: src/styles/tokens.css` |
| On-disk tokens | [`packages/ui-system/src/styles/tokens.css`](../../packages/ui-system/src/styles/tokens.css) |

### CLI theme CSS evidence

The shadcn v4 theme path is represented in this package by `components.json` plus `tokens.css`:

| CLI output class | On-disk evidence | Status |
|------------------|------------------|--------|
| CSS variables under `:root` | 32 registry `cssVars.light` keys are present in `:root` | aligned |
| CSS variables under `.dark` | 31 registry `cssVars.dark` keys are present in `.dark` | aligned |
| Tailwind v4 `@theme inline` color mappings | all registry color slots map to `--color-*` variables | aligned |
| Radius ladder | `--radius-sm` through `--radius-4xl` map from `--radius` | present |

`--radius` appears only in the registry light block and is defined once in `:root`; the registry dark block does not carry a separate `radius` key.

---

## Coverage summary

| Inventory | Registry count | Present in `tokens.css` | Missing | Value drift | Afenda extra |
|-----------|----------------|-------------------------|---------|-------------|--------------|
| Light `cssVars` | 32 | 32 | 0 | 0 | 0 |
| Dark `cssVars` | 31 | 31 | 0 | 0 | 0 |
| Combined registry entries | 63 | 63 | 0 | 0 | 0 |
| Afenda-owned additions | n/a | 46 mode-scoped variable entries + 7 `@theme inline` color mappings | n/a | n/a | 53 |
| CLI radius extensions outside registry `cssVars` | n/a | 3 `@theme inline` radius mappings | n/a | n/a | 3 |

**Result (re-verified 2026-07-17 against live registry JSON):** shadcn `new-york-v4/theme-neutral` parity is complete for every registry slot — **32/32 light, 31/31 dark, 0 missing, 0 value drift**. No registry color slot is missing from `tokens.css`; no registry-driven `tokens.css` edit is justified.

Registry omissions are real and intentional upstream gaps, not Afenda omissions:

| Omitted by registry | Afenda status | Notes |
|---------------------|---------------|-------|
| `--destructive-foreground` | Afenda extra | Present in light and dark to support paired destructive text; not in `theme-neutral.json`. |
| `--success*`, `--warning*`, `--info*` | Afenda extra | Status semantics are outside shadcn theme-neutral. |
| Surface ladder | Proposal-only | No registry tokens for `surface-sunken`, `surface-raised`, or `canvas`. |
| Label ladder | Proposal-only | Registry has `--muted-foreground` only. |
| Table chrome | Proposal-only | Registry has no row hover / stripe slots. |
| Focus ring offset variant | Proposal-only | Registry has `--ring` only. |

---

## Light mode parity table

| # | Registry slot | shadcn neutral value | `tokens.css` value | Classification |
|---|---------------|----------------------|--------------------|----------------|
| 1 | `--background` | `oklch(1 0 0)` | `oklch(1 0 0)` | aligned |
| 2 | `--foreground` | `oklch(0.145 0 0)` | `oklch(0.145 0 0)` | aligned |
| 3 | `--card` | `oklch(1 0 0)` | `oklch(1 0 0)` | aligned |
| 4 | `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.145 0 0)` | aligned |
| 5 | `--popover` | `oklch(1 0 0)` | `oklch(1 0 0)` | aligned |
| 6 | `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.145 0 0)` | aligned |
| 7 | `--primary` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 8 | `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 9 | `--secondary` | `oklch(0.97 0 0)` | `oklch(0.97 0 0)` | aligned |
| 10 | `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 11 | `--muted` | `oklch(0.97 0 0)` | `oklch(0.97 0 0)` | aligned |
| 12 | `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.556 0 0)` | aligned |
| 13 | `--accent` | `oklch(0.97 0 0)` | `oklch(0.97 0 0)` | aligned |
| 14 | `--accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 15 | `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.577 0.245 27.325)` | aligned |
| 16 | `--border` | `oklch(0.922 0 0)` | `oklch(0.922 0 0)` | aligned |
| 17 | `--input` | `oklch(0.922 0 0)` | `oklch(0.922 0 0)` | aligned |
| 18 | `--ring` | `oklch(0.708 0 0)` | `oklch(0.708 0 0)` | aligned |
| 19 | `--chart-1` | `oklch(0.646 0.222 41.116)` | `oklch(0.646 0.222 41.116)` | aligned |
| 20 | `--chart-2` | `oklch(0.6 0.118 184.704)` | `oklch(0.6 0.118 184.704)` | aligned |
| 21 | `--chart-3` | `oklch(0.398 0.07 227.392)` | `oklch(0.398 0.07 227.392)` | aligned |
| 22 | `--chart-4` | `oklch(0.828 0.189 84.429)` | `oklch(0.828 0.189 84.429)` | aligned |
| 23 | `--chart-5` | `oklch(0.769 0.188 70.08)` | `oklch(0.769 0.188 70.08)` | aligned |
| 24 | `--radius` | `0.625rem` | `0.625rem` | aligned |
| 25 | `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 26 | `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.145 0 0)` | aligned |
| 27 | `--sidebar-primary` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 28 | `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 29 | `--sidebar-accent` | `oklch(0.97 0 0)` | `oklch(0.97 0 0)` | aligned |
| 30 | `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 31 | `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(0.922 0 0)` | aligned |
| 32 | `--sidebar-ring` | `oklch(0.708 0 0)` | `oklch(0.708 0 0)` | aligned |

Light mode result: 32 aligned, 0 missing, 0 value-drift.

---

## Dark mode parity table

| # | Registry slot | shadcn neutral value | `tokens.css` value | Classification |
|---|---------------|----------------------|--------------------|----------------|
| 1 | `--background` | `oklch(0.145 0 0)` | `oklch(0.145 0 0)` | aligned |
| 2 | `--foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 3 | `--card` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 4 | `--card-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 5 | `--popover` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 6 | `--popover-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 7 | `--primary` | `oklch(0.922 0 0)` | `oklch(0.922 0 0)` | aligned |
| 8 | `--primary-foreground` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 9 | `--secondary` | `oklch(0.269 0 0)` | `oklch(0.269 0 0)` | aligned |
| 10 | `--secondary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 11 | `--muted` | `oklch(0.269 0 0)` | `oklch(0.269 0 0)` | aligned |
| 12 | `--muted-foreground` | `oklch(0.708 0 0)` | `oklch(0.708 0 0)` | aligned |
| 13 | `--accent` | `oklch(0.269 0 0)` | `oklch(0.269 0 0)` | aligned |
| 14 | `--accent-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 15 | `--destructive` | `oklch(0.704 0.191 22.216)` | `oklch(0.704 0.191 22.216)` | aligned |
| 16 | `--border` | `oklch(1 0 0 / 10%)` | `oklch(1 0 0 / 10%)` | aligned |
| 17 | `--input` | `oklch(1 0 0 / 15%)` | `oklch(1 0 0 / 15%)` | aligned |
| 18 | `--ring` | `oklch(0.556 0 0)` | `oklch(0.556 0 0)` | aligned |
| 19 | `--chart-1` | `oklch(0.488 0.243 264.376)` | `oklch(0.488 0.243 264.376)` | aligned |
| 20 | `--chart-2` | `oklch(0.696 0.17 162.48)` | `oklch(0.696 0.17 162.48)` | aligned |
| 21 | `--chart-3` | `oklch(0.769 0.188 70.08)` | `oklch(0.769 0.188 70.08)` | aligned |
| 22 | `--chart-4` | `oklch(0.627 0.265 303.9)` | `oklch(0.627 0.265 303.9)` | aligned |
| 23 | `--chart-5` | `oklch(0.645 0.246 16.439)` | `oklch(0.645 0.246 16.439)` | aligned |
| 24 | `--sidebar` | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` | aligned |
| 25 | `--sidebar-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 26 | `--sidebar-primary` | `oklch(0.488 0.243 264.376)` | `oklch(0.488 0.243 264.376)` | aligned |
| 27 | `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 28 | `--sidebar-accent` | `oklch(0.269 0 0)` | `oklch(0.269 0 0)` | aligned |
| 29 | `--sidebar-accent-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` | aligned |
| 30 | `--sidebar-border` | `oklch(1 0 0 / 10%)` | `oklch(1 0 0 / 10%)` | aligned |
| 31 | `--sidebar-ring` | `oklch(0.556 0 0)` | `oklch(0.556 0 0)` | aligned |

Dark mode result: 31 aligned, 0 missing, 0 value-drift.

Dark `--chart-1` / `--sidebar-primary` use shadcn's violet-leaning accent. That is intentional shadcn neutral default, not Aerospace Ceramic blue.

---

## Afenda extras in `tokens.css`

These are kept separately and are not drift to remove.

### Afenda `@theme inline` color extras

| Slot | Maps to | Classification |
|------|---------|----------------|
| `--color-destructive-foreground` | `var(--destructive-foreground)` | Afenda extra; registry omits this foreground pair |
| `--color-success` | `var(--success)` | Afenda extra |
| `--color-success-foreground` | `var(--success-foreground)` | Afenda extra |
| `--color-warning` | `var(--warning)` | Afenda extra |
| `--color-warning-foreground` | `var(--warning-foreground)` | Afenda extra |
| `--color-info` | `var(--info)` | Afenda extra |
| `--color-info-foreground` | `var(--info-foreground)` | Afenda extra |

### CLI radius extensions outside registry `cssVars`

| Slot | Maps to | Classification |
|------|---------|----------------|
| `--radius-2xl` | `calc(var(--radius) * 1.8)` | CLI theme CSS evidence / v4 radius extension |
| `--radius-3xl` | `calc(var(--radius) * 2.2)` | CLI theme CSS evidence / v4 radius extension |
| `--radius-4xl` | `calc(var(--radius) * 2.6)` | CLI theme CSS evidence / v4 radius extension |

### Afenda light extras

| Slot | `tokens.css` value | Classification |
|------|--------------------|----------------|
| `--destructive-foreground` | `oklch(0.985 0 0)` | Afenda extra; registry omission |
| `--success` | `oklch(0.723 0.219 149.579)` | Afenda extra |
| `--success-foreground` | `oklch(0.985 0 0)` | Afenda extra |
| `--warning` | `oklch(0.705 0.213 47.604)` | Afenda extra |
| `--warning-foreground` | `oklch(0.985 0 0)` | Afenda extra |
| `--info` | `oklch(0.6 0.118 184.704)` | Afenda extra |
| `--info-foreground` | `oklch(0.985 0 0)` | Afenda extra |
| `--control-height` | `2.25rem` | Afenda density extra |
| `--control-height-sm` | `2rem` | Afenda density extra |
| `--table-row-height` | `3rem` | Afenda density extra |
| `--table-row-height-compact` | `2.5rem` | Afenda density extra |
| `--field-gap` | `1rem` | Afenda density extra |
| `--section-gap` | `2rem` | Afenda density extra |
| `--shadow-raised` | `0 1px 3px oklch(0 0 0 / 12%)` | Afenda elevation extra |
| `--shadow-overlay` | `0 4px 12px oklch(0 0 0 / 15%)` | Afenda elevation extra |
| `--shadow-dialog` | `0 8px 32px oklch(0 0 0 / 20%)` | Afenda elevation extra |
| `--duration-instant` | `0ms` | Afenda motion extra |
| `--duration-fast` | `150ms` | Afenda motion extra |
| `--duration-normal` | `250ms` | Afenda motion extra |
| `--duration-slow` | `350ms` | Afenda motion extra |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Afenda motion extra |
| `--ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Afenda motion extra |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Afenda motion extra |

### Afenda dark extras

| Slot | `tokens.css` value | Classification |
|------|--------------------|----------------|
| `--destructive-foreground` | `oklch(0.985 0 0)` | Afenda extra; registry omission |
| `--success` | `oklch(0.696 0.17 162.48)` | Afenda extra |
| `--success-foreground` | `oklch(0.985 0 0)` | Afenda extra |
| `--warning` | `oklch(0.769 0.188 70.08)` | Afenda extra |
| `--warning-foreground` | `oklch(0.145 0 0)` | Afenda extra |
| `--info` | `oklch(0.696 0.17 184.704)` | Afenda extra |
| `--info-foreground` | `oklch(0.985 0 0)` | Afenda extra |
| `--control-height` | `2.25rem` | Afenda density extra |
| `--control-height-sm` | `2rem` | Afenda density extra |
| `--table-row-height` | `3rem` | Afenda density extra |
| `--table-row-height-compact` | `2.5rem` | Afenda density extra |
| `--field-gap` | `1rem` | Afenda density extra |
| `--section-gap` | `2rem` | Afenda density extra |
| `--shadow-raised` | `0 1px 3px oklch(0 0 0 / 28%)` | Afenda elevation extra |
| `--shadow-overlay` | `0 4px 12px oklch(0 0 0 / 35%)` | Afenda elevation extra |
| `--shadow-dialog` | `0 8px 32px oklch(0 0 0 / 45%)` | Afenda elevation extra |
| `--duration-instant` | `0ms` | Afenda motion extra |
| `--duration-fast` | `150ms` | Afenda motion extra |
| `--duration-normal` | `250ms` | Afenda motion extra |
| `--duration-slow` | `350ms` | Afenda motion extra |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Afenda motion extra |
| `--ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Afenda motion extra |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Afenda motion extra |

---

## Missing vs registry

There are no Afenda omissions against shadcn `theme-neutral` registry slots.

| Slot class | Registry position | Afenda position | Result |
|------------|-------------------|-----------------|--------|
| Core surfaces / text / borders | Present in registry | Present and aligned in `tokens.css` | no omission |
| Charts | Present in registry | Present and aligned in `tokens.css` | no omission |
| Sidebar | Present in registry | Present and aligned in `tokens.css` | no omission |
| Radius | Light-only registry key | Present once in `:root` and used by `@theme inline` ladder | no omission |
| `--destructive-foreground` | Not present in registry | Present as Afenda extra | registry omission, not Afenda omission |
| Status semantics | Not present in registry | Present as Afenda extra | registry omission, not Afenda omission |
| ERP surface / label / table slots | Not present in registry | Proposal-only below | registry omission, not Afenda omission |

---

## Authority gate (2026-07-17 promote pass)

| Check | Result | Evidence |
|-------|--------|----------|
| ADR-010 permits owned semantic tokens in `tokens.css` | Yes (package ownership) | ADR-010 § D4 — package owns `@theme inline` / `:root` / `.dark` |
| ADR-010 / Closed Living docs approve **this** ERP enrichment set | **No** (Living docs untouched) | Scratch + package only this turn |
| User authority **A** this turn for `UI-CAP-05` promotion | **Yes** | Mission letter: promote contrast-validated ERP families |
| Aerospace Ceramic promotion | **Forbidden** | Scratch brand lane only; not folded into neutral defaults |

**Contrast tool + bars (this promote):** Node one-shot using CSS Color Level 4 OKLCH→sRGB + **WCAG 2.1** relative luminance / contrast ratio. Bars: text pairs ≥ **4.5:1** (AA); non-text UI borders ≥ **3:1** (1.4.11). **No APCA Lc claims** — prior table Lc targets remain design intent only.

---

## ERP enrichments — disposition (2026-07-17 promote)

Values use the neutral achromatic / low-chroma family; they are **not** Aerospace Ceramic. Implemented values are on disk in `tokens.css`.

### Surface elevation — **implemented** (family)

| Token | Light (shipped) | Dark (shipped) | Role | Disposition | Contrast (`--foreground` on token) |
|-------|-----------------|----------------|------|-------------|-------------------------------------|
| `--surface-sunken` | `oklch(0.965 0 0)` | `oklch(0.17 0 0)` | table header, inset list rows | **implemented** | L 16.62 / D 18.90 |
| `--surface-raised` | `oklch(0.995 0 0)` | `oklch(0.23 0 0)` | lightness elevation vs card/shadow | **implemented** | L 20.23 / D 18.69 |
| `--canvas` | `oklch(0.94 0 0)` | `oklch(0.12 0 0)` | app shell behind main content | **implemented** | L 14.07 / D 18.99 |

**Retune:** proposed light `--canvas` `oklch(0.97 0 0)` was an exact alias of `--muted` / `--accent` / `--secondary` → shipped `oklch(0.94 0 0)` (distinct; still AA on `--foreground`).

### Label / ink ladder — **closed** (2026-07-17 A pass)

Role ladder (neutral ink on `--background`): `--foreground` → `--foreground-secondary` (secondary body) → `--foreground-tertiary` (caption / tertiary body, AA body) → `--muted-foreground` (registry muted chrome). **`--foreground-quaternary` removed** — never shipped; do not reintroduce.

| Token | Light | Dark | Disposition | Reason / contrast |
|-------|-------|------|-------------|-------------------|
| `--foreground-secondary` | `oklch(0.45 0 0)` | `oklch(0.82 0 0)` | **implemented** | on `--background`: L **17.89** / D **6.26** (≥4.5). Dark retuned from proposed `0.72` (measured **3.28**, failed AA). Distinct from `--muted-foreground` (dL L 0.106 / D 0.112). |
| `--foreground-tertiary` | `oklch(0.5 0 0)` | `oklch(0.78 0 0)` | **implemented** | Caption / tertiary body between secondary and muted. on `--background`: L **16.32** / D **4.80** (≥4.5). dL vs secondary L **0.050** / D **0.040**; vs muted-fg L **0.056** / D **0.072**. Not an alias of registry or secondary. |
| `--foreground-quaternary` | — | — | **removed** | Failed WCAG match: weaker than `--muted-foreground` in dark needs L &lt; **0.708**, but UI **3:1** on `--background` needs L ≥ **~0.71**. Measured dark `0.48` → **1.23**; edge `0.70` → **2.91**. Absent from `tokens.css` / `@theme`; Vitest locks non-ship. |

### Status subtle + border — **implemented** (complete family × 4 roles)

Bars: `*-subtle-foreground` on `*-subtle` ≥ **4.5:1**; `*-border` on `*-subtle` ≥ **3:1**. Borders retuned from pastel proposals that measured ~1.1–1.9.

| Role | Mode | subtle↔fg | border↔subtle | Border shipped |
|------|------|-----------|---------------|----------------|
| success | light | **14.06** | **3.48** | `oklch(0.74 0.1 160)` |
| success | dark | **8.61** | **3.40** | `oklch(0.7 0.1 160)` |
| warning | light | **13.16** | **3.28** | `oklch(0.78 0.04 75)` |
| warning | dark | **9.58** | **3.52** | `oklch(0.73 0.07 75)` |
| info | light | **13.95** | **3.29** | `oklch(0.77 0.04 230)` |
| info | dark | **8.52** | **3.40** | `oklch(0.72 0.05 230)` |
| destructive | light | **12.84** | **3.29** | `oklch(0.77 0.06 25)` |
| destructive | dark | **7.80** | **3.49** | `oklch(0.73 0.05 25)` |

Subtle + subtle-foreground values match the prior proposal for all four roles / both modes.

### Table chrome — **implemented** (family)

| Token | Light (shipped) | Dark (shipped) | Disposition | Contrast (`--foreground` on token) |
|-------|-----------------|----------------|-------------|-------------------------------------|
| `--table-row-hover` | `oklch(0.955 0 0)` | `oklch(0.24 0 0)` | **implemented** | L 15.55 / D 18.64 |
| `--table-stripe` | `oklch(0.99 0 0)` | `oklch(0.19 0 0)` | **implemented** | L 19.58 / D 18.84 |

**Retune:** proposed light hover `0.97` aliased `--muted`/`--accent`/`--secondary`; proposed light stripe `0.985` aliased `--sidebar`. Shipped distinct L steps.

### Disposition summary

| Bucket | Count | Tokens |
|--------|-------|--------|
| **implemented** | 19 | 3 surface + 2 label + 12 status-subtle/border + 2 table |
| **removed** (failed match — not shipped) | 1 | `--foreground-quaternary` |
| **blocked** (authority / evidence) | 0 | — |

### `@theme inline` mappings (applied)

```css
--color-surface-sunken: var(--surface-sunken);
--color-surface-raised: var(--surface-raised);
--color-canvas: var(--canvas);
--color-foreground-secondary: var(--foreground-secondary);
--color-foreground-tertiary: var(--foreground-tertiary);
--color-success-subtle: var(--success-subtle);
--color-success-subtle-foreground: var(--success-subtle-foreground);
--color-success-border: var(--success-border);
--color-warning-subtle: var(--warning-subtle);
--color-warning-subtle-foreground: var(--warning-subtle-foreground);
--color-warning-border: var(--warning-border);
--color-info-subtle: var(--info-subtle);
--color-info-subtle-foreground: var(--info-subtle-foreground);
--color-info-border: var(--info-border);
--color-destructive-subtle: var(--destructive-subtle);
--color-destructive-subtle-foreground: var(--destructive-subtle-foreground);
--color-destructive-border: var(--destructive-border);
--color-table-row-hover: var(--table-row-hover);
--color-table-stripe: var(--table-stripe);
```

---

## Residual color-opacity — Hybrid C close (2026-07-17)

Approved disposition this chat: **PROMOTE** soft-solid destructive, primary tint/track, overlay scrim; **RETAIN** dark input/accent fills, alert `text-destructive/90`, sidebar group-label ink. Disabled/ring/press-hover opacity remain retained (out of mission scope).

### Promoted (implemented)

| Family | Before | After | Token values | Contrast |
|--------|--------|-------|--------------|----------|
| Soft-solid destructive | `dark:bg-destructive/60` (Button, Badge) | `dark:bg-destructive-soft` | L `oklch(0.577 0.245 27.325)` (= light `--destructive`); D `oklch(0.497 0.125 21.522)` | White on soft: L **4.76** / D **6.48** (≥4.5). Opaque match of dark `/60` sRGB composite over `--background`. |
| Primary checked wash | `bg-primary/5` + `dark:…/10` (Field) | `bg-primary-subtle` | L `oklch(0.98 0 0)`; D `oklch(0.25 0 0)` | `--foreground` on subtle: L **18.68** / D **15.32**. Distinct from surface/table L steps. |
| Primary progress track | `bg-primary/20` (Progress) | `bg-primary-track` | L `oklch(0.86 0 0)`; D `oklch(0.33 0 0)` | Primary indicator vs track (non-text): L **11.70** / D **9.70** (≥3:1). |
| Overlay scrim | `bg-black/50` (Dialog, Sheet, AlertDialog) | `bg-overlay-scrim` | both modes `oklch(0 0 0 / 50%)` | Non-text dimming plane — no AA text pair. |

`@theme inline` maps: `--color-destructive-soft`, `--color-primary-subtle`, `--color-primary-track`, `--color-overlay-scrim`.

### Retained (intentional — locked in `erp-chrome.test.ts`)

| Family | Aliases | Why no token |
|--------|---------|--------------|
| Dark input / accent fills | `dark:bg-input/30`, `dark:hover:bg-input/50`, `dark:hover:bg-accent/50` | Dark `--input` is already translucent; utilities stack opacity. No opaque ERP role matches surface/muted ladder without inventing a 2–3 step control-fill family. |
| Alert destructive description | `text-destructive/90` | Soft description emphasis vs title; not a distinct semantic beyond `--destructive`. Full `text-destructive` already AA on card. |
| Sidebar group label | `text-sidebar-foreground/70` | Single chrome call site; no sidebar-muted slot required this slice. |
| Disabled / ring / press hover | `opacity-50`/`70`, `ring-*/20|40|50`, `hover:bg-*/90|/80` | Out of this mission scope (state chrome / press darkening). |

**Still forbidden** (role-matched; ERP token exists — `opacityChrome` / `roleMatchedOpacityAliases` gates):

| Retired alias pattern | Replaced by |
|-----------------------|-------------|
| `bg-*-subtle` roles via `bg-success/10` … `border-info/25` | `*-subtle` / `*-subtle-foreground` / `*-border` |
| `hover:bg-muted/50`, `bg-muted/40`, `bg-muted/50` (table) | `table-row-hover`, `table-stripe`, `surface-sunken` |
| `data-[variant=destructive]:focus:bg-destructive/10` (+ dark `/20`) | `bg-destructive-subtle` |
| `text-foreground/60` (tabs inactive) | `text-muted-foreground` |
| `dark:bg-destructive/60` | `bg-destructive-soft` |
| `bg-primary/5`, `bg-primary/10` | `bg-primary-subtle` |
| `bg-primary/20` | `bg-primary-track` |
| `bg-black/50` (overlay) | `bg-overlay-scrim` |

---

## Promotion posture

1. shadcn neutral registry slots remain aligned (32/32 light, 31/31 dark, 0 drift); no registry slot values changed.
2. ERP surface / status-subtle / table + `--foreground-secondary` + `--foreground-tertiary` are **implemented** with measured WCAG ratios; `--foreground-quaternary` is **removed** (failed dark 3:1 vs muted-fg — never ship).
3. Leave-opacity Hybrid C close: **promoted** soft destructive + primary subtle/track + overlay scrim; **retained** dark control fills, alert `/90`, sidebar `/70`, plus out-of-scope disabled/ring/press aliases — do not purge `retainedColorOpacityAliases`.
4. Aerospace Ceramic remains a separate scratch brand lane and must not be folded into neutral parity work.
5. Existing Afenda extras (status solid pairs, density, elevation shadows, motion, radius ladder including 2xl/3xl/4xl) are preserved.

### apps/web compose adoption (2026-07-17)

Product consumers under `apps/web/features/**` and product message routes now use shipped ERP utilities where roles match:

| Role | Class |
|------|-------|
| App / message shell plane | `bg-canvas` |
| Secondary body (page intros, helper copy) | `text-foreground-secondary` |
| Caption / tertiary (mono codes, empty cells, timestamps) | `text-foreground-tertiary` |

Auth-island surfaces stay on route-scoped chrome (no product canvas kit). Package primitives **consume** shipped ERP chrome: `StatusBadge` → `bg-*-subtle` / `text-*-subtle-foreground` / `border-*-border`; `TableRow` → `hover:bg-table-row-hover`; `DataTable` odd rows → `bg-table-stripe` (locked in `erp-chrome.test.ts`). Do not handroll status/table chrome in features.

---

## Verification commands

Test path on disk: `packages/ui-system/__tests__/erp-tokens.test.ts` (focused ERP assertions) + existing suite via:

```bash
pnpm --filter @afenda/ui-system test
pnpm check:ui-system
```

### Gate evidence (2026-07-17 promote + label A pass + leave-opacity Hybrid C close)

| Command | Result |
|---------|--------|
| `pnpm --filter @afenda/ui-system test` | PASS — 5 files / **79** tests (`erp-tokens` 51, `erp-chrome` 12 including promote + retain locks) |
| `pnpm check:ui-system` | PASS — ui-system 79 + web 67; `tailwind-emit` includes `bg-destructive-soft`, `bg-primary-subtle`, `bg-primary-track`, `bg-overlay-scrim` |
