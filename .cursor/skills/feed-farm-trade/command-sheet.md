# Feed Farm Trade — agent command sheet (copy-paste)

**Purpose:** Paste one block below into a new agent turn so FFT work loads the same skills, docs, forbids, and done-bar every time — no omitted steps, no soft “seems done,” no scope drift.

**How to use**

1. Copy **exactly one** command block (A / B / C / D / E / F / G).  
2. Paste as the **first** user message (or attach `/feed-farm-trade` and paste the block).  
3. Do not edit the locked sections unless you intentionally change program policy.  
4. Optional: append a short **TASK** line under the block (one sentence).

---

## Locked context (always true — do not contradict)

```text
PRODUCT: Feed Farm Trade (UI/nav) · ENGINE: Hot Sales (HOT_SALES_*) · SHELL: feed-farm-trade
MVP BAR: P0 + P1 including G1–G6 + recorded AC evidence
NOT MVP: P2 further polish (named P2-AC only; AC-01..06 done) · P3 flag enable (gate-register) · customer portal
FORBID: TradeShell · /trade/[locale] product chrome · invent permission codes · rename HOT_SALES_* ·
         org-admin⇒trade · Trade↛Declarations · claim MVP without AC evidence ·
         mix P3 writes into P1 PRs · invent FFT-UI / FFT-QA ids · agent-edit ui-registry.json
AUTH: permission codes via requireTradePermission — never role display names
SLICE: app/trade thin RSC → features/trade → app/actions/trade.ts → modules/trade
CHROME: AdminCnShell only · TRADE_UI_LOCALE for action locale arg · paths locale-free
UI: compose approved FFT-UI-* + allowlisted ACN-UI-* from ui-registry.json; ACN-BLK-* = catalog DNA only;
    new product ID = human HITL; never agent-edit registry; Vitest backstop
```

---

## Skill + doc load order (mandatory)

Agent must read in this order before coding or claiming results:

```text
1. .cursor/skills/feed-farm-trade/SKILL.md
2. .cursor/skills/feed-farm-trade/slice-playbook.md
3. .cursor/skills/feed-farm-trade/action-map.md
4. .cursor/skills/feed-farm-trade/rbac-card.md
5. .cursor/skills/feed-farm-trade/verify.md
6. .cursor/skills/feed-farm-trade/example-slice.md   (before any FE wire)
7. Phase doc matching the command:
   - P0 → doc/frontend/11-feed-farm-trade-phase0-shell.md
   - P1 → doc/frontend/12-feed-farm-trade-phase1-core-mvp.md
   - P2 → doc/frontend/13-feed-farm-trade-phase2-ui-polish.md  (AC-01..06 done; further polish = named AC + Plan for visual)
   - P3 → doc/frontend/14-feed-farm-trade-phase3-ops-flags.md
8. If locks unclear: doc/frontend/adr/001-feed-farm-trade.md
9. If structure unclear: doc/frontend/adr/001A-feed-farm-trade-architecture.md
10. Roadmap/gaps only as needed: doc/frontend/adr/001R-feed-farm-trade-roadmap.md
```

Cross-skills only when the playbook says so: `portal-api-contract`, `portal-frontend-scaffold`, `admincn-customization`, `incremental-implementation`, `test-driven-development`.

---

## Definition of Done (no variance)

A slice is **done** only when **all** are true:

```text
[ ] Named Phase + F-* / AC-* / G-* IDs from the phase doc (not invented)
[ ] action-map row matched (route · feature · action · gate)
[ ] Permission code enforced (rbac-card); no role-name auth
[ ] Vertical slice intact (no raw SQL in actions; no own /api fetch from RSC)
[ ] Residue check clean: no TradeShell / locale-switcher / app/trade/[locale]
[ ] verify.md commands run for touched AC
[ ] AC evidence recorded in Given/When/Then or one-liner format from verify.md
[ ] completeness.md updated if wire status changed
[ ] No P2/P3 scope unless this command explicitly authorizes it
```

Enterprise MVP claim requires **every** P0 + P1 AC row evidenced (incl. G1–G6). Wiring alone is **FAIL**.

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

## Command A — Evaluate P0 (no code)

```text
/feed-farm-trade

COMMAND: EVALUATE_P0
MODE: evaluation only — do not write product code
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: skill pack (SKILL → playbook → action-map → rbac → verify) then doc/frontend/11-feed-farm-trade-phase0-shell.md
DO:
1. Grade every row in the P0 Evaluation checklist (Result column).
2. Run residue + unit checks from verify.md that apply to P0.
3. Do not edit phase-doc requirement rows; only report Results.
4. Summarize: PASS / FAIL / BLOCKED per AC; list gaps only.
OUT: Output contract. No P1/P2/P3 work.
```

---

## Command B — Evaluate P1 / enterprise MVP readiness (no code)

```text
/feed-farm-trade

COMMAND: EVALUATE_P1_MVP
MODE: evaluation only — do not write product code
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: skill pack then doc/frontend/12-feed-farm-trade-phase1-core-mvp.md (+ 001R gap register if needed)
DO:
1. Grade every P1 Evaluation checklist row (incl. G1–G9 / F-* groups).
2. Cross-check action-map vs live routes/features/actions.
3. Run verify.md unit/residue commands; note which AC lack tests.
4. Verdict: Enterprise MVP claimable? YES only if all P0+P1 AC evidenced; else NO + blocker list.
OUT: Output contract with full Evidence section. No implementation.
```

---

## Command C — Implement one P1 slice (code allowed)

```text
/feed-farm-trade

COMMAND: IMPLEMENT_P1_SLICE
MODE: implement one capability only
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: skill pack (include example-slice.md) then doc/frontend/12-feed-farm-trade-phase1-core-mvp.md
SLICE_IDS: <REPLACE: e.g. F-PRI-01 / AC-PRI-01 / G1>
DO:
1. Confirm SLICE_IDS exist in phase 12 + action-map; stop if not.
2. Follow slice-playbook steps 1–6 exactly (one capability group).
3. Copy example-slice patterns; no TradeShell/locale paths; TRADE_UI_LOCALE only.
4. Run verify.md for touched AC; add tests if AC has no evidence path.
5. Record Evidence; update completeness.md only if status changed.
OUT: Output contract. Do not expand to other F-* IDs. Do not touch P2/P3 flags.
TASK: <REPLACE: one sentence>
```

---

## Command D — Close AC evidence gaps only (tests / docs, minimal product change)

```text
/feed-farm-trade

COMMAND: CLOSE_AC_EVIDENCE
MODE: evidence-first — prefer tests; product code only if required to make AC testable
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: skill pack verify.md + action-map.md + doc/frontend/12-feed-farm-trade-phase1-core-mvp.md
TARGET_ACS: <REPLACE: e.g. AC-SUP-01, AC-XFR-01, AC-AUD-01>
DO:
1. For each TARGET_AC, find or add unit/@journey coverage per verify.md.
2. Do not enable P3 flags; do not polish UI (P2).
3. Emit Evidence block per AC; mark PASS only with green test output cited.
OUT: Output contract. List remaining unevidenced P1 ACs.
```

---

## Command E — P3 ops review (no prod flag enable)

```text
/feed-farm-trade

COMMAND: REVIEW_P3
MODE: evaluation / gap report — do not set HOT_SALES_* true in production
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: skill pack action-map P3 section + doc/frontend/14-feed-farm-trade-phase3-ops-flags.md + docs/hot-sales/RUNTIME.md env flags
DO:
1. Grade P3 evaluation checklist (flag-off behavior AC-OPS-01).
2. Confirm placeholders vs write paths; list any ungated writes as FAIL.
3. Do not invent gate-register checklists; cite gate-register path only.
OUT: Output contract. Explicit: no prod flag changes.
```

---

## Command F — Full session bootstrap (docs sync check, no product code)

```text
/feed-farm-trade

COMMAND: BOOTSTRAP_SYNC_CHECK
MODE: documentation / skill consistency only — no product code
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: SKILL.md + completeness.md + ADR 001/001A/001R + phase 11–14 index in doc/README.md
DO:
1. Confirm skill pack files exist: SKILL, slice-playbook, action-map, rbac-card, verify, example-slice, architecture, mvp-and-gaps, completeness.
2. Confirm phase docs 11–14 linked from 001R and skill SSOT table.
3. List drift only (broken links, contradictory status, RUNTIME legacy path note).
4. Do not “fix” product code; propose doc/skill fixes as a list for approval.
OUT: Output contract. Drift list ranked P0/P1.
```

---

## Command G — UI registry / Studio-only (governance)

```text
/feed-farm-trade

COMMAND: UI_REGISTRY
MODE: governance — no product redesign unless TASK names a reusableId grant
FOLLOW: Feed Farm Trade agent command sheet (locked context + load order + DoD + output contract)
READ: ui-registry.md + ui-registry.json + .cursor/rules/fft-ui-registry.mdc + admincn-customization skill
DO:
1. Compose only approved FFT-UI-* and allowlisted ACN-UI-*; ACN-BLK-* requires HITL product wrap (studioSource).
2. Do not edit ui-registry.json (human HITL only). Do not invent ACN-* / FFT-UI-* IDs.
3. Run: npm run test:unit -- features/trade/ui-registry
4. SHADCN_STUDIO_ONLY: no hand-written visual CSS; no platform-views imports from features/trade.
5. Do not claim registry pass = TanStack/AdminCN visual quality.
OUT: Output contract. Explicit: no prod HOT_SALES_* flag changes.
```

---

## Anti-variance rules (paste with any command if the agent drifts)

```text
HARD RULES:
1. Do not redefine MVP. MVP = P0+P1+G1–G6+AC evidence only.
2. Do not treat completeness.md “wired” as PASS for AC rows.
3. Do not authorize by role name or templateKey.
4. Do not restore TradeShell or /trade/[locale].
5. Do not start P2/P3 implementation from a P0/P1 command.
6. Do not claim done without Evidence block matching verify.md.
7. If unsure: STOP and ask — do not invent F-*/AC-* IDs, permission codes, or FFT-UI/FFT-QA ids.
8. Do not edit ui-registry.json to green Vitest — human HITL only.
```

---

## Quick picker

| Goal | Paste |
|------|--------|
| Grade shell | **Command A** |
| Grade MVP readiness | **Command B** |
| Build one capability | **Command C** (+ set `SLICE_IDS` + `TASK`) |
| Add missing tests/evidence | **Command D** (+ set `TARGET_ACS`) |
| Review ops flags surfaces | **Command E** |
| Check docs/skill sync | **Command F** |
| UI registry / Studio-only | **Command G** |

**Skill home:** `.cursor/skills/feed-farm-trade/`  
**Phase specs:** `doc/frontend/11`–`14-feed-farm-trade-*.md`
