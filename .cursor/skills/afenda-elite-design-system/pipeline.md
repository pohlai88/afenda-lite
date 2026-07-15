# Design-system pipeline checklists

Companion to [SKILL.md](SKILL.md). DNA in via **Studio MCP/CLI only** — no handroll harness.

## Key files

| Role | Path |
|------|------|
| Package root | `packages/design-system/` |
| Registries / style | `packages/design-system/components.json` (`base-vega`) |
| App Studio forwarder | `apps/web/components.json` (aliases → `packages/design-system`; never invent `apps/web/components/`) |
| Gateway barrel | `packages/design-system/src/playground/index.ts` |
| Contracts + allowlists | `packages/design-system/src/playground/types.ts` (`PLAYGROUND_INFRA_EXPORTS` · `PLAYGROUND_PROVEN_EXPORTS`) |
| Providers door | `packages/design-system/src/playground/providers.ts` |
| L2 primitives | `packages/design-system/src/components/ui/` |
| L3 chrome | `packages/design-system/src/components/shared/` |
| Shell chrome | `packages/design-system/src/components/layout/` |
| Theme / nav | `packages/design-system/src/configs/` |
| Package architecture test | `packages/design-system/__tests__/architecture.test.ts` |
| Web boundary test | `apps/web/__tests__/ui-boundary.test.ts` |

**Removed (do not resurrect by hand):** `apps/web/features/playground/**`, `apps/web/app/playground/**`.

## Stage 1 — Preflight

- [ ] Target surface named (component / shell chrome / Studio family)
- [ ] DNA source: **Studio MCP/CLI** or user-approved `_reference/archive/<kit>` promote-only
- [ ] Auth island not in scope (no Studio login/forgot/reset as product auth)
- [ ] Cwd for CLI will be `packages/design-system` (preferred; `#` aliases). If starting from `apps/web`, use the forwarder `components.json` only — still promote into design-system; never keep trees under `apps/web/components`

## Stage 2 — DNA install (Studio MCP only)

- [ ] Default **LOCK**: `application-shell-01` · `dashboard-dropdown-02` · `dashboard-dropdown-12` · `dashboard-dialog-20`. DEFER form-layout / empty-state / charts / statistics / widgets unless named. REJECT marketing auth.
- [ ] `EMAIL` + `LICENSE_KEY` present in env (never print values)
- [ ] MCP: `get-blocks-metadata` → `get-block-meta-content` → pick **one** best license-OK variant/family
- [ ] `collect_selected_blocks` until set complete → `action: "list"` → `get_add_command_for_items`
- [ ] Run CLI once with `--yes --overwrite`
- [ ] Pro/license failures listed and skipped — never invent empty stand-ins
- [ ] Skip reinstall when foundation already promoted (anti-bloat)

## Stage 3 — Promote

- [ ] Move into `ui` / `shared` / `layout` as appropriate
- [ ] Imports use `#components`, `#lib/utils`, `#hooks` (no app `@/` inside the package)
- [ ] Hard-coded indigo/purple replaced with semantic tokens where presets must work
- [ ] Delete marketplace nesting (`components/shadcn-studio/**`) and block demo pages under the package
- [ ] One-line provenance comment OK (`Adapted from Studio …`)

## Stage 4 — Prove

- [ ] Local Next harness removed — do **not** handroll lab-registry / compose
- [ ] Interactive prove deferred until a Studio MCP-driven harness is explicitly ordered

## Stage 5 — Gateway

- [ ] Add `*Contract` in `src/playground/types.ts` (omit unsure fields — do not guess wider types)
- [ ] Component props extend/intersect the contract
- [ ] Re-export from `src/playground/index.ts`
- [ ] Update `PLAYGROUND_PROVEN_EXPORTS` or `PLAYGROUND_INFRA_EXPORTS` in the same change
- [ ] If Providers-related: use `./playground/providers` only

## Stage 6 — Consume (apps/web)

```ts
import { Button, ProfileDropdown } from "@afenda/ui/playground";
import { Providers } from "@afenda/ui/playground/providers";
import type { ProfileDropdownContract } from "@afenda/ui/playground/types";
```

Forbidden:

```ts
import { Button } from "@afenda/ui/components/ui/button"; // deep path
import Providers from "@afenda/ui/providers"; // removed public path
```

## Stage 7 — Verify

```bash
pnpm --filter @afenda/ui test
pnpm --filter @afenda/web exec vitest run __tests__/ui-boundary.test.ts --config ../../testing/vitest.config.ts
```

- [ ] No `shadcn-studio/` residue under `packages/design-system`
- [ ] No `apps/web/components` / `apps/web/features/playground` / `apps/web/app/playground`
- [ ] Barrel keys === `PLAYGROUND_PROVEN_EXPORTS` ∪ `PLAYGROUND_INFRA_EXPORTS`
- [ ] No new deep `@afenda/ui/…` imports under `apps/web`

## Forbid list (quick)

- Deep-import outside allowlist
- Product `import` from `_reference/**`
- Permanent `shadcn-studio/` product homes
- Handrolling `features/playground` / `app/playground`
- Catalog dump into product `/dashboard` from this pipeline
- Nesting a second ThemeProvider
- Inventing `ACN-*` / `FFT-UI-*` IDs or agent-editing `ui-registry.json` to pass Vitest
- Canvas importing `@afenda/ui`
- Reinstall mid-MCP-collection; reinstall when foundation already promoted (anti-bloat)
