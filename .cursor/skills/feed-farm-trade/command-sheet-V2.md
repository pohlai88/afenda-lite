# Feed Farm Trade — P3 Ops Series Command Sheet (V2)

**Purpose:** Run Phase 3 ops safely after Enterprise MVP is claimable — flag-off protection first, promotion only with gate-register + explicit human approval.

**Authority:** [gate-register](../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) · [RUNTIME](../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) · [phase 14](../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md)  
**Sibling sheet:** [command-sheet.md](command-sheet.md) (post-MVP A–J). Use `HOTFIX_TRADE` from that sheet for frozen-MVP code defects — not this series.

**Baseline (do not re-litigate):** P0+P1 claimable · P2-AC-01..06 done · trade unit/registry green · P3 prod flags **false** · AC-OPS-02 **BLOCKED** until promotion.

```text
Default action: stop after status unless a named ungated write or named FLAG promotion is authorized.
Do not invent polish ACs, reopen P1, or enable flags to keep the agent busy.
```

---

## Locked context

```text
PRODUCT: Feed Farm Trade · ENGINE: Feed Farm Trade · PHASE: P3 ops flags
DEFAULT: every P3 FFT_* ops flag = false (prod and local unless TASK says otherwise)
ACTIVATION: one named flag at a time · never bundle modules
AUTH: requireFftPermission(code) only — never role display names
WRITE RULE: flag false → server write fail-closed (UI hide alone = FAIL)
FRONTEND: placeholder / unavailable while flag false
ROLLBACK: flag=false → env:compose → sync:vercel (if prod) → redeploy → smoke
CLOSED: 2D-3 vendor packs · invent flags/perms · FftShell · ui-registry.json agent edits ·
        mix P3 into P1/P2 PRs · customer ERP adapter without contract
```

### Canonical flags (do not invent)

| Module | Flag | Notes |
|--------|------|-------|
| Deposit | `FFT_DEPOSIT_ENABLED` | ADR-002 / 2B |
| Pickup | `FFT_PICKUP_OPS_ENABLED` | ADR-002 / 2B |
| Notifications | `FFT_NOTIFICATIONS_ENABLED` | ADR-003 / 2C — outbound only |
| ERP sync | `FFT_ERP_SYNC_ENABLED` | ADR-004 / 2D — **not** 2D-3 vendor |
| Imports | *(no dedicated enable flag)* | Dry-run always; **confirm** gated by type→perm; deposit/pickup import types also need those module flags |

Suggested promote order (unless gate-register differs): **deposit → pickup → imports confirm paths → notifications → ERP retry**.

---

## Load order

```text
1. SKILL.md → completeness.md → enterprise-readiness-and-gaps.md → verify.md
2. action-map.md (P3) → rbac-card.md
3. docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md
4. docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md → docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md
5. testing/README.md (identities — SHARED_ADMIN ≠ sales allowlist)
+ FE wire: example-slice.md · ui-registry.md · /feed-farm-trade skill
```

---

## DoD (P3)

```text
[ ] Named F-OPS-* / AC-OPS-* from phase 14 (not invented)
[ ] FLAG from table above (imports: type→perm + dependent module flags)
[ ] action-map + rbac-card row match
[ ] Flag-off blocks server write (AC-OPS-01)
[ ] Flag-on still enforces permission
[ ] UI does not imply write while flag false
[ ] Focused tests + modules/fft green
[ ] Evidence in verify.md format
[ ] Gate-register updated only from observed evidence
[ ] Rollback path stated; no 2D-3 / registry / shell expansion
```

---

## Output contract

```text
## Load confirmation
- Command: · Target/FLAG: · IDs: · Files read:

## Assumptions
- none | …

## Plan
1. …
→ Executing unless locked rule blocks.

## Work
- …

## Verification
| Check | Command | Result |

## Evidence
### AC-OPS-01 | AC-OPS-02 | F-OPS-…
Given / When / Then / Evidence / Result: PASS|FAIL|BLOCKED

## DoD checklist
- [x]/[ ]

## Production state
- Flag: · Env: · Changed: yes|no · Rollback:

## Stop / ask
- …
```

---

## Stages (compressed)

```text
LOCAL (no prod)
  P3-1 STATUS  →  P3-2 GATE_WRITE*  →  P3-3 VERIFY_FLAG_OFF
PREP (docs only)
  P3-4 PREP_PROMOTE
CONTROLLED (explicit auth)
  P3-5 CONTROLLED_RUN
PROD (explicit auth naming FLAG + production)
  P3-6 PROD_DECISION  →  P3-7 PROD_ENABLE
EMERGENCY
  P3-8 ROLLBACK  →  HOTFIX_TRADE (main sheet) if code defect
```

\* Repeat **P3-2** once per mutation path. Never gate deposit+pickup+ERP in one turn.

---

## P3-1 — Status (eval only)

**Merges:** former Ops Status + Placeholder Audit.

```text
/feed-farm-trade

COMMAND: P3_STATUS
MODE: evaluation only — no code · no flag changes
FOLLOW: P3 Ops Series V2 (locked context + load order + DoD + output contract)
READ: phase 14 + action-map P3 + completeness + verify + RUNTIME + gate-register
DO:
1. List each F-OPS-* surface; classify:
   placeholder | read-only | wired+gated | wired+ungated | blocked
2. Map writes: route → feature → action → permission → FLAG (or import type→perm).
3. FAIL any active-looking control whose write is flag-off / unavailable.
4. FAIL if UI hide is the only write protection.
5. Grade AC-OPS-01; keep AC-OPS-02 BLOCKED unless gate-register proves promotion.
6. Rank gaps by production-write risk (ungated write = P0).
OUT: Short verdict first. Gap table. Next command recommendation only.
```

**First command** when entering P3. Stop here if no ungated writes and no named promotion intent.

---

## P3-2 — Gate one write (local code)

```text
/feed-farm-trade

COMMAND: P3_GATE_WRITE
MODE: local code only — production flags stay false
FOLLOW: P3 Ops Series V2
TARGET: <one action or path: deposit | pickup | import-confirm:<type> | notification-send | erp-retry>
FLAG: <from canonical table; omit only for import types without a module flag>
IDS: <existing F-OPS-* / AC-OPS-*>
DO:
1. Confirm TARGET/FLAG/IDS/action-map/permission exist — STOP if inventing.
2. Smallest failing test for flag-off write gap.
3. Assert feature flag before mutation; keep requireFftPermission.
4. Tests: flag=false→block · flag=true+unauth→deny · flag=true+auth→allow (test env).
5. No new FE unless TASK names an existing F-OPS-* surface; no registry edits.
6. Run focused tests + npm run test:unit -- modules/fft.
7. Record AC-OPS-01 evidence.
OUT: Minimal diff (action/domain/tests only).
TASK: <one sentence>
```

---

## P3-3 — Flag-off matrix (verify)

```text
/feed-farm-trade

COMMAND: P3_VERIFY_FLAG_OFF
MODE: verification — fix only if TASK authorizes
FOLLOW: P3 Ops Series V2
FLAGS: <one or more canonical P3 flags>
DO:
1. Confirm FLAGS resolve false in the verification env.
2. npm run test:unit -- modules/fft (+ focused P3 action tests).
3. Assert each P3 write returns documented disabled/unavailable.
4. Spot-check P1 event/order/allocation/transfer still work.
5. If FE touched: npm run check:fft-ui-registry.
6. Record AC-OPS-01 matrix evidence. No Vercel sync.
OUT: Pass/fail matrix by flag × action.
```

| Condition | Expected |
|-----------|----------|
| Flag false, any user | No write |
| Flag true, unauthorized | Permission denied |
| Flag true, authorized (test env) | Write allowed |
| P1 path | No regression |

---

## P3-4 — Prep promote (docs only)

**Merges:** former Promotion Readiness + Prep Gate Register.

```text
/feed-farm-trade

COMMAND: P3_PREP_PROMOTE
MODE: ops docs only — no deploy · no flag sync
FOLLOW: P3 Ops Series V2
FLAG: <one canonical FFT_*>
MODULE: <deposit | pickup | import | notification | erp-retry>
DO:
1. Read living gate-register section for FLAG — extract requirements; do not invent gates.
2. Reconcile observed evidence (tests, AC-OPS-01, FE state, identities, rollback).
3. Fill checklist fields only from evidence: commits, commands, results, env, smoke, rollback.
4. Verdict: READY | NOT READY | BLOCKED + exact blockers.
5. AC-OPS-02 stays BLOCKED. Production remains false. 2D-3 stays closed.
OUT: Human-review checklist + go/no-go for controlled enable.
```

Requires human review before **P3-5**.

---

## P3-5 — Controlled run (enable + evidence)

**Merges:** former Controlled Enable + Controlled Evidence.  
**Requires:** `AUTHORIZATION:` naming FLAG + non-prod env.

```text
/feed-farm-trade

COMMAND: P3_CONTROLLED_RUN
MODE: controlled non-production only
FOLLOW: P3 Ops Series V2
FLAG: <one FFT_*>
TARGET_ENV: <preview | staging | approved controlled>
AUTHORIZATION: <paste explicit human approval>
DO:
1. STOP if AUTHORIZATION missing/vague ("continue", "proceed", "looks good").
2. Confirm gate-register allows controlled enable; FLAG is the only P3 flag changed.
3. Record prior env value + deploy ref → set FLAG=true in TARGET_ENV only (RUNTIME workflow).
4. Deploy TARGET_ENV; run exact gate-register smoke (auth / unauth / audit / P1 / failure).
5. On any required fail: FLAG=false → redeploy → record rollback evidence.
6. Capture: deploy ID, SHA, effective flag, identity classes (no secrets), scenario results.
OUT: CONTROLLED PASS | ROLLED BACK | BLOCKED — evidence ready for gate-register.
```

No production changes.

---

## P3-6 — Production go/no-go (eval only)

```text
/feed-farm-trade

COMMAND: P3_PROD_DECISION
MODE: go/no-go — no production changes
FOLLOW: P3 Ops Series V2
FLAG: <one FFT_*>
DO:
1. Require P3_CONTROLLED_RUN = PASS evidence.
2. Require living gate-register approvals present.
3. Confirm rollback operator + command, DB/schema prereqs, identities, observation plan.
4. Confirm no other P3 flag bundled.
5. Grade GO | NO-GO | BLOCKED. Do not enable.
OUT: One-page decision.
```

---

## P3-7 — Production enable (+ immediate verify)

**Merges:** former Production Enable + Post-Enable Verify.  
**Requires:** `AUTHORIZATION:` naming exact FLAG **and** production.

```text
/feed-farm-trade

COMMAND: P3_PROD_ENABLE
MODE: production promotion
FOLLOW: P3 Ops Series V2
FLAG: <one FFT_*>
AUTHORIZATION: <paste approval naming FLAG + production>
DO:
1. Confirm P3_PROD_DECISION = GO and AUTHORIZATION is explicit (not "ship it" / "continue").
2. Record current prod deploy + flag value → set only FLAG=true (env:compose → sync:vercel per RUNTIME).
3. Redeploy production; run gate-register post-enable smoke.
4. Verify: auth write · unauth deny · audit · P1 regression · no cross-module activation.
5. On critical fail: immediate FLAG=false → sync → redeploy → rollback smoke.
6. Record AC-OPS-02 evidence. Do not start a second flag.
OUT: ENABLED | ROLLED BACK | BLOCKED.
```

---

## P3-8 — Emergency rollback

```text
/feed-farm-trade

COMMAND: P3_ROLLBACK
MODE: production rollback only — no code patch in this command
FOLLOW: P3 Ops Series V2
FLAG: <enabled FFT_*>
INCIDENT: <one sentence>
DO:
1. Record deploy + effective flag → FLAG=false → compose/sync → redeploy.
2. Verify: P3 write unavailable · P1 healthy · no other P3 flag changed.
3. Record incident + rollback deploy evidence.
4. Code defect → separate HOTFIX_TRADE (main command sheet); then re-enter at P3-3 or P3-4.
OUT: ROLLBACK PASS | FAIL.
```

---

## Quick picker

| Goal | Command |
|------|---------|
| Enter P3 / see gaps | **P3-1** `P3_STATUS` |
| Close one ungated write | **P3-2** `P3_GATE_WRITE` |
| Prove AC-OPS-01 | **P3-3** `P3_VERIFY_FLAG_OFF` |
| Checklist before any enable | **P3-4** `P3_PREP_PROMOTE` |
| Preview/staging enable + proof | **P3-5** `P3_CONTROLLED_RUN` |
| Prod go/no-go | **P3-6** `P3_PROD_DECISION` |
| Prod enable + verify | **P3-7** `P3_PROD_ENABLE` |
| Kill switch | **P3-8** `P3_ROLLBACK` |

---

## Anti-variance

```text
1. One FLAG per promotion command.
2. AC-OPS-02 never PASS without gate-register + post-enable evidence.
3. Imports: no fake FFT_IMPORT_ENABLED — use type→perm (+ module flags when required).
4. Do not infer production approval from casual language.
5. Do not edit ui-registry.json or invent FFT-UI / permission / flag names.
6. Do not remount FftShell or open 2D-3.
7. If status is clean and no promotion intent → STOP.
```

---

## First paste

```text
/feed-farm-trade

COMMAND: P3_STATUS
MODE: evaluation only — no code and no flag changes
FOLLOW: P3 Ops Series V2 (locked context + load order + DoD + output contract)
READ: phase 14 + action-map P3 + completeness + verify + RUNTIME + gate-register
DO:
1. Classify every F-OPS-* surface (placeholder | read-only | wired+gated | wired+ungated | blocked).
2. Map writes: route → feature → action → permission → FLAG (imports: type→perm).
3. Grade AC-OPS-01; AC-OPS-02 BLOCKED unless gate-register proves promotion.
4. Rank gaps by write risk; recommend at most one next command.
5. No code or production flag changes.
OUT: Short verdict first. Gap table.
```
