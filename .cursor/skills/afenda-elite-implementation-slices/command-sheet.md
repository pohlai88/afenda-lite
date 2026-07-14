# ARCH-028 — agent command sheet (copy-paste)

**Purpose:** Paste **one** block into a new Cursor Agent chat so each Turborepo slice loads the same farms, locks, verify bar, and stop condition.

**How to use**

1. Open a **fresh** Agent chat (one slice per chat).
2. Attach `/afenda-elite-implementation-slices` (or type the slash name).
3. Paste **exactly one** block below.
4. Optional: one-line `TASK:` under the block (disk conflict, verify retry, etc.).
5. After green: stop · commit yourself if desired · new chat for the next slice.

**Do not** paste multiple slice blocks. **Do not** ask the agent to “finish S3–S8 tonight.”

---

## Locked context (always true — do not contradict)

```text
PRODUCT: Afenda-Lite · QUALITY: enterprise production only
AUTHORITY: docs/architecture/ARCH-028-implementation-slices.md (+ sibling ARCH from slice-map)
LANE: Ops (implement) — ARCH-028 Acceptance/evidence update for THIS slice is in-scope
PATHS: apps/web/** · packages/* only (Target greenfield)
FORBID: Collapse/legacy restore from git (app/ modules/ features/ components-V2/ root lib/ wiped scripts) — incl. git show mining — unless user names that recovery THIS turn
FORBID: shims · placeholders · throw-TODO · silent-null session · inventing ahead packages
FORBID: drizzle 0000 baseline migrate on br-tiny-hill-ao82jp6f
FORBID: FFT 2B–2D domain / mixed FFT product commits
COMMIT: only when user explicitly asks
```

---

## Universal load order

Agent must read in this order before coding:

```text
1. .cursor/skills/afenda-elite-implementation-slices/SKILL.md
2. .cursor/skills/afenda-elite-implementation-slices/slice-map.md  (row for SLICE_ID)
3. docs/architecture/ARCH-028-implementation-slices.md            (section for SLICE_ID)
4. Sibling ARCH files named in the slice-map row
5. Each farm SKILL.md listed in the slice-map LOAD column (in order)
6. Then inventory disk → implement gap → verify → evidence → STOP
```

---

## A — Generic (any open slice)

```text
/afenda-elite-implementation-slices

SLICE_ID: {{S3.1}}

Lane: Ops. Implement only ARCH-028 {{S3.1}}.
Follow skill workflow A–F (parse → ARCH-028 → slice-map → farms → implement → verify → evidence → STOP).
Use farms and sibling ARCH from slice-map.md for this SLICE_ID.
Do not start any other slice or checkpoint unless the slice-map pairs it (e.g. S3.2→C).
Report files · verify output · blockers. Do not commit unless I ask.
```

---

## B — S3.1 `packages/auth` session

```text
/afenda-elite-implementation-slices

SLICE_ID: S3.1

Implement ARCH-028 S3.1 only.
Authority: ARCH-028 + ARCH-026.
LOAD: neon-tenancy-efficiency · afenda-elite-nextjs-best-practice.
Acceptance: getSession() returns Promise<Session> — never silent null.
Greenfield packages/auth under packages/* — no Collapse auth restore.
Verify: package typecheck + session contract.
Update ARCH-028 Acceptance + Implement evidence. STOP. No commit unless asked.
```

---

## C — S3.2 RBAC + invitations · Checkpoint C

```text
/afenda-elite-implementation-slices

SLICE_ID: S3.2

Implement ARCH-028 S3.2 then close Checkpoint C in the same mission.
Authority: ARCH-028 + ARCH-026 + ARCH-023.
LOAD: neon-tenancy-efficiency · afenda-elite-nextjs-best-practice.
Acceptance: wrong role → /403; unauthenticated → /auth/login; Neon Auth SDK only inside @afenda/auth.
Checkpoint C: no Neon Auth imports in apps/web outside @afenda/auth; rg neon-auth-request apps/web = 0 after move.
Verify + ARCH-028 evidence. STOP.
```

---

## D — S4.1 `packages/env` · Checkpoint D

```text
/afenda-elite-implementation-slices

SLICE_ID: S4.1

Implement ARCH-028 S4.1 then Checkpoint D.
Authority: ARCH-028 + ARCH-027 (compose cutover section).
LOAD: afenda-elite-nextjs-best-practice.
Acceptance: typed import { env } from '@afenda/env'; no raw process.env for app config; compose retired in the SAME change set.
Checkpoint D: .env.local only for Next; compose scripts gone from package.json; AGENTS.md Living env matches Target.
If cutover conflicts with disk, surface Plan-mode questions once — do not leave dual env systems.
Verify + evidence. STOP.
```

---

## E — S5.1 `packages/ui` · Checkpoint E

```text
/afenda-elite-implementation-slices

SLICE_ID: S5.1

Implement ARCH-028 S5.1 then Checkpoint E.
Authority: ARCH-028 + ARCH-024 + ARCH-015.
LOAD: afenda-elite-frontend-scaffold · admincn-customization.
Acceptance: @afenda/ui Button + globals.css; no duplicate shadcn tree under apps/web/components/ui.
Checkpoint E: apps/web UI imports use @afenda/ui only.
Verify + evidence. STOP.
```

---

## F — S6.1 `packages/emails`

```text
/afenda-elite-implementation-slices

SLICE_ID: S6.1

Implement ARCH-028 S6.1 only.
Authority: ARCH-028 + ARCH-026.
LOAD: afenda-elite-nextjs-best-practice.
Acceptance: onboarding-invite + password-reset templates; pnpm --filter @afenda/emails email:dev previews.
Neon Auth shared provider remains the send path for Neon invites — templates may compose from @afenda/emails where app-owned mail applies.
Verify + evidence. STOP.
```

---

## G — S7.1 `apps/web` Next scaffold

```text
/afenda-elite-implementation-slices

SLICE_ID: S7.1

Implement ARCH-028 S7.1 only (greenfield S size unless tree already exists for L move).
Authority: ARCH-028 + ARCH-017 + ARCH-016 + ARCH-022.
LOAD: afenda-elite-frontend-scaffold · afenda-elite-nextjs-best-practice.
Acceptance: pnpm --filter @afenda/web dev on :3000; transpilePackages for @afenda/*; no ../../../packages imports.
Do not recover root app/ — Target apps/web only.
Verify + evidence. STOP.
```

---

## H — S7.2 route groups

```text
/afenda-elite-implementation-slices

SLICE_ID: S7.2

Implement ARCH-028 S7.2 only.
Authority: ARCH-028 + ARCH-012 + ARCH-026.
LOAD: afenda-elite-frontend-scaffold · afenda-elite-nextjs-best-practice · neon-tenancy-efficiency.
Acceptance: (public) (operator) (client) groups; / public; /admin and /client/dashboard guarded via requireRole.
Thin real layouts that enforce auth — not fake pages.
Verify + evidence. STOP.
```

---

## I — S7.3 domain modules

```text
/afenda-elite-implementation-slices

SLICE_ID: S7.3

Implement ARCH-028 S7.3 only.
Authority: ARCH-028 + ARCH-006 + ARCH-023 + ARCH-024.
LOAD: afenda-elite-backend-modules · neon-tenancy-efficiency.
Acceptance: identity · declarations · fft · platform — each at least one domain function taking orgId: string; DB only via @afenda/db public surface; typecheck passes.
No FFT 2B–2D product reopen — shell/module shape only as ARCH-028 requires.
Verify + evidence. STOP.
```

---

## J — S7.4 features · Checkpoint F

```text
/afenda-elite-implementation-slices

SLICE_ID: S7.4

Implement ARCH-028 S7.4 then Checkpoint F.
Authority: ARCH-028 + ARCH-013 + ARCH-029.
LOAD: afenda-elite-frontend-scaffold · afenda-elite-backend-modules · afenda-elite-api-contract.
Acceptance: features auth · declarations · fft · org-admin — RSC calls domain, not DB; features never import @afenda/db directly.
Checkpoint F: turbo run build + typecheck = 0; no pg; no lib/auth|env|db under apps/web.
Smoke: pnpm --filter @afenda/web test:e2e:smoke when e2e tree exists.
Verify + evidence. STOP.
```

---

## K — S8.1 CI

```text
/afenda-elite-implementation-slices

SLICE_ID: S8.1

Implement ARCH-028 S8.1 only.
Authority: ARCH-028 + ARCH-022.
LOAD: bounded-agent-lanes (keep CI mission single-purpose).
Acceptance: .github/workflows/ci.yml runs turbo lint typecheck test; green on clean branch; TURBO_TOKEN available for remote cache.
Verify + evidence. STOP.
```

---

## L — S8.2 Deploy · note Checkpoint G

```text
/afenda-elite-implementation-slices

SLICE_ID: S8.2

Implement ARCH-028 S8.2 only (deploy workflow).
Authority: ARCH-028 + ARCH-022.
Acceptance: deploy workflow builds @afenda/web then Vercel prod; Corepack/pnpm knobs; production deploy succeeds when secrets present.
Checkpoint G (Target→Living ARCH Status + doc retirement) is a SEPARATE Docs-lane mission — do not mass-edit DOC-002 Status in this turn unless I explicitly start a Docs lane.
Verify + evidence. STOP.
```

---

## M — Status / next-slice navigator (read-only)

```text
/afenda-elite-implementation-slices

MODE: navigate

Read ARCH-028 Acceptance checkboxes + slice-map progress hint.
Report: last closed slice/checkpoint · next open SLICE_ID · farms to load · any disk drift vs Target.
Do not implement. Do not edit files.
```

---

## Session cheat card

| Step | Action |
|------|--------|
| 1 | Fresh Agent chat |
| 2 | `/afenda-elite-implementation-slices` |
| 3 | Paste one block (B–L) or Generic A with SLICE_ID filled |
| 4 | Let agent verify + write ARCH-028 evidence |
| 5 | You review · commit · open next chat |

| Anti-pattern | Instead |
|--------------|---------|
| One mega-chat for S3–S8 | One block per chat |
| “Also tidy docs/FFT” | New lane / new skill |
| Restore old `app/` from git | Greenfield Target paths |
| Skip verify | Done bar requires green commands |
