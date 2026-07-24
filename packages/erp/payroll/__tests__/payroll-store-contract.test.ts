import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { describe, expect, it } from "vitest";
import {
	parsePayrollResultLineId,
	parsePayrollRunEmployeeId,
} from "../src/brands";
import { PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP } from "../src/error-codes";

import {
	createPayrollParityHarness,
	type PayrollStoreAdapter,
	seedDraftRun,
	seedPayrollRunChain,
} from "./helpers/payroll-store-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();
const runDrizzleParity =
	hasDatabase && process.env.REQUIRE_DATABASE_TESTS === "1";

const adapters: PayrollStoreAdapter[] = runDrizzleParity
	? ["memory", "drizzle"]
	: ["memory"];

function defineStoreContractSuite(adapter: PayrollStoreAdapter): void {
	describe(`@afenda/payroll store contract (${adapter})`, () => {
		it("isolates organizations on calendar reads", async () => {
			const harnessA = createPayrollParityHarness(adapter);
			const harnessB = createPayrollParityHarness(adapter);

			const created = await harnessA.store.createCalendar(
				{
					organizationId: harnessA.organizationId,
					code: "ORG-A-CAL",
					name: "Org A calendar",
					timezone: "UTC",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					idempotencyKey: `idem-org-a-${adapter}`,
					createRequestFingerprint: "fp-a",
					createdBy: harnessA.actorUserId,
					correlationId: `corr-org-a-${adapter}`,
				},
				harnessA.ports,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			const crossOrg = await harnessB.store.getCalendar({
				organizationId: harnessB.organizationId,
				calendarId: created.data.id,
			});
			expect(crossOrg.ok).toBe(true);
			if (!crossOrg.ok) return;
			expect(crossOrg.data).toBeNull();
		});

		it("replays idempotent calendar creates with the same fingerprint", async () => {
			const harness = createPayrollParityHarness(adapter);
			const input = {
				organizationId: harness.organizationId,
				code: "IDEM-CAL",
				name: "Idempotent calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
				effectiveTo: null,
				idempotencyKey: `idem-replay-${adapter}`,
				createRequestFingerprint: "fp-replay",
				createdBy: harness.actorUserId,
				correlationId: `corr-replay-${adapter}`,
			};

			const first = await harness.store.createCalendar(input, harness.ports);
			const second = await harness.store.createCalendar(input, harness.ports);
			expect(first.ok).toBe(true);
			expect(second.ok).toBe(true);
			if (!first.ok || !second.ok) return;
			expect(second.data.id).toBe(first.data.id);
		});

		it("rejects stale expectedVersion on calendar update", async () => {
			const harness = createPayrollParityHarness(adapter);
			const created = await harness.store.createCalendar(
				{
					organizationId: harness.organizationId,
					code: "VER-CAL",
					name: "Version calendar",
					timezone: "UTC",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					idempotencyKey: `idem-ver-${adapter}`,
					createRequestFingerprint: "fp-ver",
					createdBy: harness.actorUserId,
					correlationId: `corr-ver-${adapter}`,
				},
				harness.ports,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			const stale = await harness.store.updateCalendar(
				{
					organizationId: harness.organizationId,
					calendarId: created.data.id,
					name: "Updated name",
					expectedVersion: created.data.version + 1,
					actorUserId: harness.actorUserId,
					correlationId: `corr-stale-${adapter}`,
				},
				harness.ports,
			);
			expect(stale.ok).toBe(false);
			if (stale.ok) return;
			expect(stale.code).toBe("CONFLICT");
		});

		it("rejects overlapping active earning rules for the same code", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const first = await harness.store.createEarningRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "BASE",
					name: "Base pay",
					ruleType: "fixed",
					amount: "1000.00",
					rate: null,
					currencyCode: "USD",
					ruleVersion: "1",
					taxTiming: "post_tax",
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-06-30",
					idempotencyKey: `idem-rule-1-${adapter}`,
					createRequestFingerprint: "fp-rule-1",
					createdBy: harness.actorUserId,
					correlationId: `corr-rule-1-${adapter}`,
				},
				harness.ports,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) return;

			const overlap = await harness.store.createEarningRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "BASE",
					name: "Base pay v2",
					ruleType: "fixed",
					amount: "1100.00",
					rate: null,
					currencyCode: "USD",
					ruleVersion: "2",
					effectiveFrom: "2025-06-01",
					effectiveTo: null,
					idempotencyKey: `idem-rule-2-${adapter}`,
					createRequestFingerprint: "fp-rule-2",
					createdBy: harness.actorUserId,
					correlationId: `corr-rule-2-${adapter}`,
				},
				harness.ports,
			);
			expect(overlap.ok).toBe(false);
			if (overlap.ok) return;
			expect(overlap.code).toBe("CONFLICT");
			expect(overlap.details).toEqual({
				payrollCode: PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP,
			});
		});

		it("rejects duplicate run identity", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);
			const base = {
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				runType: "regular" as const,
				sequence: 1,
				createdBy: harness.actorUserId,
				correlationId: `corr-run-dup-${adapter}`,
			};

			const first = await harness.store.createRun(
				{
					...base,
					idempotencyKey: `idem-run-1-${adapter}`,
					createRequestFingerprint: "fp-run-1",
				},
				harness.ports,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) return;

			const duplicate = await harness.store.createRun(
				{
					...base,
					idempotencyKey: `idem-run-2-${adapter}`,
					createRequestFingerprint: "fp-run-2",
				},
				harness.ports,
			);
			expect(duplicate.ok).toBe(false);
			if (duplicate.ok) return;
			expect(duplicate.code).toBe("CONFLICT");
		});

		it("rejects overlapping active deduction rules for the same code", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const first = await harness.store.createDeductionRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "401K",
					name: "401K deduction",
					ruleType: "fixed",
					amount: "100.00",
					rate: null,
					currencyCode: "USD",
					ruleVersion: "1",
					taxTiming: "post_tax",
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-06-30",
					idempotencyKey: `idem-ded-1-${adapter}`,
					createRequestFingerprint: "fp-ded-1",
					createdBy: harness.actorUserId,
					correlationId: `corr-ded-1-${adapter}`,
				},
				harness.ports,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) return;

			const overlap = await harness.store.createDeductionRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "401K",
					name: "401K deduction v2",
					ruleType: "fixed",
					amount: "110.00",
					rate: null,
					currencyCode: "USD",
					ruleVersion: "2",
					taxTiming: "post_tax",
					effectiveFrom: "2025-06-01",
					effectiveTo: null,
					idempotencyKey: `idem-ded-2-${adapter}`,
					createRequestFingerprint: "fp-ded-2",
					createdBy: harness.actorUserId,
					correlationId: `corr-ded-2-${adapter}`,
				},
				harness.ports,
			);
			expect(overlap.ok).toBe(false);
			if (overlap.ok) return;
			expect(overlap.code).toBe("CONFLICT");
			expect(overlap.details).toEqual({
				payrollCode: PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP,
			});
		});

		it("rejects overlapping active statutory rules for the same code", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const first = await harness.store.createStatutoryRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "SOCSEC",
					name: "Social security",
					jurisdictionCode: "US-FED",
					configJson: { rate: "0.062" },
					ruleVersion: "1",
					taxTiming: "post_tax",
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-06-30",
					idempotencyKey: `idem-stat-1-${adapter}`,
					createRequestFingerprint: "fp-stat-1",
					createdBy: harness.actorUserId,
					correlationId: `corr-stat-1-${adapter}`,
				},
				harness.ports,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) return;

			const overlap = await harness.store.createStatutoryRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "SOCSEC",
					name: "Social security v2",
					jurisdictionCode: "US-FED",
					configJson: { rate: "0.063" },
					ruleVersion: "2",
					effectiveFrom: "2025-06-01",
					effectiveTo: null,
					idempotencyKey: `idem-stat-2-${adapter}`,
					createRequestFingerprint: "fp-stat-2",
					createdBy: harness.actorUserId,
					correlationId: `corr-stat-2-${adapter}`,
				},
				harness.ports,
			);
			expect(overlap.ok).toBe(false);
			if (overlap.ok) return;
			expect(overlap.code).toBe("CONFLICT");
			expect(overlap.details).toEqual({
				payrollCode: PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP,
			});
		});

		it("replays idempotent pay group creates with the same fingerprint", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);
			const input = {
				organizationId: harness.organizationId,
				calendarId: seeded.calendar.id,
				code: "IDEM-PG",
				name: "Idempotent pay group",
				currencyCode: "USD",
				idempotencyKey: `idem-pg-replay-${adapter}`,
				createRequestFingerprint: "fp-pg-replay",
				createdBy: harness.actorUserId,
				correlationId: `corr-pg-replay-${adapter}`,
			};

			const first = await harness.store.createPayGroup(input, harness.ports);
			const second = await harness.store.createPayGroup(input, harness.ports);
			expect(first.ok).toBe(true);
			expect(second.ok).toBe(true);
			if (!first.ok || !second.ok) return;
			expect(second.data.id).toBe(first.data.id);
		});

		it("replays idempotent period creates with the same fingerprint", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);
			const input = {
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				periodStart: "2025-02-01",
				periodEnd: "2025-02-28",
				cutoffDate: "2025-02-25",
				idempotencyKey: `idem-period-replay-${adapter}`,
				createRequestFingerprint: "fp-period-replay",
				createdBy: harness.actorUserId,
				correlationId: `corr-period-replay-${adapter}`,
			};

			const first = await harness.store.createPeriod(input, harness.ports);
			const second = await harness.store.createPeriod(input, harness.ports);
			expect(first.ok).toBe(true);
			expect(second.ok).toBe(true);
			if (!first.ok || !second.ok) return;
			expect(second.data.id).toBe(first.data.id);
		});

		it("creates and lists exceptions for a run", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedDraftRun(harness);

			const blocking = await harness.store.createException(
				{
					organizationId: harness.organizationId,
					runId: seeded.run.id,
					severity: "blocking",
					exceptionCode: "MISSING_BANK",
					message: "Synthetic employee missing bank details",
					employeeRef: "emp-synthetic-001",
					createdBy: harness.actorUserId,
					correlationId: `corr-exc-block-${adapter}`,
				},
				harness.ports,
			);
			const warning = await harness.store.createException(
				{
					organizationId: harness.organizationId,
					runId: seeded.run.id,
					severity: "warning",
					exceptionCode: "ROUNDING_DELTA",
					message: "Synthetic rounding delta within tolerance",
					employeeRef: null,
					createdBy: harness.actorUserId,
					correlationId: `corr-exc-warn-${adapter}`,
				},
				harness.ports,
			);
			expect(blocking.ok).toBe(true);
			expect(warning.ok).toBe(true);
			if (!blocking.ok || !warning.ok) return;

			const listed = await harness.store.listExceptionsForRun({
				organizationId: harness.organizationId,
				runId: seeded.run.id,
			});
			expect(listed.ok).toBe(true);
			if (!listed.ok) return;
			expect(listed.data).toHaveLength(2);
			expect(listed.data.map((item) => item.severity).sort()).toEqual([
				"blocking",
				"warning",
			]);

			const crossOrg = await harness.store.listExceptionsForRun({
				organizationId: `other-${harness.organizationId}`,
				runId: seeded.run.id,
			});
			expect(crossOrg.ok).toBe(true);
			if (!crossOrg.ok) return;
			expect(crossOrg.data).toEqual([]);
		});

		it("resolves earning rules at effective dates", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const created = await harness.store.createEarningRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "HOURLY",
					name: "Hourly pay",
					ruleType: "rate",
					amount: null,
					rate: "25.00",
					currencyCode: "USD",
					ruleVersion: "1",
					taxTiming: "post_tax",
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-03-31",
					idempotencyKey: `idem-ear-eff-${adapter}`,
					createRequestFingerprint: "fp-ear-eff",
					createdBy: harness.actorUserId,
					correlationId: `corr-ear-eff-${adapter}`,
				},
				harness.ports,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			const hit = await harness.store.getEarningRuleAtEffectiveDate({
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				code: "HOURLY",
				effectiveDate: "2025-02-15",
			});
			expect(hit.ok).toBe(true);
			if (!hit.ok) return;
			expect(hit.data?.id).toBe(created.data.id);

			const missRange = await harness.store.getEarningRuleAtEffectiveDate({
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				code: "HOURLY",
				effectiveDate: "2025-04-01",
			});
			expect(missRange.ok).toBe(true);
			if (!missRange.ok) return;
			expect(missRange.data).toBeNull();

			const missCode = await harness.store.getEarningRuleAtEffectiveDate({
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				code: "BONUS",
				effectiveDate: "2025-02-15",
			});
			expect(missCode.ok).toBe(true);
			if (!missCode.ok) return;
			expect(missCode.data).toBeNull();
		});

		it("resolves deduction rules at effective dates", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const created = await harness.store.createDeductionRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "HEALTH",
					name: "Health deduction",
					ruleType: "fixed",
					amount: "50.00",
					rate: null,
					currencyCode: "USD",
					ruleVersion: "1",
					taxTiming: "post_tax",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					idempotencyKey: `idem-ded-eff-${adapter}`,
					createRequestFingerprint: "fp-ded-eff",
					createdBy: harness.actorUserId,
					correlationId: `corr-ded-eff-${adapter}`,
				},
				harness.ports,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			const hit = await harness.store.getDeductionRuleAtEffectiveDate({
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				code: "HEALTH",
				effectiveDate: "2025-06-01",
			});
			expect(hit.ok).toBe(true);
			if (!hit.ok) return;
			expect(hit.data?.id).toBe(created.data.id);

			const miss = await harness.store.getDeductionRuleAtEffectiveDate({
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				code: "DENTAL",
				effectiveDate: "2025-06-01",
			});
			expect(miss.ok).toBe(true);
			if (!miss.ok) return;
			expect(miss.data).toBeNull();
		});

		it("resolves statutory rules at effective dates", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const created = await harness.store.createStatutoryRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "MEDICARE",
					name: "Medicare",
					jurisdictionCode: "US-FED",
					configJson: { rate: "0.0145" },
					ruleVersion: "1",
					taxTiming: "post_tax",
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-12-31",
					idempotencyKey: `idem-stat-eff-${adapter}`,
					createRequestFingerprint: "fp-stat-eff",
					createdBy: harness.actorUserId,
					correlationId: `corr-stat-eff-${adapter}`,
				},
				harness.ports,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			const hit = await harness.store.getStatutoryRuleAtEffectiveDate({
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				code: "MEDICARE",
				effectiveDate: "2025-07-01",
			});
			expect(hit.ok).toBe(true);
			if (!hit.ok) return;
			expect(hit.data?.id).toBe(created.data.id);

			const miss = await harness.store.getStatutoryRuleAtEffectiveDate({
				organizationId: harness.organizationId,
				payGroupId: seeded.payGroup.id,
				code: "MEDICARE",
				effectiveDate: "2026-01-01",
			});
			expect(miss.ok).toBe(true);
			if (!miss.ok) return;
			expect(miss.data).toBeNull();
		});

		it("archives calendar and pay group records", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const archivedCalendar = await harness.store.archiveCalendar(
				{
					organizationId: harness.organizationId,
					calendarId: seeded.calendar.id,
					actorUserId: harness.actorUserId,
					correlationId: `corr-cal-archive-${adapter}`,
					expectedVersion: seeded.calendar.version,
				},
				harness.ports,
			);
			expect(archivedCalendar.ok).toBe(true);
			if (!archivedCalendar.ok) return;
			expect(archivedCalendar.data.status).toBe("archived");

			const archivedPayGroup = await harness.store.archivePayGroup(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					actorUserId: harness.actorUserId,
					correlationId: `corr-pg-archive-${adapter}`,
					expectedVersion: seeded.payGroup.version,
				},
				harness.ports,
			);
			expect(archivedPayGroup.ok).toBe(true);
			if (!archivedPayGroup.ok) return;
			expect(archivedPayGroup.data.status).toBe("archived");
		});

		it("closes payroll periods", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const closed = await harness.store.closePeriod(
				{
					organizationId: harness.organizationId,
					periodId: seeded.period.id,
					actorUserId: harness.actorUserId,
					correlationId: `corr-period-close-${adapter}`,
					expectedVersion: seeded.period.version,
				},
				harness.ports,
			);
			expect(closed.ok).toBe(true);
			if (!closed.ok) return;
			expect(closed.data.status).toBe("closed");
		});

		it("supersedes earning rules and blocks locked versions", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const created = await harness.store.createEarningRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "SUPERSEDE",
					name: "Supersede me",
					ruleType: "fixed",
					amount: "1000.00",
					rate: null,
					currencyCode: "USD",
					ruleVersion: "1",
					taxTiming: "post_tax",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					idempotencyKey: `idem-er-sup-${adapter}`,
					createRequestFingerprint: "fp-er-sup",
					createdBy: harness.actorUserId,
					correlationId: `corr-er-sup-${adapter}`,
				},
				harness.ports,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			const superseded = await harness.store.supersedeEarningRule(
				{
					organizationId: harness.organizationId,
					ruleId: created.data.id,
					ruleVersion: "2",
					effectiveFrom: "2025-07-01",
					effectiveTo: null,
					idempotencyKey: `idem-er-sup-2-${adapter}`,
					createRequestFingerprint: "fp-er-sup-2",
					createdBy: harness.actorUserId,
					correlationId: `corr-er-sup-2-${adapter}`,
					expectedVersion: created.data.version,
				},
				harness.ports,
			);
			expect(superseded.ok).toBe(true);
			if (!superseded.ok) return;
			expect(superseded.data.superseded.status).toBe("superseded");
			expect(superseded.data.successor.ruleVersion).toBe("2");

			const draftRun = await seedDraftRun(harness, seeded);
			const recorded = await harness.store.recordRuleVersionUsedByFinalizedRun({
				organizationId: harness.organizationId,
				ruleKind: "earning",
				ruleId: created.data.id,
				runId: draftRun.run.id,
			});
			expect(recorded.ok).toBe(true);

			const locked = await harness.store.isRuleVersionUsedByFinalizedRun({
				organizationId: harness.organizationId,
				ruleKind: "earning",
				ruleId: created.data.id,
			});
			expect(locked.ok).toBe(true);
			if (!locked.ok) return;
			expect(locked.data).toBe(true);

			const blocked = await harness.store.archiveEarningRule(
				{
					organizationId: harness.organizationId,
					ruleId: created.data.id,
					actorUserId: harness.actorUserId,
					correlationId: `corr-er-lock-${adapter}`,
					expectedVersion: superseded.data.superseded.version,
				},
				harness.ports,
			);
			expect(blocked.ok).toBe(false);
		});

		it("blocks updates to finalized runs", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);

			const created = await harness.store.createRun(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					periodId: seeded.period.id,
					runType: "regular",
					sequence: 1,
					idempotencyKey: `idem-run-fin-${adapter}`,
					createRequestFingerprint: "fp-run-fin",
					createdBy: harness.actorUserId,
					correlationId: `corr-run-fin-${adapter}`,
				},
				harness.ports,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			const finalized = await harness.store.updateRunWithVersion(
				{
					organizationId: harness.organizationId,
					runId: created.data.id,
					status: "calculating",
					expectedVersion: created.data.version,
					actorUserId: harness.actorUserId,
					correlationId: `corr-run-calc-${adapter}`,
				},
				harness.ports,
			);
			expect(finalized.ok).toBe(true);
			if (!finalized.ok) return;

			const calculated = await harness.store.updateRunWithVersion(
				{
					organizationId: harness.organizationId,
					runId: created.data.id,
					status: "calculated",
					calculationSnapshotHash: "hash-contract-test",
					expectedVersion: finalized.data.version,
					actorUserId: harness.actorUserId,
					correlationId: `corr-run-calculated-${adapter}`,
				},
				harness.ports,
			);
			expect(calculated.ok).toBe(true);
			if (!calculated.ok) return;

			const finalizedRun = await harness.store.updateRunWithVersion(
				{
					organizationId: harness.organizationId,
					runId: created.data.id,
					status: "finalized",
					finalizedAt: new Date().toISOString(),
					finalizedBy: harness.actorUserId,
					expectedVersion: calculated.data.version,
					actorUserId: harness.actorUserId,
					correlationId: `corr-run-finalize-${adapter}`,
				},
				harness.ports,
			);
			expect(finalizedRun.ok).toBe(true);
			if (!finalizedRun.ok) return;

			const blocked = await harness.store.updateRunWithVersion(
				{
					organizationId: harness.organizationId,
					runId: created.data.id,
					status: "calculated",
					expectedVersion: finalizedRun.data.version,
					actorUserId: harness.actorUserId,
					correlationId: `corr-run-block-${adapter}`,
				},
				harness.ports,
			);
			expect(blocked.ok).toBe(false);
			if (blocked.ok) return;
			expect(blocked.code).toBe("CONFLICT");
		});

		it("persists and replaces calculation outputs with org isolation", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);
			const seededChain = await seedDraftRun(harness, seeded);
			const run = seededChain.run;
			const employeeId = `emp-calc-${adapter}`;

			const runEmployeeId = parsePayrollRunEmployeeId(crypto.randomUUID());
			const resultLineId = parsePayrollResultLineId(crypto.randomUUID());
			expect(runEmployeeId.ok).toBe(true);
			expect(resultLineId.ok).toBe(true);
			if (!runEmployeeId.ok || !resultLineId.ok) return;

			const persisted = await harness.store.replaceRunCalculationOutputs(
				{
					organizationId: harness.organizationId,
					runId: run.id,
					runEmployees: [
						{
							id: runEmployeeId.data,
							employeeId,
							assignmentId: null,
							currencyCode: "USD",
							gross: "5200",
							employeeDeductions: "600",
							employeeStatutory: "470",
							employerCost: "235",
							net: "4130",
							snapshotJson: { synthetic: true },
							snapshotHash: "hash-calc-contract",
							calculationVersion: "payroll.calc.v1",
							status: "calculated",
						},
					],
					resultLines: [
						{
							id: resultLineId.data,
							runEmployeeId: runEmployeeId.data,
							employeeId,
							lineKind: "earning",
							code: "BASE_COMPENSATION",
							ruleCode: "BASE_COMPENSATION",
							ruleVersion: "snapshot",
							ruleKind: "none",
							amount: "5200",
							currencyCode: "USD",
							sourceType: "employee_snapshot",
							sourceId: employeeId,
							sequence: 1,
							traceRef: "1",
						},
					],
					actorUserId: harness.actorUserId,
					correlationId: `corr-calc-out-${adapter}`,
				},
				harness.ports,
			);
			expect(persisted.ok).toBe(true);
			if (!persisted.ok) return;

			const listed = await harness.store.listRunEmployeesForRun({
				organizationId: harness.organizationId,
				runId: run.id,
			});
			expect(listed.ok).toBe(true);
			if (!listed.ok) return;
			expect(listed.data).toHaveLength(1);
			expect(listed.data[0]?.net).toBe("4130");

			const lines = await harness.store.listResultLinesForRun({
				organizationId: harness.organizationId,
				runId: run.id,
			});
			expect(lines.ok).toBe(true);
			if (!lines.ok) return;
			expect(lines.data).toHaveLength(1);

			const crossOrg = await createPayrollParityHarness(
				adapter,
			).store.listRunEmployeesForRun({
				organizationId: `org-other-${adapter}`,
				runId: run.id,
			});
			expect(crossOrg.ok).toBe(true);
			if (!crossOrg.ok) return;
			expect(crossOrg.data).toHaveLength(0);

			const replaced = await harness.store.replaceRunCalculationOutputs(
				{
					organizationId: harness.organizationId,
					runId: run.id,
					runEmployees: [
						{
							id: runEmployeeId.data,
							employeeId,
							assignmentId: null,
							currencyCode: "USD",
							gross: "5300",
							employeeDeductions: "600",
							employeeStatutory: "470",
							employerCost: "235",
							net: "4230",
							snapshotJson: { synthetic: true, pass: 2 },
							snapshotHash: "hash-calc-contract-2",
							calculationVersion: "payroll.calc.v1",
							status: "calculated",
						},
					],
					resultLines: [],
					actorUserId: harness.actorUserId,
					correlationId: `corr-calc-replace-${adapter}`,
				},
				harness.ports,
			);
			expect(replaced.ok).toBe(true);
			if (!replaced.ok) return;

			const relisted = await harness.store.listRunEmployeesForRun({
				organizationId: harness.organizationId,
				runId: run.id,
			});
			expect(relisted.ok).toBe(true);
			if (!relisted.ok) return;
			expect(relisted.data[0]?.gross).toBe("5300");
		});

		it("creates assignments and replays idempotent variable inputs", async () => {
			const harness = createPayrollParityHarness(adapter);
			const seeded = await seedPayrollRunChain(harness);
			const employeeId = `emp-${adapter}`;

			const earningRule = await harness.store.createEarningRule(
				{
					organizationId: harness.organizationId,
					payGroupId: seeded.payGroup.id,
					code: "VAR",
					name: "Variable line",
					ruleType: "fixed",
					amount: "50.00",
					rate: null,
					currencyCode: "USD",
					ruleVersion: "1",
					taxTiming: "post_tax",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					idempotencyKey: `idem-er-assignment-${adapter}`,
					createRequestFingerprint: "fp-er-assignment",
					createdBy: harness.actorUserId,
					correlationId: `corr-er-assignment-${adapter}`,
				},
				harness.ports,
			);
			expect(earningRule.ok).toBe(true);
			if (!earningRule.ok) return;

			const assignment = await harness.store.createEmployeeAssignment(
				{
					organizationId: harness.organizationId,
					employeeId,
					payGroupId: seeded.payGroup.id,
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					idempotencyKey: `idem-assignment-${adapter}`,
					createRequestFingerprint: "fp-assignment",
					createdBy: harness.actorUserId,
					correlationId: `corr-assignment-${adapter}`,
				},
				harness.ports,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) return;

			const recurring = await harness.store.createRecurringEarning(
				{
					organizationId: harness.organizationId,
					employeeId,
					assignmentId: assignment.data.id,
					earningRuleId: earningRule.data.id,
					amount: "250.00",
					currencyCode: "USD",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					idempotencyKey: `idem-recurring-${adapter}`,
					createRequestFingerprint: "fp-recurring",
					createdBy: harness.actorUserId,
					correlationId: `corr-recurring-${adapter}`,
				},
				harness.ports,
			);
			expect(recurring.ok).toBe(true);
			if (!recurring.ok) return;

			const variableInput = {
				organizationId: harness.organizationId,
				employeeId,
				payGroupId: seeded.payGroup.id,
				periodId: seeded.period.id,
				earningRuleId: earningRule.data.id,
				earningRuleCode: earningRule.data.code,
				earningRuleVersion: earningRule.data.ruleVersion,
				amount: "75.00",
				currencyCode: "USD",
				sourceType: "timesheet",
				sourceId: `ts-${adapter}`,
				sourceRequestFingerprint: "fp-source",
				effectiveFrom: "2025-01-15",
				effectiveTo: null,
				idempotencyKey: `idem-variable-${adapter}`,
				createRequestFingerprint: "fp-variable",
				createdBy: harness.actorUserId,
				correlationId: `corr-variable-${adapter}`,
			};

			const firstInput = await harness.store.createVariableInput(
				variableInput,
				harness.ports,
			);
			const replayInput = await harness.store.createVariableInput(
				variableInput,
				harness.ports,
			);
			expect(firstInput.ok).toBe(true);
			expect(replayInput.ok).toBe(true);
			if (!firstInput.ok || !replayInput.ok) return;
			expect(replayInput.data.id).toBe(firstInput.data.id);

			const crossOrg = await createPayrollParityHarness(
				adapter,
			).store.getEmployeeAssignment({
				organizationId: `org-other-${adapter}`,
				assignmentId: assignment.data.id,
			});
			expect(crossOrg.ok).toBe(true);
			if (!crossOrg.ok) return;
			expect(crossOrg.data).toBeNull();
		});
	});
}

for (const adapter of adapters) {
	defineStoreContractSuite(adapter);
}

describe("@afenda/payroll store contract (drizzle skipped)", () => {
	it("documents drizzle parity gate when DATABASE_URL is absent locally", () => {
		if (runDrizzleParity) {
			expect(hasDatabase).toBe(true);
			return;
		}
		expect(adapters).toEqual(["memory"]);
	});
});
