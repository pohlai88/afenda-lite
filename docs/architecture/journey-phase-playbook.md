# Journey-phase playbook — preflight + auto-enrichment

| Field | Value |
|-------|-------|
| **Mode** | Internal guide |
| **Audience** | Engineers + coding agents |
| **Status** | Active — 2026-07-10 |
| **Authority** | This file is the agent operating SSOT for one-phase shipping |

---

## What this document enables

Pick one user journey phase, run preflight, implement the full vertical slice (route → UI → server action → domain → Neon) in a single pass, then verify. No open-ended debug loops. No half-stack merges. No cross-phase mixing.

---

## Operating contract (vibe coding)

```
Pick phase → run preflight → implement (FE + BE + Security) → verify → done
                                           ↑
                        auto-enrich missing side in same pass
```

| Rule | Detail |
|------|--------|
| **One phase per pass** | One agent turn, one PR — no cross-phase mixing |
| **Preflight first** | Every checklist item in that phase must be confirmed before the first line of code |
| **Auto-enrich** | FE without BE → add action + domain; BE without UI → add page/feature; stale docs → update — all in the same pass |
| **Verify or replan** | If a verify command fails, stop, state the evidence, propose a replan — do not enter exploratory debug |
| **Lane discipline** | See [`bounded-agent-lanes`](../../.cursor/skills/agent-skills/skills/bounded-agent-lanes/SKILL.md) |

---

## Phase map

| Phase ID | User journey | Canonical routes | Slice SSOTs | Status |
|----------|-------------|-----------------|-------------|--------|
| `pre-login` | Guest landing · Neon auth sign-in / sign-up / reset · org and client entry points · public and secure links · legacy invite redirect | `/` `/auth/*` `/org/login` `/client/login` `/invite/[token]` `/f/[token]` `/survey/[slug]` | [s1](slices/s1-auth-boundary.md) · [s5](slices/s5-share-access.md) · [ADR-Auth-UI-001](adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) | Re-verified 2026-07-10 — Studio + Neon; docs/stack map corrected |
| `join` | Operator invites client → Neon Auth org invitation email → `/join` OTP flow → accept → session established | `/join?invitationId=` | [s6](slices/s6-client-identity.md) · [invitation runbook](../runbooks/client-invitation-sign-in-journey.md) | Stabilized 2026-07-10 |
| `onboarding` | First authenticated session → onboarding wizard → profile row persisted → portal acknowledgement | `/client/onboarding` | [s6](slices/s6-client-identity.md) · [remaining-development](remaining-development.md) | Stabilized stub 2026-07-10 — wizard tombstoned; unavailable page (no redirect loop); backend retained |
| `client-post-login` | Client home · portal ACK gate · declare assignment · submit · confirmation receipt | `/client` `/client/profile` `/client/declare/[id]` | [s7](slices/s7-client-assignments.md) · [s4](slices/s4-submission-engine.md) | Stabilized stub 2026-07-10 — unavailable pages (no `/` ↔ `/client` loop); backend + declare logic retained; product UI deferred |
| `operator-post-login` | AdminCN dashboard · client list · declaration detail · submission review | `/dashboard` `/dashboard/clients` `/dashboard/[id]` | [s3](slices/s3-operator-crud.md) · [s8](slices/s8-operator-review.md) · [admincn-preflight](admincn-frontend-preflight.md) | Product live 2026-07-10 — detail rebuilt into portal-views |
| `hot-sales` | Trade shell — events, orders, allocations, deposits, ERP sync | `/trade/*` | [RUNTIME.md](../hot-sales/RUNTIME.md) | 2A closed · 2B–2D gated — stop and ask |

---

## Per-phase template

### a. E2E happy path
Numbered user steps from unauthenticated entry to the success state.

### b. Full-stack layer map

```
Frontend
  app/[route]/page.tsx           ← thin shell; no business logic
  → lib/entry/* or lib/pages/*  ← server runner: data fetch, redirect logic
  → features/* or
    components-V2/platform-views/portal-views/*  ← feature UI component

Backend
  app/actions/*.ts               ← server actions: Zod parse + requireSession
  → lib/domain/*.ts              ← SQL only; no JSX, no HTTP
  → Neon (neondb · br-tiny-hill-ao82jp6f)

Security
  proxy.ts                       ← session gate or named bypass
  lib/auth/session.ts            ← requireAdminSession / requireClientSession
  lib/schemas/*.ts               ← Zod input contracts
  lib/domain/*                   ← parameterized queries only — no string interpolation
```

### c. Preflight checklist

- [ ] Route exists and delegates to the correct entry / page runner — no logic in `app/` page file
- [ ] `proxy.ts` matcher or bypass is correct for this route
- [ ] Session guard present at layout level (workspace routes) or action level (mutations)
- [ ] Server actions import Zod schemas from `lib/schemas/`
- [ ] `lib/domain/` function exists before UI is wired
- [ ] Component placement follows [repo-layout.md](repo-layout.md)
- [ ] `loading.tsx` present on the route
- [ ] Copy comes from `portalCopy` (no hardcoded user-facing strings in feature UI)

---

## Phase 2 — `join`

**Status:** Stabilized 2026-07-10 — Studio + Neon on `/join`; production Guardian/portal join page+panel removed; Storybook retains `portal-invitation-join-brand-panel` + steps; interaction test under `features/auth/`.

**Slice SSOT:** [s6-client-identity](slices/s6-client-identity.md) · [invitation runbook](../runbooks/client-invitation-sign-in-journey.md)

### E2E happy path

1. Operator fills invite form on `/dashboard/clients` → `issueClientInviteAction` → `createClientInvitation` → Neon Auth org invitation email sent
2. Client clicks email link → `/join?invitationId=` → `lib/entry/client-invitation-entry.ts` → `features/auth/studio-invitation-join-page.tsx`
3. Client completes OTP / sets password → Neon Auth session → `bootstrapClientAfterAuth` → `client_invitations` + `client_profiles` rows created
4. Redirect to `/client/onboarding`

### Stack map (concrete files)

```
Frontend
  app/join/page.tsx                         → lib/entry/client-invitation-entry.ts
                                            → features/auth/studio-invitation-join-page.tsx
                                            → features/auth/invitation-join-panel.tsx
                                            → features/auth/invitation-join-steps.tsx
                                            → features/auth/use-join-invitation-auth-view.ts
  app/join/loading.tsx
  app/join/error.tsx

Operator invite (feeds join; operator-post-login surface)
  app/dashboard/clients/*                   → issueClientInviteAction (Zod)
                                            → lib/domain/clients.ts (createClientInvitation)
                                            → lib/email/send-client-onboarding-email.ts

Backend (post-auth bootstrap — not under app/actions)
  lib/auth/bootstrap-client-invite.ts       → bootstrapClientAfterAuth
                                            → ensureClientProfileRow + mark invitation accepted
  lib/domain/clients.ts                     → expirePendingInvitationIfNeeded (private; on ByToken/ByEmail lookup)

Security
  proxy.ts                                  ← /join public (matcher omission)
  lib/auth/session.ts                       ← requireAdminSession on issue/remove invite actions
  lib/schemas/client.ts                     ← issueClientInviteSchema
```

### Verify commands

```bash
npm run checks                              # sandbox invite token check
npm run test:unit                           # lib/entry/client-invitation-entry tests
npm run test:e2e:journey -- --grep "client-onboarding"
```

### Out of scope

- Onboarding wizard UI (Phase 3 — tombstoned)
- Client workspace dashboard (Phase 4 — stabilized stub; product UI deferred)

---

## Phase 3 — `onboarding`

**Status:** Stabilized stub 2026-07-10 — unavailable page (breaks `/` ↔ onboarding loop); wizard UI tombstoned; `saveClientOnboardingAction` + Zod + domain retained for rebuild.

**Slice SSOT:** [s6-client-identity](slices/s6-client-identity.md)

> **Wizard rebuild is deferred.** Do not restore `components/client/*` or start `features/client-workspace/` without an explicit rebuild-slice approval.

---

## Phase 4 — `client-post-login`

**Status:** Stabilized stub 2026-07-10 — unavailable pages; backend + declare logic retained; product UI deferred.

**Slice SSOT:** [s7](slices/s7-client-assignments.md) · [s4](slices/s4-submission-engine.md)

---

## Phase 5 — `operator-post-login`

**Status:** Product live 2026-07-10 — AdminCN dashboard + portal-views.

**Preflight:** [admincn-frontend-preflight.md](admincn-frontend-preflight.md)

---

## Phase 6 — `hot-sales`

**Status:** 2A closed · 2B–2D gated. **Stop and confirm** [gate-register](../hot-sales/ops/gate-register.md) before touching.

---

## Definition of Done (applies to every phase)

| Perspective | Pass criteria |
| --- | --- |
| **Frontend** | Route delegates to entry/page runner; feature component mounts; `loading.tsx` present; no inline business logic in `app/` page file |
| **Backend** | Zod-validated input; `requireSession` guard; domain-only DB access; no raw SQL in action layer |
| **Security** | `proxy.ts` matcher correct; session guard at layout for workspace routes; `sanitizeReturnToPath` on `returnTo`; parameterized queries only |
| **Integration** | `tsc --noEmit` clean for touched surfaces; relevant unit test passes; `npm run checks` passes; no half-stack residue |
