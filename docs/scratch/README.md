# Scratch

**What it is** — Non-authoritative drafts and temporary notes under `docs/scratch/`.

**What it does** — Holds working REQ critiques, research notes, provisional module packs, and Neon Auth / FFT discovery ledgers until a DOC-001 mission promotes durable material into Living or Target homes.

**What you need** — Treat every file here as **not** Living, Target, or Accepted. Controlled SSOT stays under [`docs/`](../README.md) ([DOC-001](../_control/DOC-001-documentation-control-standard.md)). Agent checkout doctrine: [AGENTS.md](../../AGENTS.md).

**Who it is for** — Contributors and agents navigating drafts; not operators looking for production runbooks.

A document number and DOC-002 register row are added only when the user explicitly agrees under DOC-001. Do not create archive folders or controlled-document stubs for retired scratch.

## Inventory

Grouped by folder. Paths verified on disk 2026-07-17.

### Root

| Document | Purpose | Posture |
|----------|---------|---------|
| [REQ-saas-erp-multitenant-fullstack.md](REQ-saas-erp-multitenant-fullstack.md) | Future-product SaaS ERP requirements and quality-gate working material | **Parked** — OQ-20 scope-separated outside Afenda-Lite Target. Cross-cutting evidence semantics promoted to [GUIDE-017](../guides/GUIDE-017-enterprise-quality-evidence-standard.md); ERP requirements/gates remain scratch. Readiness **NOT EVIDENCED**. |
| [response-to-saas-erp-fullstack.md](response-to-saas-erp-fullstack.md) | Historical critique of an earlier REQ revision | Historical only; P0 remediations absorbed into REQ V2+; see REQ V2.4 park ruling |
| [afenda-ui-system-architecture.md](afenda-ui-system-architecture.md) | Working notes for `@afenda/ui-system` architecture | Scratch — owner edits content |
| [reliance-dx-patterns-xerp-oss-2026-07-17.md](reliance-dx-patterns-xerp-oss-2026-07-17.md) | Research: Xerp + OSS reliance/graph/DX patterns; Afenda keep/adapt/reject | Scratch — ADR feedstock only; not Living |
| [aerospace-ceramic-erp-preview.html](aerospace-ceramic-erp-preview.html) | HTML preview mock | Scratch visual evidence only |

### `FFT/` — Feed Farm Trade discovery

Aspirational / reconciliation material. Living FFT ops and freeze stay in [`docs/modules/feed-farm-trade/`](../modules/feed-farm-trade/) ([FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md)).

| Document | Purpose | Posture |
|----------|---------|---------|
| [1-fft-architecture.md](FFT/1-fft-architecture.md) | Aspirational FFT product + architecture blueprint | Scratch — does not replace Living `FFT-MOD-*` |
| [2-fft-blueprint-oss-scorecard.md](FFT/2-fft-blueprint-oss-scorecard.md) | Blueprint vs agri-OSS scorecard | Scratch |
| [3-fft-improvement.md](FFT/3-fft-improvement.md) | Improvement critique of scorecard/blueprint | Scratch |
| [4-fft-reconciliation-and-promotion-map.md](FFT/4-fft-reconciliation-and-promotion-map.md) | Scratch → Living disposition / promotion map | Scratch |
| [5-fft-relevant-architecture.md](FFT/5-fft-relevant-architecture.md) | Afenda-Lite-filtered FFT architecture compose | Scratch |
| [6-fft-implementation-slice-map.md](FFT/6-fft-implementation-slice-map.md) | Discovery `FT1`–`FT18` slice map (not Neon `N*`) | Scratch — UNEVALUATED until Approved missions |
| [7-fft-frontend-ui-ux.md](FFT/7-fft-frontend-ui-ux.md) | FFT App Router UI/UX blueprint | Scratch Target narrative |

### `neon-auth-optimisation/`

Working Neon Auth notes. **N1–N18 serial complete** (N18 APPROVED 2026-07-17). Cite [ARCH-026](../architecture/ARCH-026-auth-session.md) and the [neon-auth-slice-map](../../.cursor/skills/afenda-elite-implementation-slices/neon-auth-slice-map.md) as authority; do not treat scratch files as Living SSOT or invent **N19**.

| Document | Purpose | Posture |
|----------|---------|---------|
| [README.md](neon-auth-optimisation/README.md) | Pack posture — N1–N18 complete · no N19 | Scratch |
| [N15-path-to-100-evidence.md](neon-auth-optimisation/N15-path-to-100-evidence.md) | N15 Path-to-100% close ledger | Scratch |
| [1-neon-auth-capability-map-and-dev-roadmap.md](neon-auth-optimisation/1-neon-auth-capability-map-and-dev-roadmap.md) | Capability map + auth/post-login roadmap | Scratch |
| [2-neon-auth-command-cheatsheet.md](neon-auth-optimisation/2-neon-auth-command-cheatsheet.md) | Command cheatsheet (archive candidate) | Scratch |
| [3-neon-auth-execution.command.md](neon-auth-optimisation/3-neon-auth-execution.command.md) | Execution command sheet | Scratch |
| [4-neon-auth-audit.md](neon-auth-optimisation/4-neon-auth-audit.md) | Audit notes | Scratch |
| [5-neon-auth-repair.md](neon-auth-optimisation/5-neon-auth-repair.md) | Repair notes | Scratch |
| [6-neon-auth-slice-card.md](neon-auth-optimisation/6-neon-auth-slice-card.md) | Slice card template | Scratch |
| [7-N1-example.md](neon-auth-optimisation/7-N1-example.md) | N1 slice example | Scratch |
| [8-N4-db-performance.md](neon-auth-optimisation/8-N4-db-performance.md) | N4 db performance notes | Scratch |
| [9-neon-auth-fe-surface-compose-map.md](neon-auth-optimisation/9-neon-auth-fe-surface-compose-map.md) | FE surface compose map (FE-01…FE-15) | Scratch |
| [10-neon-auth-frontend-ui-ux.md](neon-auth-optimisation/10-neon-auth-frontend-ui-ux.md) | Target FE UI/UX blueprint (kept separate from doc 9) | Scratch Target narrative |

### `cursor-prompt/`

| Document | Purpose | Posture |
|----------|---------|---------|
| [cursor-vibe-coding-prompt-guideline.md](cursor-prompt/cursor-vibe-coding-prompt-guideline.md) | Cursor vibe-coding prompt budgets and layering | Scratch — feeds `/cursor-mission-compile` |
| [cursor-mission-compile-guideline.md](cursor-prompt/cursor-mission-compile-guideline.md) | Mission compile worked examples | Scratch — feeds `/cursor-mission-compile` |
| [ui-compose-cursor-vibe-prompt.md](cursor-prompt/ui-compose-cursor-vibe-prompt.md) | UI compose vibe prompt example | Scratch |

### `module-packs/` — provisional 10-MOD ledgers

Folder stubs own the file lists. Packs are discovery + verify ledgers only — **not** Living module SSOT. Promotion requires DOC-001 + MOD-002 path.

| Pack | Index | Focus |
|------|-------|-------|
| Declarations (N17) | [module-packs/declarations/README.md](module-packs/declarations/README.md) | Submit/read evidence under hard tenancy; `DECL-MOD-001`…`010` + `N17-submit-read-evidence.md` |
| FFT (N18) | [module-packs/fft/README.md](module-packs/fft/README.md) | Phase-2A permitted vertical evidence; `N18-fft-permitted-vertical-evidence.md` |

## Rules

- Move durable material out of scratch only via a separate DOC-001 mission with named owner and controlled destination.
- Delete stale scratch when it is confirmed redundant; do not invent archive paths.
- Controlled Afenda-Lite authorities stay under `docs/` Living/Target homes — never cite parked ERP REQ or scratch FFT/Neon packs as Target or APPROVED evidence.
- Tenancy wording: organization-scoped (`organization_id`) — link [ARCH-023](../architecture/ARCH-023-multi-tenancy.md); never claim multi-DB isolation.

## Change log

| Date | Summary |
|------|---------|
| 2026-07-17 | Record N18 APPROVED / N1–N18 complete across neon-auth pack + FFT evidence pointers; add neon-auth-optimisation README |
| 2026-07-17 | Reconciled inventory with disk: added `FFT/`, `module-packs/`, neon-auth `9`/`10`; removed gone paths (`AUDIT-*`, token/compose gap md, HTML previews except aerospace-ceramic, biome-ultracite research); grouped tables + four-slot intro |
| 2026-07-17 | Added `reliance-dx-patterns-xerp-oss-2026-07-17.md` (Xerp/OSS reliance·graph·DX research) |
| 2026-07-17 | Reconciled inventory with disk: neon-auth-optimisation/, cursor-prompt/, HTML previews, token/compose gap md |
| 2026-07-16 | Added `neon-auth-capability-map-and-dev-roadmap.md` (Neon capability map + auth/post-login roadmap) |
| 2026-07-16 | Added `afenda-ui-system-architecture.md` scratch file |
| 2026-07-14 | Parked ERP REQ (OQ-20 scope separation); removed mistaken GUIDE-005 Living header; listed response + audit as historical |
| 2026-07-13 | Defined scratch folder as non-authoritative |
