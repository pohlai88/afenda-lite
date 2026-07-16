# Scratch

Non-authoritative drafts and temporary notes under `docs/scratch/`.

Content here is **not** a Living, Target, or Accepted source of truth. A document number and DOC-002 register row are added only when the user explicitly agrees under DOC-001. Do not create archive folders or controlled-document stubs for retired scratch.

## Inventory

| Document | Purpose | Posture |
|----------|---------|---------|
| [REQ-saas-erp-multitenant-fullstack.md](REQ-saas-erp-multitenant-fullstack.md) | Future-product SaaS ERP requirements and quality-gate working material | **Parked** — OQ-20 scope-separated outside Afenda-Lite Target. Cross-cutting evidence semantics promoted to [GUIDE-017](../guides/GUIDE-017-enterprise-quality-evidence-standard.md); ERP requirements/gates remain scratch. Readiness **NOT EVIDENCED**. |
| [response-to-saas-erp-fullstack.md](response-to-saas-erp-fullstack.md) | Historical critique of an earlier REQ revision | Historical only; P0 remediations absorbed into REQ V2+; see REQ V2.4 park ruling |
| [AUDIT-2026-07-13-documentation.md](AUDIT-2026-07-13-documentation.md) | One-shot note: `turborepo/` → system architecture home rename | Historical provenance; not a Living audit SSOT |
| [afenda-ui-system-architecture.md](afenda-ui-system-architecture.md) | Working notes for `@afenda/ui-system` architecture | Scratch — owner edits content |
| [shadcn-token-erp-gap.md](shadcn-token-erp-gap.md) | ERP token gap analysis for `@afenda/ui-system` | Scratch — not Living |
| [ui-compose-no-compromise.md](ui-compose-no-compromise.md) | UI compose quality notes | Scratch — not Living |
| [imperial.html](imperial.html) | HTML preview mock | Scratch visual evidence only |
| [previwe.html](previwe.html) | HTML preview mock (typo filename retained) | Scratch visual evidence only |
| [aerospace-ceramic-erp-preview.html](aerospace-ceramic-erp-preview.html) | HTML preview mock | Scratch visual evidence only |
| [cursor-prompt/cursor-vibe-coding-prompt-guideline.md](cursor-prompt/cursor-vibe-coding-prompt-guideline.md) | Cursor vibe-coding prompt budgets and layering | Scratch — feeds `/cursor-mission-compile` |
| [cursor-prompt/cursor-mission-compile-guideline.md](cursor-prompt/cursor-mission-compile-guideline.md) | Mission compile worked examples | Scratch — feeds `/cursor-mission-compile` |
| [cursor-prompt/ui-compose-cursor-vibe-prompt.md](cursor-prompt/ui-compose-cursor-vibe-prompt.md) | UI compose vibe prompt example | Scratch |
| [neon-auth-optimisation/1-neon-auth-capability-map-and-dev-roadmap.md](neon-auth-optimisation/1-neon-auth-capability-map-and-dev-roadmap.md) | Neon capability map + auth/post-login roadmap | Scratch — cite ARCH-026 / GUIDE-018 as authority |
| [neon-auth-optimisation/2-neon-auth-command-cheatsheet.md](neon-auth-optimisation/2-neon-auth-command-cheatsheet.md) | Neon Auth command cheatsheet | Scratch |
| [neon-auth-optimisation/3-neon-auth-execution.command.md](neon-auth-optimisation/3-neon-auth-execution.command.md) | Neon Auth execution command sheet | Scratch |
| [neon-auth-optimisation/4-neon-auth-audit.md](neon-auth-optimisation/4-neon-auth-audit.md) | Neon Auth audit notes | Scratch |
| [neon-auth-optimisation/5-neon-auth-repair.md](neon-auth-optimisation/5-neon-auth-repair.md) | Neon Auth repair notes | Scratch |
| [neon-auth-optimisation/6-neon-auth-slice-card.md](neon-auth-optimisation/6-neon-auth-slice-card.md) | Neon Auth slice card template | Scratch |
| [neon-auth-optimisation/7-N1-example.md](neon-auth-optimisation/7-N1-example.md) | N1 slice example | Scratch |
| [neon-auth-optimisation/8-N4-db-performance.md](neon-auth-optimisation/8-N4-db-performance.md) | N4 db performance notes | Scratch |
| [reliance-dx-patterns-xerp-oss-2026-07-17.md](reliance-dx-patterns-xerp-oss-2026-07-17.md) | Research: Xerp + OSS reliance/graph/DX patterns; Afenda keep/adapt/reject | Scratch — ADR feedstock only; not Living |
| [biome-ultracite-oss-best-practices-2026-07-17.md](biome-ultracite-oss-best-practices-2026-07-17.md) | Research: Biome + Ultracite OSS best practices; Afenda fit and scoped lint-debt posture | Scratch — not Living |

## Rules

- Move durable material out of scratch only via a separate DOC-001 mission with named owner and controlled destination.
- Delete stale scratch when it is confirmed redundant; do not invent archive paths.
- Controlled Afenda-Lite authorities stay under `docs/` Living/Target homes — never cite parked ERP REQ as Target.

## Change log

| Date | Summary |
|------|---------|
| 2026-07-17 | Added `biome-ultracite-oss-best-practices-2026-07-17.md` (Biome + Ultracite OSS research) |
| 2026-07-17 | Added `reliance-dx-patterns-xerp-oss-2026-07-17.md` (Xerp/OSS reliance·graph·DX research) |
| 2026-07-17 | Reconciled inventory with disk: neon-auth-optimisation/, cursor-prompt/, HTML previews, token/compose gap md |
| 2026-07-16 | Added `neon-auth-capability-map-and-dev-roadmap.md` (Neon capability map + auth/post-login roadmap) |
| 2026-07-16 | Added `afenda-ui-system-architecture.md` scratch file |
| 2026-07-14 | Parked ERP REQ (OQ-20 scope separation); removed mistaken GUIDE-005 Living header; listed response + audit as historical |
| 2026-07-13 | Defined scratch folder as non-authoritative |
