# BL-08 — Auth surface registry & traceability

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P2  
**Journeys:** J8 (documentation)  
**Depends on:** BL-01  
**Status:** **Closed** — registry updated; 39/39 surfaces pass `evaluate:ui-matrix`

---

## Problem

The UI evaluation surface registry listed core auth routes but omitted several user-reachable Neon Auth surfaces (`/join`, email-otp, magic-link). Future UI work could miss trust notices, copy, or Storybook coverage for those paths.

---

## Issues to close

- ~~`/join` not in `UI_SURFACE_REGISTRY`~~ → added `client-join`.
- ~~`/auth/email-otp` and `/auth/magic-link` not registered~~ → added.
- ~~`recover-account` and `two-factor` SDK paths without documentation~~ → documented as N/A in validation matrix (features off).
- `neonAuthUiApplicationName` exported but not passed to UI provider — **by design**; Neon Console sets email display name (BL-05).

---

## Expectation

Every production auth surface has a registry entry linking route → component → copy block → branch feature flag — so reviewers can confirm nothing is orphaned.

---

## Definition of done

- [x] Registry includes: `/join`, `/auth/email-otp`, `/auth/magic-link`, `/auth/accept-invitation` (with note: prefer `/join`).
- [x] Each entry has `surfaceId`, `domain`, `route`, `currentComponent`.
- [x] `org-login` surface registered for operator org sign-in entry.
- [x] `npm run evaluate:ui-matrix` — 39 surfaces scored and implementation-tracked.
- [x] Validation matrix AuthView table updated.
- [x] Orphan `portal-invitation-neon-view.tsx` removed (superseded by `PortalInvitationJoinPage`).

---

## Test & verification

| Layer | Command / action | Pass criteria |
| --- | --- | --- |
| Registry | `npm run evaluate:ui-matrix` | PASS — 39/39 |
| Manual | Crosswalk registry vs validation matrix | All J1–J7 routes listed |
| Storybook | `stories/ui-evaluation/auth-shell.stories.tsx` | Auth shell layout review available |

---

## Surfaces added

| surfaceId | route |
| --- | --- |
| `client-join` | `/join` |
| `auth-email-otp` | `/auth/email-otp` |
| `auth-magic-link` | `/auth/magic-link` |
| `auth-accept-invitation` | `/auth/accept-invitation` |
| `org-login` | `/auth/sign-in?from=org` |
