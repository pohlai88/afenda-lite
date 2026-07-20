# README dry-run bake-off — comparison

**Date:** 2026-07-21  
**Skill:** `afenda-readme-diataxis`  
**Pilots:** `@afenda/receiving`, `@afenda/fulfillment`, `@afenda/payments`  
**Artifacts:** `M` = living package README · `S` = scaffold · `A` = agent skill dry-run · `F` = Scratch ERP “fdocs” review under `docs-V2/_scratch/erp/`

Living package READMEs were **not** overwritten. Candidates live under this folder.

## Headline

| Verdict | Detail |
|---------|--------|
| Scaffold **S** | Too thin for package consumers — export list + scripts only |
| Manual **M** | Strong voice and structure; **receiving/fulfillment ACCURACY broken** vs disk (claim events-only inventory; code posts via `@afenda/inventory`) |
| Agent **A** | Closest to code truth; keeps Diátaxis package shape; still thinner on Ops than receiving **M** |
| Scratch **F** | Useful as *target-state review*, **not** as SSOT for auto-generating READMEs — same stale inventory claim as **M** for receiving |

**Go / no-go:** **Go hybrid VERIFY + agent batch**; **reject** scaffold as shipped prose; **do not** treat Scratch ERP fdocs as auto-gen authority without a code verify pass.

---

## Overall scores (README Score / 100)

| Package | M Manual | S Scaffold | A Agent |
|---------|----------|------------|---------|
| receiving | **68** | **48** | **88** |
| fulfillment | **70** | **48** | **87** |
| payments | **90** | **50** | **91** |

Agent beats or ties manual on payments; **beats manual on receiving/fulfillment** because it corrects the inventory boundary.

---

## Dimension scores

### receiving

| Dimension | M | S | A | Note |
|-----------|---|---|---|------|
| AUTHORITY /20 | 14 | 12 | 18 | M/S omit or soft-link Scratch; A links Scratch + code. M implies Living consumers OK. |
| ACCURACY /25 | **8** | 14 | **23** | **M false:** “never writes inventory / imports neither … inventory” — `receipt.ts` calls `createStockMovement` / `postStockMovement`. S has no false claim but no facts. A matches code (inventory package API, no direct `stock_*`). |
| DIATAXIS /15 | 14 | 8 | 14 | M/A clear how-to+reference mix; S mechanical skeleton |
| AUDIENCE /15 | 14 | 10 | 14 | Package-consumer voice on M/A |
| BREVITY /10 | 9 | 8 | 9 | M Ops section honest about incomplete peers |
| VERIFY /15 | 9 | 8 | 10 | Scripts live on all; M fails verify vs disk on inventory claim |
| **Total** | **68** | **48** | **88** | |

**Path to 100% (A):** Add PO over-receipt / idempotency one-liners from tests; optional Ops baseline like M.

**Path to 100% (M):** Rewrite Inventory boundary to match `postReceiptInventoryMovement`; drop “imports neither … inventory.”

### fulfillment

| Dimension | M | S | A | Note |
|-----------|---|---|---|------|
| AUTHORITY /20 | 14 | 12 | 18 | Same pattern as receiving |
| ACCURACY /25 | **10** | 14 | **23** | **M false:** “never imports … Inventory” — `delivery.ts` posts stock via `@afenda/inventory`. A corrected. |
| DIATAXIS /15 | 14 | 8 | 14 | |
| AUDIENCE /15 | 14 | 10 | 14 | |
| BREVITY /10 | 9 | 8 | 9 | |
| VERIFY /15 | 9 | 8 | 10 | |
| **Total** | **70** | **48** | **87** | |

**Path to 100% (A):** Clarify posted vs completed vs POD (Scratch F flags this); keep statements code-backed only.

### payments

| Dimension | M | S | A | Note |
|-----------|---|---|---|------|
| AUTHORITY /20 | 16 | 12 | 18 | A adds Scratch link |
| ACCURACY /25 | 24 | 14 | 24 | M/A match disk (no peer ERP imports; refund = direction) |
| DIATAXIS /15 | 14 | 8 | 14 | |
| AUDIENCE /15 | 14 | 10 | 14 | |
| BREVITY /10 | 10 | 8 | 10 | |
| VERIFY /15 | 12 | 8 | 11 | Scripts verified |
| **Total** | **90** | **50** | **91** | |

**Path to 100% (A/M):** Optional one sentence that `payment_allocation` is an application *instruction* (Scratch F target-state) — only if product agrees; do not invent rename.

---

## Scratch fdocs (F) as generation source

Scored as **authority-for-README-gen**, not as package READMEs:

| F file | Self-score in doc | Fit for auto-gen README | Failure vs disk |
|--------|-------------------|-------------------------|-----------------|
| `receiving.md` | 8.2/10 | Poor as SSOT | Affirms “no direct stock_* writes” / events-only inventory narrative while code posts via inventory APIs |
| `fulfillment.md` | 7.3/10 | Poor as SSOT | Affirms Sales/Inventory not imported; Inventory **is** imported for post |
| `payment.md` | 6.5/10 | Better as *critique* | Target-state rename of allocation — not current public API |

**F quality for dry-run:** high as **review / Path-to-100% notes**; low as **verbatim README seed**. Auto-gen that trusts F without reading `src/` would re-ship the same ACCURACY miss as M.

---

## Qualitative deltas (what M has that S/A miss)

| Topic | M | S | A |
|-------|---|---|---|
| PO guard / over-receipt | Yes (receiving) | No | Yes (receiving) |
| Inventory truth | **Wrong** | Silent | **Correct** |
| Event names | Yes | No | Yes |
| Permissions | Yes | No | Yes |
| Ops incompleteness | Yes (receiving) | No | No |
| Export dump | Commands | Export list only | Commands |

---

## Go / no-go

| Question | Answer |
|----------|--------|
| Ship scaffold prose? | **No** — ~48–50 vs M/A |
| Batch agent `/afenda-readme-diataxis`? | **Yes, with code-first VERIFY** — A ≥ M when M is stale |
| Auto-gen from Scratch fdocs alone? | **No** — F lags / targets future; must Discover `src/` |
| Next implement? | Optional: Layer A `check:readme` anti-claim + script gate; agent revise living receiving/fulfillment Inventory sections (separate approve) |
