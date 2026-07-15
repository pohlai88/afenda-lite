---
name: afenda-elite-ui-handoff
description: >-
  Gates all Afenda UI work — forbids handrolled UI trees, blocks UX drift from
  Studio/AdminCN DNA and `@afenda/ui` gateway rules, and requires Chrome
  DevTools MCP evidence before any human handoff. Use whenever engaging
  afenda-elite-design-system, admincn-customization, afenda-elite-frontend-scaffold,
  afenda-elite-nextjs-best-practice (UI routes), frontend-ui-engineering, or when
  the user mentions Studio, playground gateway, shell chrome, handroll, or UI handoff.
---

# Afenda Elite — UI handoff gate

**Companion to every UI farm.** Does not replace DNA install (`afenda-elite-design-system` / `admincn-customization`) or scaffolding. Owns: **no handroll**, **no UX drift**, **Chrome DevTools before handoff**.

```text
LOAD (with any UI farm):
  this skill
  browser-testing-with-devtools   # method detail
  Chrome DevTools MCP             # project-0-afenda-lite-chrome-devtools (or equivalent)
SKIP:
  handrolling apps/web/features/playground · apps/web/app/playground · apps/web/components
  inventing UI trees outside Studio MCP/CLI + promote
  declaring UI "done" / handoff without DevTools evidence
  product deep-import @afenda/ui outside ALLOWED_UI_SUBPATHS
  Storybook restore · Portal Atmosphere remount
  carving quality below enterprise production
```

## Applies when

Any of these are in play:

| Farm / method | Role |
|---------------|------|
| `afenda-elite-design-system` | Studio → promote → gateway |
| `admincn-customization` | Shell / theme / Studio DNA |
| `afenda-elite-frontend-scaffold` | App routes / wipe / FE trees |
| `afenda-elite-nextjs-best-practice` | When changing browser-visible UI |
| `frontend-ui-engineering` | Vendor method after farm pick |

**Rule:** If a turn changes pixels or UI routes, this skill’s Done gate binds that turn.

## Hard rules

### 1. No handroll

| Forbidden | Required |
|-----------|----------|
| New compose/lab/hub trees under `apps/web/features/playground` or `apps/web/app/playground` | DNA via **Shadcn Studio MCP** + CLI · cwd `packages/design-system` · promote into `ui` / `shared` / `layout` |
| New `apps/web/components/**` or `features/*/shadcn-studio/**` product homes | Aliases write into `packages/design-system` (`components.json` forwarder OK) |
| Empty / throw-TODO UI stand-ins | Real Studio-promoted components or stop |

Named exception only: user letter **this turn** authorizing a named temporary path.

### 2. No UX drift

| Drift | Rectify |
|-------|---------|
| Hard-coded indigo/purple / inventory-AI aesthetics | Semantic tokens (`bg-primary`, …) · ThemeCustomizer presets |
| Deep-import or bypassing `@afenda/ui/playground` | Gateway + `*Contract` only ([ADR-009](../../../docs/architecture/adr/ADR-009-afenda-ui-playground-gateway.md) · [ARCH-024](../../../docs/architecture/ARCH-024-package-boundaries.md)) |
| Marketing login/forgot/reset as product auth | Neon Auth island stays |
| Replacing LOCK shell DNA with ad-hoc chrome | LOCK: `application-shell-01` · `dashboard-dropdown-02` · `dashboard-dropdown-12` · `dashboard-dialog-20` ([afenda-collection](../afenda-elite-design-system/SKILL.md)) |

### 3. Chrome DevTools before human handoff (compulsory)

Do **not** claim ready for human review until DevTools evidence is pasted.

1. Ensure app reachable (`pnpm --filter @afenda/web dev` or production URL as scoped).
2. Use Chrome DevTools MCP (method: [browser-testing-with-devtools](../agent-skills/skills/browser-testing-with-devtools/SKILL.md)):
   - `navigate_page` / `list_pages` — land on the changed surface
   - `take_snapshot` (or screenshot) — structure matches intent
   - `list_console_messages` — **zero unexpected errors**
   - `list_network_requests` — no failed first-party fetches for the surface
3. If anything fails: **fix in code → re-run DevTools** — never hand off broken visuals.
4. Hand-off report must include DevTools evidence (see below).

Backend-only / docs-only / package-architecture-only turns skip this section.

## Done checklist (UI turns)

```text
- [ ] UI DNA path: Studio MCP/CLI + promote (or explicit reuse / anti-bloat skip)
- [ ] No new handroll harness or apps/web/components dump
- [ ] Imports only ALLOWED_UI_SUBPATHS
- [ ] Chrome DevTools: snapshot + console clean + network OK (evidence pasted)
- [ ] Verify commands for the farm (e.g. ui-boundary / typecheck) green with evidence
```

## Hand-off report (required shape)

```markdown
## UI handoff
- Surface / URL:
- Studio / gateway evidence:
- DevTools: snapshot OK | console errors: N | network fails: N
- Commands green:
- Residual risks:
```

## Additional resources

- Checklist detail: [reference.md](reference.md)
- Design-system pipeline: [afenda-elite-design-system](../afenda-elite-design-system/SKILL.md)
- AdminCN DNA: [admincn-customization](../admincn-customization/SKILL.md)
