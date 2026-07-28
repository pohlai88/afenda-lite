# `@afenda/storybook`

Greenfield component catalog for `@afenda/ui-system`. It is a private React/Vite application and never mounts product routes or imports UI-system source modules.

## Contract evidence boundary

```text
Catalogue decides what exists
Contract decides what it means
Story file demonstrates usage
Tests prove observable behavior
```

Story rendering imports components only from the public `@afenda/ui-system`
barrel. Storybook startup tooling privately reads the internal metadata catalog,
validates governance, and exposes a frozen JSON-compatible projection containing
only component identity, purpose, component ownership, classification, variants,
sizes, and required states. It does not expose lifecycle history, contract policy
collections, catalogue mutation, or a public metadata subpath.

For component evidence suites, `Overview` is the sole tagged
visual-regression story. Additional stories provide usage, states and
accessibility, composition, and approved variant/size evidence without
silently multiplying the component overview inventory. The Mineral Calm
foundation suite owns two representative tagged baselines: `SurfaceHierarchy`
and `OperationalWorkspace`.
Badge, Button, Card, DataTable, FormField, Input, MetricCard, PageHeader, and
StatusBadge are the Phase 1 benchmark set. The other suites retain the central
scenario infrastructure until they are migrated component by component;
transitional checks do not pretend they already satisfy strict evidence parity.
Storybook evidence never promotes component lifecycle automatically.

The tagged inventory is 75 stories: one `Overview` for each of the 73 public
component modules plus the two Mineral Calm foundation stories. Drawer and
Menubar include behavioral play evidence and targeted open-portal screenshot
tests.
The Button lane separately records variants, sizes, disabled and pending states,
navigation, composition, hover, active, and focus-visible evidence.

## Foundation parity

Storybook loads Tailwind, animation utilities, `@afenda/ui-system/styles.css`,
and `@afenda/ui-system/base.css` before Storybook-owned Geist font rules. The
workspace decorator is explicitly `bg-background`; the shared base stylesheet
owns document canvas, body margin, foreground, and default border behavior.
The theme decorator applies `light` or `dark` to the iframe document element and
restores its prior classes on cleanup so portalled overlays inherit the same
tokens as their trigger.

### Button governance benchmark

The metadata contract defines Button semantics; the Button suite is the
authoritative set of approved demonstrated usage patterns. It separates
semantic meaning, implementation inventory, state and accessibility evidence,
navigation composition, ERP composition, and misuse guidance. Its colocated
play functions prove activation, keyboard access, disabled and pending
behavior, accessible naming, and link semantics. Product usage must match a
demonstrated pattern, or add and review a new Storybook pattern before or with
adoption.

```bash
pnpm --filter @afenda/storybook dev
pnpm --filter @afenda/storybook build
pnpm --filter @afenda/storybook preview
pnpm --filter @afenda/storybook test:stories
pnpm --filter @afenda/storybook test:visual
```

Visual baselines are reviewed before running `test:visual:update`. Canonical
baselines are generated with the repository Playwright version on Linux, and
ordinary test runs never rewrite them. A missing baseline is not permission to
accept an image automatically: inspect the rendered diff first, then update the
approved snapshot set explicitly.
