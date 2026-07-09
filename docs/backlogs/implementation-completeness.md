# Backlog-01 — Implementation completeness (plan ↔ codebase)

**Updated:** 2026-07-09  
**Master backlog:** [backlog-01-neon-auth-closure.md](./backlog-01-neon-auth-closure.md)  
**Post-deploy checklist (SSOT):** [post-deploy-verification.md](./post-deploy-verification.md)  
**Validation:** [neon-auth-validation-matrix.md](./neon-auth-validation-matrix.md)

---

## Summary

| Category | Count |
| --- | --- |
| Slices closed (code + docs) | 5 (BL-01, BL-04, BL-08, BL-09, partial BL-06 code) |
| Slices code-complete, prod verify pending | 4 (BL-02, BL-03, BL-06, BL-07) |
| Manual / Console only | 1 (BL-05) |

**Program status:** **Not closed** — complete [post-deploy-verification.md](./post-deploy-verification.md) on production.

---

## Slice status

| ID | Title | Code | Tests | Prod verify | Status |
| --- | --- | --- | --- | --- | --- |
| BL-01 | Config truth & audit | Done | Pass | MCP synced | **Closed** |
| BL-02 | Operator invite email | Done | Unit + script | Pending | **Verify → post-deploy Phase 1** |
| BL-03 | Operator preview | Done | — | Pending | **Verify → post-deploy Phase 1** |
| BL-04 | Production cutover | Done | Audit pass | Live MCP match | **Closed** (sign-off optional) |
| BL-05 | Email branding | N/A (Console) | — | Manual | **Verify → post-deploy Phase 3** |
| BL-06 | Client join journey | Done | Unit + E2E | Pending | **Verify → post-deploy Phase 2** |
| BL-07 | Account self-service | Done | Manifest tests | Manual | **Verify → post-deploy Phase 3** |
| BL-08 | Surface registry | Done | Matrix pass | — | **Closed** |
| BL-09 | Local dev auth | Done | Doc smoke | Dev branch | **Closed** |

---

## Journey coverage

| Journey | Description | Code ready | Verified prod |
| --- | --- | --- | --- |
| J1 | Operator invite → email | Yes | **post-deploy Phase 1** |
| J2 | Client join → onboarding | Yes | **post-deploy Phase 2** |
| J3 | Password reset | Yes | **post-deploy Phase 3** |
| J4 | OTP at sign-up / join | Yes | **post-deploy Phase 2** |
| J5 | Magic link sign-in | Yes | **post-deploy Phase 3** |
| J6 | Operator preview client | Yes | **post-deploy Phase 1** |
| J7 | Account settings/security | Yes | **post-deploy Phase 3** |
| J8 | Config ↔ manifest ↔ UI | Yes | Audit pass |

---

## Code map (join + invite — current)

| Area | Location |
| --- | --- |
| Join route | `app/join/page.tsx` |
| Join entry / redirects | `lib/client-invitation-entry.ts` |
| Auth step machine | `lib/client-invitation-join-auth.ts`, `components/use-join-invitation-auth-view.ts` |
| Join UI | `components/portal-invitation-join-page.tsx`, `portal-invitation-join-panel.tsx`, `guardian-invitation-join-page.tsx` |
| Org invite 401 fix | `lib/auth/neon-auth-request.ts` |
| Preview session fix | `app/actions/admin.ts` |

---

## Next action

Run **[post-deploy-verification.md](./post-deploy-verification.md)** end-to-end after the next production deploy. Do not track duplicate deploy checklists in slice files or runbooks.
