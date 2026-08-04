# HR ↔ Payroll Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the engineering-closable gaps from `docs/erp/hr-payroll-bridging.md` (order-of-work items 1, 4, 5, 6, 7): lifecycle honesty + governance gate, the C2 stale-revision defect, C9 maker-checker on finalize, the payroll parity/failure-injection loop, the four governance fixtures, emission-registry consolidation, and doc symmetry.

**Architecture:** All changes are greenfield under `packages/erp/payroll`, `packages/erp/human-resources` (docs only), `scripts/`, `testing/`, and root `package.json`. No schema changes are required (the `payroll_accepted_handoff` table already carries `payload_hash` and `contract_version`). HR ↔ Payroll never import each other; they meet only at `apps/web`.

**Tech Stack:** TypeScript, Zod, Drizzle (`@afenda/db`), Vitest, Neon Postgres (parity loop), `@afenda/errors` `Result<T>`.

## Global Constraints

- Run `pnpm checks` before calling the work complete; paste output.
- `Result` failures via `errorResult.fail("CODE", { publicMessage })` — never throw for domain outcomes; never `{ success, data }`.
- No new packages; no `@afenda/*/src/...` deep imports; UI untouched.
- No shims, stubs, TODO paths, or "later" language. Every task ends green.
- Commit per task with conventional message; **do not push**. **Never `git add -A` or `git commit -am`** — the working tree holds unrelated in-progress user work (corporate-administration failure-injection tests + `neon-cleanup.ts` edits) that must stay uncommitted. Stage only the exact files your task created or modified. (Where a later step says `git add -A`, read it as: add your task's files by path.)
- DB migrations are out of scope — if a task appears to need a schema change, STOP and surface it (none should).
- Windows checkout; shell steps are Git Bash syntax. PowerShell env alternative: `$env:REQUIRE_DATABASE_TESTS = "1"`.
- Neon-gated tests follow the corporate-administration pattern: self-skip unless the gate env var is set; never fail on missing DB.

---

### Task 1: Lifecycle honesty (A1) + `governance:lifecycle-coupling` gate

**Files:**
- Create: `scripts/governance-lifecycle-coupling.mjs`
- Modify: `packages/erp/payroll/src/composition/module.manifest.ts` (line ~31, `lifecycle`)
- Modify: root `package.json` (scripts)
- Modify: `scripts/governance-packages.mjs` (chain the new check)

**Interfaces:**
- Produces: root script `pnpm governance:lifecycle-coupling` (exit 0/1); payroll manifest `lifecycle: "scaffolded"`.

- [ ] **Step 1: Verify the demotion is metadata-only.** Grep consumers before touching the manifest:

```bash
grep -rn "lifecycle" packages/erp/payroll/src --include="*.ts" | grep -v test
grep -rn "\.lifecycle" apps/web packages --include="*.ts" -l | grep -v __tests__ | grep -v node_modules
```

Read every non-test hit. If any runtime code branches on `lifecycle === "active"` (feature gating, activation), STOP — report to the coordinator instead of demoting. If it is manifest metadata only (expected), proceed.

- [ ] **Step 2: Demote payroll.** In `packages/erp/payroll/src/composition/module.manifest.ts` change `lifecycle: "active"` → `lifecycle: "scaffolded"`. Run `pnpm --filter @afenda/payroll test` — fix any manifest snapshot/contract test expecting `"active"` by updating the expectation (the demotion is the intended new truth, recorded in `docs/erp/hr-payroll-bridging.md` A1).

- [ ] **Step 3: Write the failing check run.** Create `scripts/governance-lifecycle-coupling.mjs`:

```js
#!/usr/bin/env node
/**
 * A module manifest with lifecycle "active" may not list a required
 * dependency whose manifest declares lifecycle "scaffolded" (A1,
 * docs/erp/hr-payroll-bridging.md). Reads manifests directly — no
 * docs-V2 roadmap dependency.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const erpRoot = "packages/erp";
const manifests = new Map();
for (const dir of readdirSync(erpRoot)) {
	const file = join(erpRoot, dir, "src", "composition", "module.manifest.ts");
	if (!existsSync(file)) continue;
	const src = readFileSync(file, "utf8");
	const id = src.match(/id:\s*"([^"]+)"/)?.[1];
	const lifecycle = src.match(/lifecycle:\s*"([^"]+)"/)?.[1];
	const requiredBlock = src.match(/required:\s*\[([^\]]*)\]/s)?.[1] ?? "";
	const required = [...requiredBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
	if (id && lifecycle) manifests.set(id, { lifecycle, required, file });
}
const violations = [];
for (const [id, m] of manifests) {
	if (m.lifecycle !== "active") continue;
	for (const dep of m.required) {
		const target = manifests.get(dep);
		if (target && target.lifecycle === "scaffolded") {
			violations.push(`${id} (active) requires ${dep} (scaffolded) — ${m.file}`);
		}
	}
}
if (violations.length > 0) {
	console.error("governance:lifecycle-coupling FAILED");
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}
console.log(`governance:lifecycle-coupling OK (${manifests.size} manifests)`);
```

- [ ] **Step 4: Prove the check bites.** Temporarily revert the manifest to `"active"`, run `node scripts/governance-lifecycle-coupling.mjs` — expect exit 1 naming `payroll → human-resources`. Restore `"scaffolded"`, run again — expect OK. (This is the test; the script has no unit-test file, matching sibling governance scripts.)

- [ ] **Step 5: Wire the scripts.** Root `package.json`: add `"governance:lifecycle-coupling": "node scripts/governance-lifecycle-coupling.mjs"` next to `governance:packages`. In `scripts/governance-packages.mjs`, invoke the new script after the existing `validate:modules` step (same child-process style as the file already uses), so `pnpm governance:packages` inherits the gate.

- [ ] **Step 6: Verify + commit.**

```bash
pnpm governance:lifecycle-coupling && pnpm governance:packages
git add -A && git commit -m "feat(governance): lifecycle-coupling gate; demote payroll to scaffolded (A1)"
```

---

### Task 2: C2 stale-revision rejection in workforce ingress

**Files:**
- Modify: `packages/erp/payroll/src/features/workforce-ingress/accepted-handoff.drizzle.ts`
- Modify: `packages/erp/payroll/src/features/workforce-ingress/accepted-handoff.memory.ts`
- Test: the existing workforce-ingress test file (find via `ls packages/erp/payroll/__tests__ | grep -i ingress` / grep `ingestApprovedPayrollHandoff`)

**Interfaces:**
- Consumes: `AcceptHandoffRecord` (has `contractVersion: number`), active-row lookup already present in both adapters.
- Produces: `acceptWorkforceHandoff` returns `errorResult.fail("CONFLICT", { publicMessage: "Stale workforce handoff revision is rejected" })` when `record.contractVersion <= active.contractVersion` and the payload differs.

Behavior spec (both adapters must match exactly — this is a store-contract behavior):
1. Idempotency-key replay: unchanged (same-hash → ok(sealed row); changed-hash → existing CONFLICT).
2. Active identity row exists with **same `payloadHash`** → unchanged (idempotent ok).
3. Active identity row exists, different payload, `record.contractVersion <= active.contractVersion` → **NEW: CONFLICT "Stale workforce handoff revision is rejected"**. No insert, no supersession.
4. Active identity row exists, different payload, `record.contractVersion > active.contractVersion` → supersede (current behavior).

- [ ] **Step 1: Write the failing tests** in the existing workforce-ingress test file, using the memory store the file already uses:

```ts
it("rejects a stale contractVersion for an already-accepted identity", async () => {
	// Arrange: ingest a handoff at contractVersion 2 (reuse the file's
	// existing valid-payload builder, overriding contractVersion: 2).
	// Act: ingest same (employeeId, effectiveDate, periodStart, periodEnd)
	// with contractVersion 1, a DIFFERENT payload field, and a NEW idempotencyKey.
	// Assert:
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.error.code).toBe("CONFLICT");
	// And the v2 row is still the active one:
	const active = await store.getAcceptedWorkforceHandoff(identity);
	expect(active.ok && active.data?.contractVersion).toBe(2);
});

it("rejects an equal contractVersion with different payload for an accepted identity", async () => {
	// v1 accepted, then v1 again with different payload + new idempotencyKey → CONFLICT
});

it("still supersedes when a higher contractVersion arrives", async () => {
	// v1 accepted, then v2 with new idempotencyKey → ok; old row superseded_by set
});
```

- [ ] **Step 2: Run to verify the two new rejection tests fail** (the supersede test should already pass): `pnpm --filter @afenda/payroll test -- <testfile>`.

- [ ] **Step 3: Implement — memory adapter.** In `accepted-handoff.memory.ts`, inside the `active !== undefined` branch (currently lines 86–94), after the same-hash idempotent return:

```ts
if (record.contractVersion <= active.contractVersion) {
	return Promise.resolve(
		errorResult.fail("CONFLICT", {
			publicMessage: "Stale workforce handoff revision is rejected",
		}),
	);
}
```

- [ ] **Step 4: Implement — drizzle adapter.** In `accepted-handoff.drizzle.ts` after the existing active-row same-hash check (line ~112):

```ts
if (
	active !== undefined &&
	record.contractVersion <= active.contractVersion
) {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Stale workforce handoff revision is rejected",
	});
}
```

Also add defense-in-depth to the supersession CTE `WHERE` (guards the read-check-race): `AND contract_version < ${record.contractVersion}`. With that, a racing stale insert fails the partial-unique active-identity index, is caught by the existing catch → persistence CONFLICT, so no stale row ever wins.

- [ ] **Step 5: Run the full payroll unit suite:** `pnpm --filter @afenda/payroll test` — all pass. If a store-contract/parity harness test asserts old supersede-anything behavior, update it to the four-rule spec above (cite C2 in the test name, not a comment).

- [ ] **Step 6: Commit.** `git add -A && git commit -m "fix(payroll): reject stale contractVersion on workforce ingress (C2)"`

---

### Task 3: C9 maker-checker on finalize

**Files:**
- Modify: `packages/erp/payroll/src/features/payroll-runs/finalization.ts`
- Modify: `docs/erp/hr-payroll-bridging.md` (C9 section — record the binding decision)
- Test: existing payroll-runs lifecycle test file (grep `finalizePayrollRun` under `packages/erp/payroll/__tests__`)

**Interfaces:**
- Consumes: `run.updatedBy` — after the `calculating → calculated` transition, `updatedBy` is the calculating actor (verify in `run-helpers.ts` / the calculate feature before relying on it; if calculate does NOT stamp `updatedBy`, STOP and report).
- Produces: finalize rejects with `CONFLICT` when the finalizing actor is the calculating actor.

Decision being encoded (already argued in the bridging doc C9): with no approve step in the run lifecycle (`draft → calculating → calculated → finalized`), maker-checker binds to **calculate-actor ≠ finalize-actor**. A distinct `payroll.run.approve` permission plus break-glass override lands with the future approval-workflow slice; this task records that in the C9 doc section as the dated decision.

- [ ] **Step 1: Confirm the actor source.** Read `run-helpers.ts` (`transitionPayrollRun`) and the calculation feature's transition to `calculated`; confirm `updatedBy` is set to the acting user on that transition. Paste the line into the task summary.

- [ ] **Step 2: Write the failing test** in the runs lifecycle test file (reuse its existing memory-store run builder that walks draft→calculating→calculated):

```ts
it("rejects finalize by the actor who calculated the run (C9 segregation of duties)", async () => {
	// run reaches "calculated" with actorUserId: CALC_ACTOR
	const result = await finalizePayrollRun(
		{ ...validFinalizeInput, actorUserId: CALC_ACTOR },
		options,
	);
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.error.code).toBe("CONFLICT");
});

it("allows finalize by a different actor", async () => {
	// same run, actorUserId: OTHER_ACTOR → ok, finalizedBy === OTHER_ACTOR
});
```

- [ ] **Step 3: Run to verify the first test fails** (finalize currently succeeds for the same actor).

- [ ] **Step 4: Implement.** In `finalization.ts`, after the blocking-exceptions check and before loading period/employees/lines:

```ts
if (run.status === "calculated" && run.updatedBy === data.actorUserId) {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Segregation of duties: the actor who calculated a payroll run cannot finalize it",
	});
}
```

- [ ] **Step 5: Run the payroll suite** `pnpm --filter @afenda/payroll test`; update any existing finalize test that used one actor throughout (give it a distinct finalizer — that is the new contract).

- [ ] **Step 6: Record the decision** in `docs/erp/hr-payroll-bridging.md` C9: append a line "**Decision 2026-08-05:** maker-checker shipped as calculate-actor ≠ finalize-actor on the `calculated → finalized` transition; distinct `payroll.run.approve` + break-glass permission land with the approval-workflow slice (tracked in the A-decisions register)."

- [ ] **Step 7: Commit.** `git commit -am "feat(payroll): segregation of duties on run finalization (C9)"`

---

### Task 4: Payroll parity + failure-injection loop (B5) and root scripts

**Files:**
- Create: `packages/erp/payroll/__tests__/helpers/payroll-neon-parity.ts` (gate + skip-reason const)
- Create: `packages/erp/payroll/__tests__/helpers/payroll-neon-cleanup.ts` (row counters + cleanup)
- Create: `packages/erp/payroll/__tests__/failure-injection/run-finalize-atomicity.test.ts`
- Create: `packages/erp/payroll/__tests__/failure-injection/workforce-ingress-atomicity.test.ts`
- Create: `testing/vitest.payroll-parity.config.ts`
- Modify: root `package.json` (scripts)

**Interfaces:**
- Consumes (templates — copy the shape, rename for payroll): `packages/erp/corporate-administration/__tests__/helpers/neon-parity.ts` (env-gated `describe.skipIf` + `NEON_PARITY_SKIP_REASON`), `.../helpers/neon-cleanup.ts` (count + cleanup per table), any `.../failure-injection/*-atomicity.test.ts` (inject failing outbox port, assert full rollback); `testing/vitest.hr-parity.config.ts` (config shape); payroll's existing live harness `packages/erp/payroll/__tests__/helpers/payroll-constraint-live.ts` (how payroll tests reach the real DB and which env gate they honor — reuse the same gate variable).
- Produces: root scripts `test:payroll:parity`, `test:payroll:unit`, `check:payroll`.

- [ ] **Step 1: Read the three template sources above** (CA helpers + one CA atomicity test; HR parity config; payroll live harness). Note payroll's existing DB-gate env var and connection helper — reuse them; do not invent a second gate.

- [ ] **Step 2: Build the helper pair.** `payroll-neon-parity.ts`: export the gate boolean + skip-reason string following the CA pattern but keyed to payroll's existing gate env var (fall back to `REQUIRE_DATABASE_TESTS` if payroll's harness uses that). `payroll-neon-cleanup.ts`: count/delete helpers scoped by `organizationId` for the tables the two tests touch: `payroll_run`, `payroll_run_employee`, `payroll_result_line`, plus the audit receipt and outbox tables the payroll SQL ports write (find exact table objects via `packages/erp/payroll/src/composition/production/ports.ts` imports from `@afenda/db`).

- [ ] **Step 3: Failure-injection test 1 — finalize atomicity.** Mirror the CA atomicity shape: real drizzle store (`@afenda/payroll` composition adapters) against Neon, drive a run to `calculated` (reuse whatever seeding payroll's existing parity/contract live tests use), then call `finalizePayrollRun` with `ports` whose outbox `append` throws (`"Injected outbox failure."`). Assert: `Result` is a failure; run row status is still `calculated` (reload); no new outbox rows; no finalize audit receipt (use the cleanup helpers' counters before/after).

- [ ] **Step 4: Failure-injection test 2 — ingress atomicity + concurrency.** (a) Two concurrent `ingestApprovedPayrollHandoff` calls with the same NEW identity, different idempotency keys, same `contractVersion`, different payloads → exactly one `accepted` row survives active; the loser gets `CONFLICT` (the C2 guard + partial-unique index from Task 2). (b) Same `idempotencyKey` delivered twice concurrently → one accepted row, second call returns the same sealed row or CONFLICT — never two rows (assert row count = 1).

- [ ] **Step 5: Parity config + scripts.** Copy `testing/vitest.hr-parity.config.ts` → `testing/vitest.payroll-parity.config.ts`, retarget include globs to `packages/erp/payroll/__tests__/failure-injection/**` plus payroll's existing live-DB tests, serial execution (match HR's `fileParallelism`/pool settings verbatim). Root `package.json`, mirroring the `hr` entries exactly: `"test:payroll:parity"`, `"test:payroll:unit"` (vitest `--project payroll`), `"lint:payroll"`, `"typecheck:payroll"`, `"check:payroll"` (chain lint + typecheck + unit, same shape as `check:hr`).

- [ ] **Step 6: Verify both loops.**

```bash
pnpm check:payroll                                   # green, no DB
REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity    # green against Neon (or the payroll gate var found in Step 1)
```

If Neon is unreachable in this environment, the suite must SKIP cleanly (that is the gate working) — paste the skip output and say so; do not fake a green run.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "test(payroll): Neon parity loop with failure-injection atomicity proofs (B5)"`

---

### Task 5: Four governance fixtures for payroll (B2)

**Files:**
- Create: `packages/erp/payroll/__tests__/fixtures/public-contract.fixture.json`
- Create: `packages/erp/payroll/__tests__/fixtures/registry-projection.fixture.json`
- Create: `packages/erp/payroll/__tests__/fixtures/consumer-inventory.fixture.json`
- Create: `packages/erp/payroll/__tests__/fixtures/architecture-debt.fixture.json`
- Create: `packages/erp/payroll/__tests__/governance-fixtures.test.ts` (or extend existing export-surface / operation-registry tests — match HR's file naming)

**Interfaces:**
- Consumes (templates): HR's four fixture files under `packages/erp/human-resources/__tests__/fixtures/` and the HR tests that assert them (`architecture-debt-report.test.ts`, the registry-projection and public-contract assertions — locate by grepping the fixture filenames in HR's `__tests__`). Payroll's `src/kernel/operations/registry.ts` and existing `export-surface.test.ts`.
- Produces: four fixtures asserted by tests running in the payroll unit project (CI-bound automatically).

- [ ] **Step 1: Read HR's fixture shapes and their asserting tests.** Copy the JSON shape exactly — same top-level keys — so a future `governance:erp-symmetry` check can diff shapes.
- [ ] **Step 2: Generate content from payroll's own sources** (never hand-invent): public-contract = the export names `export-surface.test.ts` already asserts; registry-projection = a stable serialization of `src/kernel/operations/registry.ts` (id, permission, kind per operation — match HR's projection fields); consumer-inventory = the verified consumer list: `apps/web/lib/erp/payroll-command-options.ts`, `apps/web/modules/platform/domain/human-resources-payroll-delivery.ts` (ingest call), `apps/web/app/actions/` payroll actions (grep `@afenda/payroll` in apps/web for the authoritative list); architecture-debt = HR's schema with payroll's real debt entries: undrained outbox emissions (B6), dormant `workforce` pull port (B1), synth-only statutory calculators (A2) — each with the target/ticket format HR uses.
- [ ] **Step 3: Write the asserting test(s)** mirroring HR: fixture content equals the projection computed from source at test time (registry-projection, public-contract), fixture parses against the shared shape (consumer-inventory, architecture-debt).
- [ ] **Step 4: Run** `pnpm --filter @afenda/payroll test` — green.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "test(payroll): governance fixtures — contract, registry, consumers, debt (B2)"`

---

### Task 6: Emission registry consolidation (B4) + stale citation removal

**Files:**
- Create: `packages/erp/payroll/src/kernel/emissions/emission-registry.ts`
- Modify: `packages/erp/payroll/src/kernel/emissions/mutation-tables.ts` (remove the retired `docs-V2` citation at line ~15; re-point authority to `docs/erp/hr-payroll-bridging.md`)
- Test: extend the operation-registry or governance-fixtures test to assert manifest/registry parity

**Interfaces:**
- Consumes: event names built in `src/features/payroll-runs/lifecycle-events.ts` (`payroll.payment-requested.v1`, `payroll.posting-requested.v1`), the manifest's `events.emits` array (`src/composition/module.manifest.ts:51-54`), tables in `mutation-tables.ts`.
- Produces: `PAYROLL_EMISSION_REGISTRY` — one exported const array of `{ event: string; emittedBy: string; dispatcher: string | null }` (operation id from `kernel/operations/module-ids.ts` as `emittedBy`; `dispatcher: null` is honest today — B6 platform drain is a separate mission and the architecture-debt fixture from Task 5 carries that entry).

- [ ] **Step 1: Write the failing parity test:** every event in `module.manifest.ts` `events.emits` appears exactly once in `PAYROLL_EMISSION_REGISTRY` and vice versa; every registry event is one that `lifecycle-events.ts` can build (import its builder constants rather than duplicating strings — if the event names live as literals there, export named constants from `lifecycle-events.ts` and use them in both places; one semantic owner).
- [ ] **Step 2: Implement the registry** per the Produces spec; refactor `lifecycle-events.ts` and `module.manifest.ts` to consume the shared event-name constants so the string exists in exactly one file.
- [ ] **Step 3: Remove the `docs-V2` reference** in `mutation-tables.ts`.
- [ ] **Step 4: Run** `pnpm --filter @afenda/payroll test && pnpm check:docs-trunk-ban` — green. Regenerate the Task 5 registry-projection fixture if the test asserts emissions too.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(payroll): canonical emission registry; drop retired docs-V2 citation (B4)"`

---

### Task 7: Payroll doc symmetry + `./testing` subpath

**Files:**
- Modify: `packages/erp/payroll/package.json` (`exports`)
- Create: `packages/erp/payroll/docs/development-roadmap.md`
- Create: `packages/erp/payroll/docs/baseline-verification.md`
- Modify: `packages/erp/payroll/README.md`

**Interfaces:**
- Consumes: HR's `docs/development-roadmap.md` and `docs/baseline-verification.md` as structure templates; HR `package.json` `exports` for the `./testing` shape; the corrected transport description in `docs/erp/hr-payroll-bridging.md` B1.

- [ ] **Step 1: Declare `./testing`.** Copy HR's `./testing` export entry into payroll `package.json`, pointing at `./src/testing/index.ts` (types + default, same shape as the `.` entry). Verify: `pnpm --filter @afenda/payroll typecheck` and grep that no consumer deep-imports `@afenda/payroll/src/testing` (if any do, switch them to the subpath).
- [ ] **Step 2: `docs/development-roadmap.md`** — HR's section structure with payroll's truth: shipped features (the nine `src/features/` dirs), open items by bridging-doc phase (B6 outbox drain, B3 capability signature, D1–D6 features, A2 calculators), each row citing `docs/erp/hr-payroll-bridging.md` items rather than restating them.
- [ ] **Step 3: `docs/baseline-verification.md`** — HR's structure: the exact commands (`pnpm check:payroll`, `REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity`, `pnpm governance:lifecycle-coupling`) with a dated evidence row for the runs performed in Tasks 1–6.
- [ ] **Step 4: README updates** (all four in one pass): (a) rewrite the workforce arrival section to the single push/sync-ingest transport (copy the flow diagram from bridging-doc B1; state `PayrollWorkforceCapability` is a test-only seam, never wired in production); (b) add the tenant-injection doctrine paragraph — copy HR's README wording verbatim, s/hr_/payroll_/ examples; (c) add the composition-entries table (manifest, drizzle adapters, production ports, store slices — from `src/composition/`); (d) align governance wording to `pnpm validate:modules` (check-only) matching HR.
- [ ] **Step 5: Run** `pnpm checks` (docs-naming gate must pass on the two new docs). 
- [ ] **Step 6: Commit.** `git add -A && git commit -m "docs(payroll): transport truth, tenancy doctrine, roadmap + baseline, ./testing subpath (B1/B2)"`

---

### Task 8: HR doc closure

**Files:**
- Create: `packages/erp/human-resources/PRODUCTION_READINESS.md`
- Modify: `packages/erp/human-resources/README.md`

**Interfaces:**
- Consumes: `packages/erp/payroll/PRODUCTION_READINESS.md` (structure template, ~53 lines); the corrected `docs/erp/hr-payroll-bridging.md` (B1 transport, D7 rows, Phase E promotion criteria).

- [ ] **Step 1: `PRODUCTION_READINESS.md`** mirroring payroll's section structure, stating HR's honest posture: `lifecycle: scaffolded`; what is production-shaped today (handoff transport with bounded retry + atomic corrections, parity loop, fixtures, privacy legal-hold); and the explicit **promotion criteria** list (`scaffolded → active` gate — the D7/Phase E items: restriction operation, cut-off semantics documented, mid-period termination contract documented, breaking-change policy for `public-contract.fixture.json`), each with its bridging-doc item id. This is a statement of criteria, not a claim of readiness — do not claim `active`.
- [ ] **Step 2: README updates:** (a) transport section — same single-transport flow as payroll's Task 7 wording (both READMEs must describe it identically, per Phase B exit gate); (b) document the existing feedback/correction operations under their real names (`recordPayrollDeliveryFeedback`, correction via `queuePayrollDelivery` + `supersedesDeliveryId`) and name `assembleApprovedPayrollHandoff` as the pre-queue dry-run; (c) align `validate:modules` wording (check-only) with payroll.
- [ ] **Step 3: Run** `pnpm checks` — green. 
- [ ] **Step 4: Commit.** `git add -A && git commit -m "docs(hr): production-readiness with promotion gate; single-transport README (D7/E)"`

---

### Task 9: Final verification sweep

- [ ] **Step 1:** `pnpm checks` — paste full output.
- [ ] **Step 2:** `pnpm check:hr && pnpm check:payroll` — paste output.
- [ ] **Step 3:** `pnpm governance:lifecycle-coupling && pnpm governance:packages` — paste output.
- [ ] **Step 4:** `REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity` (or documented skip if Neon unavailable) — paste output.
- [ ] **Step 5:** `git log --oneline main..HEAD` (or since start) — one commit per task, none pushed.
