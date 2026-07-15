---
name: afenda-elite-design-system
description: >-
  Runs the Afenda-Lite @afenda/ui design-system pipeline — Studio DNA install,
  promote into packages/design-system layers, playground lab prove, gateway
  export with *Contract types, and apps/web consumption via allowlisted
  subpaths only. Use when adding or promoting UI from Shadcn Studio, wiring
  playground labs or /playground/compose, changing @afenda/ui exports,
  fixing deep-import or gateway/registry parity, or when the user mentions
  design-system, playground gateway, or ui-boundary.
---

# Afenda Elite — design system

**SSOT for the `@afenda/ui` process.** Canonical home: [`packages/design-system`](../../../packages/design-system) (not retired `packages/ui`). Public API is the **playground gateway**, not the template tree.

```text
LOAD:
  docs/architecture/adr/ADR-009-afenda-ui-playground-gateway.md
  docs/architecture/ARCH-024-package-boundaries.md  (§ @afenda/ui)
  docs/architecture/ARCH-015-admincn-alignment.md
  docs/architecture/ARCH-018-admincn-customization.md
  packages/design-system/src/playground/{index,types,providers}.ts
  packages/design-system/components.json
  apps/web/components.json
  apps/web/__tests__/ui-boundary.test.ts
  ../afenda-elite-ui-handoff/SKILL.md
SKIP:
  inventing src/shell or src/components/composite this slice (disk = layout + shared)
  recreating apps/web/features/playground or apps/web/app/playground by handroll
  auto-scanning views/ into a local harness without Studio MCP install + promote
  deep-import @afenda/ui/components|shared|layout|views|fake-db
  product import from _reference/** or Collapse recover of components-V2
  leaving components/shadcn-studio/ or features/*/shadcn-studio/blocks/ as homes
  installing UI trees under apps/web/components or features/*/shadcn-studio
  replacing Neon Auth with Studio account-settings / login / forgot / reset
  inventing empty stand-ins for Pro/license-failed blocks
  claiming full-package typecheck green while views/fake-db still error
  reinstalling LOCK foundation already promoted under layout/shared (anti-bloat)
  reduced-viability quality frames (sole bar = enterprise production)
```

## Next open — named Studio MCP target

| Field | Value |
|-------|--------|
| **Afenda ID** | `afenda-collection` |
| **Purpose** | Afenda Collection — publish primitives/variants onto `@afenda/ui/playground` for ecosystem import; browser host only via Studio DNA |
| **Studio category** | `dashboard-and-application` |
| **Studio registry** | `/dashboard-and-application/application-shell/registry` |
| **MCP /iui seed (LOCK)** | `application-shell-01` → `src/mcp/inspiration-blocks/dashboard-and-application/application-shell` |
| **Companion LOCK chrome** | `dashboard-dropdown-02` · `dashboard-dropdown-12` · `dashboard-dialog-20` (already promoted — **do not reinstall**) |
| **Anti-bloat** | Shell/chrome already under `packages/design-system/src/components/{layout,shared}/` — reuse; skip CLI overwrite unless user names a **refresh**. **2026-07-15:** user-ordered refresh ran `pnpm dlx shadcn@latest add @ss-blocks/application-shell-01`; marketplace `shadcn-studio/` deleted after promote; gateway `Button`/`Input` Contracts restored. |
| **Host route (Studio-backed)** | `apps/web/app/playground/*` thin consume only — gateway imports + `PLAYGROUND_ENABLED` gate. **No** `features/playground` compose/lab-registry. Shell LOCK anti-bloat on disk; full sidebar after Sidebar family is gateway-promoted. |
| **Next primitive publish** | Pick next L2 from `src/components/ui/` (e.g. `Card`, `Separator`, `Label`) — one component family per slice (`*Contract` + `PLAYGROUND_INFRA_EXPORTS`). `Accordion` published 2026-07-15. |
| **Forbidden** | Handroll compose/lab-registry under `features/playground` · marketing auth blocks · dumping all `ui/` onto the barrel without per-component promote |

MCP entry: `get-blocks-metadata` → `get-block-meta-content` on that registry path → collect LOCK set only if a net-new host route is approved · promote · gate through `@afenda/ui/playground`.

## Companion split

| Artifact | Owns |
|----------|------|
| **This skill** | Process: Studio MCP/CLI → promote → gateway → boundary → product consume |
| [`afenda-elite-ui-handoff`](../afenda-elite-ui-handoff/SKILL.md) | No handroll · no UX drift · **Chrome DevTools before human handoff** |
| [`admincn-customization`](../admincn-customization/SKILL.md) | AdminCN / ThemeCustomizer DNA narrative; Studio category discovery |
| `/studio` Cursor command | MCP/CLI modes (`base` / `shell` / `chrome` / `primitive` / `theme` / `promote`) — **cwd = `packages/design-system`** |

Route shell/theme *content* refine through `admincn-customization`. Route CLI mode drills through `/studio`. Route gateway/boundary work here. **Always** satisfy `afenda-elite-ui-handoff` before claiming a UI turn done.

## Naming trap

| Term | Meaning |
|------|---------|
| `@afenda/ui/playground` | Package gateway subpath — sole runtime door for UI primitives |
| `/playground` Next routes | **Removed** (2026-07-15). Do not handroll a replacement — any future harness must arrive via **Shadcn Studio MCP** install + promote into Target packages. |

See [ARCH-024 § `@afenda/ui`](../../../docs/architecture/ARCH-024-package-boundaries.md#afendaui).

## Pipeline (ordered)

1. **Preflight** — confirm surface, shell invariants, DNA source ([ARCH-019](../../../docs/architecture/ARCH-019-admincn-frontend-preflight.md)).
2. **DNA in** — **Studio MCP only** (no handroll UI trees). Default **LOCK** family for shell/chrome: `application-shell-01` · `dashboard-dropdown-02` · `dashboard-dropdown-12` · `dashboard-dialog-20`. DEFER form-layout / empty-state / charts / statistics / widgets unless named slice. REJECT marketing login/forgot/reset · account-settings as product auth. MCP: metadata → meta → collect → `get_add_command_for_items` → CLI in `packages/design-system` with `EMAIL` / `LICENSE_KEY`. Style: `base-vega` ([components.json](../../../packages/design-system/components.json)). Preferred CLI cwd remains `packages/design-system` (native `#` imports). [`apps/web/components.json`](../../../apps/web/components.json) is a Studio **forwarder** only — never invent `apps/web/components/`.
3. **Promote** — flatten scratch out of `shadcn-studio/`; rewrite imports to `#components`, `#lib/utils`, `#hooks`; semantic tokens only (`bg-primary`, …). Homes:
   - L2 primitives → `src/components/ui/`
   - L3 chrome → `src/components/shared/`
   - Shell chrome → `src/components/layout/` (Header, Sidebar, ThemeCustomizer)
4. **Prove** — harness routes removed. Until a Studio MCP-driven harness returns: interactive prove is optional; **do not** invent lab-registry / compose boards by hand.
5. **Gateway** — same change set: `*Contract` in `src/playground/types.ts` + re-export from `src/playground/index.ts` (or providers subpath). Grow barrel with `PLAYGROUND_PROVEN_EXPORTS` or `PLAYGROUND_INFRA_EXPORTS` — never alone. Infra: `Button`, `buttonVariants`, `Input`, `cn`. Providers stay on `./playground/providers`.
6. **Consume** — product import only allowlisted subpaths (ARCH-024 / ADR-009).
7. **Verify** — commands below.

Stage checklists: [pipeline.md](pipeline.md).

## Hard rules

1. **Gateway-only imports** outside the package: `@afenda/ui`, `@afenda/ui/style.css`, `@afenda/ui/playground`, `@afenda/ui/playground/providers`, `@afenda/ui/playground/types`.
2. **Allowlist ↔ barrel parity** — every non-Providers barrel export is in `PLAYGROUND_PROVEN_EXPORTS` or `PLAYGROUND_INFRA_EXPORTS`.
3. **No handroll harness** — DNA in via Studio MCP/CLI only; no resurrecting `features/playground` without an explicit Studio-backed slice.
4. **Promote kills marketplace nesting** — delete demo `app/<block>/page.tsx` from the package; no permanent `shadcn-studio/` trees.
5. **ThemeCustomizer** stays the brand/layout control surface; do not nest a second ThemeProvider.
6. **Auth island** untouched — Neon Auth paths stay out of Studio marketing login/forgot/reset.
7. **No Collapse recover** of banned trees unless the user names that recovery this turn.
8. **Canvas briefs** import only `cursor/canvas` — never `@afenda/ui`.
9. **`components/ui` DNA** stays on disk for study — listing or browsing it in apps/web without Studio MCP is not a substitute for gateway publish.

## Public exports (pin)

```text
@afenda/ui                      → cn
@afenda/ui/style.css            → tokens
@afenda/ui/playground           → proven primitives + infra
@afenda/ui/playground/providers → Providers (Next font chain)
@afenda/ui/playground/types     → *Contract + ALLOWED_UI_SUBPATHS
```

Everything else under `src/` stays on disk as DNA study — not public.

## Verify

```bash
pnpm --filter @afenda/ui test
pnpm --filter @afenda/web exec vitest run __tests__/ui-boundary.test.ts --config ../../testing/vitest.config.ts
```

Optional residue: no `shadcn-studio/` dirs under `packages/design-system` after promote.

**Typecheck note:** full-package `pnpm --filter @afenda/ui typecheck` may fail on template `views/` / `fake-db` debt. Do not invent empty implementations to force green. Scope “done” to gateway + touched surfaces + the two tests above.

## Done when

- [ ] DNA promoted into `ui` / `shared` / `layout` (no marketplace residue)
- [ ] Lab row + host prove the surface (when promoting a new primitive)
- [ ] `*Contract` + gateway export land with the registry row
- [ ] Architecture + ui-boundary tests pass
- [ ] Consumers use allowlisted subpaths only
