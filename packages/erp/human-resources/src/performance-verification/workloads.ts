import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";
import {
	type ApprovedPayrollHandoff,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";

import { createMemoryHumanResourcesStore } from "../adapters/memory/store";
import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesHeadcountPlanId,
	parseHumanResourcesHeadcountPlanLineId,
	parseHumanResourcesPositionId,
} from "../brands";
import {
	createMemoryPayrollDeliveryStore,
	deliverPayrollHandoff,
	queuePayrollDelivery,
} from "../integrations/payroll-delivery";
import { HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE } from "../module-ids";
import type { MutationPorts } from "../ports";
import { buildImportEventFingerprint } from "../time/attendance/import-keys";
import type { HeadcountPlanLine } from "../types";
import { computeWorkforcePlanVarianceLine } from "../workforce-planning/variance";
import type { LocalBenchmarkWorkload } from "./harness";
import { HR_LOCAL_BENCHMARK_THRESHOLDS_MS } from "./thresholds";

const ORGANIZATION_ID = "org-local-performance";
const ACTOR_ID = "actor-local-performance";

const mutationPorts: MutationPorts = {
	audit: { record: async () => ok({ id: randomUUID() }) },
	outbox: { append: async () => ok({ id: randomUUID() }) },
};

const mutationMeta = {
	correlationId: "corr-local-performance",
	operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
};

function unwrap<T>(result: Result<T>): T {
	if (!result.ok) throw new Error(result.message);
	return result.data;
}

function deterministicUuid(index: number): string {
	return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

async function seedEmployees(input: {
	organizations: readonly { id: string; count: number }[];
}) {
	const store = createMemoryHumanResourcesStore();
	let sequence = 0;
	for (const organization of input.organizations) {
		for (let index = 0; index < organization.count; index += 1) {
			sequence += 1;
			unwrap(
				await store.createEmployee(
					{
						organizationId: organization.id,
						employeeNumber: `EMP-${sequence.toString().padStart(6, "0")}`,
						normalizedEmployeeNumber: `EMP-${sequence.toString().padStart(6, "0")}`,
						legalName: `Local Fixture Employee ${sequence.toString().padStart(6, "0")}`,
						createIdempotencyKey: `idem-local-${sequence}`,
						createRequestFingerprint: `fingerprint-local-${sequence}`,
						createdBy: ACTOR_ID,
					},
					mutationPorts,
					mutationMeta,
				),
			);
		}
	}
	return store;
}

function approvedHandoff(idempotency: number): ApprovedPayrollHandoff {
	return {
		contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
		organizationId: ORGANIZATION_ID,
		employeeId: `employee-${idempotency}`,
		employmentId: `employment-${idempotency}`,
		assignment: {
			assignmentId: `assignment-${idempotency}`,
			positionId: `position-${idempotency}`,
		},
		effectiveDate: "2026-01-01",
		currencyCode: "USD",
		baseAmount: "85000.00",
		decimalScale: 2,
		roundingMode: "half_even",
		payFrequency: "monthly",
		components: [
			{
				code: "base",
				kind: "base",
				amount: "85000.00",
				currencyCode: "USD",
				decimalScale: 2,
				sourceType: "hr_employee_compensation",
				sourceId: `comp-${idempotency}`,
				sourceVersion: 1,
			},
		],
		leaveFacts: [],
		timeFacts: null,
		overtimeFacts: [],
		sourceVersion: { compensationVersion: 1 },
		approvalEvidence: {
			approvedAt: "2026-01-01T12:00:00.000Z",
			approvedBy: ACTOR_ID,
			correlationId: `corr-payroll-${idempotency}`,
		},
	};
}

export async function createHrLocalBenchmarkWorkloads(): Promise<
	readonly LocalBenchmarkWorkload[]
> {
	const employeeStore = await seedEmployees({
		organizations: [{ id: ORGANIZATION_ID, count: 500 }],
	});
	const tenantStore = await seedEmployees({
		organizations: [
			{ id: "org-large-a", count: 500 },
			{ id: "org-large-b", count: 500 },
		],
	});
	const cases = Array.from({ length: 1_000 }, (_, index) => ({
		organizationId: index % 5 === 0 ? "org-other" : ORGANIZATION_ID,
		status: index % 3 === 0 ? "closed" : "open",
		createdOrdinal: index,
	}));
	const attendance = Array.from({ length: 2_000 }, (_, index) => ({
		employeeId: deterministicUuid((index % 500) + 1),
		occurredAtIso: `2026-01-${((index % 28) + 1).toString().padStart(2, "0")}T08:00:00.000Z`,
		sourceReference: `clock-${index}`,
	}));
	const bulkRows = Array.from({ length: 2_000 }, (_, index) => ({
		employeeNumber: `BULK-${index.toString().padStart(6, "0")}`,
		legalName: `Bulk Employee ${index}`,
	}));
	const timeEntries = Array.from({ length: 2_000 }, (_, index) => ({
		workDate: `2026-01-${((index % 28) + 1).toString().padStart(2, "0")}`,
		minutes: 420 + (index % 4) * 15,
	}));
	const lineId = unwrap(
		parseHumanResourcesHeadcountPlanLineId(deterministicUuid(1)),
	);
	const planId = unwrap(
		parseHumanResourcesHeadcountPlanId(deterministicUuid(2)),
	);
	const positionId = unwrap(
		parseHumanResourcesPositionId(deterministicUuid(3)),
	);
	const varianceLine: HeadcountPlanLine = {
		id: lineId,
		organizationId: ORGANIZATION_ID,
		planId,
		departmentId: null,
		jobId: null,
		positionId,
		locationCode: null,
		employmentType: null,
		plannedFte: "500.0000",
		plannedHeadcount: 500,
		costEnvelopeAmount: null,
		costEnvelopeCurrencyCode: null,
		version: 1,
		createdBy: ACTOR_ID,
		updatedBy: ACTOR_ID,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
	};
	const varianceActuals = Array.from({ length: 500 }, (_, index) => ({
		employmentId: unwrap(
			parseHumanResourcesEmploymentId(deterministicUuid(index + 10)),
		),
		employeeId: unwrap(
			parseHumanResourcesEmployeeId(deterministicUuid(index + 1_000)),
		),
		positionId,
		departmentId: null,
		jobId: null,
		locationCode: null,
		employmentStatus: "active" as const,
		employmentStartsOn: "2025-01-01",
		employmentEndsOn: null,
		assignmentStartsOn: "2025-01-01",
		assignmentEndsOn: null,
	}));
	let payrollSequence = 0;

	return [
		{
			name: "employee_lists",
			description: "Memory store employee prefix list over 500 rows",
			implementation: "real_memory_api",
			fixtureSize: 500,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.employee_lists,
			async run() {
				const result = unwrap(
					await employeeStore.listEmployees({
						organizationId: ORGANIZATION_ID,
						page: 1,
						pageSize: 50,
						employeeNumberPrefix: "EMP-000",
					}),
				);
				return result.employees.length + result.totalCount;
			},
		},
		{
			name: "case_lists",
			description:
				"Representative tenant/status case-list projection over 1,000 rows",
			implementation: "representative_fixture",
			fixtureSize: 1_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.case_lists,
			run() {
				return cases.filter(
					(row) =>
						row.organizationId === ORGANIZATION_ID && row.status === "open",
				).length;
			},
		},
		{
			name: "timesheet_generation",
			description:
				"Representative daily timesheet aggregation over 2,000 entries",
			implementation: "representative_fixture",
			fixtureSize: 2_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.timesheet_generation,
			run() {
				const daily = new Map<string, number>();
				for (const entry of timeEntries) {
					daily.set(
						entry.workDate,
						(daily.get(entry.workDate) ?? 0) + entry.minutes,
					);
				}
				return (
					daily.size +
					Array.from(daily.values()).reduce((sum, value) => sum + value, 0)
				);
			},
		},
		{
			name: "attendance_import",
			description:
				"Real attendance fingerprint kernel over 2,000 imported events",
			implementation: "real_domain_kernel",
			fixtureSize: 2_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.attendance_import,
			run() {
				let bytes = 0;
				for (const event of attendance) {
					bytes += buildImportEventFingerprint({
						employeeId: event.employeeId,
						employmentId: null,
						shiftAssignmentId: null,
						eventType: "clock_in",
						occurredAtIso: event.occurredAtIso,
						sourceTimezone: "UTC",
						localWorkDate: event.occurredAtIso.slice(0, 10),
						sourceKey: "local-benchmark",
						sourceReference: event.sourceReference,
						payloadChecksum: null,
					}).length;
				}
				return bytes;
			},
		},
		{
			name: "bulk_employee_import",
			description:
				"Representative validation and deduplication of 2,000 employee rows",
			implementation: "representative_fixture",
			fixtureSize: 2_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.bulk_employee_import,
			run() {
				const seen = new Set<string>();
				let valid = 0;
				for (const row of bulkRows) {
					if (row.legalName.length > 0 && !seen.has(row.employeeNumber)) {
						seen.add(row.employeeNumber);
						valid += 1;
					}
				}
				return valid;
			},
		},
		{
			name: "workforce_variance",
			description: "Real workforce variance kernel over 500 actual assignments",
			implementation: "real_domain_kernel",
			fixtureSize: 500,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.workforce_variance,
			run() {
				const variance = computeWorkforcePlanVarianceLine({
					line: varianceLine,
					availability: {
						planLineId: lineId,
						plannedFte: "500.0000",
						plannedHeadcount: 500,
						reservedFte: "0.0000",
						reservedHeadcount: 0,
						consumedFte: "0.0000",
						consumedHeadcount: 0,
						availableFte: "500.0000",
						availableHeadcount: 500,
					},
					actuals: varianceActuals,
				});
				return variance.actualHeadcount;
			},
		},
		{
			name: "payroll_handoff_delivery",
			description:
				"Real payroll delivery queue and publish Memory state machine",
			implementation: "real_domain_kernel",
			fixtureSize: 1,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.payroll_handoff_delivery,
			async run() {
				payrollSequence += 1;
				const payload = approvedHandoff(payrollSequence);
				const store = createMemoryPayrollDeliveryStore();
				const ports = {
					store,
					clock: { now: () => new Date("2026-01-02T00:00:00.000Z") },
					producer: {
						publish: async () => ok({ receiptId: "local-receipt" }),
					},
				};
				const queued = unwrap(
					await queuePayrollDelivery(
						{
							organizationId: ORGANIZATION_ID,
							correlationId: payload.approvalEvidence.correlationId,
							idempotencyKey: `idem-payroll-${payrollSequence}`,
							actorUserId: ACTOR_ID,
							payload,
						},
						ports,
					),
				);
				const delivered = unwrap(
					await deliverPayrollHandoff(
						{
							organizationId: ORGANIZATION_ID,
							deliveryId: queued.id,
							correlationId: queued.correlationId,
							actorUserId: ACTOR_ID,
						},
						ports,
					),
				);
				return delivered.attemptCount;
			},
		},
		{
			name: "large_tenant_isolation",
			description:
				"Memory store tenant-isolated employee page over 1,000 cross-tenant rows",
			implementation: "real_memory_api",
			fixtureSize: 1_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.large_tenant_isolation,
			async run() {
				const result = unwrap(
					await tenantStore.listEmployees({
						organizationId: "org-large-b",
						page: 1,
						pageSize: 100,
					}),
				);
				return result.totalCount + result.employees.length;
			},
		},
	];
}
