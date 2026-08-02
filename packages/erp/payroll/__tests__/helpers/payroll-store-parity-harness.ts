import { createDrizzlePayrollStore } from "../../src/composition/adapters/drizzle";
import type { PayrollStore } from "../../src/composition/store/contract";
import type { MutationPorts } from "../../src/kernel/execution/ports";
import type { MemoryPayrollStore } from "../../src/testing/index";
import { createMemoryPayrollStore } from "../../src/testing/index";
import { createMemoryMutationPorts } from "./memory-ports";

export type PayrollStoreAdapter = "memory" | "drizzle";

export interface PayrollParityHarness {
	actorUserId: string;
	adapter: PayrollStoreAdapter;
	memoryStore: MemoryPayrollStore | null;
	organizationId: string;
	ports: MutationPorts;
	store: PayrollStore;
}

function uniqueSuffix(adapter: PayrollStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPayrollParityHarness(
	adapter: PayrollStoreAdapter,
): PayrollParityHarness {
	const suffix = uniqueSuffix(adapter);
	const memoryStore = adapter === "memory" ? createMemoryPayrollStore() : null;
	return {
		adapter,
		store: memoryStore ?? createDrizzlePayrollStore(),
		memoryStore,
		ports: createMemoryMutationPorts(),
		organizationId: `org-payroll-${suffix}`,
		actorUserId: `user-payroll-${suffix}`,
	};
}

export async function seedPayrollRunChain(harness: PayrollParityHarness) {
	const { store, ports, organizationId, actorUserId } = harness;
	const correlationId = `corr-seed-${harness.adapter}`;

	const calendar = await store.createCalendar(
		{
			organizationId,
			code: `CAL-${harness.adapter}`,
			name: "Test calendar",
			timezone: "UTC",
			effectiveFrom: "2025-01-01",
			effectiveTo: null,
			idempotencyKey: `idem-cal-${harness.adapter}`,
			createRequestFingerprint: "fp-cal",
			createdBy: actorUserId,
			correlationId,
		},
		ports,
	);
	if (!calendar.ok) {
		throw new Error(`seed calendar failed: ${calendar.message}`);
	}

	const payGroup = await store.createPayGroup(
		{
			organizationId,
			calendarId: calendar.data.id,
			code: `PG-${harness.adapter}`,
			name: "Test pay group",
			currencyCode: "USD",
			idempotencyKey: `idem-pg-${harness.adapter}`,
			createRequestFingerprint: "fp-pg",
			createdBy: actorUserId,
			correlationId,
		},
		ports,
	);
	if (!payGroup.ok) {
		throw new Error(`seed pay group failed: ${payGroup.message}`);
	}

	const period = await store.createPeriod(
		{
			organizationId,
			payGroupId: payGroup.data.id,
			periodStart: "2025-01-01",
			periodEnd: "2025-01-31",
			cutoffDate: "2025-01-28",
			idempotencyKey: `idem-period-${harness.adapter}`,
			createRequestFingerprint: "fp-period",
			createdBy: actorUserId,
			correlationId,
		},
		ports,
	);
	if (!period.ok) {
		throw new Error(`seed period failed: ${period.message}`);
	}

	return {
		calendar: calendar.data,
		payGroup: payGroup.data,
		period: period.data,
	};
}

export async function seedDraftRun(
	harness: PayrollParityHarness,
	seeded?: Awaited<ReturnType<typeof seedPayrollRunChain>>,
) {
	const chain = seeded ?? (await seedPayrollRunChain(harness));
	const run = await harness.store.createRun(
		{
			organizationId: harness.organizationId,
			payGroupId: chain.payGroup.id,
			periodId: chain.period.id,
			runType: "regular",
			sequence: 1,
			idempotencyKey: `idem-run-draft-${harness.adapter}`,
			createRequestFingerprint: "fp-run-draft",
			createdBy: harness.actorUserId,
			correlationId: `corr-run-draft-${harness.adapter}`,
		},
		harness.ports,
	);
	if (!run.ok) {
		throw new Error(`seed draft run failed: ${run.message}`);
	}
	return { ...chain, run: run.data };
}
