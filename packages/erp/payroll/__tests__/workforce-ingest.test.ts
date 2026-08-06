import { describe, expect, it } from "vitest";

import {
	createPayrollPeriod,
	lockPayrollPeriodInputs,
} from "../src/features/payroll-runs/payroll-period";
import { createPayrollRun } from "../src/features/payroll-runs/payroll-run";
import { createPayrollCalendar } from "../src/features/payroll-setup/calendar";
import { createPayrollPayGroup } from "../src/features/payroll-setup/pay-group";
import { createAcceptedWorkforceInputPort } from "../src/features/workforce-ingress/accepted-workforce-input-port";
import {
	hashApprovedPayrollHandoffPayload,
	ingestApprovedPayrollHandoff,
} from "../src/features/workforce-ingress/ingest-approved-handoff";
import { MID_PERIOD_TERMINATION_EXCEPTION_CODE } from "../src/features/workforce-ingress/period-freeze";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "../src/kernel/execution/permissions";
import { createMemoryPayrollStore } from "../src/testing/index";
import { buildSyntheticHandoff } from "./fixtures/approved-payroll-handoff-fixtures";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-synth-handoff";

function createGrantingAuthorization(
	permissions: string[] = [PAYROLL_PERMISSION_INPUT_MANAGE],
): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) => permissions.includes(permission),
	};
}

function createDenyingAuthorization(): PayrollAuthorizationPort {
	return {
		can: async () => false,
	};
}

function createOptions(
	authorization: PayrollAuthorizationPort = createGrantingAuthorization(),
) {
	return {
		store: createMemoryPayrollStore(),
		ports: createMemoryMutationPorts(),
		authorization,
	};
}

function ingestInput(overrides: Record<string, unknown> = {}) {
	return {
		organizationId: ORGANIZATION_ID,
		actorUserId: "user-ingress-actor",
		correlationId: "corr-ingress-test",
		idempotencyKey: "idem-ingress-1",
		periodStart: "2025-01-01",
		periodEnd: "2025-01-31",
		payload: buildSyntheticHandoff(),
		...overrides,
	};
}

describe("payroll workforce ingress (PRD R1)", () => {
	it("accepts a valid approved handoff and seals the payload hash", async () => {
		const options = createOptions();
		const result = await ingestApprovedPayrollHandoff(ingestInput(), options);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.organizationId).toBe(ORGANIZATION_ID);
		expect(result.data.employeeId).toBe("emp-synth-handoff");
		expect(result.data.employmentId).toBe("employ-synth-handoff");
		expect(result.data.effectiveDate).toBe("2025-01-01");
		expect(result.data.status).toBe("accepted");
		expect(result.data.supersededByHandoffId).toBeNull();
		expect(result.data.payloadHash).toBe(
			hashApprovedPayrollHandoffPayload(buildSyntheticHandoff()),
		);
	});

	it("rejects an actor without payroll.input.manage", async () => {
		const options = createOptions(createDenyingAuthorization());
		const result = await ingestApprovedPayrollHandoff(ingestInput(), options);

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("FORBIDDEN");
	});

	it("rejects a payload for another tenant without disclosure", async () => {
		const options = createOptions();
		const result = await ingestApprovedPayrollHandoff(
			ingestInput({
				payload: buildSyntheticHandoff({ organizationId: "org-other-tenant" }),
			}),
			options,
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("VALIDATION_ERROR");
		expect(result.message).toBe("Invalid approved payroll handoff input.");
		expect(result.message).not.toContain("org-other-tenant");
	});

	it("replays the same record for an identical payload and idempotency key", async () => {
		const options = createOptions();
		const first = await ingestApprovedPayrollHandoff(ingestInput(), options);
		const replay = await ingestApprovedPayrollHandoff(ingestInput(), options);

		expect(first.ok).toBe(true);
		expect(replay.ok).toBe(true);
		if (!(first.ok && replay.ok)) {
			return;
		}
		expect(replay.data.id).toBe(first.data.id);
		expect(replay.data.version).toBe(first.data.version);
	});

	it("fails with CONFLICT when the same key carries a changed payload", async () => {
		const options = createOptions();
		const first = await ingestApprovedPayrollHandoff(ingestInput(), options);
		const conflicting = await ingestApprovedPayrollHandoff(
			ingestInput({
				payload: buildSyntheticHandoff({ baseAmount: "90000" }),
			}),
			options,
		);

		expect(first.ok).toBe(true);
		expect(conflicting.ok).toBe(false);
		if (conflicting.ok) {
			return;
		}
		expect(conflicting.code).toBe("CONFLICT");
	});

	it("supersedes the prior accepted record for the same identity with lineage", async () => {
		const options = createOptions();
		const first = await ingestApprovedPayrollHandoff(ingestInput(), options);
		const second = await ingestApprovedPayrollHandoff(
			ingestInput({
				idempotencyKey: "idem-ingress-2",
				payload: buildSyntheticHandoff({
					baseAmount: "90000",
					sourceVersion: { compensationVersion: 2 },
					components: [
						{
							code: "base",
							kind: "base",
							amount: "90000",
							currencyCode: "USD",
							decimalScale: 0,
							sourceType: "hr_employee_compensation",
							sourceId: "comp-synth-1",
							sourceVersion: 2,
						},
					],
				}),
			}),
			options,
		);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!(first.ok && second.ok)) {
			return;
		}
		expect(second.data.id).not.toBe(first.data.id);
		expect(second.data.status).toBe("accepted");

		const active = await options.store.getAcceptedWorkforceHandoff({
			organizationId: ORGANIZATION_ID,
			employeeId: "emp-synth-handoff",
			effectiveDate: "2025-01-01",
			periodStart: "2025-01-01",
			periodEnd: "2025-01-31",
		});
		expect(active.ok).toBe(true);
		if (!active.ok) {
			return;
		}
		expect(active.data?.id).toBe(second.data.id);
	});

	it("rejects a stale or equal sourceVersion under a fresh idempotency key", async () => {
		const options = createOptions();
		const first = await ingestApprovedPayrollHandoff(
			ingestInput({
				payload: buildSyntheticHandoff({
					baseAmount: "90000",
					sourceVersion: { compensationVersion: 2 },
					components: [
						{
							code: "base",
							kind: "base",
							amount: "90000",
							currencyCode: "USD",
							decimalScale: 0,
							sourceType: "hr_employee_compensation",
							sourceId: "comp-synth-1",
							sourceVersion: 2,
						},
					],
				}),
			}),
			options,
		);
		const stale = await ingestApprovedPayrollHandoff(
			ingestInput({
				idempotencyKey: "idem-ingress-stale",
				payload: buildSyntheticHandoff({
					baseAmount: "85000",
					sourceVersion: { compensationVersion: 1 },
				}),
			}),
			options,
		);
		const equalRevision = await ingestApprovedPayrollHandoff(
			ingestInput({
				idempotencyKey: "idem-ingress-equal-revision",
				payload: buildSyntheticHandoff({
					baseAmount: "91000",
					sourceVersion: { compensationVersion: 2 },
					components: [
						{
							code: "base",
							kind: "base",
							amount: "91000",
							currencyCode: "USD",
							decimalScale: 0,
							sourceType: "hr_employee_compensation",
							sourceId: "comp-synth-1",
							sourceVersion: 2,
						},
					],
				}),
			}),
			options,
		);

		expect(first.ok).toBe(true);
		expect(stale.ok).toBe(false);
		expect(equalRevision.ok).toBe(false);
		if (stale.ok || equalRevision.ok) {
			return;
		}
		expect(stale.code).toBe("CONFLICT");
		expect(stale.message).toContain("Stale workforce handoff revision");
		expect(equalRevision.code).toBe("CONFLICT");

		const active = await options.store.getAcceptedWorkforceHandoff({
			organizationId: ORGANIZATION_ID,
			employeeId: "emp-synth-handoff",
			effectiveDate: "2025-01-01",
			periodStart: "2025-01-01",
			periodEnd: "2025-01-31",
		});
		expect(active.ok).toBe(true);
		if (!(active.ok && first.ok)) {
			return;
		}
		expect(active.data?.id).toBe(first.data.id);
	});

	it("rejects a handoff with no sourceVersion key (fail-closed, never CONFLICT)", async () => {
		const options = createOptions();
		const payload = buildSyntheticHandoff() as Record<string, unknown>;
		payload.sourceVersion = undefined;
		const result = await ingestApprovedPayrollHandoff(
			ingestInput({ payload }),
			options,
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		// The shared HR schema requires the `sourceVersion` key itself, so an
		// absent key is already rejected at the parse step (generic message)
		// before this feature's declared-axis guard runs; still VALIDATION_ERROR
		// before any store call, so it can never surface as a stale-revision
		// CONFLICT.
		expect(result.code).toBe("VALIDATION_ERROR");
	});

	it("rejects a handoff with an empty sourceVersion object (fail-closed)", async () => {
		const options = createOptions();
		const result = await ingestApprovedPayrollHandoff(
			ingestInput({
				payload: buildSyntheticHandoff({
					sourceVersion: {} as unknown as { compensationVersion: number },
				}),
			}),
			options,
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("VALIDATION_ERROR");
		expect(result.message).toBe(
			"Approved payroll handoff must declare at least one sourceVersion axis",
		);
	});

	it("returns the same record when a new key repeats the active payload", async () => {
		const options = createOptions();
		const first = await ingestApprovedPayrollHandoff(ingestInput(), options);
		const repeat = await ingestApprovedPayrollHandoff(
			ingestInput({ idempotencyKey: "idem-ingress-3" }),
			options,
		);

		expect(first.ok).toBe(true);
		expect(repeat.ok).toBe(true);
		if (!(first.ok && repeat.ok)) {
			return;
		}
		expect(repeat.data.id).toBe(first.data.id);
	});

	it("serves period-scoped reads from the period-agnostic accepted record", async () => {
		const options = createOptions();
		const ingested = await ingestApprovedPayrollHandoff(
			ingestInput({ periodStart: null, periodEnd: null }),
			options,
		);
		expect(ingested.ok).toBe(true);

		const reader = createAcceptedWorkforceInputPort(options.store);
		const periodScoped = await reader.getApprovedPayrollHandoff({
			organizationId: ORGANIZATION_ID,
			employeeId: "emp-synth-handoff",
			effectiveDate: "2025-01-01",
			periodStart: "2025-01-01",
			periodEnd: "2025-01-31",
			actorUserId: "user-ingress-actor",
			correlationId: "corr-ingress-test",
		});
		expect(periodScoped.ok).toBe(true);
		if (!periodScoped.ok) {
			return;
		}
		expect(periodScoped.data).toEqual(buildSyntheticHandoff());

		const periodless = await reader.getApprovedPayrollHandoff({
			organizationId: ORGANIZATION_ID,
			employeeId: "emp-synth-handoff",
			effectiveDate: "2025-01-01",
			actorUserId: "user-ingress-actor",
			correlationId: "corr-ingress-test",
		});
		expect(periodless.ok).toBe(true);
		if (!periodless.ok) {
			return;
		}
		expect(periodless.data).toEqual(buildSyntheticHandoff());
	});

	it("returns null from the reader for an unknown employee", async () => {
		const options = createOptions();
		const reader = createAcceptedWorkforceInputPort(options.store);
		const missing = await reader.getApprovedPayrollHandoff({
			organizationId: ORGANIZATION_ID,
			employeeId: "emp-unknown",
			effectiveDate: "2025-01-01",
			actorUserId: "user-ingress-actor",
			correlationId: "corr-ingress-test",
		});
		expect(missing.ok).toBe(true);
		if (!missing.ok) {
			return;
		}
		expect(missing.data).toBeNull();
	});

	it("defers a non-termination handoff after inputs_locked (C3/C4)", async () => {
		const seeded = await seedLockedPeriod("defer");
		const ingested = await ingestApprovedPayrollHandoff(
			ingestInput({
				idempotencyKey: "idem-ingress-defer",
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
			}),
			seeded.options,
		);
		expect(ingested.ok).toBe(true);
		if (!ingested.ok) {
			return;
		}
		expect(ingested.data.status).toBe("deferred_to_next_period");

		const reader = createAcceptedWorkforceInputPort(seeded.options.store);
		const active = await reader.getApprovedPayrollHandoff({
			organizationId: ORGANIZATION_ID,
			employeeId: "emp-synth-handoff",
			effectiveDate: "2025-01-01",
			periodStart: "2025-01-01",
			periodEnd: "2025-01-31",
			actorUserId: "user-ingress-actor",
			correlationId: "corr-ingress-test",
		});
		expect(active.ok).toBe(true);
		if (!active.ok) {
			return;
		}
		expect(active.data).toBeNull();
	});

	it("accepts a late termination and raises a blocking run exception (C6)", async () => {
		const seeded = await seedLockedPeriod("term");
		const ingested = await ingestApprovedPayrollHandoff(
			ingestInput({
				idempotencyKey: "idem-ingress-term",
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				payload: buildSyntheticHandoff({
					employmentStatus: "terminated",
					sourceVersion: { compensationVersion: 2 },
				}),
			}),
			seeded.options,
		);
		expect(ingested.ok).toBe(true);
		if (!ingested.ok) {
			return;
		}
		expect(ingested.data.status).toBe("accepted");

		const exceptions = await seeded.options.store.listExceptionsForRun({
			organizationId: ORGANIZATION_ID,
			runId: seeded.run.id,
		});
		expect(exceptions.ok).toBe(true);
		if (!exceptions.ok) {
			return;
		}
		expect(exceptions.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					exceptionCode: MID_PERIOD_TERMINATION_EXCEPTION_CODE,
					severity: "blocking",
					employeeRef: "emp-synth-handoff",
				}),
			]),
		);
	});
});

async function seedLockedPeriod(suffix: string) {
	const store = createMemoryPayrollStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingAuthorization([
		PAYROLL_PERMISSION_INPUT_MANAGE,
		PAYROLL_PERMISSION_SETUP_MANAGE,
		PAYROLL_PERMISSION_RUN_CREATE,
	]);
	const options = { store, ports, authorization };
	const context = {
		organizationId: ORGANIZATION_ID,
		actorUserId: "user-ingress-actor",
		correlationId: "corr-ingress-test",
	};

	const calendar = await createPayrollCalendar(
		{
			...context,
			code: `CAL-${suffix}`,
			name: "Ingress calendar",
			timezone: "UTC",
			effectiveFrom: "2025-01-01",
			idempotencyKey: `idem-cal-${suffix}`,
		},
		options,
	);
	if (!calendar.ok) {
		throw new Error(calendar.message);
	}

	const payGroup = await createPayrollPayGroup(
		{
			...context,
			calendarId: calendar.data.id,
			code: `PG-${suffix}`,
			name: "Ingress pay group",
			currencyCode: "USD",
			idempotencyKey: `idem-pg-${suffix}`,
		},
		options,
	);
	if (!payGroup.ok) {
		throw new Error(payGroup.message);
	}

	const period = await createPayrollPeriod(
		{
			...context,
			payGroupId: payGroup.data.id,
			periodStart: "2025-01-01",
			periodEnd: "2025-01-31",
			cutoffDate: "2025-01-28",
			idempotencyKey: `idem-period-${suffix}`,
		},
		options,
	);
	if (!period.ok) {
		throw new Error(period.message);
	}

	const run = await createPayrollRun(
		{
			...context,
			payGroupId: payGroup.data.id,
			periodId: period.data.id,
			runType: "regular",
			sequence: 1,
			idempotencyKey: `idem-run-${suffix}`,
		},
		options,
	);
	if (!run.ok) {
		throw new Error(run.message);
	}

	const locked = await lockPayrollPeriodInputs(
		{
			...context,
			periodId: period.data.id,
			expectedVersion: period.data.version,
		},
		options,
	);
	if (!locked.ok) {
		throw new Error(locked.message);
	}

	return {
		options,
		period: locked.data,
		run: run.data,
		payGroup: payGroup.data,
	};
}
