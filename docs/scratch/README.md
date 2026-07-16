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
| [neon-auth-capability-map-and-dev-roadmap.md](neon-auth-capability-map-and-dev-roadmap.md) | Neon platform capability inventory; Afenda pre-login / auth / post-login map; identity development roadmap | Scratch — not Living; cite ARCH-026 / GUIDE-018 as authority |

## Rules

- Move durable material out of scratch only via a separate DOC-001 mission with named owner and controlled destination.
- Delete stale scratch when it is confirmed redundant; do not invent archive paths.
- Controlled Afenda-Lite authorities stay under `docs/` Living/Target homes — never cite parked ERP REQ as Target.

## Change log

| Date | Summary |
|------|---------|
| 2026-07-16 | Added `neon-auth-capability-map-and-dev-roadmap.md` (Neon capability map + auth/post-login roadmap) |
| 2026-07-16 | Added `afenda-ui-system-architecture.md` scratch file |
| 2026-07-14 | Parked ERP REQ (OQ-20 scope separation); removed mistaken GUIDE-005 Living header; listed response + audit as historical |
| 2026-07-13 | Defined scratch folder as non-authoritative |
