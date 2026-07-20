# shadcn-ui — components.json · Studio MCP · DNA promote

Companion to [SKILL.md](SKILL.md). Confirm product barrel in `packages/surfaces/ui-system/src/index.ts` before inventing exports.

---

## 1. Disk truth matrix

| Path | Role | Registries |
|------|------|------------|
| `packages/surfaces/ui-system/components.json` | **Product** shadcn CLI SSOT (`new-york`, `#` aliases) | **None** (ADR-010) |
| `apps/web/components.json` | **DNA forwarder** — present (M-A1) | `@shadcn-studio` · `@ss-components` · `@ss-blocks` · `@ss-themes` |
| `apps/web/shadcn-studio/**` | **DNA staging** — stubs tracked; bulky installs gitignored (M-A1) | n/a |
| `packages/design-system/components.json` | Retired historical Studio home | Do not restore package |
| Repo-root `components.json` | Collapse banned | Absent |

**Runtime product imports:** `import { … } from "@afenda/ui-system"` only.  
**Forbidden runtime:** `@/shadcn-studio/…`, `apps/web/components/ui/**`, parallel kits.

---

## 2. Authority conflict map

| Authority | Says | Skill resolution |
|-----------|------|------------------|
| **ADR-010** (Closed) | Owned-source `@afenda/ui-system`; no paid Studio registries on product CLI | Hold — never add `registries` to ui-system without explicit ADR reopen |
| **ARCH-015** | Studio DNA temporary → promote → prune; no product import from nested `shadcn-studio/` | **Method A land = `apps/web/shadcn-studio/`** is staging only; promote-out mandatory; staging ≠ Living shell |
| **ARCH-018** | AdminCN = pattern; Studio = blocks DNA; no full zip as product | Same — blocks → promote into portal-chrome / features |
| **ui-system.mdc** | Flat barrel; no app `components/ui` | Enforce after promote |
| **Retired skills** | `afenda-elite-design-system` · `admincn-customization` | Forbidden restore — this skill replaces the CLI/DNA method only |

Historical `packages/design-system` Studio registries are **inventory**, not a restore target.

---

## 3. Env mapping (Studio CLI license)

Official Studio CLI expands `${EMAIL}` / `${LICENSE_KEY}` in registry params.

| Purpose | Vars in `.env.local` |
|---------|----------------------|
| Afenda documented names | `SHADCN_STUDIO_EMAIL` · `SHADCN_STUDIO_API_KEY` |
| Studio CLI names (required for Method A) | `EMAIL` · `LICENSE_KEY` |

Schema allows both pairs in [`packages/foundation/env/src/web.ts`](../../../packages/foundation/env/src/web.ts). Template: [`.env.example`](../../../.env.example).

**Rules:** set both pairs (or export CLI names from Studio values) before Method A; never sync Studio secrets to Vercel prod; never print secret values; validate presence/HTTP only.

---

## 4. DNA forwarder template (`apps/web/components.json`)

Create only for Method A missions. Point aliases **into** the DNA tree; CSS must **not** be product `globals.css` for theme mutation.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "shadcn-studio/styles.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/shadcn-studio/components",
    "utils": "@/shadcn-studio/lib/utils",
    "ui": "@/shadcn-studio/components/ui",
    "lib": "@/shadcn-studio/lib",
    "hooks": "@/shadcn-studio/hooks"
  },
  "registries": {
    "@shadcn-studio": "https://shadcnstudio.com/r/{style}/{name}.json",
    "@ss-components": {
      "url": "https://shadcnstudio.com/r/components/{style}/{name}.json",
      "params": {
        "email": "${EMAIL}",
        "license_key": "${LICENSE_KEY}"
      }
    },
    "@ss-blocks": {
      "url": "https://shadcnstudio.com/r/blocks/{style}/{name}.json",
      "params": {
        "email": "${EMAIL}",
        "license_key": "${LICENSE_KEY}"
      }
    },
    "@ss-themes": {
      "url": "https://shadcnstudio.com/r/themes/{name}.json",
      "params": {
        "email": "${EMAIL}",
        "license_key": "${LICENSE_KEY}"
      }
    }
  }
}
```

**Also required for Method A (follow-on implement):** DNA-local `shadcn-studio/lib/utils.ts` (`cn`), `shadcn-studio/styles.css` stub, and optional tsconfig path `@/shadcn-studio/*` for tooling — never for product feature imports.

**Git posture:** prefer gitignore bulky DNA installs; commit promoted product code. DNA may stay in-repo for review only when user asks.

---

## 5. Method A vs Method B

| | Method B (default audit) | Method A (full tree) |
|--|--------------------------|----------------------|
| Tooling | Studio MCP `get-inspiration-block-content` / block meta | `pnpm dlx shadcn@latest add @ss-blocks/…` cwd=`apps/web` |
| Needs registries | No | Yes — apps/web DNA forwarder |
| Land | Rewrite into promote targets, or drop raw under `shadcn-studio/` for inspection | CLI writes under `apps/web/shadcn-studio/**` |
| When | P0 audits, small leaves, no license CLI needed | Need full file trees / Pro blocks Approved |

```bash
cd apps/web
pnpm dlx shadcn@latest add @ss-blocks/application-shell-01
pnpm dlx shadcn@latest add @ss-components/button-44
# then upgrade → promote into ui-system — do not keep numbered kits as product public API
```

CLI name trap (ARCH-018): singular `chart-component-*` vs metadata plural — verify before add; P0 skips charts.

---

## 6. Upgrade checklist (before promote)

1. Rewrite imports → `@afenda/ui-system` or package-relative (ui-system) / feature-local
2. Tokens / ERP utilities from `tokens.css` — no raw hex; no Studio theme pack
3. Type / density locks (ui-compose)
4. lucide only
5. Strip demo nav, fake data, CDN avatars, language switchers, social footers
6. Preserve RSC boundaries
7. UI-CAP if reusable gap — no local compensation
8. `pnpm check:ui-system`
9. Prune unused `apps/web/shadcn-studio` leaves

### Promote land table

| DNA class | Land after upgrade |
|-----------|-------------------|
| Reusable primitive / compound | `packages/surfaces/ui-system` + barrel |
| Shell chrome (sidebar/header/nav frame) | `apps/web/features/portal-chrome/` |
| Org admin / roles / stats panels | `apps/web/features/org-admin/` |
| Auth chrome only (layout/message wrappers) | `apps/web/features/auth/` — Neon `AuthView` / invitation cards stay; **no** Studio login forms |
| ~~FFT~~ / ~~Declarations~~ | **Removed** — do not land DNA under `features/fft/` or `features/declarations/` |

---

## 7. Studio MCP capability map

Server: `user-shadcn-studio-mcp`.

| Tool | Workflow | Afenda use | Stop rule |
|------|----------|------------|-----------|
| `get-inspire-instructions` | `/iui` | Load inspire protocol | STOP before vendor Steps 6–9 into wrong trees |
| `get-blocks-metadata` | `/iui` `/cui` | Category catalog | — |
| `get-inspiration-block-content` | `/iui` | **Primary Method B DNA** | Copy → upgrade → land |
| `get-create-instructions` | `/cui` | Understand install automation | Do not auto-install into product |
| `get-block-meta-content` | `/cui` | Variant pick | Collect only |
| `collect_selected_blocks` / `get_add_command_for_items` | `/cui` | Method A CLI generation | Run with **cwd=`apps/web`** only → `shadcn-studio/` |
| `get-refine-instructions` | `/rui` | Primitive variant search | — |
| `get-component-meta-content` / `collect_selected_components` / `get_add_command_for_components` | `/rui` | Pro components | Method B prefer; Method A → DNA tree then promote to ui-system |
| `get-component-content` | `/rui` | Immediate install helper | Avoid; breaks collect-first |
| `install-theme` | `/rui` | Theme packs | **REJECT** vs owned `tokens.css` |
| `parse-figma-blocks` / `get-ftc-instructions` | `/ftc` | Figma→blocks | Out of scope unless named |

**Max-effectiveness audit pattern:** `/iui` metadata → one `iuiPath` → Layout DNA + `registryDependencies` vs barrel → ACCEPT/ADAPT/REJECT → Method B. Use `/cui` collect+add only when Method A Approved.

### CLI namespaces

| Namespace | Content | Auth |
|-----------|---------|------|
| `@shadcn-studio` | Free components/blocks/themes | None |
| `@ss-components` | Free + Pro components | `EMAIL` + `LICENSE_KEY` |
| `@ss-blocks` | Free + Pro blocks | Same |
| `@ss-themes` | Themes | Same — default REJECT for product |

---

## 8. P0 shortlist · UX delta · Method

**Machine SSOT:** [`dna-ledger.json`](dna-ledger.json) (`AFN-DNA-*` rows — verdict, method, status, landPath, strip, barrelDeps, feZones).  
**Protocol:** [`dna-ledger.md`](dna-ledger.md).  
**Narrative:** [11-studio-admincn-possibility-audit.md](../../../docs/scratch/neon-auth-optimisation/11-studio-admincn-possibility-audit.md).

Do not maintain a second P0 table here — edit the ledger. Quick index:

| id | studioId | verdict | status |
|----|----------|---------|--------|
| `AFN-DNA-APPLICATION-SHELL-01` | application-shell-01 | ADAPT | promoted |
| `AFN-DNA-EMPTY-STATE-01` | empty-state-01 | ADAPT | staged |
| `AFN-DNA-LOGIN-PAGE-CHROME` | login-page-03 | ADAPT (chrome) | staged |
| `AFN-DNA-STATISTICS-CARD-01` | statistics-component-01 | ADAPT | promoted |
| `AFN-DNA-FORM-LAYOUT` | form-layout-01 | ADAPT | promoted |
| `AFN-DNA-DATATABLE` | datatable-component-04 | ADAPT | promoted |
| `AFN-DNA-LANGUAGE-SWITCHER` | language-switcher | REJECT | rejected |
| `AFN-DNA-SOCIAL-FOOTER` | social-footer | REJECT | rejected |
| `AFN-DNA-THEMES` | @ss-themes/* | REJECT | rejected |

---

## 9. Recommendation (Owned-promote)

1. Keep product `packages/surfaces/ui-system/components.json` **without** registries (ADR-010 hold).
2. DNA via **Method B** for most work; **Method A** into `apps/web/shadcn-studio/` when full trees Approved.
3. Runtime: features/routes never import DNA tree.
4. Themes REJECT.
5. High-ROI metadata = `dna-ledger.json` — not an Afenda install registry.

---

## 9.1 Own shadcn install registry — deferred

Hosting `@afenda/*` registry JSON so agents `shadcn add @afenda/…` is **out of scope** until an explicit ADR. Reasons: ADR-010 rejected paid/external registry coupling on product CLI; a private host without multi-app consumers adds drift without ROI. Until then: ledger metadata + Method A/B → promote into owned source.

---

## 10. Hygiene

| Allowed | Forbidden |
|---------|-----------|
| Stage under `apps/web/shadcn-studio/` | Product `page.tsx` / features importing DNA at runtime |
| Promote + prune (ARCH-015) | Permanent AdminCN zip / `_reference` lock as product |
| DNA-local utils for CLI | Dual product kit under `apps/web/components/ui` |
| Gitignore bulky DNA | Committing secrets; themes into globals |
