# Studio / AdminCN possibility audit (P0)

| Field | Value |
|-------|-------|
| Posture | **Scratch** — not Living, Target, Accepted, or DOC-002 registered |
| Audience | Frontend / UI compose / Studio DNA missions |
| Updated | 2026-07-17 |
| Skills | [`shadcn-ui`](../../../.cursor/skills/shadcn-ui/SKILL.md) · [`afenda-elite-ui-compose`](../../../.cursor/skills/afenda-elite-ui-compose/SKILL.md) |
| Companion | [9-neon-auth-fe-surface-compose-map.md](./9-neon-auth-fe-surface-compose-map.md) |
| Machine SSOT | [`dna-ledger.json`](../../../.cursor/skills/shadcn-ui/dna-ledger.json) (`AFN-DNA-*`) · protocol [`dna-ledger.md`](../../../.cursor/skills/shadcn-ui/dna-ledger.md) |

## Status / posture

Working audit under `docs/scratch/`. Does **not** reopen ADR-010, change Living ARCH control state, or authorize product installs. Controlled DNA law remains [ARCH-015](../../architecture/ARCH-015-admincn-alignment.md) · [ADR-010](../../architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md).

**Binding land path (user decision):** Studio Method A CLI/MCP install → **`apps/web/shadcn-studio/`** via DNA forwarder `apps/web/components.json` — not `.scratch/`. Staging ≠ Living; promote then prune; no product route imports from the DNA tree.

**Metadata:** P0 verdict/status/landPath live in the skill ledger (edit there on promote). This file stays narrative. Afenda-hosted shadcn install registry = **deferred**.

## Authority snapshot

| Authority | Implication |
|-----------|-------------|
| ADR-010 | Product CLI = `packages/ui-system/components.json` **without** `registries` |
| ARCH-015 | Stage → promote → prune; no runtime DNA import |
| Retired farms | Do not restore `afenda-elite-design-system` / `admincn-customization` |
| Living shell | `OperatorPlatformShell` + barrel `Sidebar` — thinner than full AdminCN zip |

## Recommendation

**Owned-promote:** keep ui-system sans registries; DNA via Method B (MCP) or Method A into `apps/web/shadcn-studio/`; themes REJECT vs `tokens.css`.

## P0 ACCEPT / ADAPT / REJECT

| Studio item | FE zones (doc 9) | Verdict | Method | Promote land | Notes |
|-------------|------------------|---------|--------|--------------|-------|
| `application-shell-01` | FE-11 · FE-12 | **ADAPT** | B default; A if full tree | `features/portal-chrome/` + barrel `Sidebar` | Strip demo nav, locale switcher, social footer, CDN avatars |
| `empty-state-01` | FE-07 · FE-08 · FE-10 · not-found | **ADAPT** | B | Message shell recipe / `Empty` | Layout DNA only; keep `PublicMessageShell` type locks |
| `login-page-*` | FE-02…FE-06 | **ADAPT chrome / REJECT forms** | B | `features/auth` chrome only | Neon `AuthView` stays; Studio credential forms REJECT |
| statistics / card-01 | FE-11 org-admin | **ADAPT** | B | `features/org-admin/` or barrel `MetricCard` | Metric density/layout DNA |
| form-layout | FE-11 · FE-13 sheets | **ADAPT** | B | feature forms + barrel fields | Prefer Sheet recipe |
| datatable / table blocks | FE-11 · FE-13 | **ADAPT** | B | barrel `DataTable` ports + feature | Feature owns fetch/URL/permissions |
| Language switcher | — | **REJECT** | — | — | Not product shell |
| Social footer / demo mail-chat kits | — | **REJECT** | — | — | ARCH-015 drop list |
| `@ss-themes/*` / `install-theme` | — | **REJECT** | — | — | Owned `tokens.css` |

## UX delta (Living vs Studio DNA)

| Surface | Living today | Studio delta worth taking |
|---------|--------------|---------------------------|
| Message shell | `PublicMessageShell` — canvas center, title + body + footer | empty-state spacing/illustration patterns only |
| Auth island | Neon Auth + `auth-surface.css` | Frame/chrome only — not form widgets |
| App chrome | Thin `OperatorPlatformShell` | application-shell layout DNA (sidebar/header structure) after strip |
| Metric + Sheet + dense detail | `MetricCard` · Sheet recipe · `KeyValue` | statistics-card + form-layout structure; no parallel compounds without UI-CAP |

## Method A / B choice

| When | Choice |
|------|--------|
| Audit / single leaf / no CLI tree needed | **Method B** — `get-inspiration-block-content` |
| Approved full Pro block tree | **Method A** — cwd `apps/web`, land `shadcn-studio/**` |

Env for Method A: `EMAIL` + `LICENSE_KEY` (and documented `SHADCN_STUDIO_*`) in `.env.local` only — never Vercel prod.

## Follow-on (not this scratch doc)

1. Create `apps/web/components.json` DNA forwarder + DNA-local utils/css stubs.
2. Install selected P0 into `apps/web/shadcn-studio/` (update ledger `status=staged`).
3. Upgrade → promote → prune → ledger `status=promoted` → `pnpm check:ui-system`.
4. Afenda install registry / ADR-010 reopen only if multi-consumer CLI scale forces it.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-17 | Initial P0 audit; land path `apps/web/shadcn-studio`; skills `shadcn-ui` + ui-compose Message/Auth recipes |
| 2026-07-17 | Machine SSOT → `shadcn-ui/dna-ledger.json`; install registry deferred |
| 2026-07-17 | Audit repair: landPath single-path, evidenceRef file-only; scope-map `studio-dna` |
| 2026-07-17 | I3.4 cut B: promoted shell-01 · statistics · form-layout · datatable into portal-chrome / org-admin / barrel consume; DNA trees pruned; ledger `promoted` |
