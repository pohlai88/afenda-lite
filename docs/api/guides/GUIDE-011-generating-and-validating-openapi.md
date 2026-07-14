# GUIDE-011 Generating and Validating OpenAPI

| Field        | Value      |
| ------------ | ---------- |
| **ID**       | GUIDE-011  |
| **Category** | Guide      |
| **Version**  | 0.1.3      |
| **Status**   | Draft      |
| **Control State** | Closed     |
| **Owner**    | Backend    |
| **Updated**  | 2026-07-14 |
---

# 1. Purpose

This guide holds OpenAPI **implementation** instructions (generate, validate, Fumadocs wire, troubleshooting) so [OPEN-001](../OPEN-001-openapi.md) remains governance-only.

**Placeholder.** Formerly drafted as GUIDE-007; ID aligned to the interface-guide set under `docs/api/guides/`.

---

# 2. Scope

## 2.1 In Scope

- generator commands;
- package use;
- Fumadocs integration;
- local development;
- Spectral / lint validation;
- troubleshooting;
- coordination with [RB-006](../runbooks/RB-006-openapi-drift-detection-recovery.md).

## 2.2 Out of Scope

- OpenAPI governance and authority chain ([OPEN-001](../OPEN-001-openapi.md));
- Splitting OPEN-002…005 (deferred);
- REST path catalogue authoring ([GUIDE-009](GUIDE-009-adding-a-rest-resource.md)).

---

# 3. Generating and Validating OpenAPI

> **Status:** Placeholder — move recipes out of OPEN-001 into this guide when refining.

| Topic | Planned content |
| ----- | --------------- |
| Generate | `pnpm openapi:generate` (env names only) |
| Validate | Spectral / `check:openapi` |
| Packages | Zod → OpenAPI toolchain |
| Fumadocs | How published OAS is consumed |
| Local loop | Expected outputs, regenerate, diff |
| Drift | Escalate to RB-006 when release-blocking |

Until Living, follow generate notes in [OPEN-001](../OPEN-001-openapi.md).

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| ARCH-029 | Interface and API Architecture | Parent architecture |
| OPEN-001 | OpenAPI | Governance SSOT |
| REST-001 | REST Standards and Resource Index | Path source |
| API-004 | Schema Map | Zod ownership |
| RB-006 | OpenAPI Drift Detection and Recovery | Ops recovery (Draft) |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1.3 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` (repo SSOT `packageManager` + `pnpm-lock.yaml`). |
| 0.1.2 | 2026-07-14 | RB-006 link → `docs/api/runbooks/`. |
| 0.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 0.1.0 | 2026-07-13 | Draft under `docs/api/guides/`; supersedes prior GUIDE-007 OpenAPI placeholder path. |

---

# 6. Notes

**Deferred OPEN splits:** OPEN-002…005 — only when consumers, security models, independent releases, or unsafe size require it.

**ID history:** OpenAPI recipes were briefly registered as GUIDE-007; GUIDE-007 is now Implementing a Server Action. Use **GUIDE-011** for OpenAPI generate/validate.
