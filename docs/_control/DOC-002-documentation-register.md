# DOC-002 Documentation Register

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | DOC-002    |
| **Category**      | Control    |
| **Version**       | 4.158.0 |
| **Status**        | Living     |
| **Control State** | Closed     |
| **Owner**         | Platform   |
| **Updated**       | 2026-07-18 |


---

# 1. Purpose

This document is the controlled catalogue of authoritative documents for this Afenda checkout (Afenda-Lite).

The catalogue shape is shared with Afenda-Elite: seven register fields, the same categories and lifecycle, and governance from [DOC-001](DOC-001-documentation-control-standard.md). Lite is the beta edition; Elite is the battle-proven edition — not a second documentation system.

It records only the metadata needed to confirm:

- whether a document exists;
- which version is current;
- who owns it; and
- whether it remains authoritative.

The register is governed by [DOC-001 Documentation Control Standard](DOC-001-documentation-control-standard.md).

---

# 2. Scope

## 2.1 In Scope

This register includes controlled documents whose IDs have been explicitly approved.

Each row contains exactly:

- ID;
- Category;
- Title;
- Version;
- Status;
- Owner; and
- Updated date.

## 2.2 Out of Scope

This register does not contain:

- file paths;
- slugs;
- tags;
- keywords;
- priorities;
- supersession relationships;
- implementation progress; or
- unapproved provisional documents.

## 2.3 Allocation Gate

A new document row shall not be added unless the user has explicitly approved the document ID.

Agents may propose a candidate ID, but shall not invent, reuse, or commit an ID without approval.

---

# 3. Register

| ID           | Category     | Title                                      | Version | Status | Owner    | Updated    |
| ------------ | ------------ | ------------------------------------------ | ------- | ------ | -------- | ---------- |
| DOC-001      | Control      | Documentation Control Standard             | 2.7.0   | Living | Platform | 2026-07-14 |
| DOC-002      | Control      | Documentation Register                     | 4.158.0 | Living | Platform | 2026-07-18 |
| DOC-003      | Control      | Controlled Document Template               | 1.4.0   | Living | Platform | 2026-07-14 |
| ARCH-029     | Architecture | Interface and API Architecture             | 1.2.7   | Living | Platform | 2026-07-14 |
| ARCH-031     | Architecture | Technology Stack Catalogue                 | 1.4.0   | Living | Platform | 2026-07-17 |
| API-001      | API          | API Boundaries                             | 1.2.3   | Living | Backend  | 2026-07-14 |
| API-002      | API          | Error Contract                             | 1.2.2   | Living | Backend  | 2026-07-14 |
| API-003      | API          | API Types                                  | 2.0.1   | Living | Backend  | 2026-07-14 |
| API-004      | API          | Schema Map                                 | 1.1.6   | Living | Backend  | 2026-07-15 |
| API-005      | API          | Authentication and Authorization Contract  | 0.1.1   | Draft  | Platform | 2026-07-14 |
| API-006      | API          | Idempotency and Concurrency Contract       | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| API-007      | API          | API Observability and Correlation Contract | 1.0.0   | Living | Backend  | 2026-07-17 |
| API-008      | API          | Collection Query Contract                  | 0.1.2   | Draft  | Backend  | 2026-07-14 |
| API-009      | API          | Compatibility and Deprecation Contract     | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-001     | REST         | REST Resources                             | 2.0.1   | Living | Backend  | 2026-07-14 |
| REST-002     | REST         | Identity and Organization Resources        | 0.1.1   | Draft  | Platform | 2026-07-14 |
| REST-003     | REST         | Client Resources                           | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-004     | REST         | Declaration Resources                      | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-005     | REST         | Assignment and Submission Resources        | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-006     | REST         | Public Survey and Secure-Link Resources    | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| REST-007     | REST         | Account Resources                          | 0.1.1   | Draft  | Platform | 2026-07-14 |
| FFT-REST-001 | REST         | Feed Farm Trade Resource Index             | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| OPEN-001     | OPEN         | OpenAPI                                    | 1.1.8   | Living | Backend  | 2026-07-15 |
| GUIDE-007    | Guide        | Implementing a Server Action               | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-008    | Guide        | Implementing a Route Handler               | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-009    | Guide        | Adding a REST Resource                     | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-010    | Guide        | Adding a Zod Contract                      | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-011    | Guide        | Generating and Validating OpenAPI          | 0.1.3   | Draft  | Backend  | 2026-07-14 |
| GUIDE-012    | Guide        | Testing API Contracts                      | 0.1.2   | Draft  | Backend  | 2026-07-14 |
| GUIDE-013    | Guide        | API Security Review Checklist              | 0.1.1   | Draft  | Platform | 2026-07-14 |
| GUIDE-014    | Guide        | API Contract Verification Standard         | 0.1.1   | Draft  | Backend  | 2026-07-14 |
| GUIDE-015    | Guide        | Interface Pack Development Roadmap         | 1.0.2   | Living | Platform | 2026-07-14 |
| GUIDE-016    | Guide        | Feed Farm Trade Enterprise Acceptance      | 0.2.0   | Retired | Feed Farm Trade | 2026-07-14 |
| GUIDE-017    | Guide        | Enterprise Quality and Evidence Standard   | 1.0.2   | Living | Platform | 2026-07-17 |
| GUIDE-018    | Guide        | Full-Stack End-to-End Integration Program  | 1.0.13  | Living | Platform | 2026-07-17 |
| RB-006       | Runbook      | OpenAPI Drift Detection and Recovery       | 0.2.1   | Draft  | Backend  | 2026-07-14 |
| RB-007       | Runbook      | API Incident Response                      | 0.2.0   | Draft  | Backend  | 2026-07-14 |
| RB-008       | Runbook      | API Contract Rollback                      | 0.2.1   | Draft  | Backend  | 2026-07-14 |
| ARCH-022     | Architecture | System Overview — Turborepo                | 1.6.10  | Living | Platform | 2026-07-17 |
| ARCH-023     | Architecture | Multi-Tenancy and Platform RBAC            | 3.1.7   | Living | Platform | 2026-07-17 |
| ARCH-024     | Architecture | Package Boundaries                         | 1.7.2   | Living | Platform | 2026-07-17 |
| ARCH-025     | Architecture | Data Layer                                 | 1.3.4   | Living | Backend  | 2026-07-17 |
| ARCH-026     | Architecture | Authentication and Session Model           | 2.1.0   | Living | Platform | 2026-07-18 |
| ARCH-027     | Architecture | Environment Variable Model                 | 1.6.5   | Living | Platform | 2026-07-16 |
| ARCH-028     | Architecture | Turborepo Implementation Slices            | 1.5.6   | Living | Platform | 2026-07-17 |
| ARCH-001     | Architecture | Backend Architecture                       | 1.2.0   | Living | Backend  | 2026-07-14 |
| ARCH-002     | Architecture | Frontend Architecture                      | 1.3.4   | Living | Frontend | 2026-07-15 |
| ADR-008      | ADR          | Cache Components Mode B (Gated)            | 1.0.1   | Accepted | Frontend | 2026-07-14 |
| ADR-009      | ADR          | `@afenda/ui` Playground Gateway as the Sole Public UI Import Surface | 1.1.0   | Superseded | Platform | 2026-07-16 |
| ADR-010      | ADR          | `@afenda/ui-system` Flat-Barrel Radix Design System | 1.1.0   | Accepted | Platform | 2026-07-17 |
| ARCH-003     | Architecture | Multi-tenant Ecosystem                     | 2.1.1   | Superseded | Platform | 2026-07-14 |
| ARCH-004     | Architecture | Backend Layers                             | 1.1.1   | Living | Backend  | 2026-07-14 |
| ARCH-005     | Architecture | Backend Folder Map                         | 1.1.4   | Living | Backend  | 2026-07-15 |
| ARCH-006     | Architecture | Bounded Contexts                           | 1.1.1   | Living | Backend  | 2026-07-14 |
| ARCH-007     | Architecture | Ports and Adapters                         | 1.2.0   | Living | Backend  | 2026-07-14 |
| ARCH-008     | Architecture | Next.js Adapter Map                        | 1.3.0   | Living | Backend  | 2026-07-14 |
| ARCH-009     | Architecture | Modules Ownership Map                      | 1.1.5   | Living | Backend  | 2026-07-16 |
| ARCH-010     | Architecture | Backend Conventions                        | 1.3.0   | Living | Backend  | 2026-07-14 |
| ARCH-012     | Architecture | App Router Routes                          | 1.2.9   | Living | Frontend | 2026-07-18 |
| ARCH-013     | Architecture | BFF and Data Flow                          | 1.1.3   | Living | Frontend | 2026-07-14 |
| ARCH-014     | Architecture | UI Surfaces                                | 2.0.0   | Superseded | Frontend | 2026-07-14 |
| ARCH-015     | Architecture | Shadcn Studio / AdminCN Alignment          | 2.0.4   | Living | Frontend | 2026-07-16 |
| ARCH-016     | Architecture | Next.js Conventions                        | 1.2.3   | Living | Frontend | 2026-07-14 |
| ARCH-017     | Architecture | Frontend Folder Map                        | 2.0.4   | Living | Frontend | 2026-07-16 |
| ARCH-018     | Architecture | AdminCN Customization                      | 1.1.7   | Living | Frontend | 2026-07-16 |
| ARCH-019     | Architecture | AdminCN Frontend Preflight                 | 1.1.7   | Living | Frontend | 2026-07-16 |
| ARCH-020     | Architecture | Closed Scope Register                      | 2.0.1   | Superseded | Platform | 2026-07-14 |
| ARCH-021     | Architecture | Repository Migration Map                   | 2.0.2   | Superseded | Platform | 2026-07-14 |
| FFT-MOD-001  | Module       | Module Architecture                        | 2.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-002  | Module       | Domain and Ownership                       | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-003  | Module       | Tech Stack                                 | 1.3.2 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-004  | Module       | Data Model                                 | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-005  | Module       | Auth, Tenancy and RBAC                     | 1.3.1 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-006  | Module       | Surfaces and Routes                        | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-007  | Module       | API and Adapters                           | 1.3.0 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-008  | Module       | Ops Runtime                                | 1.3.2 | Living | Feed Farm Trade | 2026-07-14 |
| FFT-MOD-009  | Module       | Verification                               | 2.1.0 | Living | Feed Farm Trade | 2026-07-17 |
| FFT-MOD-010  | Module       | Module Docs Index + Roadmap                | 2.5.0 | Living | Feed Farm Trade | 2026-07-17 |
| GUIDE-001    | Guide        | Engineering Docs Entry                     | 1.2.0   | Retired | Platform | 2026-07-14 |
| GUIDE-002    | Guide        | Coding Engineering Guide                   | 1.2.0   | Retired | Platform | 2026-07-14 |
| GUIDE-003    | Guide        | Engineering Documentation Workflow         | 1.3.0   | Retired | Platform | 2026-07-14 |
| GUIDE-004    | Guide        | Engineering Drift Register                 | 1.4.0   | Retired | Platform | 2026-07-14 |
| GUIDE-006    | Guide        | Guides Index                               | 1.8.0   | Retired | Platform | 2026-07-14 |
| MOD-002      | Module       | Modules Index                              | 4.0.3 | Living | Platform | 2026-07-17 |
| RB-001       | Runbook      | Multi-org Ops                              | 1.4.1   | Living | Platform | 2026-07-17 |
| RB-005       | Runbook      | Post-lock Coding Cheat Sheet               | 1.2.0   | Living | Platform | 2026-07-17 |

---

# 4. References

| ID      | Title                          | Relationship                                      |
| ------- | ------------------------------ | ------------------------------------------------- |
| DOC-001 | Documentation Control Standard | Governs this register                             |
| DOC-003 | Documentation Structure Standard | Header and section shape                        |
---

# 5. Change Log

| Version | Date       | Summary                                                                                                                                         |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.158.0 | 2026-07-18 | ARCH-026→2.1.0 honesty repair: Auth presentation = Neon Path A (SDK + own UI) or Path B (Auth UI); remove misleading Auth-UI-only lock; DOC-002 self-row synced. |
| 4.157.0 | 2026-07-18 | ARCH-012→1.2.9 §3.12 proxy matcher honesty (`/admin/*` · Pre-Login API bypass · document-nav vs API-002); DOC-002 self-row synced. |
| 4.156.0 | 2026-07-17 | GUIDE-018→1.0.13 **I6.3 DONE** (Deploy · Vercel READY · Neon Auth domains) · GUIDE-017→1.0.2 (deploy-health blocker cleared; claim stays **NOT READY**); Phase I6 **DONE**; next Ops = **I7.1**; DOC-002 self-row synced. |
| 4.155.0 | 2026-07-17 | GUIDE-017→1.0.1 · GUIDE-018→1.0.12 **I6.2 DONE** (claim identity **NOT READY** @ `fc16109`); Phase I6 stays WAIT (I6.3); next Ops = **I6.3**; DOC-002 self-row synced. |
| 4.154.0 | 2026-07-17 | GUIDE-018→1.0.11 **I6.1 DONE** (FFT-MOD-009→2.1.0 · FFT-MOD-010→2.5.0 · MOD-002→4.0.3 pack gaps); Phase I6 stays WAIT; no GUIDE-017 READY; DOC-002 self-row synced. |
| 4.153.0 | 2026-07-17 | GUIDE-018→1.0.10 **Phase I5 DONE** (invite pre-Neon audit · I5.3 API-007 Living correlation); API-007→1.0.0 Living; next Ops = **I6+**; no GUIDE-017 READY; DOC-002 self-row synced. |
| 4.152.0 | 2026-07-17 | GUIDE-018→1.0.8 **I5.5 residual repair** (`protect:main` · in-CI secrets-presence · stale `journey` removed); Phase I5 stays WAIT; next Ops = **I6+**; DOC-002 self-row synced. |
| 4.151.0 | 2026-07-17 | GUIDE-018→1.0.7 **I5.4 residual close** (A11Y03 axe/skip-link PASS · PERF01 Google CWV lab adopted); Phase I5 stays WAIT; next Ops = **I6+**; DOC-002 self-row synced. |
| 4.150.0 | 2026-07-17 | GUIDE-018→1.0.6 **I5.6 DONE** (accidental-complexity cuts · behavior unchanged · turbo green); Phase I5 stays WAIT (I5.3 BLOCKED + named residuals); next Ops = **I6+**; DOC-002 self-row synced. |
| 4.149.0 | 2026-07-17 | GUIDE-018→1.0.5 **I5.5 DONE** (Deploy after CI · quality DB fail-closed · factory secrets audit; `protect:main` / in-CI `gh secret list` residuals **BLOCKED**); next Ops = **I5.6**; DOC-002 self-row synced. |
| 4.148.0 | 2026-07-17 | GUIDE-018→1.0.4 **I5.1 DONE** (isolation/secrets/unsafe-error closed; invite-audit attribution residual **BLOCKED**); next Ops = **I5.5** then I5.6; DOC-002 self-row synced. |
| 4.147.0 | 2026-07-17 | GUIDE-018→1.0.3 **I5.4 DONE** (UX/a11y/i18n/perf criteria matrix + owners; FE CWV NOT EVIDENCED · multi-locale N/A); next Ops = **I5.1** then I5.5–I5.6; DOC-002 self-row synced. |
| 4.146.0 | 2026-07-17 | GUIDE-018→1.0.2 **I5.2 DONE** + **I5.3 BLOCKED** (restore/RPO/RTO · N4 alert→RB-001 §3.7b · correlation blockers named) · RB-001→1.4.1; next Ops = **I5.1** then I5.4–I5.6; DOC-002 self-row synced. |
| 4.145.0 | 2026-07-17 | GUIDE-018→1.0.1 I5.3 **BLOCKED** (N4 alert→RB-001 §3.7b; correlation blockers named) · RB-001→1.4.1; next Ops = **I5.1**; DOC-002 self-row synced. |
| 4.144.0 | 2026-07-17 | GUIDE-018→**1.0.0 Living** (Draft→Living after I1–I4 closed; I3.4 cut B waived); next Ops = **I5** then I6+; DOC-002 self-row synced. |
| 4.143.0 | 2026-07-17 | GUIDE-018→0.3.19 I4 DONE (adverse matrix A1–A11 · standing CI `e2e-smoke`); next Ops = **I5** then I6+; Status stays Draft; DOC-002 self-row synced. |
| 4.142.0 | 2026-07-17 | Binding: GUIDE-018 I3.4 DONE (cut A) · cut B AdminCN **waived this chat**; Phase I3 DONE; register→0.3.19; corrects 4.139–4.141 PARTIAL claims; next Ops = **I4** then I5+; Status stays Draft; DOC-002 self-row synced. |
| 4.141.0 | 2026-07-17 | Incorrectly reasserted I3.4 PARTIAL / cut B WAIT against this-chat waiver — **corrected by 4.142.0**. |
| 4.140.0 | 2026-07-17 | GUIDE-018 I3.4 DONE / cut B waived (this chat) — momentarily disputed by 4.141.0; restored by 4.142.0. |
| 4.139.0 | 2026-07-17 | Corrects 4.138.0 false claim: GUIDE-018→0.3.18 I3.4 cut A ON DISK · cut B AdminCN WAIT · I3.4 not DONE; next Ops = I3.4 cut B / I4; Status stays Draft; DOC-002 self-row synced. |
| 4.138.0 | 2026-07-17 | Erroneous: GUIDE-018 I3.4 DONE / cut B waived — **corrected by 4.139.0 / 4.141.0**. |
| 4.137.0 | 2026-07-17 | GUIDE-018→0.3.18 I3.4 cut A ON DISK (member-directory); cut B AdminCN WAIT; I3.4 not DONE; next Ops = I3.4 cut B / I4; Status stays Draft; DOC-002 self-row synced. |
| 4.136.0 | 2026-07-17 | GUIDE-018→0.3.17 Docs-lane sync: I3.2←N17 · I3.3←N18 DONE; next Ops = I3.4 / I4 then I5+; Status stays Draft; DOC-002 self-row synced. |
| 4.135.0 | 2026-07-17 | N15 Path-to-100%: ARCH-026→2.0.1 (trusted-domain/deploy ops honesty; collapsed configure no longer live); DOC-002 self-row synced. |
| 4.134.0 | 2026-07-17 | N15 Production ops: RB-001→1.4.0 · RB-005→1.2.0 (trusted domains · deploy health · live validate honesty); DOC-002 self-row synced. |
| 4.133.0 | 2026-07-17 | Neon Auth mail lock: ARCH-026→2.0.0 (Zoho SMTP via Neon Auth console) · ARCH-031→1.4.0 · ARCH-028→1.5.6 · GUIDE-018→0.3.16; DOC-002 self-row synced. |
| 4.132.0 | 2026-07-17 | I3.1 audit repair: GUIDE-018→0.3.15 · ARCH-022→1.6.10 · ARCH-026→1.3.11 · ARCH-028→1.5.5; next Ops = I3.2; DOC-002 self-row synced. |
| 4.131.0 | 2026-07-17 | N4 Path-to-100%: RB-001→1.3.2 (org-index inventory = living 11/11 public tables); DOC-002 self-row synced. |
| 4.130.0 | 2026-07-17 | Housekeeping graph honesty: ARCH-024→1.7.2 (`auth`→`env`; emails not a current web runtime dep); DOC-002 self-row synced. |
| 4.129.0 | 2026-07-17 | Housekeeping drift align: ARCH-024→1.7.1 · ARCH-028→1.5.4 · GUIDE-018→0.3.14 after Slice D removed orphan `list-surveys.ts`; DOC-002 self-row synced. |
| 4.128.0 | 2026-07-17 | ERP token families Living docs: ADR-010→1.1.0 · ARCH-024→1.7.0 (19 shipped families cited to `tokens.css`); DOC-002 self-row synced. |
| 4.127.0 | 2026-07-17 | N4 alert repair: RB-001→1.3.1; DOC-002 self-row synced. |
| 4.126.0 | 2026-07-17 | N4 DB performance baseline: ARCH-025→1.3.4 · RB-001→1.3.0; DOC-002 self-row synced. |
| 4.125.0 | 2026-07-17 | N3 audit Path-to-100%: ARCH-023→3.1.7 (drill executed) · RB-001→1.2.2 (five-day snapshot inventory); DOC-002 self-row synced. |
| 4.124.0 | 2026-07-17 | N3 recovery evidence: RB-001→1.2.0 · ARCH-023→3.1.6 · ARCH-025→1.3.3; DOC-002 self-row synced. |
| 4.123.0 | 2026-07-16 | N1 audit repair: ARCH-027 → 1.6.5 (Neon product contract keys aligned with `packages/env/neon-contract.ts`); DOC-002 self-row synced. |
| 4.122.0 | 2026-07-16 | ADR-010 skill-retirement + anchor follow-through: repointed retired `/admincn-customization` method references (ARCH-015 → 2.0.4 · ARCH-017 → 2.0.4) to `@afenda/ui-system` barrel + `/afenda-elite-frontend-scaffold`; fixed dangling `@afenda/ui/playground` / `#afendaui` disambiguation links to `#afendaui-system` and repointed stale current-state `@afenda/ui` / `packages/design-system` references (ARCH-012 → 1.2.8 · ARCH-027 → 1.6.4 · ARCH-009 → 1.1.5 · ARCH-022 → 1.6.9 · ARCH-018 → 1.1.7 · ARCH-019 → 1.1.7 Studio-DNA promote-target example). |
| 4.121.0 | 2026-07-16 | Registered ADR-010 → 1.0.0 Accepted (`@afenda/ui-system` flat-barrel Radix design system); ADR-009 → 1.1.0 Superseded (`@afenda/ui` playground gateway retired); ARCH-024 + ARCH-031 repointed to `@afenda/ui-system`; `packages/design-system` deleted; deprecation register + skills router updated. User-approved ADR-010 ID this turn per DOC-001 §3.2. |
| 4.120.0 | 2026-07-15 | I2.4 audit resolve: API-004→1.1.6 (Zod→OpenAPI arrow honesty); DOC-002 self-row synced. |
| 4.119.0 | 2026-07-15 | I2.4 audit repair: OPEN-001→1.1.8 (Zod handoff landed) · API-004→1.1.5 (draft/health Target-on-disk); DOC-002 self-row synced. |
| 4.118.0 | 2026-07-15 | I2.4 audit repair: GUIDE-018→0.3.13 · ARCH-022→1.6.8 · ARCH-026→1.3.10 · ARCH-028→1.5.3; next Ops = I3.1; DOC-002 self-row synced. |
| 4.117.0 | 2026-07-15 | I2.3 residual disposition: GUIDE-018→0.3.12 (E2E→I4 · clients.invite→I3.1 · Change Log history non-SSOT); DOC-002 self-row synced. |
| 4.116.0 | 2026-07-15 | I2.3 documentation-audit repair: ARCH-022→1.6.7 · ARCH-028→1.5.2 · ARCH-005→1.1.4 next-pointer/path honesty; next Ops = I2.4; DOC-002 self-row synced. |
| 4.115.0 | 2026-07-15 | I2.3 closed: GUIDE-018→0.3.11 · ARCH-026→1.3.9; invite + hard-org audit write; next Ops = I2.4; DOC-002 self-row synced. |
| 4.114.0 | 2026-07-15 | Residual STRUCTURE-DRIFT close: ARCH-022→1.6.6 · ARCH-025→1.3.1 · ARCH-026→1.3.8 · ARCH-027→1.6.3 · ARCH-028→1.5.1 DOC-003 six-section retrofit; grandfather cleared; DOC-002 self-row synced. |
| 4.113.0 | 2026-07-15 | I2.2 audit repair: GUIDE-018→0.3.10 · ARCH-024→1.5.2 · ARCH-026→1.3.7; next Ops = I2.3; DOC-002 self-row synced. |
| 4.112.0 | 2026-07-15 | I2.1 audit follow-through: ARCH-009→1.1.4 (action-result / invite schema honesty); DOC-002 self-row synced. |
| 4.111.0 | 2026-07-15 | I2.1 audit repair: GUIDE-018→0.3.9 · ARCH-026→1.3.6 · ARCH-005→1.1.3 · API-004→1.1.4; next Ops = I2.2; DOC-002 self-row synced. |
| 4.110.0 | 2026-07-15 | I1.4 register sync: GUIDE-018→0.3.8 · ARCH-026→1.3.5; Phase I1 DONE; next Ops = I2.1; DOC-002 self-row synced. |
| 4.109.0 | 2026-07-15 | Register-only: GUIDE-018 → 0.3.7 (header already at 0.3.7); clears DOC-CONS naming REGISTER-DRIFT. |
| 4.108.0 | 2026-07-15 | Playground harness absence honesty: ARCH-005→1.1.2 · ARCH-009→1.1.3 · ARCH-012→1.2.7 · ARCH-017→2.0.3 · ARCH-024→1.5.1 · ARCH-027→1.6.2 · ADR-009→1.0.1; DOC-002 self-row synced; no handroll restore. |
| 4.107.0 | 2026-07-15 | ARCH-024 → 1.5.0 DOC-003 six-section retrofit (content unchanged; "Known limits" moved to § 6 Notes) — the 1.4.0 revision this session crossed the "materially revised" threshold in DOC-001 §3.8. ARCH-022/025/026/027/028 remain explicitly grandfathered (see § 6 Notes below) — link-only or single-row edits this session did not cross that threshold for them. |
| 4.100.0 | 2026-07-15 | I1.3 register sync: GUIDE-018→0.3.6 · ARCH-022→1.6.4 · ARCH-026→1.3.3; next Ops = I1.4; DOC-002 self-row synced. |
| 4.99.0 | 2026-07-15 | `(client)` normalize honesty: ARCH-012→1.2.5 · ARCH-002→1.3.4; DOC-002 self-row synced. |
| 4.98.0 | 2026-07-15 | ARCH-012→1.2.4 client `(gate)`/`(workspace)` path honesty vs on-disk `app/(client)/client/**`; DOC-002 self-row synced. |
| 4.97.0 | 2026-07-15 | Client `(gate)`/`(workspace)` honesty: ARCH-022→1.6.3; DOC-002 self-row synced. |
| 4.96.0 | 2026-07-15 | I1.2 register sync: GUIDE-018→0.3.5 · ARCH-022→1.6.2 · ARCH-026→1.3.2 · ARCH-031→1.3.14; DOC-002 self-row synced. |
| 4.95.0 | 2026-07-15 | I1.1 gap close register sync: GUIDE-018→0.3.4 · ARCH-022→1.6.1 · ARCH-026→1.3.1; DOC-002 self-row synced. |
| 4.94.0 | 2026-07-15 | GUIDE-018 → 0.3.3 (I1.1 `proxy.ts` evidence); program note next Ops = I1.2; DOC-002 self-row synced. |
| 4.93.0 | 2026-07-15 | Registered GUIDE-018 (approved ID) Full-Stack End-to-End Integration Program Draft 0.3.2; DOC-002 self-row synced. |
| 4.92.0 | 2026-07-15 | Checkpoint G: ARCH-022/024/025/026/027/028 Target→Living; ARCH-031→1.3.13 posture honesty; DOC-002 self-row synced. |
| 4.91.0 | 2026-07-15 | Docs audit: ARCH-028→1.4.27 (stale Risks/drift retired; post-S8.2 CI/Deploy honesty); DOC-002 self-row synced. |
| 4.90.0 | 2026-07-15 | Docs audit residual close: ARCH-028→1.4.26, ARCH-031→1.3.12; DOC-002 self-row synced (Actions Deploy evidence). |
| 4.89.0 | 2026-07-15 | Docs audit residual: DOC-002 self-row aligned; ARCH-028→1.4.26 (S8.1/S8.2 Actions/`packageManager` evidence + Deploy run 29367183769). |
| 4.88.0 | 2026-07-15 | S8.2 Deploy: ARCH-028→1.4.25, ARCH-022→1.5.11, ARCH-031→1.3.11 (`deploy.yml` + Corepack; prod READY; Checkpoint G next Docs). |
| 4.87.0 | 2026-07-15 | S8.1 audit gap close: ARCH-028→1.4.24, ARCH-031→1.3.10 (Biome + Vitest under turbo; 19 tasks). |
| 4.86.0 | 2026-07-15 | S8.1 CI: ARCH-028→1.4.23, ARCH-022→1.5.10, ARCH-031→1.3.9 (turbo lint/typecheck/test + TURBO remote cache; next open S8.2). |
| 4.85.0 | 2026-07-15 | S7.4 audit gap close: ARCH-028→1.4.22 (session-aware feature runners + Target org-admin farm honesty). |
| 4.84.0 | 2026-07-15 | S7.4 + Checkpoint F: ARCH-028→1.4.21, ARCH-022→1.5.9, ARCH-031→1.3.8 (feature shells on disk; next open S8.1). |
| 4.83.0 | 2026-07-15 | S7.3 gap close follow-up: FFT-MOD-009→2.0.4 (Target fft shell honesty; AC still BLOCKED). |
| 4.82.0 | 2026-07-15 | S7.3 gap close: ARCH-028→1.4.20, ARCH-031→1.3.7 (Identity RBAC ownership + catalogue honesty). |
| 4.81.0 | 2026-07-15 | Post-S7.3: ARCH-022→1.5.8, ARCH-028→1.4.19 (domain modules on disk; register catch-up). |
| 4.80.0 | 2026-07-15 | Post-S7.2 plan/code audit: ARCH-022→1.5.7, ARCH-028→1.4.18, ARCH-031→1.3.6 (route groups on disk; register catch-up). |
| 4.79.0 | 2026-07-15 | ARCH-022 → 1.5.6 — Purpose banner checkout honesty through S7.1 Next shell (bounded reopen). |
| 4.78.0 | 2026-07-15 | Register catch-up: DOC-002 self-row + ARCH-022→1.5.5 + ARCH-031→1.3.5; Vercel `afenda-lite` Root Directory=`apps/web` + outside-root sources verified. |
| 4.77.0 | 2026-07-15 | Post-S7.1 gap close: ARCH-028→1.4.16, ARCH-031→1.3.4 (Target Next SSOT under `apps/web`; register catch-up). |
| 4.76.0 | 2026-07-15 | ARCH-019 → 1.1.6 — DNA archive-promote align + close docs-trunk index-ghost residual (disk/`git ls-files`/trunk-ban authority). |
| 4.75.0 | 2026-07-15 | Docs audit post-S5.1: ARCH-028→1.4.14, ARCH-031→1.3.2, ARCH-015→2.0.2, ARCH-018→1.1.6 (stale next-open + DNA archive-promote clarity). |
| 4.74.0 | 2026-07-15 | ARCH-022 → 1.5.4 (Checkpoint E banner includes `@afenda/ui`). |
| 4.73.0 | 2026-07-15 | ARCH-028 → 1.4.13 (S5.1 `@afenda/ui` + Checkpoint E) · ARCH-031 → 1.3.1 (component foundation base-vega). |
| 4.72.0 | 2026-07-15 | ARCH-028 → 1.4.12 — anti-contamination stress: Collapse/legacy recovery (incl. `git show` mining) requires explicit user approval this turn. |
| 4.71.0 | 2026-07-15 | S4.1 plan/code audit gaps: ARCH-022→1.5.3, ARCH-027→1.5.1, ARCH-028→1.4.11, ARCH-031→1.3.0 (register sync + cutover anchor + catalogue evidence). |
| 4.70.0 | 2026-07-14 | ARCH-028 → 1.4.8 (S3.1 `@afenda/auth` session acceptance + evidence). |
| 4.69.0 | 2026-07-14 | ARCH-025→1.2.4 / ARCH-028→1.4.7 — ban `db:migrate` of `0000_living-roots-baseline` (hook + package guard). |
| 4.68.0 | 2026-07-14 | ARCH-028 → 1.4.6 (S2.2 drizzle generate/check + Checkpoint B). |
| 4.67.0 | 2026-07-14 | ARCH-028 S2.1 `@afenda/db`; ARCH-023→3.1.4 / ARCH-025→1.2.3 / ARCH-028→1.4.5 (`organization_id` = live `text`). |
| 4.66.0 | 2026-07-14 | ARCH-028 → 1.4.4 (S1.1–S1.2 + Checkpoint A implement evidence; preconditions package-manager + implement unlock). |
| 4.65.0 | 2026-07-14 | Registered Living GUIDE-017 Enterprise Quality and Evidence Standard for cross-cutting evidence vocabulary, freshness/applicability, exception governance, and release/capability aggregation; aligned the guides integrity baseline; future-product ERP scope remains parked. |
| 4.64.0 | 2026-07-14 | Hard-delete `docs/**/archive/` stubs; DOC-001 → 2.7.0 register-only Retired/Superseded; clear guides archive integrity baseline; ARCH-023→3.1.3, ARCH-028→1.4.3, MOD-002→4.0.2, FFT-MOD-009→2.0.3. |
| 4.63.0 | 2026-07-14 | RB-001/RB-005 → 1.1.0 DOC-003 six-section retrofit (clears runbooks STRUCTURE-DRIFT). |
| 4.62.0 | 2026-07-14 | FFT ARCH-027 env reconciliation (FFT-MOD-003/008 → 1.3.2, FFT-MOD-009 → 2.0.2) plus Living/Target pnpm command cutover register sync (MOD-002 → 4.0.1 + executable contract). |
| 4.61.0 | 2026-07-14 | Bounded reopen: Living/Target package-manager docs cutover to pnpm (ARCH-012/016/018/019/023/025/026/028/031, OPEN-001, GUIDE-011, RB-001/005/006/008, MOD-002, FFT-MOD-003/005/008/009); ARCH-031 → 1.2.0 Living lockfile facts. |
| 4.60.0 | 2026-07-14 | Bounded reopen (documentation-audit close omitted): added **Control State = Closed** on archived GUIDE-001…004/006; synced `docs/guides` integrity baseline **20** known findings (5 VERSION-DRIFT + 15 REFERENCE-BROKEN — leave body links untouched). |
| 4.59.1 | 2026-07-14 | Architecture pack consolidate: utilization + pointer-only SSOTs (ARCH-001→1.2.0, 002→1.3.3, 007→1.2.0, 008→1.3.0, 010→1.3.0, 018/019→1.1.4, 022→1.5.2, 027→1.4.2); README when-to-use; drop stub/Living-compose residue. |
| 4.59.0 | 2026-07-14 | Flatten architecture trunks: Living/Target ARCH-* → docs/architecture/; DOC-001 → 2.6.0 (forbid backend/frontend/system/tech-stack); pack reading order in architecture/README; ARCH patch bumps + ARCH-007 → 1.1.2 (OPEN-001 link); ARCH-015 register title align; ADR home unchanged. |
| 4.58.0 | 2026-07-14 | ARCH-010 → 1.2.0 (conventions: deploy matrix SSOT; proxy≠authz; lib gone; Alignment). |
| 4.57.0 | 2026-07-14 | ARCH-009 → 1.1.0 modules ownership (logical inventory; lib-gone honesty; RBAC/draft API; closed relocate history). |
| 4.56.0 | 2026-07-14 | ARCH-008 → 1.2.0 (adapter map pack sync: in-Action authz, logical inventory, Alignment; proxy≠authz). |
| 4.55.0 | 2026-07-14 | ARCH-007 → 1.1.0 ports/adapters (hard rules; Action map; onboarding off IdentityPort; TradePort; api-now RH). |
| 4.54.0 | 2026-07-14 | ARCH-006 → 1.1.0 bounded contexts (Platform shared Zod; logical Target homes; Trade↛Declarations; fft.access). |
| 4.53.0 | 2026-07-14 | ARCH-005 → 1.1.0 (folder map Target↔logical; env ARCH-027; adapter homes; Forbidden list). |
| 4.52.0 | 2026-07-14 | ARCH-004 → 1.1.0 (layers + Vercel/Node adapter posture; ARCH-013 link fix). |
| 4.51.0 | 2026-07-14 | ADR home → `docs/architecture/adr/` (DOC-001 → 2.5.0; ADR-008 → 1.0.1); forbid `decisions/`; link retarget ARCH-002→1.3.1, 008/010→1.1.1, 012→1.2.1, 013→1.1.2, 016→1.2.1, 029→1.2.6. |
| 4.50.0 | 2026-07-14 | Backend Vercel deploy optimum: ARCH-001 → 1.1.0; ARCH-008 → 1.1.0; ARCH-010 → 1.1.0; ARCH-013 → 1.1.1 (pointer only). |
| 4.49.0 | 2026-07-14 | Frontend pack Studio sync: ARCH-015 → 2.0.0; ARCH-002 → 1.3.0; ARCH-012 → 1.2.0; ADR-008 home restored to `architecture/decisions/` (removed `architecture/adr/`). |
| 4.48.0 | 2026-07-14 | ARCH-017 → 2.0.0 Studio-first folder map (Shadcn DNA homes; legacy dump bans). |
| 4.47.0 | 2026-07-14 | ARCH-016 → 1.2.0 (conventions numbered pack; Afenda overrides; hard stops; ARCH-027 link fix). |
| 4.46.0 | 2026-07-14 | ARCH-016 → 1.1.0 Elite Next.js conventions upgrade (data patterns, Mode A RH, ADR-008 gate, MCP vs isolation). |
| 4.45.0 | 2026-07-14 | ARCH-014 → 2.0.0 Superseded (archived); Studio/AdminCN successors ARCH-012 + ARCH-015/018/019 + ui-registry. |
| 4.44.0 | 2026-07-14 | ARCH-013 → 1.1.0 (BFF / Accelint Action trust + waterfall sync). |
| 4.43.0 | 2026-07-14 | ARCH-012 → 1.1.0 (App Router Elite Next.js sync); aligned DOC-002 header↔self-row (cleared prior register-version drift). |
| 4.42.0 | 2026-07-14 | Registered ADR-008 → 1.0.0 Accepted Phase 1 (Cache Components Mode B; enablement deferred); ARCH-002 → 1.2.0; ARCH-016 → 1.0.5. |
| 4.41.0 | 2026-07-14 | ARCH-002 → 1.1.0 Mode A/B rendering + Cache Components gate; ARCH-016 → 1.0.4 `'use cache'` align. |
| 4.40.2 | 2026-07-14 | Removed `_reference/archive/2026-07-14-admincn-1.0.0/`; ARCH-015/018/019 → 1.1.2. |
| 4.40.1 | 2026-07-14 | Removed `_reference/studio-admincn-lock/`; ARCH-015/018/019 → 1.1.1 (Studio DNA scratch-only). |
| 4.40.0 | 2026-07-14 | AdminCN Studio freeze validation: ARCH-015/018/019 → 1.1.0 (MCP/CLI critical constraint). |
| 4.39.0 | 2026-07-14 | ARCH-031 → 1.1.0 purge Collapse Current ops (`lib/env`/compose evidence); ARCH-027 → 1.4.0 docs-first STOP (no recover compose). |
| 4.38.0 | 2026-07-14 | Anti-contamination: ARCH-028 → 1.4.0 lock; Living ARCH-001/002/004–010/012–019 checkout honesty (→ 1.0.3 / ARCH-017 → 1.1.4); ARCH-031 → 1.0.1; forbid Collapse tree recover. |
| 4.37.0 | 2026-07-14 | Architecture sync: Living pack ARCH-001/002/004–010/012–019 DOC-003 retrofit + Change Logs; ARCH-017 → 1.1.3; ARCH-021 → 2.0.2 (ARCH-029→017 label fix); DOC-002 header↔row version align. |
| 4.106.0 | 2026-07-15 | Register-only sync: ARCH-026 register row 1.3.3 → 1.3.4 to match the document header/Change Log (I1.3 operator-invite gap close), which had already landed but never propagated to the register. Pre-existing drift, unrelated to this session's UI-gateway work; no document edit required. |
| 4.105.0 | 2026-07-15 | Plan-vs-codebase audit: ARCH-022→1.6.5 (package boundary table `packages/ui`→`packages/design-system`), ARCH-031→1.3.16 (§3.2 ledger "UI tooling" row same fix, missed in the prior pass) — closes the last current-state `packages/ui` references in controlled docs; historical ARCH-028 S5.1 / GUIDE-018 slice records left as dated history, not current claims. |
| 4.104.0 | 2026-07-15 | Registered ADR-009 → 1.0.0 Accepted (`@afenda/ui` playground gateway; `packages/ui`→`packages/design-system` consolidation; exports trim; `*Contract` pattern), user-approved ID this turn per DOC-001 §3.2. |
| 4.103.0 | 2026-07-15 | ARCH-031 → 1.3.15: fixed two doc-integrity broken links surfaced post-consolidation (`apps/web/styles/globals.css`, `packages/ui`) to the current `apps/web/globals.css` / canonical `packages/design-system` paths. |
| 4.102.0 | 2026-07-15 | Docs carve-out follow-through: ARCH-009→1.1.2, ARCH-012→1.2.6, ARCH-015→2.0.3, ARCH-017→2.0.2, ARCH-027→1.6.1 — each links its `/playground` mention to the ARCH-024 `@afenda/ui/playground` disambiguation paragraph instead of repeating prose. |
| 4.101.0 | 2026-07-15 | ARCH-024 → 1.4.0: `@afenda/ui` exports trimmed to the `./playground` gateway (`.`, `./style.css`, `./playground`, `./playground/providers`, `./playground/types`); added `@afenda/ui/playground` vs `/playground` routes disambiguation paragraph. |
| 4.36.0 | 2026-07-14 | ARCH-023 → 3.1.0 DOC-003 six-section retrofit (Decision lock content unchanged); cleared system-pack STRUCTURE-DRIFT residual. |
| 4.35.0 | 2026-07-14 | System-pack integrity remediation: ARCH-022→1.5.0; ARCH-024…026→1.2.0; ARCH-027→1.3.0; ARCH-028→1.3.0; ARCH-023 structure grandfather retained (DOC-001 §3.8 Review needed until material revision). |
| 4.34.0 | 2026-07-14 | Registered Living ARCH-031 Technology Stack Catalogue as the derived stack-discovery authority. |
| 4.33.0 | 2026-07-14 | Synchronized MOD-002 4.0.0 and FFT-MOD-001…010 executable Core/ERP quality-contract retrofit. |
| 4.32.0  | 2026-07-14 | Evidence reconstruction: FFT-MOD-009 → 1.3.0 / FFT-MOD-010 → 2.3.0; Core rows BLOCKED at HEAD `764287d` (product tree absent); claim remains Not claimable. |
| 4.31.0  | 2026-07-14 | Bounded reopen: confirmed FFT-MOD-001 (2.2.0) / FFT-MOD-002…005 (1.2.0) / GUIDE-016 (0.2.0 Retired) already matched headers; recorded `docs/guides/archive` integrity baseline **29 known findings** (5 VERSION-DRIFT + 24 REFERENCE-BROKEN on GUIDE-001…004/006 — leave untouched; DOC-001 §3.7 Control State exemption). Wave 3 skill rename closed (`doc-control` / `doc-integrity`). |
| 4.30.0  | 2026-07-14 | Wave D: Retired GUIDE-016 → `docs/guides/archive/` (0.2.0); active authority MOD-002 + FFT-MOD-001…010; ID non-recyclable. |
| 4.29.0  | 2026-07-14 | Wave C: FFT-MOD-001…008 enterprise requirements (single-owner ACs); versions 001→2.2.0, 002…008→1.2.0. |
| 4.28.0  | 2026-07-14 | Wave B: FFT-MOD-009 1.2.0 structured evidence ledger; FFT-MOD-010 2.2.0 Module Enterprise Readiness Not claimable (inherited PASS vacated). |
| 4.27.0  | 2026-07-14 | Wave A: DOC-001 2.4.0 names MOD-002 as Module category standard; MOD-002 3.0.0 Module Enterprise Readiness (lifecycle ≠ readiness). |
| 4.26.0  | 2026-07-14 | Registered Draft GUIDE-016 Feed Farm Trade Enterprise Acceptance; linked from FFT-MOD-009/010. |
| 4.25.0  | 2026-07-14 | Synced FFT-MOD-001…010 after DOC-003 six-section retrofit and enterprise compact enrich (Living spine). |
| 4.24.0  | 2026-07-14 | Relocated RB-006…008 to `docs/api/runbooks/` (composed Draft 0.2.0); DOC-001 2.3.0 co-location exception; platform RB-001/005 stay in `docs/runbooks/`. |
| 4.23.0  | 2026-07-14 | Moved Retired GUIDE-001…004/006 into docs/guides/archive/ (not Living stubs in guides root). |
| 4.22.0  | 2026-07-14 | Hard-deleted GUIDE-001…004/006 files; IDs stay Retired in register (no stub files — no-stub ban). |
| 4.21.0  | 2026-07-14 | Retired GUIDE-001…004 and GUIDE-006 (duplication with DOC-*/AGENTS/skills); ARCH-028 absorbed Target vs checkout drift. |
| 4.20.0  | 2026-07-14 | Registered ARCH-017 (frontend folder map; renumbered from colliding ARCH-029) and all previously unregistered controlled docs under docs/ (option A). |
| 4.19.0  | 2026-07-14 | Synced Version/Updated for docs/-wide Control State header retrofit (phases A–D); Control State remains header-only. |
| 4.18.0  | 2026-07-14 | Aligned DOC-001 2.2.0 and DOC-003 1.4.0: Control State is a mandatory document header field, still not an eighth register column. |
| 4.17.0  | 2026-07-13 | Aligned DOC-001 2.1.0 and DOC-003 1.3.0 with the explicit Control State model while keeping the register to seven fields. |
| 4.16.0  | 2026-07-13 | Aligned DOC-001 2.0.0 and DOC-003 1.2.0 with the controlled-document close/reopen gate. |
| 4.15.0  | 2026-07-13 | Reconciled the API audit: guide-home exception, active evidence bar, list envelope, OpenAPI provenance, structures, link, title, and recipe ownership. |
| 4.14.1  | 2026-07-13 | ARCH-029 → 1.2.2 (README reading sequence vs GUIDE-015 development order). |
| 4.14.0  | 2026-07-13 | Registered Living GUIDE-015 Interface Pack Development Roadmap (locked by Jack Wee); ARCH-029 → 1.2.1. |
| 4.13.0  | 2026-07-13 | ARCH-029 → 1.2.0 (API pack sync); API-001 → 1.2.1 (parent + public-exception align). |
| 4.12.1  | 2026-07-13 | Aligned ARCH-029 to 1.1.5 (creation sequence Phases 1–5 in Notes; not a Guide). |
| 4.12.0  | 2026-07-13 | Registered Draft GUIDE-014 API Contract Verification Standard; ARCH-030 deferred. |
| 4.11.0  | 2026-07-13 | Registered Draft GUIDE-007…013 under `docs/api/guides/`; OpenAPI recipes → GUIDE-011; OPEN-001 → 1.1.4. |
| 4.10.0  | 2026-07-13 | Registered Draft RB-006…008 (API ops runbooks); reserved RB-009 for webhook replay; aligned ARCH-029 to 1.1.2. |
| 4.9.1   | 2026-07-13 | Aligned ARCH-029 to 1.1.1 (deferred ADR-001…007 candidates; no ADR files). |
| 4.9.0   | 2026-07-13 | Registered Draft REST-002…007, FFT-REST-001, GUIDE-007; bumped REST-001 to 1.2.1 and OPEN-001 to 1.1.3. |
| 4.8.0   | 2026-07-13 | Registered Living ARCH-029; registered Draft placeholders API-005…API-009 (interface optimization backlog).                                     |
| 4.7.0   | 2026-07-13 | Aligned DOC-001 to 1.6.0 and DOC-003 to 1.1.0 (user-approved shared Lite/Elite documentation control).                                           |
| 4.6.0   | 2026-07-13 | Registered DOC-003; aligned DOC-001 to version 1.5.0; corrected lifecycle compatibility for Target architecture documents; standardized titles. |
| 4.5.0   | 2026-07-13 | Removed ADR register rows; retained ARCH-023 as the sole living tenancy and platform-RBAC authority.                                            |
| 4.4.1   | 2026-07-13 | Retargeted documentation after post-commit audit.                                                                                               |
| 4.4.0   | 2026-07-13 | Removed the former `docs/adr/` directory.                                                                                                       |
| 3.0.0   | 2026-07-13 | Reset the register to explicitly agreed controlled documents.                                                                                   |

---

# 6. Notes

`ARCH-023` is the current living source of truth for multi-tenancy and platform RBAC (DOC-003 six-section form from 3.1.0). Decision lock R1–R7 / D4·D5 must not be reopened without separate explicit approval.

`ARCH-029` is the Living parent authority for interface and API architecture. **GUIDE-015** is the locked Phases 1–5 development roadmap (Jack Wee). `API-005`…`API-009`, `REST-002`…`REST-007`, `FFT-REST-001`, `GUIDE-007`…`GUIDE-014`, and `RB-006`…`RB-008` are Draft until expanded / promoted per their owning roadmaps. API guides live under `docs/api/guides/`. API runbooks live under `docs/api/runbooks/`. Non-API guides live under `docs/guides/` when Living. **GUIDE-016** is **Retired** (register-only; stub removed); Module Enterprise Readiness authority is [MOD-002](../modules/MOD-002-modules-index.md) + FFT-MOD-001…010. `ARCH-030` (verification architecture) is deferred while GUIDE-014 remains the API verification Guide.

**GUIDE-017** is the Living cross-cutting authority for evidence vocabulary and release/capability aggregation (1.0.2; §3.11 claim identity for Afenda-Lite I1–I6.1 slice = **NOT READY** @ `fc16109`; I6.3 deploy-health blocker cleared). It does not replace MOD-002 module evidence/claims or ARCH-029/GUIDE-014 interface verification. Living GUIDE-017 ≠ product READY.

**GUIDE-018** is the registered **Living** post-scaffold full-stack integration program (1.0.13; Phase **I1–I6 DONE**; GUIDE-017 claim **NOT READY**; next Ops **I7.1**). It sequences work; owning ARCH/API/MOD spines remain binding for detail.

`FFT-REST-002`…`FFT-REST-007`, `OPEN-002`…`OPEN-005`, `ADR-001`…`ADR-007`, `RB-009` (webhook replay), and `ARCH-030` (verification architecture) are **reserved in planning docs only** — not registered until created under the approved derivation / creation gates. **`ADR-008`** is registered (Accepted Phase 1 — Cache Components Mode B; `cacheComponents` enablement still deferred). **`ADR-009`** is registered (Superseded by ADR-010 — the `@afenda/ui` playground gateway is retired). **`ADR-010`** is registered (Accepted — `@afenda/ui-system` flat-barrel Radix design system; `packages/design-system` retired).

`ARCH-022` and `ARCH-024` through `ARCH-028` are **Living** scaffold SSOT after Checkpoint G (2026-07-15). Post-scaffold program order is [GUIDE-018](../guides/GUIDE-018-fullstack-e2e-integration-program.md) (registered **Living** 1.0.13). Phase **I1–I6 DONE** (GUIDE-017 claim **NOT READY**); next Ops = **I7.1** — not a Status demotion of Living auth ARCH. Neon Auth `N1`–`N18` serial complete — do **not** invent **N19**. Neon Auth transactional mail = **Zoho SMTP** via Neon Auth console ([ARCH-026](../architecture/ARCH-026-auth-session.md) 2.1.0). Auth **presentation** Living = Path A (Afenda forms + Neon SDK) for login/sign-up/sign-out; Path B `AuthView` residual for forgot/reset.

**`ARCH-022`–`ARCH-028`** (and previously ARCH-024 at 1.5.0) now use DOC-003 six numbered sections. The earlier DOC-001 §3.8 structure grandfather for ARCH-022/025/026/027/028 is **cleared** as of 4.114.0.

DOC-001 is the shared Afenda documentation control baseline (Lite beta · Elite battle-proven). This register lists documents for the Lite checkout only.

GUIDE-001…004, GUIDE-006, and GUIDE-016 are **Retired** in this register only (IDs non-recyclable; stub files hard-deleted — no `docs/guides/archive/`). ARCH-003, ARCH-014, ARCH-020, and ARCH-021 are **Superseded** in this register only (no `docs/architecture/archive/`). Engineering entry is `docs/README.md` + DOC-001/003 + AGENTS.md; API how-tos remain under `docs/api/guides/`; Target vs checkout drift lives in ARCH-028. Module Enterprise Readiness is MOD-002 + module spines.

**Integrity baseline (`docs/guides`):** expect **0** findings for the navigator plus Living GUIDE-017 and registered GUIDE-018. Retired GUIDE stubs remain register-only and `docs/guides/archive/` must not be restored.

Under DOC-001 §3.5.1 / §3.7, every controlled document header shall declare **Control State** (`Open` · `Closed` · `Reopened`) distinct from lifecycle **Status**. Lifecycle Status remains in this seven-field catalogue; Control State is header-only and must not be added as an eighth register column. The documentation validator requires and validates the header field for `docs/_control/**` and for any document that already declares it.

Everything else remains unregistered until its ID is explicitly approved.
