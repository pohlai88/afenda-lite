# Backlog-01 — Implementation completeness (plan ↔ codebase)

**Generated:** 2026-07-08  
**Master backlog:** [backlog-01-neon-auth-closure.md](./backlog-01-neon-auth-closure.md)  
**Validation:** [neon-auth-validation-matrix.md](./neon-auth-validation-matrix.md)

---

## Summary

| Category | Count |
| --- | --- |
| Slices closed (code + docs) | 5 (BL-01, BL-04, BL-08, BL-09, partial BL-06/07) |
| Slices code-complete, prod verify pending | 3 (BL-02, BL-03, BL-06) |
| Manual / Console only | 1 (BL-05) |
| Account UX manual verify | 1 (BL-07) |

**Program status:** **Not closed** — deploy BL-02/BL-03 fixes and complete production journey verification (J1–J7).

---

## Slice status

| ID | Title | Code | Tests | Prod verify | Status |
| --- | --- | --- | --- | --- | --- |
| BL-01 | Config truth & audit | Done | Pass | MCP synced | **Closed** |
| BL-02 | Operator invite email | Done | Unit + script | Pending deploy | **Deploy + verify** |
| BL-03 | Operator preview | Done | — | Pending deploy | **Deploy + verify** |
| BL-04 | Production cutover | Done | Audit pass | Live MCP match | **Closed** (sign-off optional) |
| BL-05 | Email branding | N/A (Console) | — | Manual | **Open — Console** |
| BL-06 | Client join journey | Done | E2E partial | After BL-02 | **Code complete** |
| BL-07 | Account self-service | Done | Manifest tests | Manual flows | **Code complete** |
| BL-08 | Surface registry | Done | 39/39 matrix | — | **Closed** |
| BL-09 | Local dev auth | Done | Doc smoke | Dev branch | **Closed** |

---

## Journey coverage

| Journey | Description | Code ready | Verified prod |
| --- | --- | --- | --- |
| J1 | Operator invite → email | Yes (401 fix) | No — deploy first |
| J2 | Client join → onboarding | Yes | No — depends J1 |
| J3 | Password reset | Yes | Manual pending |
| J4 | OTP at sign-up | Yes | Manual pending |
| J5 | Magic link sign-in | Yes | Manual pending |
| J6 | Operator preview client | Yes (session fix) | No — deploy first |
| J7 | Account settings/security | Yes | Manual pending |
| J8 | Config ↔ manifest ↔ UI | Yes | Audit pass |

---

## Automated checks (last run)

```text
npm run test:unit              → 90/90 pass
npm run evaluate:ui-matrix     → 39/39 pass
npm run audit:neon-auth-production → no blocking failures
node scripts/live-org-invite.mjs   → success (with fresh admin session)
```

---

## Remaining actions (ordered)

1. **Deploy** current branch to `https://iam-check.vercel.app`.
2. **BL-02:** Operator invite → confirm `emailSent: true` in audit.
3. **BL-03:** Preview client portal → confirm `admin.client_preview_started`.
4. **BL-06:** Full invite → join → onboarding on production.
5. **BL-05:** Neon Console → Auth → Application Name → **Client Declaration Portal**.
6. **BL-07:** Manual password reset, magic link, account name/password on production.
7. **BL-04:** Release owner sign-off (optional checkbox).

---

## Code changes in this closure pass

| Area | Change |
| --- | --- |
| Org invite 401 | `lib/auth/neon-auth-request.ts` — proxy header + cookie filter |
| Preview session | `app/actions/admin.ts` — trust impersonation result |
| Dead code | Removed `lib/client-auth-provision.ts`, `portal-invitation-neon-view.tsx` |
| Manifest sync | `resolveAllowLocalhost()` in manifest build |
| UI registry | 5 auth surfaces in `lib/ui-decision-matrix.ts` |
| Local dev | `docs/runbooks/local-dev-auth.md`, AGENTS.md section |

---

## Risks still open

| Risk | Mitigation |
| --- | --- |
| Invite fix not deployed | Deploy + audit `invite.issued` |
| Preview still fails in prod | Deploy + audit preview events |
| Email sender shows "Neon Auth" | BL-05 Console application name |
| Local dev without dev branch | Follow BL-09 runbook |
