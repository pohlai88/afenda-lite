# S5 — Share access (open + secure links)

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 6 (parallel with S7 after S4) |
| **Depends on** | S3, S4 |
| **Feeds into** | S8, S9 |

## Purpose

Distribute declarations via open and secure links. Links resolve to the authenticated client assignment workflow (anonymous submit retired).

## Inputs / outputs

- **Inputs:** `surveyId`, token generation (`getOrCreateInviteToken`), operator share tab
- **Outputs:** `/survey/[slug]`, `/f/[token]`, client sign-in dispatch with optional `returnTo`

## Owned files

- `components/client-access-share-panel.tsx`, `components/declaration-share-panel.tsx`, `components/secure-link-rotate-button.tsx`
- `lib/declaration-share-links.ts`, `lib/public-link-routing.ts`
- `lib/open-link-entry.ts`, `lib/secure-link-entry.ts`, `lib/public-link-routing.ts`
- `lib/invite.ts`, `lib/tokens.ts`, `lib/surveys.ts` (`getOrCreateInviteToken`)
- `app/survey/[slug]/page.tsx`, `app/f/[token]/page.tsx`

## Critical control points

- Secure links resolve via `survey_invite_tokens`, not slug
- Token rotation invalidates old secure links (`regenerateInviteTokenAction` on share tab)
- Public slug is intentionally discoverable; secure token is not
- Unauthenticated visitors redirect to `/auth/sign-in?reason=login-required&returnTo=…`

## Failure modes

- QR hostname blocked (mitigated in `next.config.ts`)
- Leaked secure token grants routing until rotation
- Invalid token or slug → `notFound()`

## Required tests

- Open link resolves slug and redirects unauthenticated users to sign-in
- Secure link resolves token and redirects unauthenticated users to sign-in
- Operator share tab surfaces `/f/{token}` and `/survey/{slug}`
- Rotate token breaks old secure URL (manual / future action)

## Acceptance proof

- [x] Link routes resolve survey and dispatch authenticated clients to assignments
- [x] Secure flow does not expose slug in URL
- [x] Post-login `returnTo` resumes original link path

## Must not bypass

Resolving secure links by slug instead of `survey_invite_tokens`.

## Drift risk

Restoring anonymous submit without assignment scope; adding slug-based secure URLs.
