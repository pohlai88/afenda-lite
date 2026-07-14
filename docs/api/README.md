# API / REST / OPEN — docs entry

| Field | Value |
|-------|-------|
| Surface | `docs/api/` |
| Mode | Navigation |
| Audience | Backend and frontend maintainers |
| Updated | 2026-07-13 |

This file is **navigation only**. It does not establish architecture, contracts, or program order.

| Role | Document | Use for |
|------|----------|---------|
| Parent architecture | [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) | Principles, trust boundaries, Accept / Reject |
| Development order (locked) | [GUIDE-015](guides/GUIDE-015-interface-pack-development-roadmap.md) | Phases 1–5 create/revise sequence (Jack Wee) |
| Register | [DOC-002](../_control/DOC-002-documentation-register.md) | ID existence, version, status |
| Control | [DOC-001](../_control/DOC-001-documentation-control-standard.md) | Categories, lifecycle, naming |

OpenAPI machine file: [`OPEN-001-openapi.yaml`](OPEN-001-openapi.yaml) (`npm run openapi:generate`). Skill mirror: [`.cursor/skills/afenda-elite-api-contract/`](../../.cursor/skills/afenda-elite-api-contract/SKILL.md) — follows these docs (ARCH-029 · GUIDE-015 · Living Phase 1), never the reverse. After Living contract edits: `npm run check:doc-integrity` · `node scripts/check-docs-naming.mjs docs/api` · `npm run check:openapi`.

---

## Reading sequence (avoid misalignment)

Read in this order when joining the pack or resolving a conflict. Do **not** start from Draft placeholders or how-to guides.

| Step | Read | Why |
|------|------|-----|
| 1 | [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) | Living parent authority — surfaces, security pipeline, compatibility, change gate |
| 2 | [GUIDE-015](guides/GUIDE-015-interface-pack-development-roadmap.md) | Locked program order — what to create/refine next |
| 3 | Phase 1 Living contracts (below) | Executable rules that implement ARCH-029 |
| 4 | Domain / module catalogues you need | REST-00N or FFT-REST-001 only for the surface you touch |
| 5 | Phase 2 contracts if relevant | Only when the cross-cutting topic is in scope (still Draft until promoted) |
| 6 | Guides / runbooks | How to implement or operate — never override Living contracts |

**Conflict rule:** ARCH-029 wins on architecture. Living `API-*` / `REST-*` / `OPEN-*` win on executable contract detail. GUIDE-015 wins on create/revise order. Guides and runbooks never redefine those.

**Do not treat as SSOT:** this README, Draft placeholders, skill mirrors, generated OpenAPI alone, or Accept/Reject lists copied into chats.

---

## Dossier map

| Folder / surface | Holds | Does not hold |
|------------------|-------|---------------|
| `docs/architecture/ARCH-029-*.md` | Parent interface / API architecture | Route catalogues, Zod recipes |
| `docs/api/API-*.md` | Cross-cutting BFF contracts (Actions + HTTP vocabulary) | Module resource inventories |
| `docs/api/REST-*.md` | REST standards + domain path catalogues | OpenAPI generation steps |
| `docs/modules/feed-farm-trade/FFT-REST-*.md` | FFT module REST index (and gated children) | Platform-wide REST standards |
| `docs/api/OPEN-*.md` + `OPEN-001-openapi.yaml` | OpenAPI governance + machine export | Architecture principles |
| `docs/api/guides/` | Implementation / verification how-tos | Architecture or contract SSOT |
| `docs/api/runbooks/` | Drift, incident, rollback ops (RB-006…008) | Platform tenancy ops (those stay in `docs/runbooks/`) |
| `docs/_control/` | DOC-001…003 governance | Product API rules |

### Prefix map

| Prefix | Owns |
|--------|------|
| **API-** | Cross-cutting BFF (Actions + HTTP vocabulary) |
| **REST-** | Human REST standards + domain path catalogues |
| **FFT-REST-** | Feed Farm Trade module-owned REST catalogues |
| **OPEN-** | OpenAPI machine exports / governance |
| **GUIDE-** | Implementation / verification how-tos (`guides/`) |
| **RB-** | Operational procedures (`runbooks/` in this pack for RB-006…008) |

---

## Catalogue by GUIDE-015 phase

Development/create order is locked in [GUIDE-015](guides/GUIDE-015-interface-pack-development-roadmap.md). Tables below are an index only — do not reorder phases here.

### Phase 1 — Governance (Living; read after ARCH-029)

| Doc | Use when |
|-----|----------|
| [API-001](API-001-api-boundaries.md) | Adapter + security pipeline |
| [API-002](API-002-error-contract.md) | Failure shapes |
| [API-003](API-003-api-types.md) | Brands, Input/Output, types |
| [API-004](API-004-schema-map.md) | Zod ownership |
| [REST-001](REST-001-rest-resources.md) | REST standards + index |
| [OPEN-001](OPEN-001-openapi.md) | OpenAPI governance |

### Phase 2 — Cross-cutting contracts (Draft)

| Doc |
|-----|
| [API-005](API-005-authentication-authorization-contract.md) |
| [API-006](API-006-idempotency-concurrency-contract.md) |
| [API-007](API-007-api-observability-correlation-contract.md) |
| [API-008](API-008-collection-query-contract.md) |
| [API-009](API-009-compatibility-deprecation-contract.md) |

### Phase 3 — Resource families (Draft; expand on demand)

| Doc |
|-----|
| [REST-002](REST-002-identity-organization-resources.md) |
| [REST-003](REST-003-client-resources.md) |
| [REST-004](REST-004-declaration-resources.md) |
| [REST-005](REST-005-assignment-submission-resources.md) |
| [REST-006](REST-006-public-survey-secure-link-resources.md) |
| [REST-007](REST-007-account-resources.md) (gated) |

### Phase 4 — Module APIs

| Doc | Rule |
|-----|------|
| [FFT-REST-001](../modules/feed-farm-trade/FFT-REST-001-feed-farm-trade-resource-index.md) | Index first; derive FFT-REST-002…007 only when gates open |

### Phase 5 — Ops and implementation guides

| Need | Doc |
|------|-----|
| Guides index | [guides/README.md](guides/README.md) |
| OpenAPI generate | [GUIDE-011](guides/GUIDE-011-generating-and-validating-openapi.md) |
| API testing | [GUIDE-012](guides/GUIDE-012-testing-api-contracts.md) |
| Verification standard | [GUIDE-014](guides/GUIDE-014-api-contract-verification-standard.md) |
| Security checklist | [GUIDE-013](guides/GUIDE-013-api-security-review-checklist.md) |
| Runbooks index | [runbooks/README.md](runbooks/README.md) |
| Incident | [RB-007](runbooks/RB-007-api-incident-response.md) |
| Rollback | [RB-008](runbooks/RB-008-api-contract-rollback.md) |
| OpenAPI drift | [RB-006](runbooks/RB-006-openapi-drift-detection-recovery.md) |

---

## Related (outside this pack)

| Doc | Why |
|-----|-----|
| [ARCH-013](../architecture/ARCH-013-bff-and-data-flow.md) | BFF / data-flow context |
| [ARCH-010](../architecture/ARCH-010-backend-conventions.md) | Backend conventions |
| Accept / Reject decisions | Living in [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) — not duplicated here |
