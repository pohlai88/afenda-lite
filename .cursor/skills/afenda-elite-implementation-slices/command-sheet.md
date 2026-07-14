# Implementation — agent command sheet (copy-paste)

**Purpose:** Paste **one** block into a new Cursor Agent chat so each mission loads the same farms, locks, verify bar, and stop condition.

**How to use**

1. Open a **fresh** Agent chat (one `PHASE_ID` / `SLICE_ID` per chat).
2. Attach `/afenda-elite-implementation-slices`.
3. Paste **exactly one** block below.
4. Optional: one-line `TASK:` under the block (disk conflict, verify retry, etc.).
5. After green: stop · commit yourself if desired · new chat for the next block.

**Do not** paste multiple blocks. **Do not** ask the agent to “finish I1–I7 tonight.”

---

## Locked context (always true — do not contradict)

```text
PRODUCT: Afenda-Lite · QUALITY: enterprise production only
AUTHORITY: GUIDE-018 (Phase I) or ARCH-028 (scaffold residual only) + sibling docs from slice-map
LANE: per slice-map row (usually Ops)
PATHS: apps/web/** · packages/* only (Living greenfield)
FORBID: Collapse/legacy restore from git (app/ modules/ features/ components-V2/ root lib/ wiped scripts) — incl. git show mining — unless user names that recovery THIS turn
FORBID: shims · placeholders · throw-TODO · silent-null session · inventing ARCH-028 S9
FORBID: drizzle 0000 baseline migrate on br-tiny-hill-ao82jp6f
FORBID: FFT 2B–2D domain / mixed FFT product commits
COMMIT: only when user explicitly asks
```

---

## Universal load order

```text
1. .cursor/skills/afenda-elite-implementation-slices/SKILL.md
2. .cursor/skills/afenda-elite-implementation-slices/slice-map.md  (row for PHASE_ID / SLICE_ID)
3. docs/guides/GUIDE-018-fullstack-e2e-integration-program.md       (Phase I)
   OR docs/architecture/ARCH-028-implementation-slices.md          (S* residual)
4. Sibling ARCH/MOD/FFT files named in the slice-map row
5. Each farm SKILL.md listed in the LOAD column (in order)
6. Inventory disk → implement gap → verify → evidence → STOP
```

---

# Phase I — GUIDE-018 (current) — copy these

## N0 — Navigate (read-only)

```text
/afenda-elite-implementation-slices

MODE: navigate

Read GUIDE-018 You-are-here + slice-map progress hint.
Report: last closed PHASE_ID · next open PHASE_ID · farms to load · disk drift vs Living paths.
Do not implement. Do not edit files.
```

---

## N1 — Generic Phase I (any open stage)

```text
/afenda-elite-implementation-slices

PHASE_ID: {{I1.1}}

Lane: per slice-map. Implement only GUIDE-018 {{I1.1}}.
Follow skill workflow (parse → GUIDE-018 → slice-map → farms → implement → verify → evidence → STOP).
Use farms and sibling authority from slice-map.md for this PHASE_ID.
Do not start any other Phase I stage.
Report files · verify output · blockers. Do not commit unless I ask.
```

---

## P1 — I1.1 edge session gate `proxy.ts`

```text
/afenda-elite-implementation-slices

PHASE_ID: I1.1

Implement GUIDE-018 I1.1 only.
Authority: GUIDE-018 Phase I1 + ARCH-026 + ARCH-012 + ARCH-022.
LOAD: afenda-elite-nextjs-best-practice · neon-tenancy-efficiency.
Acceptance: greenfield apps/web/proxy.ts edge session gate; do not invent middleware.ts as product SSOT.
Guardian: Backend + Security (authn at edge).
Verify: protected routes redirect unauth; @afenda/web typecheck.
Update GUIDE-018 evidence for I1.1. STOP. No commit unless asked.
```

---

## P2 — I1.2 public `/auth/*`

```text
/afenda-elite-implementation-slices

PHASE_ID: I1.2

Implement GUIDE-018 I1.2 only.
Authority: GUIDE-018 Phase I1 + ARCH-026 · Neon Auth (shared provider only).
LOAD: afenda-elite-nextjs-best-practice · neon-tenancy-efficiency · afenda-elite-frontend-scaffold.
Acceptance: public /auth/login · forgot-password · reset-password via Neon Auth UI forms.
Guardian: Frontend + Security.
Verify: routes render; no custom SMTP; package/session helpers stay in @afenda/auth.
Update GUIDE-018 evidence. STOP.
```

---

## P3 — I1.3 `/join` + operator invite

```text
/afenda-elite-implementation-slices

PHASE_ID: I1.3

Implement GUIDE-018 I1.3 only.
Authority: GUIDE-018 Phase I1 + ARCH-026 + ARCH-023.
LOAD: afenda-elite-nextjs-best-practice · neon-tenancy-efficiency · afenda-elite-backend-modules.
Acceptance: /join?invitationId=… works; operator invite path uses @afenda/auth inviteOrgMember; Origin = production APP_URL rules.
Guardian: Full stack + authz.
Verify: invite→join happy path reproducible locally without production secrets in repo.
Update GUIDE-018 evidence. STOP.
```

---

## P4 — I1.4 fail-closed role shells

```text
/afenda-elite-implementation-slices

PHASE_ID: I1.4

Implement GUIDE-018 I1.4 only.
Authority: GUIDE-018 Phase I1 + ARCH-026 + ARCH-023.
LOAD: afenda-elite-nextjs-best-practice · neon-tenancy-efficiency.
Acceptance: unauthenticated → login; wrong role → /403; authed correct role reaches shell.
Guardian: Authz.
Verify: anonymous + wrong-role + happy path evidence (commands or browser).
Update GUIDE-018 I1 exit status when I1.1–I1.4 all green. STOP.
```

---

## P5 — I2.1 ActionResult / error brands

```text
/afenda-elite-implementation-slices

PHASE_ID: I2.1

Implement GUIDE-018 I2.1 only.
Authority: GUIDE-018 Phase I2 + ARCH-029 + API-002 + GUIDE-015.
LOAD: afenda-elite-api-contract · afenda-elite-backend-modules.
Acceptance: ActionResult / shared error brands on Target paths — real types, not stubs.
Verify: typecheck + contract honesty. Update GUIDE-018 evidence. STOP.
```

---

## P6 — I2.2 feature → domain → db boundary

```text
/afenda-elite-implementation-slices

PHASE_ID: I2.2

Implement GUIDE-018 I2.2 only.
Authority: GUIDE-018 Phase I2 + ARCH-024 + ARCH-029.
LOAD: afenda-elite-backend-modules · afenda-elite-api-contract.
Acceptance: features never import @afenda/db; feature → domain → @afenda/db only.
Verify: rg / boundary check green. Update GUIDE-018 evidence. STOP.
```

---

## P7 — I2.3 first authenticated write

```text
/afenda-elite-implementation-slices

PHASE_ID: I2.3

Implement GUIDE-018 I2.3 only.
Authority: GUIDE-018 Phase I2 + ARCH-023 + owning module spine.
LOAD: afenda-elite-backend-modules · afenda-elite-api-contract · neon-tenancy-efficiency.
Acceptance: first authenticated WRITE vertical (prefer Identity invite or Declarations — NOT FFT 2B).
Hard organization_id tenancy on the write path. Guardian full stack + validation.
Verify: end-to-end write under tenancy. Update GUIDE-018 evidence. STOP.
```

---

## P8 — I2.4 OpenAPI / REST sync

```text
/afenda-elite-implementation-slices

PHASE_ID: I2.4

Implement GUIDE-018 I2.4 only.
Authority: GUIDE-018 Phase I2 + ARCH-029 + GUIDE-015.
LOAD: afenda-elite-api-contract.
Acceptance: OpenAPI / REST sync gates honest (`pnpm check:openapi`).
Verify + GUIDE-018 I2 exit when I2.1–I2.4 green. STOP.
```

---

## P9 — I3.1 Identity / Platform deepen

```text
/afenda-elite-implementation-slices

PHASE_ID: I3.1

Implement GUIDE-018 I3.1 only.
Authority: GUIDE-018 Phase I3 + ARCH-023 + owning MOD.
LOAD: afenda-elite-backend-modules · afenda-elite-module-readiness · neon-tenancy-efficiency.
Acceptance: roles · assignments · RBAC audit beyond list ports.
Verify + evidence. STOP.
```

---

## P10 — I3.2 Declarations submit/read

```text
/afenda-elite-implementation-slices

PHASE_ID: I3.2

Implement GUIDE-018 I3.2 only.
Authority: GUIDE-018 Phase I3 + Declarations module + ARCH-023.
LOAD: afenda-elite-backend-modules · afenda-elite-module-readiness · neon-tenancy-efficiency.
Acceptance: client list → submit/read under hard tenancy.
Verify + evidence. STOP.
```

---

## P11 — I3.3 FFT read shell (freeze)

```text
/afenda-elite-implementation-slices

PHASE_ID: I3.3

Implement GUIDE-018 I3.3 only — FFT freeze envelope.
Authority: GUIDE-018 Phase I3 + FFT-MOD-008 Allowed/Forbidden.
LOAD: feed-farm-trade · afenda-elite-backend-modules.
Acceptance: operator read shell + Phase 2A RBAC only. FORBID 2B–2D domain reopen.
Verify + evidence. STOP.
```

---

## P12 — I3.4 Org-admin shell

```text
/afenda-elite-implementation-slices

PHASE_ID: I3.4

Implement GUIDE-018 I3.4 only.
Authority: GUIDE-018 Phase I3 + ARCH-015/018 if shell deepens.
LOAD: afenda-elite-frontend-scaffold · afenda-elite-backend-modules · admincn-customization (only if shell needs it).
Acceptance: operator UX composes Identity/Platform ports.
Verify + evidence. STOP.
```

---

## P13 — I4 verification factory

```text
/afenda-elite-implementation-slices

PHASE_ID: I4

Implement GUIDE-018 I4 only (Test lane).
Authority: GUIDE-018 Phase I4 + GUIDE-017 + testing/README.
LOAD: test-driven-development · bounded-agent-lanes.
Acceptance: forward-owned testing/e2e/* factories + tracked e2e/ specs; two-org denial; no Collapse tree recover; no production credentials in fixtures.
Verify: smoke runnable. Update GUIDE-018 evidence. STOP.
```

---

## P14 — I5.1 security / privacy / audit

```text
/afenda-elite-implementation-slices

PHASE_ID: I5.1

Implement GUIDE-018 I5.1 only.
Authority: GUIDE-018 Phase I5 + GUIDE-017 + ARCH-023.
LOAD: security-and-hardening · neon-tenancy-efficiency.
Acceptance: no open non-waivable isolation, secret, corruption, or unsafe-error condition — close or evidence BLOCKED honestly.
Verify + GUIDE-018 evidence. STOP.
```

---

## P15 — I5.2 resilience / restore

```text
/afenda-elite-implementation-slices

PHASE_ID: I5.2

Implement GUIDE-018 I5.2 only.
Authority: GUIDE-018 Phase I5 + GUIDE-017 + ARCH-025.
LOAD: neon-tenancy-efficiency.
Acceptance: restore/RPO/RTO path rehearsed or explicit blocker; 0000 baseline migrate remains banned.
Verify + evidence. STOP.
```

---

## P16 — I5.3 observability

```text
/afenda-elite-implementation-slices

PHASE_ID: I5.3

Implement GUIDE-018 I5.3 only.
Authority: GUIDE-018 Phase I5 + GUIDE-017.
LOAD: shipping-and-launch (method) as needed.
Acceptance: critical-path correlation; alerts map to runbooks when alerts exist.
Verify + evidence. STOP.
```

---

## P17 — I5.4 UX · a11y · i18n · perf

```text
/afenda-elite-implementation-slices

PHASE_ID: I5.4

Implement GUIDE-018 I5.4 only.
Authority: GUIDE-018 Phase I5 + GUIDE-017.
LOAD: afenda-elite-frontend-scaffold.
Acceptance: declared UX states + a11y/i18n/perf criteria with owners — do not invent numeric thresholds here.
Verify + evidence. STOP.
```

---

## P18 — I5.5 CI / supply chain / release gates

```text
/afenda-elite-implementation-slices

PHASE_ID: I5.5

Implement GUIDE-018 I5.5 only.
Authority: GUIDE-018 Phase I5 + GUIDE-017 + ARCH-022.
LOAD: bounded-agent-lanes · ci-cd-and-automation (method).
Acceptance: merge/deploy gates ordered and honest — no silent skip.
Verify + evidence. STOP.
```

---

## P19 — I5.6 simplification

```text
/afenda-elite-implementation-slices

PHASE_ID: I5.6

Implement GUIDE-018 I5.6 only.
Authority: GUIDE-018 Phase I5.
LOAD: code-simplification (method).
Acceptance: reduce accidental complexity without behavior change; suites stay green.
Verify + evidence. STOP.
```

---

## P20 — I6.1 module evidence ledgers

```text
/afenda-elite-implementation-slices

PHASE_ID: I6.1

Implement GUIDE-018 I6.1 only (Docs/Test).
Authority: GUIDE-018 Phase I6 + MOD-002 + owning *-MOD-009/*-MOD-010.
LOAD: afenda-elite-module-readiness · afenda-elite-doc-control.
Acceptance: ledger rows updated for claimed verticals — no readiness claim without rows.
Verify + evidence. STOP.
```

---

## P21 — I6.2 GUIDE-017 claim identity

```text
/afenda-elite-implementation-slices

PHASE_ID: I6.2

Implement GUIDE-018 I6.2 only.
Authority: GUIDE-018 Phase I6 + GUIDE-017.
LOAD: afenda-elite-module-readiness · shipping-and-launch.
Acceptance: claim identity filled (READY / CONDITIONALLY READY / NOT READY) with revision-bound evidence.
Verify + evidence. STOP.
```

---

## P22 — I6.3 production deploy health

```text
/afenda-elite-implementation-slices

PHASE_ID: I6.3

Implement GUIDE-018 I6.3 only.
Authority: GUIDE-018 Phase I6.
LOAD: shipping-and-launch.
Acceptance: Actions Deploy · Vercel READY · trusted Neon Auth domains confirmed with pasted evidence.
Verify + GUIDE-018 I6 exit when I6.1–I6.3 green. STOP.
```

---

## P23 — I7.1 doc integrity

```text
/afenda-elite-implementation-slices

PHASE_ID: I7.1

Implement GUIDE-018 I7.1 only (Normalize/Docs).
Authority: GUIDE-018 Phase I7 + DOC-001.
LOAD: afenda-elite-doc-integrity.
Acceptance: doc↔doc / register integrity run; residuals logged honestly.
Verify + evidence. STOP.
```

---

## P24 — I7.2 housekeeping → Slice D

```text
/afenda-elite-implementation-slices

PHASE_ID: I7.2

Implement GUIDE-018 I7.2 only.
Authority: GUIDE-018 Phase I7.
LOAD: afenda-elite-repo-housekeeping discovery → afenda-elite-monorepo-refactor for deletes only.
Acceptance: discovery complete; no ad-hoc deletes outside Slice D.
Verify + evidence. STOP.
```

---

## P25 — I7.3 deprecation register

```text
/afenda-elite-implementation-slices

PHASE_ID: I7.3

Implement GUIDE-018 I7.3 only.
Authority: GUIDE-018 Phase I7 + deprecation register.
LOAD: deprecation-and-migration (method).
Acceptance: retired names / banned surfaces not reintroduced.
Verify + evidence. STOP.
```

---

## P26 — I7.4 skill catalog honesty

```text
/afenda-elite-implementation-slices

PHASE_ID: I7.4

Implement GUIDE-018 I7.4 only.
Authority: GUIDE-018 Phase I7 + using-afenda-elite-skills catalog.
Acceptance: catalog honesty — extend before inventing farms; no forbidden/unapproved candidates.
Verify + evidence. STOP.
```

---

# ARCH-028 scaffold residual (coding closed)

Use only for re-verify or named residual. Prefer Phase I blocks above for new work.

## A — Generic ARCH-028 residual

```text
/afenda-elite-implementation-slices

SLICE_ID: {{S3.1}}

Lane: Ops. Residual ARCH-028 {{S3.1}} only — scaffold coding is closed; do not invent S9.
Follow skill workflow for S*. Update ARCH-028 evidence if re-verify changes facts.
STOP. No commit unless asked.
```

## M — ARCH-028 navigate (read-only)

```text
/afenda-elite-implementation-slices

MODE: navigate
PROGRAM: ARCH-028

Read ARCH-028 Acceptance checkboxes + Checkpoint G evidence.
Report: scaffold closed confirmation · next program PHASE_ID from GUIDE-018.
Do not implement. Do not edit files.
```

<details>
<summary>Legacy ARCH-028 copy-paste blocks (S3.1–S8.2) — historical</summary>

Scaffold is closed. Kept for archaeology / re-verify only.

### B — S3.1

```text
/afenda-elite-implementation-slices

SLICE_ID: S3.1

Implement ARCH-028 S3.1 only (residual).
Authority: ARCH-028 + ARCH-026.
LOAD: neon-tenancy-efficiency · afenda-elite-nextjs-best-practice.
Acceptance: getSession() returns Promise<Session> — never silent null.
Verify + ARCH-028 evidence. STOP.
```

### L — S8.2

```text
/afenda-elite-implementation-slices

SLICE_ID: S8.2

Residual ARCH-028 S8.2 only. Checkpoint G is DONE (Docs Living cutover).
Do not invent S9. Prefer GUIDE-018 Phase I for new work.
STOP.
```

</details>

---

## Session cheat card

| Step | Action |
|------|--------|
| 1 | Fresh Agent chat |
| 2 | `/afenda-elite-implementation-slices` |
| 3 | Paste **one** Phase I block (**P1** next = I1.1) |
| 4 | Let agent verify + write GUIDE-018 evidence |
| 5 | You review · commit · open next chat |

| Next up now | Paste block |
|-------------|-------------|
| Edge `proxy.ts` | **P1** (`PHASE_ID: I1.1`) |
| Auth UI | **P2** |
| Join / invite | **P3** |
| Role shells | **P4** |

| Anti-pattern | Instead |
|--------------|---------|
| One mega-chat for I1–I7 | One block per chat |
| “Also tidy docs/FFT” | New lane / waive serial order explicitly |
| Restore old `app/` from git | Greenfield Living paths |
| Invent ARCH-028 S9 | Use GUIDE-018 Phase I |
| Skip verify | Done bar requires green commands |
