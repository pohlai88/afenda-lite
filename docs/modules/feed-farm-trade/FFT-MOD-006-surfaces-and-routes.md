# FFT-MOD-006 Surfaces and Routes

| Field             | Value                    |
| ----------------- | ------------------------ |
| **ID**            | FFT-MOD-006              |
| **Category**      | Module                   |
| **Version**       | 1.3.0 |
| **Status**        | Living                   |
| **Control State** | Closed                 |
| **Owner**         | Feed Farm Trade          |
| **Updated**       | 2026-07-14               |
| **Spine**         | MOD-006 Surfaces and Routes |


---

# 1. Purpose

Map Feed Farm Trade operator surfaces, App Router homes, and thin-page rules.

**Audience:** frontend engineers adding or moving `/fft` routes.
**Action enabled:** place UI under AdminCN with locale-free paths and thin RSC pages.

---

# 2. Scope

## 2.1 In Scope

- Route map and layout/shell rules
- Operator vs client audience entry
- Thin page / BFF alignment for FFT UI

## 2.2 Out of Scope

- Product locks detail → [FFT-MOD-001](FFT-MOD-001-module-architecture.md)
- MVP / phase status → [FFT-MOD-010](FFT-MOD-010-module-docs-index.md)
- Platform-wide route inventory → [ARCH-012](../../architecture/ARCH-012-app-router-routes.md)

---

# 3. Surfaces and Routes

## 3.1 Route map

| Surface | Path | Notes |
|---------|------|-------|
| Trade app | `app/fft/**` | Locale-free product routes |
| Legacy locale | `app/fft/[locale]/[[...path]]` | Redirect shim only |
| Layout | `app/fft/layout.tsx` | `AdminCnShell` |
| RBAC admin | `/fft/admin/rbac` | Control plane |

Canonical inventory: [ARCH-012](../../architecture/ARCH-012-app-router-routes.md).

## 3.2 Layout / shell

- Operator chrome: AdminCN — [ARCH-015](../../architecture/ARCH-015-admincn-alignment.md) · [ARCH-018](../../architecture/ARCH-018-admincn-customization.md).
- UI implementation: `features/fft/*` — **no** `FftShell`.

## 3.3 Client vs operator

| Audience | Entry |
|----------|-------|
| Operator / trade users with `fft.access` | `/fft` |
| Declaration preview client | Not auto on sales allowlist; separate client routes |

## 3.4 Thin page rule

`app/fft/**/page.tsx` stays thin RSC → feature runners / domain. Mutations via Server Actions. Align with [ARCH-013](../../architecture/ARCH-013-bff-and-data-flow.md).

## 3.5 Enterprise requirements

Single-owner ACs for this role. Evidence: [FFT-MOD-009](FFT-MOD-009-verification.md). Standard: [MOD-002](../MOD-002-modules-index.md).

| AC-ID | Profile | Quality Dimension | Applicability | Criterion |
| --- | --- | --- | --- | --- |
| FFT-AC-006-01 | Enterprise Core | CORE-EXPERIENCE | Core | Keyboard, focus, and error announcement cover primary FFT operator journeys. |
| FFT-AC-006-02 | Enterprise Core | CORE-EXPERIENCE | Core | Responsive surfaces and loading/error/empty states exist for core journey routes under locale-free `app/fft/**`. |
| FFT-AC-006-03 | Enterprise Core | CORE-EXPERIENCE | Core | vi/en completeness for FFT-owned UI strings on Core surfaces (no silent missing keys on primary paths). |
| FFT-AC-006-04 | ERP | ERP-LOCALIZATION | Core | Enabled jurisdictions and locales define currency, unit, number, date/time, language, calendar, and statutory presentation behavior with fallback and test coverage. |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| ARCH-012 | App Router Routes | Platform inventory |
| ARCH-013 | BFF and Data Flow | Thin page / Actions |
| ARCH-015 | AdminCN Alignment | Shell |
| FFT-MOD-001 | Module Architecture | Path locks |
| FFT-MOD-008 | Ops Runtime | Access expectations |
| FFT-MOD-009 | Verification | Evidence ledger |
| FFT-MOD-010 | Module Docs Index and Roadmap | Phase surfaces |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 1.3.0 | 2026-07-14 | Executable quality contract: profile/dimension mapping and owned ERP benchmark criteria. |
| 1.2.0   | 2026-07-14 | Wave C: enterprise requirements FFT-AC-006-01…03 (a11y/responsive/i18n). |
| 1.1.0   | 2026-07-14 | DOC-003 six-section retrofit; compact route map. |
| 1.0.1   | 2026-07-14 | Added mandatory Control State header field (Closed). |
| 1.0.0   | 2026-07-13 | Initial spine |

---

# 6. Notes

**Spine role:** MOD-006 Surfaces and Routes — route map + owned enterprise requirements. Evidence rows stay in MOD-009.
