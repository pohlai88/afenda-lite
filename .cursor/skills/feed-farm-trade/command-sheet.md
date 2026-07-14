# Feed Farm Trade — agent command sheet (copy-paste)

**Purpose:** Paste one block below into a new agent turn so FFT work loads the same skills, docs, forbids, and done-bar every time — no omitted steps, no soft “seems done,” no scope drift.

**Program state (2026-07-11):** Enterprise MVP **claimable** (P0 + P1 + G1–G9 AC evidence). P2 polish AC-01..06 **done**. P3 = flag-off placeholders; prod `FFT_*` ops flags stay **false** until gate-register.

**How to use**

1. Copy **exactly one** command block (A–J).  
2. Paste as the **first** user message (or attach `/feed-farm-trade` and paste the block).  
3. Do not edit the locked sections unless you intentionally change program policy.  
4. Optional: append a short **TASK** line under the block (one sentence).

---

## Locked context (always true — do not contradict)

```text
PRODUCT: Feed Farm Trade (UI/nav) · ENGINE: Feed Farm Trade (FFT_*) · SHELL: feed-farm-trade
MVP BAR: P0 + P1 including G1–G6 + recorded AC evidence — CLAIMABLE (do not re-open as greenfield)
P2: AC-01..06 DONE — further polish only with named P2-AC-* + Plan for visual
P3: flag-off default · AC-OPS-01 required · AC-OPS-02 only after gate-register · no invent checklists
NOT IN SCOPE: customer portal · locale product URLs · FFT_* rename · 2D-3 vendor packs ·
              org-admin⇒trade · Trade↛Declarations · FftShell · /fft/[locale] chrome
FORBID: invent permission codes · invent FFT-UI / FFT-QA ids · agent-edit ui-registry.json ·
         claim MVP without AC evidence · mix P3 writes into P1 PRs · enable prod flags without gate-register ·
         remount FftShell / locale switcher
AUTH: permission codes via requireFftPermission — never role display names
SLICE: app/fft thin RSC → features/fft → app/actions/fft.ts → modules/fft
CHROME: AdminCnShell only · FFT_UI_LOCALE for action locale arg · paths locale-free
UI: compose approved FFT-UI-* + allowlisted ACN-UI-* from ui-registry.json; ACN-BLK-* = catalog DNA only;
    new product ID = human HITL; never agent-edit registry; Vitest backstop
TEST ID: SHARED_ADMIN_EMAIL ≠ sales allowlist · PREVIEW_CLIENT_EMAIL not auto-seeded into fft_sales_member
```

---

## Skill + doc load order (mandatory)

Agent must read in this order before coding or claiming results:

```text
1. .cursor/skills/feed-farm-trade/SKILL.md
2. .cursor/skills/feed-farm-trade/completeness.md   (current wire status)
3. .cursor/skills/feed-farm-trade/enterprise-readiness-and-gaps.md
4. .cursor/skills/feed-farm-trade/verify.md         (evidence log + commands)
5. .cursor/skills/feed-farm-trade/slice-playbook.md (if implementing)
6. .cursor/skills/feed-farm-trade/action-map.md     (if implementing / reviewing actions)
7. .cursor/skills/feed-farm-trade/rbac-card.md      (if touching auth)
8. .cursor/skills/feed-farm-trade/example-slice.md  (before any new FE wire)
9. Phase doc matching the command:
   - P0 → docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md
   - P1 → docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md
   - P2 → docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md
   - P3 → docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md
10. If locks unclear: docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md
11. If structure unclear: docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md
12. Roadmap/gaps: docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md
13. Ops flags / promote: docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md + docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md
```

Cross-skills only when the playbook says so: `afenda-elite-api-contract`, `afenda-elite-frontend-scaffold`, `afenda-elite-backend-modules`, `admincn-customization`, `incremental-implementation`, `test-driven-development`.

---

## Definition of Done (no variance)

A slice is **done** only when **all** are true:

```text
[ ] Named Phase + F-* / AC-* / G-* / P2-AC-* IDs from the phase doc (not invented)
[ ] action-map row matched (route · feature · action · gate) when mutations touched
[ ] Permission code enforced (rbac-card); no role-name auth
[ ] Vertical slice intact (no raw SQL in actions; no own /api fetch from RSC)
[ ] Residue check clean: no FftShell / locale-switcher product chrome
[ ] verify.md commands run for touched AC
[ ] AC evidence recorded in Given/When/Then or one-liner format from verify.md
[ ] completeness.md updated if wire status changed
[ ] Scope matches this command (no silent P2/P3/prod-flag expansion)
```

Enterprise MVP is already claimable — do **not** re-litigate wiring as “not done” without failing evidence. New work still needs Evidence for touched ACs.

---

## Output contract (every response)

Agent must structure the reply as:

```text
## Load confirmation
- Phase: …
- IDs: …
- Files read: (list)

## Assumptions
- … (or “none”)

## Plan
1. …
→ Executing unless redirected.

## Work
- … (or evaluation results)

## Evidence
### AC-…
Given: …
When: …
Then: …
Evidence: …
Result: PASS | FAIL | BLOCKED

## DoD checklist
- [x]/[ ] each item from Definition of Done

## Stop / ask
- … (only if blocked)
```

If anything in **Locked context** conflicts with the task → **STOP** and ask. Do not silently reinterpret.

---

## Command A — Status advise (no code)

```text
/feed-farm-trade

COMMAND: ADVISE_STATUS
MODE: evaluation only — do not write product code
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: SKILL.md → completeness.md → enterprise-readiness-and-gaps.md → verify.md evidence log → 001R
DO:
1. Summarize P0 / P1 / P2 / P3 / Later in one table (done · partial · gated · closed).
2. Cite EVALUATE_P1_MVP + P2-AC + REVIEW_P3 lines from verify.md (do not invent status).
3. List the only safe next moves (hotfix · named P2-AC · P3 review · gate-register prep).
4. Explicit: do not recommend remounting FftShell, customer portal, or prod flag enable.
OUT: Output contract. Short verdict first. No implementation.
```

---

## Command B — Re-verify enterprise MVP evidence (no code)

```text
/feed-farm-trade

COMMAND: REVERIFY_P1_MVP
MODE: evaluation only — do not write product code unless a test is broken and TASK authorizes fix
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: skill pack then docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md + verify.md
DO:
1. Run: npm run test:unit -- modules/fft
2. Run residue: rg "FftShell|locale-switcher" features/fft app/fft (redirect-only [locale] shim OK)
3. Confirm trade-p1-ac-gates + journey evidence still map to P1 AC rows.
4. Verdict: still YES / NO + blocker list. Do not reopen greenfield P1.
OUT: Output contract with Evidence section. No P2 polish / P3 flag work.
```

---

## Command C — Smoke + journey health (tests only)

```text
/feed-farm-trade

COMMAND: VERIFY_TRADE_HEALTH
MODE: run tests / report — product code only if TASK says fix failing tests
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: verify.md commands section + testing/README.md identities
DO:
1. npm run env:compose (if needed for E2E)
2. npm run test:unit -- modules/fft
3. npm run check:fft-ui-registry && npm run test:unit -- features/fft/ui-registry
4. Optionally: npm run test:e2e:smoke / npm run test:e2e:journey (cite @smoke / @journey)
5. Do not conflate SHARED_ADMIN_EMAIL with sales allowlist.
OUT: Output contract. Pass/fail table. No feature work.
TASK: <REPLACE: e.g. unit only | include journey>
```

---

## Command D — Production-blocking hotfix (frozen boundary)

```text
/feed-farm-trade

COMMAND: HOTFIX_TRADE
MODE: minimal fix on frozen MVP boundary — no scope expansion
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: SKILL.md + action-map.md + rbac-card.md + verify.md + RUNTIME.md (rollback notes if flag-related)
BUG: <REPLACE: one sentence symptom + route/action>
DO:
1. Reproduce with smallest failing test or cited journey step.
2. Fix only the broken path (permission, Zod, domain, thin page).
3. Do not add P3 writes, new RBAC codes, UI redesign, or registry edits.
4. Run focused verify.md commands; record Evidence for touched AC.
OUT: Output contract. Diff limited to fix + tests.
TASK: <REPLACE: one sentence>
```

---

## Command E — Named P2 polish only (UI)

```text
/feed-farm-trade

COMMAND: IMPLEMENT_P2_AC
MODE: UI polish only — no new domain/RBAC/actions unless required to keep P1 green
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md + ui-registry.md + admincn-customization
P2_AC: <REPLACE: e.g. P2-AC-07 — must be named; inventing IDs = STOP>
DO:
1. Confirm P2_AC exists in phase 13 or user explicitly opened a new named AC — else STOP.
2. Plan visual first if layout/hero/chrome; wait for approval when Plan mode required.
3. Compose approved FFT-UI-* / allowlisted ACN-UI-*; no hand visual CSS; no platform-views imports.
4. Re-run P1 unit gates touched by the change; keep residue clean.
5. Record Evidence for P2_AC; update completeness only if status changed.
OUT: Output contract. No prod FFT_* changes.
TASK: <REPLACE: one sentence>
```

---

## Command F — P3 ops review (no prod flag enable)

```text
/feed-farm-trade

COMMAND: REVIEW_P3
MODE: evaluation / gap report — do not set FFT_* true in production
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: action-map P3 + docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md + RUNTIME.md + gate-register.md
DO:
1. Grade AC-OPS-01 (flag-off writes blocked; P1 still works).
2. List F-OPS-* FE: placeholder vs wired; any ungated write = FAIL.
3. AC-OPS-02 = BLOCKED until gate-register promotion — do not invent checklist.
4. Cite living gate-register path only.
OUT: Output contract. Explicit: no prod flag changes.
```

---

## Command G — P3 flag-gate a write path (local/code only)

```text
/feed-farm-trade

COMMAND: IMPLEMENT_P3_FLAG_GATE
MODE: close ungated write gaps — do not enable production flags
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: phase 14 + action-map P3 + rbac-card + RUNTIME flag names + verify.md P3 tests
TARGET: <REPLACE: e.g. deposit | pickup | import confirm | ERP retry>
DO:
1. Confirm TARGET action exists; wrap writes with the correct FFT_* feature assert.
2. Preserve permission codes; do not invent new codes.
3. Add/adjust unit tests proving flag-off blocks writes (AC-OPS-01).
4. Leave FE as placeholder unless TASK explicitly wires a panel behind the same flag.
5. Run: npm run test:unit -- modules/fft (+ focused action tests); do not sync:vercel flags.
OUT: Output contract. Explicit: prod flags remain false.
TASK: <REPLACE: one sentence>
```

---

## Command H — Gate-register promotion prep (ops docs only)

```text
/feed-farm-trade

COMMAND: PREP_GATE_REGISTER
MODE: ops checklist prep — no code · no Vercel flag sync unless TASK explicitly says so
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md + RUNTIME.md + phase 14
FLAGS: <REPLACE: e.g. FFT_DEPOSIT_ENABLED>
DO:
1. Extract the living promotion steps for FLAGS from gate-register (do not invent).
2. List preconditions: RBAC on, dual-read notes, smoke matrix, rollback.
3. Call out 2D-3 / customer ERP adapter as still closed without approval.
4. If TASK does not authorize sync/deploy — stop after the checklist report.
OUT: Output contract. Ask before any sync:vercel or prod enable.
```

---

## Command I — UI registry / Studio-only (governance)

```text
/feed-farm-trade

COMMAND: UI_REGISTRY
MODE: governance — no product redesign unless TASK names a reusableId grant
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: ui-registry.md + ui-registry.json + admincn-customization skill + docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md
DO:
1. Compose only approved FFT-UI-* and allowlisted ACN-UI-*; ACN-BLK-* requires HITL product wrap.
2. Do not edit ui-registry.json (human HITL only). Do not invent ACN-* / FFT-UI-* IDs.
3. Run: npm run check:fft-ui-registry && npm run test:unit -- features/fft/ui-registry
4. SHADCN_STUDIO_ONLY: no hand-written visual CSS; no platform-views imports from features/fft product screens without HITL wrap.
5. Layer A ≠ Layer B ≠ visual QA. Layer B fail → remediate product/route code; do not dilute dna.
OUT: Output contract. Explicit: no prod FFT_* flag changes.
```

---

## Command J — Docs / skill sync check (no product code)

```text
/feed-farm-trade

COMMAND: BOOTSTRAP_SYNC_CHECK
MODE: documentation / skill consistency only — no product code
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: SKILL.md + completeness.md + enterprise-readiness-and-gaps.md + ADR 001/001A/001R + phase 11–14 + this command sheet
DO:
1. Confirm skill pack files exist and status lines agree (MVP claimable · P2 done · P3 gated).
2. Confirm phase docs 11–14 linked from 001R and skill SSOT table.
3. List drift only (broken links, contradictory status, RUNTIME path notes).
4. Propose doc/skill fixes as a list for approval — do not “fix” product code.
OUT: Output contract. Drift list ranked P0/P1.
```

---

## Legacy / residual (use only when explicitly reopening)

Greenfield P1 slice work is **closed** unless the user reopens a named F-\*/AC-\*. Prefer **D** (hotfix) or **E** (named P2-AC).

```text
# Residual reference only — not default picker
COMMAND: IMPLEMENT_P1_SLICE | CLOSE_AC_EVIDENCE | EVALUATE_P0
→ Require explicit reopen + SLICE_IDS / TARGET_ACS in TASK before coding.
```

---

## Anti-variance rules (paste with any command if the agent drifts)

```text
HARD RULES:
1. Do not redefine MVP. MVP = P0+P1+G1–G6+AC evidence — already claimable.
2. Do not treat completeness.md “wired” as new PASS without re-running evidence when claiming a change.
3. Do not authorize by role name or templateKey.
4. Do not restore FftShell or /fft/[locale] product chrome.
5. Do not start P3 prod enable or 2D-3 from a P1/P2 command.
6. Do not claim done without Evidence block matching verify.md.
7. If unsure: STOP and ask — do not invent F-*/AC-*/P2-AC-* IDs, permission codes, or FFT-UI/FFT-QA ids.
8. Do not edit ui-registry.json to green Vitest / check:fft-ui-registry — human HITL only.
9. Do not conflate SHARED_ADMIN_EMAIL with fft_sales_member allowlist.
```

---

## Quick picker

| Goal | Paste |
|------|--------|
| Status / what’s next | **A** `ADVISE_STATUS` |
| Re-prove MVP still green | **B** `REVERIFY_P1_MVP` |
| Unit + registry (+ optional E2E) | **C** `VERIFY_TRADE_HEALTH` |
| Production-blocking bug | **D** `HOTFIX_TRADE` |
| Named UI polish | **E** `IMPLEMENT_P2_AC` |
| Ops flag surfaces review | **F** `REVIEW_P3` |
| Close ungated P3 write | **G** `IMPLEMENT_P3_FLAG_GATE` |
| Promotion checklist prep | **H** `PREP_GATE_REGISTER` |
| UI registry / Studio DNA | **I** `UI_REGISTRY` |
| Docs/skill drift | **J** `BOOTSTRAP_SYNC_CHECK` |

**Skill home:** `.cursor/skills/feed-farm-trade/`  
**Phase specs:** `docs/architecture/11`–`14-feed-farm-trade-*.md`  
**Ops SSOT:** `docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md` · `docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md`
