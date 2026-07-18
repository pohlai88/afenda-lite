# afenda-elite-ui-compose — recipes & gate SSOT

Companion to [SKILL.md](SKILL.md). **SKILL** = QUALITY ORDER, locks, hard rules, matrix, Compose Score template. **This file** = recipes, F*/C*, UI-CAP, promotion rule, score rubric. Confirm barrel names in `packages/ui-system/src/index.ts` before inventing a local copy.

**QUALITY ORDER:** AUTHORITY → CONSISTENCY → CORRECT-COMPONENT → SUITABILITY → SCALABILITY → STABILITY — see [SKILL.md](SKILL.md). Prettier that breaks a higher rule = failed.

**Vitest SSOT:** F* → `apps/web/__tests__/compose-redflags.test.ts`; C* → `apps/web/__tests__/compose-suitability.test.ts` (`compose-scan.ts`); vague exports → `packages/ui-system/__tests__/export-naming.test.ts`.

**Risk A:** IDs must not diverge. `compose-gate-ids.test.ts` asserts this file’s `| F1 |`…`| F8 |` / `| C1 |`…`| C3 |` table cells match Vitest `it("F…")` / `it("C…")` titles. Adding a gate = update this table **and** the test title in the same change.

## ERP token utilities (shipped)

Disk SSOT: `packages/ui-system/src/styles/tokens.css` (public `@afenda/ui-system/styles.css`). Living authority: [ADR-010](../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) § D4.1 · [ARCH-024](../../../docs/architecture/ARCH-024-package-boundaries.md) § `@afenda/ui-system`. Lock: `packages/ui-system/__tests__/erp-tokens.test.ts`. **No parallel token file.** Do not promote scratch brand lanes (including Aerospace Ceramic). **Never** use or reintroduce `--foreground-quaternary`.

| Role | Utility | Notes |
|------|---------|-------|
| App / message shell plane | `bg-canvas` | Outside auth-island chrome |
| Inset / sunken plane | `bg-surface-sunken` | Table header, inset list rows |
| Raised plane | `bg-surface-raised` | Lightness elevation vs card/shadow |
| Secondary body | `text-foreground-secondary` | Page intros, helper copy |
| Caption / tertiary | `text-foreground-tertiary` | Mono codes, empty cells, timestamps |
| Muted chrome | `text-muted-foreground` | Registry muted (weaker than tertiary) |
| Status chip / banner fill | `bg-{success\|warning\|info\|destructive}-subtle` | Prefer over ad-hoc `*/10` opacity fills when composing features |
| Status chip / banner ink | `text-{success\|warning\|info\|destructive}-subtle-foreground` | Pair with matching subtle fill |
| Status chip / banner edge | `border-{success\|warning\|info\|destructive}-border` | Pair with subtle fill |
| Table row hover | `bg-table-row-hover` | Prefer over inventing `hover:bg-muted/50` in feature chrome |
| Table stripe | `bg-table-stripe` | Alternating rows |
| Soft solid destructive (dark control fill) | `bg-destructive-soft` | Button/Badge dark destructive surface — not `destructive-subtle` chip wash |
| Primary checked / tint wash | `bg-primary-subtle` | Field checked wash; prefer over `bg-primary/5` |
| Primary progress rail | `bg-primary-track` | Progress track under solid `bg-primary` indicator |
| Modal / sheet dimming | `bg-overlay-scrim` | Dialog, Sheet, AlertDialog overlay |
| Dark control fill | `bg-control-fill` · `bg-control-fill-hover` · `bg-control-fill-strong` | Input/select/checkbox dark fills; switch unchecked |
| Accent hover fill (dark) | `bg-accent-fill-hover` | Ghost/outline dark hover |
| Solid press hover | `bg-primary-hover` · `bg-destructive-hover` · `bg-secondary-hover` | Button/Badge solid press |
| Sidebar group label | `text-sidebar-muted-foreground` | SidebarGroupLabel |
| Focus / invalid ring | `ring-ring-focus` · `ring-ring-destructive-focus` · `ring-ring-destructive-focus-strong` | Alpha lives on token — no `/N` utility |
| Kbd on tooltip | `bg-kbd-tooltip-fill` | Tooltip-inverse kbd chrome |

Package primitives may retain **element opacity** only (`opacity-50`/`70` disabled/close). Color-opacity utilities for named roles are forbidden — do not handroll a second status/table palette in `apps/web/features/**`.

## Composition recipes → barrel

**Recipe = default, not absolute.** Prefer the row below unless workflow evidence justifies another barrel option or a dedicated page (SUITABILITY-FIRST in [SKILL.md](SKILL.md)).

| Recipe | Compose from barrel | Notes |
|--------|---------------------|-------|
| Settings / profile panel | `Tabs`, `Card` (+ parts), `FormField`, `Input`, `Textarea`, `Switch`, `Button`, `Separator` | One density; page title outside tabs; shell plane `bg-canvas` when the surface is an app shell |
| CRUD / tabular list | `DataTable`, `Button`, `Input` (filter), `Badge` / `StatusBadge`, `Pagination`, `Empty` | Feature decides sort/filter/pagination/row actions/URL/server need. DataTable must expose generic ports for approved reusable interaction; missing port → `UI-CAP-04`. Do not implement a feature-local table framework. Do not invent actions without a real product route or command. **DataTable** = presentation + interaction only; feature owns fetch/URL/permissions/domain/server (rule 14). Prefer ERP table utilities (`bg-table-row-hover`, `bg-table-stripe`) and status-subtle utilities when composing row/status chrome outside primitive internals |
| Create / edit drawer | `Sheet` (+ parts), `FormField`, `Input`, `NativeSelect` / `Select`, `DatePicker`, `Combobox`, `Button`, `FormError` | **Default** for multi-field forms; tiny one-field edit may use `Dialog`; complex workflows may use a dedicated page |
| Confirm destructive | `AlertDialog` (+ parts), `Button` `variant="destructive"` | Never custom modal markup |
| Inline notice | `Alert` (+ parts) | Not a bordered `div`. Soft status callouts may use ERP `bg-*-subtle` + `text-*-subtle-foreground` + `border-*-border` when not using `Alert`/`StatusBadge` |
| Dense key/value detail | `KeyValue` / `KeyValueList`, `Badge`, `Separator` | Body = `text-sm`; secondary/tertiary ink via `text-foreground-secondary` / `text-foreground-tertiary` |
| Metric strip | `MetricCard`, `KeyValue` | Use `MetricCard` for individual metrics. Use an existing shared metric compound when repeated responsive metric collection is required. If none exists and feature code would recreate count-aware grid behavior → `UI-CAP-03`. Do not add feature-local metric-grid abstractions. One-off two-card layout may still be composed directly when straightforward and not becoming a repeated abstraction |
| App chrome nav | `Sidebar` (+ parts), `Breadcrumb`, `Separator` | Do not handroll nav pills. Living operator frame: `OperatorPlatformShell` → `OperatorPlatformChrome` under `features/portal-chrome/`. Studio shell DNA → promote via `shadcn-ui` into this home — never import `apps/web/shadcn-studio/**` |
| **Message shell** | `Button` (`asChild` + `Link` for CTAs), optional `Alert` | Blank-chrome gate / 403 / join-missing / not-found. Living: `PublicMessageShell` (`features/auth/public-message-shell.tsx`) — centered `main`, `bg-canvas`, page `h1` lock, body `text-sm text-foreground-secondary`, optional footer. Prefer shared shell over one-off centered pages. Studio `empty-state-*` = layout DNA only (ADAPT → this recipe); do not replace with Card stacks |
| **Auth island** | Neon Auth UI (`AuthView` / invitation cards) + route-scoped `auth-surface.css` | Living: `AuthIslandLayout` → `AuthUiProvider` → `AuthViewShell` / `AuthSurfaceChrome`. Auth eyebrow + island CSS stay route-scoped — never leak into operator/client product shells. Studio `login-page-*` = **chrome DNA only** (ADAPT); Studio login/register/forgot **forms REJECT**. No parallel product kit from auth-surface |
| **Machine Sign in (`surface="machine"`)** | `SignInButton` + `.the-machine .sign-in-button--machine` | **CLOSED (edit-forbidden)** 2026-07-18 — champagne dual-frame CTA on The Machine landing only. Keep `Button asChild` → `AUTH_LOGIN_PATH`. Forbidden: global `auth-sign-in` kits, `--auth-signin-*` tokens, cold vault-blue dark SignIn, restyling message-shell outline CTAs. Reopen: explicit user letter this turn. |
| **Machine stage frame** | none | **CLOSED (edit-forbidden)** 2026-07-18 — no inset hairline `.frame`, corner ticks, or stage border rail on The Machine landing. Atmosphere = ambient + vignette + grain only. Reopen: explicit user letter this turn. |
| Command palette | `Command`, `Dialog` / command dialog pattern | lucide icons only |
| Loading state | `Skeleton`, `Spinner` | Never plain loading copy alone |
| Empty collection | `Empty` | Title uses section type lock |

**Banned when `DataTable` fits:** bordered handrolled `<ul>` with divide-y + border for rows with ≥2 fields or row actions.

### Studio DNA → compose (pointer)

Shadcn Studio CLI/MCP + dual `components.json` + Method A/B: [`shadcn-ui`](../shadcn-ui/SKILL.md). Machine DNA metadata: [`dna-ledger.json`](../shadcn-ui/dna-ledger.json) (`AFN-DNA-*`). Stage under `apps/web/shadcn-studio/`; after promote, **this skill** owns QUALITY ORDER. Do not restore retired `afenda-elite-design-system` / `admincn-customization`.

```tsx
import { Button, Card, FormField, Input } from "@afenda/ui-system";
```

Missing export → ADR-010: `pnpm --filter @afenda/ui-system ui:add <name>` → relative imports → export from `src/index.ts` → package test. Never copy into `apps/web`.

## Hard rules 12–15 (detail)

| Rule | Binding |
|------|---------|
| 12 | No silent barrel API/behavior change. Additive → tests. Rename/removal/default/semantic → migrate **all** consumers same change. |
| 13 | Export names communicate role. Ban exact `Panel`, `Container`, `Box`, `Item`, `Wrapper`, `View`. Gate: `export-naming.test.ts`. Flat barrel — no split on count alone (Risk D). |
| 14 | `DataTable` = presentation + interaction only. Feature owns fetch, URL, permissions, domain, persistence, server ops. |
| 15 | **NO LOCAL CAPABILITY COMPENSATION** — `UI-CAP-*`; no feature-local substitute for reusable gaps; no fake domain controls. Product-local compose of **existing** barrel primitives OK when not duplicating shared responsibility. |

| Allowed (rule 15) | Forbidden |
|-------------------|-----------|
| Product-specific arrangement of approved primitives | Reimplementing a missing reusable primitive/compound |
| Feature-owned domain workflow | Generic table/selector/dialog/metric duplicated locally |
| One-off domain presentation | Parallel UI-system layer |
| Real routes/actions through component ports | Fake or disabled actions for appearance |

---

## Shared Component Capability Gate (SCALABILITY-FIRST)

Capability insufficiency produces a **UI COMPOSITION CAPABILITY FINDING**, not a new F*/C* ID. Machine gates stay **F1–F8** and **C1–C3** only.

### Pre-compose check

```text
1. Does the intended barrel component exist?
2. Does its public API support the required reusable behavior?
3. Are required states already represented?
4. Can the feature supply domain state through existing component ports?
5. Would implementation duplicate shared visual/interaction logic locally?
```

### Outcomes

| Outcome | Action |
|---------|--------|
| **CAPABLE** | Compose; feature owns data/permissions/routes |
| **UI-SYSTEM GAP** | Stop; `UI-CAP-01..06` or `UI-CAP-08`; controlled `ui:add` / compound upgrade; no feature-local substitute |
| **PRODUCT GAP** | Issue `UI-CAP-07` (composition finding, product ownership); no fake/disabled actions; honest list-only/read-only OK; report to product mission |
| **UNSUITABLE** | Prefer other barrel component; else `UI-CAP-08` — do not force wrong component |

### UI composition capability findings (`UI-CAP-*`)

Collective label: **UI composition capability findings**. One namespace; ownership column routes work.

| Code | Finding | Ownership |
|------|---------|-----------|
| `UI-CAP-01` | Primitive missing | UI-system / composition |
| `UI-CAP-02` | Primitive API incomplete | UI-system / composition |
| `UI-CAP-03` | Shared compound missing | UI-system / composition |
| `UI-CAP-04` | Shared compound API incomplete | UI-system / composition |
| `UI-CAP-05` | Token/foundation capability missing | UI-system / composition |
| `UI-CAP-06` | Accessibility capability insufficient | UI-system / composition |
| `UI-CAP-07` | Product/domain port missing | **Product / domain** (not a ui-system package gap) |
| `UI-CAP-08` | Existing component unsuitable for workflow | UI-system / composition |

```text
UI-CAP-01..06, UI-CAP-08  → route to @afenda/ui-system / compose escalation
UI-CAP-07                 → route to owning product/feature mission
```

### Finding template

```text
UI COMPOSITION CAPABILITY FINDING

Surface:
<route / feature / component>

Required behavior:
<what the approved workflow genuinely needs>

Intended barrel component:
<existing component or missing shared compound>

Current capability:
<what its current public API supports>

Capability gap:
<precise missing reusable capability>

Observed or proposed local workaround:
<what would otherwise be duplicated in apps/web>

Classification:
<UI-CAP-01..08>

Evidence:
<component source, barrel export, route, existing product port>

Reuse scope:
<one feature / two or more features / platform-wide>

Required owner:
<@afenda/ui-system / product feature / architecture decision>

Required action:
<smallest controlled upgrade or product mission>

Composition status:
<CAPABLE | BLOCKED_UI_SYSTEM | BLOCKED_PRODUCT | READ_ONLY_PERMITTED | LIST_ONLY_PERMITTED | LOCAL_COMPOSITION_PERMITTED>
```

**Required owner** must match classification ownership: `UI-CAP-01..06` / `08` → `@afenda/ui-system` (or architecture); `UI-CAP-07` → product feature.

### Composition status values (closed set)

| Status | Meaning |
|--------|---------|
| `CAPABLE` | Existing shared component and product ports are sufficient |
| `BLOCKED_UI_SYSTEM` | Missing reusable shared capability |
| `BLOCKED_PRODUCT` | Required product route/action/data port does not exist |
| `READ_ONLY_PERMITTED` | Honest read-only surface matches current capability |
| `LIST_ONLY_PERMITTED` | A list is valid; no real detail/action capability exists |
| `LOCAL_COMPOSITION_PERMITTED` | Product-specific composition using existing primitives is acceptable |

| Status | Typical next step |
|--------|-------------------|
| `CAPABLE` | Compose + STABILITY matrix |
| `BLOCKED_UI_SYSTEM` | `UI-CAP-01..06` / `08` → ui-system upgrade; no local substitute |
| `BLOCKED_PRODUCT` | `UI-CAP-07` → product mission; no fake actions |
| `READ_ONLY_PERMITTED` / `LIST_ONLY_PERMITTED` | Honest reduced surface; STABILITY on that surface only |
| `LOCAL_COMPOSITION_PERMITTED` | Rule 15 clarification + promotion rule says product-local |

Do **not** use bare `BLOCKED` or spaced `LIST-ONLY PERMITTED` in new findings.

### Promotion decision rule (shared vs product-local)

**Treat a gap as shared** (route to `@afenda/ui-system`) when any applies:

1. The capability is already needed by **two or more independent features**
2. The capability is **intrinsic** to the generic primitive or compound
3. Architecture identifies it as **common ERP platform behavior**
4. Implementing it locally would **duplicate** interaction, accessibility, responsive, token, or state logic that should behave consistently everywhere

**Keep a requirement product-local** when:

1. It contains **domain-specific data or permission** semantics
2. It relies on **one feature’s route or server action**
3. Its behavior would **not make sense outside** the owning module
4. Existing barrel primitives can compose it **without duplicating** shared logic

| Rule outcome | Finding fields | Typical code |
|--------------|----------------|--------------|
| Shared | Reuse scope = two+ features or platform-wide; Required owner = `@afenda/ui-system` | `UI-CAP-01..06` / `08` |
| Product-local | Reuse scope = one feature; Required owner = product feature | Compose under rule 15 clarification, or `UI-CAP-07` if a domain port is missing |

If shared and product-local both seem to match, **prefer product-local** until Evidence shows a second independent consumer or Approved architecture names it platform-common.

### Completion rule

Chrome consistency alone is insufficient. Product completeness must not be simulated through feature-local UI compensation. Complete only when:

1. Shared UI capabilities come from `@afenda/ui-system`
2. Product actions/data ports are real
3. No fake/disabled/decorative controls conceal gaps
4. Stability evidence green

---

## Forbidden patterns (F* — gate source)

**Regex discipline:** keep patterns narrow; fail with **path** + **gate ID/reason**; review allowlists explicitly; do not broaden a regex for one isolated case; use C* AST for high-risk semantics.

Product scope: `apps/web/features/**`, `apps/web/app/**` (exclude auth-island allowlist).

| ID | Forbidden smell | Required instead | Gate regex hint |
|----|-----------------|------------------|-----------------|
| F1 | Fake primary CTA | `Button` / `Button asChild` + `Link` | `inline-flex` with `h-9` and `bg-primary` outside Button usage |
| F2 | Page shell `p-8` | `p-6` or `p-4` | `\bp-8\b` |
| F3 | Rogue page title | `text-2xl font-semibold tracking-tight` | `text-(3xl\|4xl\|5xl)` or `text-xl font-semibold` |
| F4 | Bordered tabular `<ul>` | `DataTable` | `divide-y` with `rounded-md border` on `<ul>` |
| F5 | Plain loading copy only | `Spinner` / `Skeleton` | loading ellipsis text without Spinner/Skeleton import |
| F6 | Deep / retired UI import | flat barrel | `@afenda/ui-system/` (not styles.css), `@afenda/ui` |
| F7 | Parallel UI tree | never | `apps/web/components/ui/` path exists |
| F8 | Auth CSS leaked | island only | `auth-surface.css` import outside allowlist |

## Suitability gates (C* — AST, highest risk only)

| ID | Rule | Required | Gate |
|----|------|----------|------|
| C1 | Destructive confirm via `Dialog` | `AlertDialog` + destructive action | `Button variant="destructive"` under `Dialog` (not `AlertDialog*`) |
| C2 | Nav `Button` wraps `Link` without `asChild` | `Button asChild` + `Link`/`NextLink` | Direct child `Link`/`NextLink` on `Button` lacks `asChild` |
| C3 | Interactive `Card` root | Non-interactive `Card`; actions inside via `Button`/`Link` | `Card` with `onClick`, `role="button"`, or `tabIndex={0}` |

**C3 approved pattern:** keep `Card` non-interactive; put `Button` / `Link` / menus inside. `Card` has no `asChild` Slot — clickable card shells are not approved.

Do not add Badge/Sheet/Table semantic gates without an Approved skill expansion.

### Allowlist (negative control)

- `apps/web/app/(public)/auth/**`
- `apps/web/app/(public)/join/layout.tsx` (may import auth-surface for join island)
- `apps/web/features/auth/auth-surface-chrome.tsx` and auth shells that only wrap Neon Auth UI
- `apps/web/features/auth/local-auth-credential-fill.tsx` (local login autofill — island only)
- `apps/web/app/(public)/auth/auth-surface.css`

Do not copy auth-surface patterns into operator or client product layouts. Allowlist prefixes live in `apps/web/__tests__/compose-scan.ts` — review when adding.

### Advisory ripgrep (while editing)

```bash
rg -n "inline-flex.*h-9|bg-primary" apps/web/features apps/web/app --glob "*.tsx"
rg -n "\bp-8\b" apps/web/features apps/web/app --glob "*.tsx"
rg -n "divide-y.*border|rounded-md border" apps/web/features apps/web/app --glob "*.tsx"
rg -n "text-(3xl|4xl|5xl)|text-xl font-semibold" apps/web/features apps/web/app --glob "*.tsx"
```

**Done means (suitability + scalability + stability):** run the Shared Component Capability Gate (SCALABILITY-FIRST) before composing shared surfaces. Apply the STABILITY verification matrix in [SKILL.md](SKILL.md) for the changed layer(s) only after capability is clear or an approved reduced/product-local outcome is recorded. Usual floor: `pnpm check:ui-system` (compose-redflags F*, compose-suitability C1–C3, package + web tests including `tailwind-emit` as scoped). Run `pnpm --filter @afenda/web build` when the matrix requires it (RSC boundary, **structural package change**, global CSS/font map, clear Next emit risk). When the matrix requires a **representative route**, use the Risk B definition in [SKILL.md](SKILL.md) (real non-auth product route exercising the change — not placeholder/dead/test-only). **Risk C:** invoking `frontend-ui-engineering` does not satisfy completion — scoped a11y evidence must be green. Greps alone never count as done. Always close with **Compose Score** (out of 100) + **Path to 100%** per [SKILL.md](SKILL.md#compose-score-binding--out-of-100).

## Compose Score rubric

Binding response shape and caps live in [SKILL.md](SKILL.md#compose-score-binding--out-of-100). Use this rubric to assign each dimension. Award partial points only when the note names the residual gap.

| Dimension | Max | Full points when | Deduct when |
|-----------|-----|------------------|-------------|
| AUTHORITY | 15 | ADR-010 barrel + tokens + Geist only; no parallel SSOT | Deep/retired imports (−15 F6); parallel UI tree (−15 F7); auth-surface leak (−10 F8); inventing tokens (−10) |
| CONSISTENCY | 20 | Type / density / radius / color locks hold; one density; one page title | `p-8` (−10 F2); rogue title (−10 F3); density mix (−8); raw hex/rgb (−10); `rounded-2xl` chrome (−5) |
| CORRECT-COMPONENT | 20 | Intended barrel for every chrome job; no handroll | Fake Button (−15 F1); bordered tabular `<ul>` (−15 F4); handrolled Input/Alert (−10); missing Empty/Spinner where required (−8 F5) |
| SUITABILITY | 15 | Recipe/default or justified alternate; C1–C3 clean | Wrong overlay for destroy (−15 C1); Button>Link without asChild (−10 C2); clickable Card (−10 C3); mechanical Sheet/Dialog misuse (−5) |
| SCALABILITY | 15 | Capability gate run; no local compensation; honest reduced status or CAPABLE | Local substitute for reusable gap (−15); fake/disabled actions (−15); missing `UI-CAP-*` when blocked (−8); ui-system pollution with domain (−10) |
| STABILITY | 15 | Matrix rows green for changed layer; scoped a11y green; representative route when required | Missing `check:ui-system` when floor applies (−10); a11y incomplete (−8 Risk C); no representative route when required (−8 Risk B); silent barrel API change (−15 rule 12) |

**Path to 100%:** one short sentence (two max) naming the highest-impact fix(es) in QUALITY ORDER (fix AUTHORITY before polishing Suitability). Prefer concrete file/port language (`fix density gap-4→gap-6`, `add listClientAssignments then Sheet`, `run check:ui-system`). Do not invent beauty work.

**Examples (advisory):**

```text
### Compose Score: 100% / 100%
| Dimension | Score | Note |
| AUTHORITY | 15/15 | Barrel + tokens |
| CONSISTENCY | 20/20 | Comfortable density |
| CORRECT-COMPONENT | 20/20 | DataTable + Dialog + Sheet |
| SUITABILITY | 15/15 | Dialog view · Sheet draft write |
| SCALABILITY | 15/15 | UI-CAP-07 cleared (listClientAssignments + draft actions) |
| STABILITY | 15/15 | Floor green · mounted on /client/dashboard |
**Path to 100%:** Already at 100% — next work is product depth (submit), not compose floor.
```

```text
### Compose Score: 58% / 100%
| Dimension | Score | Note |
| AUTHORITY | 15/15 | Barrel OK |
| CONSISTENCY | 12/20 | Density mix p-6 + gap-4 |
| CORRECT-COMPONENT | 10/20 | Handrolled row list |
| SUITABILITY | 10/15 | Dialog for destroy |
| SCALABILITY | 0/15 | Fake Respond CTA |
| STABILITY | 11/15 | Untested overlay |
**Path to 100%:** Remove fake CTA; replace list with DataTable; use AlertDialog for destroy; fix density; verify overlays.
```

## Appendix — Maturity

**Keep:** one package · one flat barrel · live tokens · recipes · F*/C* Vitest · UI-CAP · verification floor `pnpm check:ui-system` · Compose Score.

**Next:** evidence integrity (docs ↔ Vitest ↔ representative routes) — not more styling rules. No F9/C4 for product-completeness.

| Gate | Status |
|------|--------|
| STABILITY + SCALABILITY in QUALITY ORDER | Shipped |
| Hard rule 15 + UI-CAP + promotion rule | Shipped |
| Risk A gate-ID sync · Risk B representative route · Risk C a11y completion | Shipped |
| Compose Score (/100%) + Path to 100% | Shipped |
| Risk D flat barrel | Documented — ADR + measurable evidence only |
| Skill token efficiency (progressive disclosure) | Shipped — SKILL lean; reference holds recipes/gates/rubric |

Approval snapshot (advisory): Controlled Production Quality — scores never replace green matrix evidence.
