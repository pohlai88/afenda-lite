# S15 — E2E journey coverage

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 15 (post Phase C) |
| **Depends on** | S1 auth, S3 operator CRUD, S4 submission, S5 share, S6–S7 client flows, S10 validation |
| **Feeds into** | CI quality gate (S13), production acceptance (doctrine §7) |

## Purpose

Automate the remaining identity and submission paths not covered by smoke-only E2E: full client assignment journey, secure anonymous link with file metadata, and open-link submit.

## Owned files

- `e2e/smoke.spec.ts` — liveness, readiness, operator create, public page load + submit
- `e2e/secure-file.spec.ts` — secure `/f/[token]` + file question (`@journey`)
- `e2e/client-journey.spec.ts` — invite → onboard → assign → submit → `CDP-*` (`@journey`)
- `e2e/fixtures/sample-evidence.txt` — Playwright file-input fixture
- `lib/evidence-policy.ts` — MIME/size allowlist for file metadata (S4 hardening)

## Critical control points

- Operator creds from `SHARED_ADMIN_*` or `E2E_OPERATOR_*` env
- Client invite URL captured from UI (no email inbox automation)
- File evidence: metadata registered only; policy rejects disallowed MIME/size
- Client journey uses isolated browser context after invite issued

## Required tests

| Spec | Proves |
|------|--------|
| smoke | Readiness JSON, org login, create → public load + submit |
| secure-file | Operator adds file question; `/f/` submit; submission count |
| client-journey | Invite accept, onboarding, assignment submit, `CDP-*` receipt |

## Acceptance proof

- [x] `npm test` runs all specs in CI with secrets configured
- [x] `@journey` specs are serial and skip gracefully without operator creds
- [x] Evidence policy rejects disallowed MIME at action boundary

## Rollback

Remove or skip failing spec files; smoke remains minimum gate.

## Drift risk

- Question editor missing `file` type breaks secure-file spec
- Neon Auth trusted-domain mismatch breaks client invite in production manual tests
