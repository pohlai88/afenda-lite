---
name: shadcn-ui
description: >-
  Afenda monorepo shadcn CLI + Shadcn Studio DNA intake. Product primitives via
  packages/surfaces/ui-system (ADR-010, no registries). Studio Pro Method A lands under
  apps/web/shadcn-studio via apps/web/components.json DNA forwarder; Method B
  copies MCP source. Promote into @afenda/ui-system / features/*; never product
  import from shadcn-studio. Overrides Claude @/components/ui defaults. Use when
  adding shadcn primitives, Studio /iui /cui /rui, or DNA promote missions.
---

# Afenda — shadcn-ui (monorepo + Studio DNA)

**Goal:** correct `components.json` ownership + Studio DNA → promote → product compose. Not a beauty skill; not a second design system.

**Done:** DNA method chosen · ledger row honored/updated · land path correct · promote checklist clear · product still imports only `@afenda/ui-system`. Floor after promote: `pnpm check:ui-system`.

**Defer:** Afenda-hosted shadcn install registry — see [dna-ledger.md](dna-ledger.md). Metadata SSOT = [dna-ledger.json](dna-ledger.json).

```text
LOAD:
  packages/surfaces/ui-system/components.json
  docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md
  docs/architecture/ARCH-015-admincn-alignment.md  (DNA law · promote-out)
  docs/architecture/ARCH-024-package-boundaries.md  (#afendaui-system)
  .cursor/rules/ui-system.mdc
  dna-ledger.json   (machine DNA metadata SSOT)
  dna-ledger.md     (HITL / status / registry deferral)
  reference.md
SKIP:
  Claude skill defaults (@/components/ui · root shadcn init as product)
  registries on packages/surfaces/ui-system without ADR-010 reopen
  hosting @afenda shadcn install registry (deferred — dna-ledger.md)
  product import from apps/web/shadcn-studio/**
  apps/web/components/ui/** parallel kit
  install-theme vs owned tokens.css
  Collapse components-V2 / AdminCN zip recover
  afenda-elite-design-system · admincn-customization (forbidden restore)
```

## Authority ladder

```text
1. ADR-010 + ARCH-024 + ui-system components.json + tokens.css
2. ARCH-015 DNA law (stage → promote → prune; no runtime DNA import)
3. dna-ledger.json (verdict · status · landPath · strip)
4. This skill (CLI / Studio MCP method)
5. afenda-elite-ui-compose (product QUALITY ORDER after promote)
6. Vendor Studio / Claude shadcn-ui (last; drop on conflict)
```

## Dual `components.json` (binding)

| File | Role |
|------|------|
| [`packages/surfaces/ui-system/components.json`](../../../packages/surfaces/ui-system/components.json) | **Product SSOT** — `new-york`, `#` aliases, **no `registries`** |
| `apps/web/components.json` | **DNA forwarder only** — aliases + Studio `@ss-*` registries → write under `apps/web/shadcn-studio/` |
| Repo-root / product `apps/web/components/ui` | **Banned** |

Product add:

```bash
pnpm --filter @afenda/ui-system ui:add <built-in-shadcn-name>
# → relative imports → export barrel → tests green
```

Studio Method A (after DNA forwarder exists):

```bash
cd apps/web
pnpm dlx shadcn@latest add @ss-blocks/<name>
# lands under apps/web/shadcn-studio/** — then promote + prune
```

Details: [reference.md](reference.md).

## DNA method (law)

```text
LOAD dna-ledger.json row
Studio → Method B (MCP copy, default for audit)
       OR Method A (CLI cwd=apps/web → shadcn-studio/)
      → Upgrade checklist
      → Promote: landPath from ledger (ui-system | portal-chrome | features/* | auth chrome)
      → Prune unused shadcn-studio leaves · update ledger status
      → afenda-elite-ui-compose QUALITY ORDER
```

**Never** treat `apps/web/shadcn-studio` as Living product UI. Staging ≠ shell. Protocol: [dna-ledger.md](dna-ledger.md).

## Claude / vendor override

Attached Claude `/shadcn-ui` teaches `@/components/ui` and app-root install. **Ignore for Afenda product.** Use this skill + ADR-010 workflow. Studio MCP vendor Steps that auto-install into `components/ui` or emit product `page.tsx` — **STOP**; redirect to Method A/B above.

## Handoff

| Need | Skill |
|------|-------|
| Product compose / recipes / Compose Score | `afenda-elite-ui-compose` |
| Route / feature scaffold | `afenda-elite-frontend-scaffold` |
| Studio DNA CLI/MCP / components.json | **this skill** |
| Farm pick | `using-afenda-elite-skills` |

## Verify

- [ ] Ledger row loaded; REJECT/rejected not staged
- [ ] Product CLI only in `packages/surfaces/ui-system`
- [ ] Studio DNA only under `apps/web/shadcn-studio` (Method A) or Method B buffer → promote
- [ ] No product route imports DNA tree
- [ ] Themes REJECT vs `tokens.css`
- [ ] After promote: ledger `status=promoted` + `pnpm check:ui-system`
- [ ] No Afenda install-registry host invented this mission
