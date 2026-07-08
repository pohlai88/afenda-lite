# Backlog-01 — Neon Auth end-to-end closure (iam-check)

**Status:** Active — code closure complete; production verification pending  
**Completeness report:** [implementation-completeness.md](./implementation-completeness.md)
**Audience:** Engineers, operators, release owner  
**Lifecycle:** Maintenance / pre-launch closure  
**Source of truth:** Live Neon Auth branch (`production`) ↔ materialized manifest ↔ portal UI  
**Validation matrix:** [neon-auth-validation-matrix.md](./neon-auth-validation-matrix.md) (MCP-live ↔ manifest ↔ UI)  
**Last validated:** 2026-07-08 (MCP + manifest sync + audit)

---

## Purpose

Close every open gap between **what Neon Auth is configured to do**, **what the portal exposes to users**, and **what operators can verify in production** — so client onboarding and operator workflows work end-to-end without silent failures.

This backlog is **outcome-focused**. Implementation detail lives in individual slice briefs under [`slices/`](./slices/).

---

## Goals

- One authoritative picture of auth configuration vs user-facing behaviour.
- Operators can invite clients and clients receive actionable invitation email.
- Operators can preview the client portal without session errors.
- Production cutover checklist is honest (no stale manifest false positives).
- Every auth surface a user can reach has aligned copy, trust messaging, and audit traceability.
- Local development strategy is explicit after production auth hardening.

## Non-goals

- Custom SMTP or MailerSend for Neon Auth transactional mail.
- Enabling social (Google) sign-in in the product UI.
- Exposing Neon Auth account tabs the product deliberately hides (teams, API keys, org admin UI).
- Playground or developer-only harness features in production journeys.
- Customer-facing help centre or API portal documentation.

---

## End-to-end journeys this backlog must cover

| Journey | Actor | Happy outcome |
| --- | --- | --- |
| J1 | Operator | Sign in → invite client → client receives org invitation email |
| J2 | Client | Open invitation link → register → accept org invite → complete onboarding → see assigned declaration |
| J3 | Client | Sign in with credentials → reset forgotten password via email link |
| J4 | Client | Sign in with verification code (OTP) when prompted at registration |
| J5 | Existing client | Sign in via magic link (no new registration via magic link) |
| J6 | Operator | Preview client portal as sandbox user → return to operator dashboard |
| J7 | Signed-in user | Update display name and change password in account settings |
| J8 | Release owner | Confirm live auth config matches committed manifest and production checklist |

---

## Backlog index

| ID | Title | Priority | Depends on | Slice |
| --- | --- | --- | --- | --- |
| BL-01 | Configuration truth & audit pipeline | P0 | — | [BL-01](./slices/bl-01-config-truth-audit.md) |
| BL-02 | Operator client invitation email | P0 | BL-01 | [BL-02](./slices/bl-02-operator-invite-email.md) |
| BL-03 | Operator client portal preview | P1 | BL-01 | [BL-03](./slices/bl-03-operator-client-preview.md) |
| BL-04 | Production auth cutover readiness | P1 | BL-01 | [BL-04](./slices/bl-04-production-cutover.md) |
| BL-05 | Auth email branding & sender trust | P2 | BL-04 | [BL-05](./slices/bl-05-auth-email-branding.md) |
| BL-06 | Client invitation join journey | P0 | BL-02 | [BL-06](./slices/bl-06-client-join-journey.md) |
| BL-07 | Account & credential self-service | P2 | BL-01 | [BL-07](./slices/bl-07-account-self-service.md) |
| BL-08 | Auth surface registry & traceability | P2 | BL-01 | [BL-08](./slices/bl-08-surface-registry.md) |
| BL-09 | Local development auth strategy | P1 | BL-04 | [BL-09](./slices/bl-09-local-dev-auth.md) |

**Recommended execution order:** BL-01 → BL-02 + BL-03 (parallel) → BL-06 → BL-04 → BL-09 → BL-05 + BL-07 + BL-08 (parallel).

---

## Cross-cutting risks (track until closed)

| Risk | Impact | Owner slice |
| --- | --- | --- |
| Materialized manifest out of date with live branch | False audit passes; wrong operator guidance | BL-01 |
| Invitation email fails silently in operator UI | Clients never onboard | BL-02 — **fix in repo; deploy pending** |
| Preview-as-client fails with session mismatch | Operators cannot validate client UX | BL-03 — **fix in repo; deploy pending** |
| Local dev blocked after localhost disabled on prod branch | Developer velocity | BL-09 — **closed** |
| Email sender shows generic Neon name | Client trust / confusion | BL-05 — **Console manual** |
| Auth surfaces missing from registry | Future UI drift undetected | BL-08 — **closed** |

---

## Program definition of done

Backlog-01 is **closed** when:

1. All slice DoD checklists are complete.
2. J1–J8 have been exercised in production (or documented exception with owner sign-off).
3. `npm run audit:neon-auth-production` reflects live branch state (via fresh manifest sync).
4. No open P0/P1 items remain in the cross-cutting risks table.

---

## Related documents

- [implementation-completeness.md](./implementation-completeness.md) — plan ↔ codebase gap report
- [neon-auth-validation-matrix.md](./neon-auth-validation-matrix.md) — live ↔ manifest ↔ UI (MCP-validated)
- [AGENTS.md](../../AGENTS.md) — Neon Auth env and MCP workflow
- [production-go-live.md](../runbooks/production-go-live.md) — launch runbook
- [s1-auth-boundary.md](../architecture/slices/s1-auth-boundary.md) — auth architecture slice
- [s16-admin-client-preview.md](../architecture/slices/s16-admin-client-preview.md) — preview feature spec

---

## Slice folder

Individual slice briefs: [`docs/backlogs/slices/`](./slices/)
