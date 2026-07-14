# ARCH-001 Backend Architecture

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-001     |
| **Category**      | Architecture |
| **Version**       | 1.2.0        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Backend      |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Living **backend entry**: Modular Monolith + Hexagonal posture and where to go next. Pack reading order lives in [`README.md`](README.md#packs-reading-order) (Backend pack) — this doc does not maintain a second index.

**Audience:** engineers choosing adapters, ports, and deploy constraints.  
**Action enabled:** pick the correct sibling ARCH before writing domain or adapters.  
**When NOT to edit:** do not paste [ARCH-013](ARCH-013-bff-and-data-flow.md) trees or [ARCH-010](ARCH-010-backend-conventions.md) deploy matrices here; do not reopen ARCH-023 R*/D*.

---

# 2. Scope

## 2.1 In Scope

- Backend framework posture (pointer to system SSOT)
- Entry pointers to Backend pack authorities
- Alignment table (topic → sole authority)

## 2.2 Out of Scope

- Frontend route maps ([ARCH-002](ARCH-002-frontend-architecture.md) pack)
- Target slice execution ([ARCH-028](ARCH-028-implementation-slices.md))
- Module product locks (FFT-MOD)
- Full Vercel / env matrices ([ARCH-010](ARCH-010-backend-conventions.md) · [ARCH-027](ARCH-027-env-model.md))
- Recovering Collapse-era product trees ([ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Backend Architecture

**Framework:** Next.js App Router Modular Monolith + Hexagonal — [ARCH-022](ARCH-022-system-overview.md).  
**Contracts:** one port catalog + one REST catalog; Actions and Route Handlers adapt the same ports.  
**Skill (not authority):** [afenda-elite-backend-modules](../../.cursor/skills/afenda-elite-backend-modules/SKILL.md).

**Read next:** Backend pack in [`README.md`](README.md#backend-hexagon) — typically ARCH-004 → 005 → 008 → 006/007 → 009 → **010** (deploy SSOT) → data tree **013** (link only).

## Alignment (must not diverge)

| Topic | Authority |
|-------|-----------|
| Data decision tree | [ARCH-013](ARCH-013-bff-and-data-flow.md) only |
| Adapter role ↔ primitive | [ARCH-008](ARCH-008-next-js-adapter-map.md) |
| Vercel / Node / Neon proximity | [ARCH-010](ARCH-010-backend-conventions.md) |
| REST | [REST-001](../api/REST-001-rest-resources.md) |
| Errors / types / schemas | [API-002](../api/API-002-error-contract.md) · [API-003](../api/API-003-api-types.md) · [API-004](../api/API-004-schema-map.md) |
| Tenancy / IAM | [ARCH-023](ARCH-023-multi-tenancy.md) |
| Env (Target) | [ARCH-027](ARCH-027-env-model.md) |

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-022 | System Overview | Framework SSOT |
| README | architecture packs | Reading order |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.2.0 | 2026-07-14 | Consolidate: utilization trio; drop duplicate How-to-read/Index (pack README owns order); pointer-only Alignment. |
| 1.1.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.1.0 | 2026-07-14 | Index hygiene; Alignment to ARCH-008/010/013. |
| 1.0.3 | 2026-07-14 | Checkout posture / Collapse contamination ban. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root `app/`, `modules/`, `features/`, `components-V2/` are **absent** after Collapse (`4680c91`) and **forbidden** to recover — [ARCH-028](ARCH-028-implementation-slices.md).
- Paths here are a **logical Living map**. Forward product code only under Target (`apps/web/**`, `packages/*`) after explicit ARCH-028 implement — never as a restore of banned roots.
