# S5 — Anonymous share access

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 6 (parallel with S7 after S4) |
| **Depends on** | S3, S4 |
| **Feeds into** | S8, S9 |

## Purpose

Distribute declarations without client accounts via open and secure links.

## Inputs / outputs

- **Inputs:** `surveyId`, token generation, clipboard/QR
- **Outputs:** `/survey/[slug]`, `/f/[token]`, invite email copy text

## Owned files

- `components/anonymous-share-panel.tsx`
- `app/actions/invitations.ts`
- `lib/invite.ts`, `lib/tokens.ts`
- `app/survey/[slug]/page.tsx`, `app/f/[token]/page.tsx`

## Critical control points

- Token rotation invalidates old secure links
- Public slug is intentionally discoverable; secure token is not

## Failure modes

- QR hostname blocked (mitigated in `next.config.ts`)
- Leaked secure token grants access until rotation

## Required tests

- Open link submit end-to-end
- Secure link submit end-to-end
- Rotate token breaks old URL

## Acceptance proof

- [ ] Anonymous completion on both link types
- [ ] Secure flow does not expose slug in URL

## Must not bypass

Resolving secure links by slug instead of `survey_invite_tokens`.

## Drift risk

Adding slug-based secure URLs.
