import { describe, expect, it } from "vitest";
import { createRegistryPayrollStatutory } from "../src/facade/system-capabilities";
import { hashSnapshot } from "../src/features/calculation/calculation-snapshot";
import { finalizePayrollRun } from "../src/features/payroll-runs/finalization";
import { createPayrollPeriod } from "../src/features/payroll-runs/payroll-period";
import { createPayrollRun } from "../src/features/payroll-runs/payroll-run";
import { reversePayrollRun } from "../src/features/payroll-runs/reversal";
import { createPayrollCalendar } from "../src/features/payroll-setup/calendar";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import {
	generateAnnualStatement,
	generateStatutoryFiling,
	listFilingObligations,
	sealFilingEvidence,
} from "../src/features/statutory-filings/filing.command";
import { SYNTH_V1_CALCULATOR_ID } from "../src/features/statutory-rules/calculator-synth-v1";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import type { PayrollStatutoryCapability } from "../src/kernel/execution/capability-ports";
import {
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/kernel/execution/permissions";
import {
	type PayrollRunId,
	parsePayrollRunEmployeeId,
	parsePayrollStatutoryResultId,
} from "../src/kernel/identity/brands";
import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
} from "../src/kernel/money/rounding-policy";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-payroll-statutory-filings";
const OTHER_ORGANIZATION_ID = "org-payroll-statutory-filings-other";
const ACTOR_ID = "actor-payroll-statutory-filings";
const FINALIZER_ID = "actor-payroll-statutory-filings-finalizer";
const SEALER_ID = "actor-payroll-statutory-filings-sealer";
const EMPLOYEE_ID = "emp-payroll-filing-001";
const CORRELATION_ID = "corr-payroll-statutory-filings";
const JURISDICTION = "MY";
const INSTRUMENT = "EPF";

const PERMISSIONS = [
	PAYROLL_PERMISSION_SETUP_MANAGE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
];

function authorization(
	permissions: readonly string[],
): PayrollAuthorizationPort {
	return { can: async ({ permission }) => permissions.includes(permission) };
}

/**
 * Approves the registered calculator for production without mutating the
 * package registry, so production approval is the only difference between a
 * generated filing and a refused one.
 */
function approvingStatutory(): PayrollStatutoryCapability {
	const registry = createRegistryPayrollStatutory();
	return {
		isProductionApproved: () => true,
		requireCalculator: registry.requireCalculator,
	};
}

function context(actorUserId = ACTOR_ID) {
	return {
		organizationId: ORGANIZATION_ID,
		actorUserId,
		correlationId: CORRELATION_ID,
	};
}

function unwrap<T>(
	result: { ok: true; data: T } | { ok: false; message: string },
): T {
	if (!result.ok) {
		throw new Error(result.message);
	}
	return result.data;
}

async function seedFinalizedRunWithStatutoryResult(
	seedOptions: { statutory?: PayrollStatutoryCapability } = {},
) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const options = {
		store,
		ports,
		authorization: authorization(PERMISSIONS),
		statutory: seedOptions.statutory ?? approvingStatutory(),
	};
	const calendar = unwrap(
		await createPayrollCalendar(
			{
				...context(),
				code: "CAL-FILING",
				name: "Filing calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
				idempotencyKey: "idem-cal-filing",
			},
			options,
		),
	);
	const payGroup = unwrap(
		await createPayrollPayGroup(
			{
				...context(),
				calendarId: calendar.id,
				code: "PG-FILING",
				name: "Filing pay group",
				currencyCode: "MYR",
				idempotencyKey: "idem-pg-filing",
			},
			options,
		),
	);
	const period = unwrap(
		await createPayrollPeriod(
			{
				...context(),
				payGroupId: payGroup.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-period-filing",
			},
			options,
		),
	);
	const run = unwrap(
		await createPayrollRun(
			{
				...context(),
				payGroupId: payGroup.id,
				periodId: period.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-filing",
			},
			options,
		),
	);
	unwrap(
		await store.replaceStatutoryResultsForRun(
			{
				actorUserId: ACTOR_ID,
				correlationId: CORRELATION_ID,
				organizationId: ORGANIZATION_ID,
				runId: run.id,
				results: [
					{
						id: unwrap(
							parsePayrollStatutoryResultId(
								"b0000006-0006-4006-8006-000000000001",
							),
						),
						runEmployeeId: unwrap(
							parsePayrollRunEmployeeId("b0000006-0006-4006-8006-000000000011"),
						),
						employeeId: EMPLOYEE_ID,
						jurisdictionCode: JURISDICTION,
						ruleCode: INSTRUMENT,
						ruleVersion: "1",
						calculatorId: SYNTH_V1_CALCULATOR_ID,
						baseAmount: "1000.00",
						employeeAmount: "110.00",
						employerAmount: "130.00",
						currencyCode: "MYR",
						configSnapshotJson: { calculatorId: SYNTH_V1_CALCULATOR_ID },
					},
				],
			},
			ports,
		),
	);
	const calculating = unwrap(
		await store.updateRunWithVersion(
			{
				actorUserId: ACTOR_ID,
				correlationId: CORRELATION_ID,
				expectedVersion: run.version,
				organizationId: ORGANIZATION_ID,
				runId: run.id,
				status: "calculating",
			},
			ports,
		),
	);
	const calculated = unwrap(
		await store.updateRunWithVersion(
			{
				actorUserId: ACTOR_ID,
				calculationSnapshotHash: hashSnapshot({
					calculationVersion: PAYROLL_CALCULATION_VERSION,
					roundingPolicy: DEFAULT_PAYROLL_ROUNDING_POLICY,
					runId: run.id,
					snapshotHashes: [],
				}),
				calculationVersion: PAYROLL_CALCULATION_VERSION,
				correlationId: CORRELATION_ID,
				expectedVersion: calculating.version,
				organizationId: ORGANIZATION_ID,
				roundingPolicyJson: { ...DEFAULT_PAYROLL_ROUNDING_POLICY },
				runId: run.id,
				status: "calculated",
			},
			ports,
		),
	);
	const finalized = unwrap(
		await finalizePayrollRun(
			{
				...context(FINALIZER_ID),
				expectedVersion: calculated.version,
				runId: run.id,
			},
			options,
		),
	);
	return {
		options,
		payGroupId: payGroup.id,
		periodId: period.id,
		ports,
		runId: finalized.id as PayrollRunId,
		runVersion: finalized.version,
		store,
	};
}

type SeededFiling = Awaited<
	ReturnType<typeof seedFinalizedRunWithStatutoryResult>
>;

/**
 * Changes the state of the run a filing was generated from, through the real
 * reversal ingress. Finalized statutory evidence is itself immutable, so this
 * is the strongest legitimate "the world moved on" mutation available.
 */
async function reverseSourceRun(seeded: SeededFiling) {
	unwrap(
		await reversePayrollRun(
			{
				...context(),
				runId: seeded.runId,
				expectedVersion: seeded.runVersion,
				idempotencyKey: "idem-run-filing-reverse",
				reasonCode: "operational_correction",
				reason: "Synthetic reversal for statutory filing reproducibility",
			},
			seeded.options,
		),
	);
}

describe("statutory-filings", () => {
	it("generates a period filing from finalized statutory results and seals with SoD", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		const draftRun = unwrap(
			await createPayrollRun(
				{
					...context(),
					payGroupId: seeded.payGroupId,
					periodId: seeded.periodId,
					runType: "off_cycle",
					sequence: 2,
					idempotencyKey: "idem-run-filing-draft",
				},
				seeded.options,
			),
		);
		const draftBlocked = await generateStatutoryFiling(
			{
				...context(),
				idempotencyKey: "idem-filing-period-draft",
				instrumentCode: INSTRUMENT,
				jurisdictionCode: JURISDICTION,
				periodId: seeded.periodId,
				runIds: [draftRun.id],
			},
			seeded.options,
		);
		expect(draftBlocked.ok).toBe(false);

		const generated = unwrap(
			await generateStatutoryFiling(
				{
					...context(),
					idempotencyKey: "idem-filing-period-1",
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					periodId: seeded.periodId,
					runIds: [seeded.runId],
				},
				seeded.options,
			),
		);
		expect(generated.filing.status).toBe("generated");
		expect(generated.filing.kind).toBe("period_filing");
		expect(generated.filing.totals).toEqual({
			baseAmount: "1000.00",
			employeeAmount: "110.00",
			employerAmount: "130.00",
		});
		expect(generated.lines).toHaveLength(1);

		const replay = unwrap(
			await generateStatutoryFiling(
				{
					...context(),
					idempotencyKey: "idem-filing-period-1",
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					periodId: seeded.periodId,
					runIds: [seeded.runId],
				},
				seeded.options,
			),
		);
		expect(replay.filing.id).toBe(generated.filing.id);

		const sameActor = await sealFilingEvidence(
			{
				...context(),
				expectedVersion: generated.filing.version,
				filingId: generated.filing.id,
			},
			seeded.options,
		);
		expect(sameActor.ok).toBe(false);
		if (!sameActor.ok) {
			expect(sameActor.message).toContain("Segregation of duties");
		}

		const sealed = unwrap(
			await sealFilingEvidence(
				{
					...context(SEALER_ID),
					expectedVersion: generated.filing.version,
					filingId: generated.filing.id,
				},
				seeded.options,
			),
		);
		expect(sealed.filing.status).toBe("sealed");
		expect(sealed.filing.sealedBy).toBe(SEALER_ID);
		expect(sealed.filing.evidence?.contentHash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("generates an annual statement and lists missing obligations", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		const annual = unwrap(
			await generateAnnualStatement(
				{
					...context(),
					employeeId: EMPLOYEE_ID,
					idempotencyKey: "idem-filing-annual-1",
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					runIds: [seeded.runId],
					taxYear: 2025,
				},
				seeded.options,
			),
		);
		expect(annual.filing.kind).toBe("annual_statement");
		expect(annual.filing.employeeId).toBe(EMPLOYEE_ID);
		expect(annual.filing.periodId).toBeNull();

		const obligations = unwrap(
			await listFilingObligations(
				{
					...context(),
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					runIds: [seeded.runId],
					taxYear: 2025,
				},
				seeded.options,
			),
		);
		expect(
			obligations.some(
				(row) => row.kind === "annual_statement" && row.status === "generated",
			),
		).toBe(true);
		expect(
			obligations.some(
				(row) => row.kind === "period_filing" && row.status === "missing",
			),
		).toBe(true);
	});

	it("refuses generation when no statutory results match", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		const result = await generateStatutoryFiling(
			{
				...context(),
				idempotencyKey: "idem-filing-period-miss",
				instrumentCode: "SOCSO",
				jurisdictionCode: JURISDICTION,
				periodId: seeded.periodId,
				runIds: [seeded.runId],
			},
			seeded.options,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.message).toContain("No sealed statutory results");
		}
	});
});

describe("statutory-filings generation is fail-closed (A2)", () => {
	it("refuses when the sealed calculator is not production approved", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult({
			statutory: createRegistryPayrollStatutory(),
		});
		const result = await generateStatutoryFiling(
			{
				...context(),
				idempotencyKey: "idem-filing-period-unapproved",
				instrumentCode: INSTRUMENT,
				jurisdictionCode: JURISDICTION,
				periodId: seeded.periodId,
				runIds: [seeded.runId],
			},
			seeded.options,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("not approved for production");
		}
	});

	it("refuses when no statutory capability is wired at all", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		const { statutory: _statutory, ...withoutStatutory } = seeded.options;
		const result = await generateAnnualStatement(
			{
				...context(),
				employeeId: EMPLOYEE_ID,
				idempotencyKey: "idem-filing-annual-unwired",
				instrumentCode: INSTRUMENT,
				jurisdictionCode: JURISDICTION,
				runIds: [seeded.runId],
				taxYear: 2025,
			},
			withoutStatutory,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
			expect(result.message).toContain("not approved for production");
		}
	});
});

describe("statutory-filings sealed artifacts are reproducible", () => {
	it("keeps the sealed artifact and content hash stable after the source run evidence changes", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		const generated = unwrap(
			await generateStatutoryFiling(
				{
					...context(),
					idempotencyKey: "idem-filing-period-repro",
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					periodId: seeded.periodId,
					runIds: [seeded.runId],
				},
				seeded.options,
			),
		);
		const sealed = unwrap(
			await sealFilingEvidence(
				{
					...context(SEALER_ID),
					expectedVersion: generated.filing.version,
					filingId: generated.filing.id,
				},
				seeded.options,
			),
		);
		const sealedHash = sealed.filing.evidence?.contentHash;
		expect(sealedHash).toMatch(/^[a-f0-9]{64}$/);

		await reverseSourceRun(seeded);

		const resealed = unwrap(
			await sealFilingEvidence(
				{
					...context(SEALER_ID),
					expectedVersion: sealed.filing.version,
					filingId: sealed.filing.id,
				},
				seeded.options,
			),
		);
		expect(resealed.filing.version).toBe(sealed.filing.version);
		expect(resealed.filing.sealedAt).toEqual(sealed.filing.sealedAt);
		expect(resealed.filing.evidence?.contentHash).toBe(sealedHash);
		expect(resealed.filing.totals).toEqual(sealed.filing.totals);
		expect(resealed.lines).toEqual(sealed.lines);
	});

	it("replays the identical filing when the same request is retried after the evidence changed", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		const request = {
			...context(),
			idempotencyKey: "idem-filing-period-replay",
			instrumentCode: INSTRUMENT,
			jurisdictionCode: JURISDICTION,
			periodId: seeded.periodId,
			runIds: [seeded.runId],
		};
		const generated = unwrap(
			await generateStatutoryFiling(request, seeded.options),
		);

		await reverseSourceRun(seeded);

		const replay = unwrap(
			await generateStatutoryFiling(request, seeded.options),
		);
		expect(replay.filing.id).toBe(generated.filing.id);
		expect(replay.filing.version).toBe(generated.filing.version);
		expect(replay.filing.totals).toEqual(generated.filing.totals);
		expect(replay.lines).toEqual(generated.lines);
	});

	it("refuses a different request that reuses an idempotency key", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		unwrap(
			await generateStatutoryFiling(
				{
					...context(),
					idempotencyKey: "idem-filing-period-reuse",
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					periodId: seeded.periodId,
					runIds: [seeded.runId],
				},
				seeded.options,
			),
		);
		const conflicting = await generateAnnualStatement(
			{
				...context(),
				employeeId: EMPLOYEE_ID,
				idempotencyKey: "idem-filing-period-reuse",
				instrumentCode: INSTRUMENT,
				jurisdictionCode: JURISDICTION,
				runIds: [seeded.runId],
				taxYear: 2025,
			},
			seeded.options,
		);
		expect(conflicting.ok).toBe(false);
		if (!conflicting.ok) {
			expect(conflicting.code).toBe("CONFLICT");
		}
	});
});

describe("statutory-filings are org scoped", () => {
	it("hides a filing and its obligations from another organization", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		const generated = unwrap(
			await generateStatutoryFiling(
				{
					...context(),
					idempotencyKey: "idem-filing-period-scope",
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					periodId: seeded.periodId,
					runIds: [seeded.runId],
				},
				seeded.options,
			),
		);

		const foreignSeal = await sealFilingEvidence(
			{
				actorUserId: SEALER_ID,
				correlationId: CORRELATION_ID,
				organizationId: OTHER_ORGANIZATION_ID,
				expectedVersion: generated.filing.version,
				filingId: generated.filing.id,
			},
			seeded.options,
		);
		expect(foreignSeal.ok).toBe(false);
		if (!foreignSeal.ok) {
			expect(foreignSeal.code).toBe("NOT_FOUND");
		}

		const foreignObligations = unwrap(
			await listFilingObligations(
				{
					actorUserId: ACTOR_ID,
					correlationId: CORRELATION_ID,
					organizationId: OTHER_ORGANIZATION_ID,
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					taxYear: 2025,
				},
				seeded.options,
			),
		);
		expect(foreignObligations).toEqual([]);
	});

	it("projects generated and sealed obligation statuses for the owning organization", async () => {
		const seeded = await seedFinalizedRunWithStatutoryResult();
		const generated = unwrap(
			await generateStatutoryFiling(
				{
					...context(),
					idempotencyKey: "idem-filing-period-obligations",
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					periodId: seeded.periodId,
					runIds: [seeded.runId],
				},
				seeded.options,
			),
		);
		const beforeSeal = unwrap(
			await listFilingObligations(
				{
					...context(),
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					taxYear: 2025,
				},
				seeded.options,
			),
		);
		expect(beforeSeal).toEqual([
			{
				employeeId: null,
				filingId: generated.filing.id,
				instrumentCode: INSTRUMENT,
				jurisdictionCode: JURISDICTION,
				kind: "period_filing",
				periodId: seeded.periodId,
				status: "generated",
				taxYear: 2025,
			},
		]);

		unwrap(
			await sealFilingEvidence(
				{
					...context(SEALER_ID),
					expectedVersion: generated.filing.version,
					filingId: generated.filing.id,
				},
				seeded.options,
			),
		);
		const afterSeal = unwrap(
			await listFilingObligations(
				{
					...context(),
					instrumentCode: INSTRUMENT,
					jurisdictionCode: JURISDICTION,
					taxYear: 2025,
				},
				seeded.options,
			),
		);
		expect(afterSeal.map((row) => row.status)).toEqual(["sealed"]);
	});
});
