# ARCH-014 UI Surfaces

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-014     |
| **Category**      | Architecture |
| **Version**       | 2.0.0        |
| **Status**        | Superseded   |
| **Control State** | Closed       |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-14   |

**Superseded by:** [ARCH-012](../ARCH-012-app-router-routes.md) (routes) · [ARCH-015](../ARCH-015-admincn-alignment.md) / [ARCH-018](../ARCH-018-admincn-customization.md) / [ARCH-019](../ARCH-019-admincn-frontend-preflight.md) (Shadcn Studio / AdminCN) · [ui-registry](../../../.cursor/skills/feed-farm-trade/ui-registry.md) (surface IDs)  
**Superseded on:** 2026-07-14  
**Location:** `docs/architecture/archive/`

---

# 1. Purpose

Record that the former Living UI-surface catalogue is **Superseded**. Do not teach ARCH-014 as current architecture SSOT.

---

# 2. Scope

## 2.1 In Scope

- Retirement notice and successor pointers only

## 2.2 Out of Scope

- Maintaining a parallel journey/surface inventory
- Restoring this document to Living under `docs/architecture/`

---

# 3. Deprecation: ARCH-014 UI Surfaces

**Status:** Compulsory — removed from the Living frontend pack 2026-07-14; archived under `docs/architecture/archive/`.

| Former concern | Living / compulsory successor |
|----------------|------------------------------|
| Route / journey inventory | [ARCH-012 App Router Routes](../ARCH-012-app-router-routes.md) |
| AdminCN / Shadcn Studio shell, keep/drop, DNA | [ARCH-015](../ARCH-015-admincn-alignment.md) · [ARCH-018](../ARCH-018-admincn-customization.md) · [ARCH-019](../ARCH-019-admincn-frontend-preflight.md) · skill `/admincn-customization` |
| Compulsory UI surface / block IDs (`ACN-*` / `FFT-UI-*`) | [ui-registry.md](../../../.cursor/skills/feed-farm-trade/ui-registry.md) · [`ui-registry.json`](../../../.cursor/skills/feed-farm-trade/ui-registry.json) · `/feed-farm-trade` |
| Closed client workspace | [deprecation register — Closed product phases](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |
| BFF read/mutate adapters | [ARCH-013](../ARCH-013-bff-and-data-flow.md) |

**Forbidden:** Teaching ARCH-014 as Living; restoring the full surface table into `docs/architecture/`; inventing a parallel ui-registry twin under Architecture docs.

UI work focuses on **Shadcn Studio → AdminCN** primitives/blocks registered in `ui-registry.json`, composed under Target/logical `components-V2` / `features/*` per ARCH-015 — not a separate journey catalogue.

Historical Living body (v1.0.x surface table) is recoverable from git prior to this stub.

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-012 | App Router Routes | Successor — route catalogue |
| ARCH-015 | AdminCN Alignment | Successor — Studio / AdminCN shell |
| ARCH-018 | AdminCN Customization | Successor — Studio playbook |
| ARCH-019 | AdminCN Frontend Preflight | Successor — screen preflight |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 2.0.0 | 2026-07-14 | Superseded; archived. Living surface table removed — successors ARCH-012 + ARCH-015/018/019 + ui-registry (Studio-first). |
| 1.0.3 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees not present and forbidden to recover; Target greenfield via ARCH-028 only. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log; Control State Closed after architecture sync campaign. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

None beyond §3. ID **ARCH-014** is non-recyclable.
