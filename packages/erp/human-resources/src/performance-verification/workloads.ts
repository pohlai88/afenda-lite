import { randomUUID } from "node:crypto";

import { AppError } from "@afenda/errors";
import { ok, type Result } from "@afenda/errors/result";
import {
	type ApprovedPayrollHandoff,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";

import { createMemoryHumanResourcesStore } from "../adapters/memory/store";
import {
	parseHumanResourcesAttendanceSessionId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesHeadcountPlanId,
	parseHumanResourcesHeadcountPlanLineId,
	parseHumanResourcesPositionId,
} from "../brands";
import { createMemoryBulkCheckpointPort, runEmployeeBulkImport } from "../bulk";
import {
	createMemoryPayrollDeliveryStore,
	deliverPayrollHandoff,
	queuePayrollDelivery,
} from "../integrations/payroll-delivery";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
} from "../module-ids";
import type { MutationPorts } from "../ports";
import {
	buildImportEventFingerprint,
	namespacedImportSourceReference,
} from "../time/attendance/import-keys";
import { buildAttendanceTimesheetEntryPlans } from "../time/timesheet-generation";
import type { AttendanceSession, HeadcountPlanLine } from "../types";
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
	if (!result.ok) {
		throw new AppError({
			code: result.code,
			message: result.message,
			...(result.details === undefined ? {} : { details: result.details }),
		});
	}
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

async function seedEmployeeCases() {
	const store = createMemoryHumanResourcesStore();
	const organizations = [
		{ id: ORGANIZATION_ID, count: 800 },
		{ id: "org-other", count: 200 },
	] as const;
	let employeeSequence = 0;
	let caseSequence = 0;
	for (const organization of organizations) {
		employeeSequence += 1;
		const employee = unwrap(
			await store.createEmployee(
				{
					organizationId: organization.id,
					employeeNumber: `CASE-EMP-${employeeSequence}`,
					normalizedEmployeeNumber: `CASE-EMP-${employeeSequence}`,
					legalName: `Case Benchmark Employee ${employeeSequence}`,
					createIdempotencyKey: `case-employee-${employeeSequence}`,
					createRequestFingerprint: `case-employee-${employeeSequence}`,
					createdBy: ACTOR_ID,
				},
				mutationPorts,
				{
					correlationId: `corr-case-employee-${employeeSequence}`,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
				},
			),
		);
		const employment = unwrap(
			await store.createEmployment(
				{
					organizationId: organization.id,
					employeeId: employee.id,
					startsOn: "2025-01-01",
					endsOn: null,
					createdBy: ACTOR_ID,
				},
				mutationPorts,
				{
					correlationId: `corr-case-employment-${employeeSequence}`,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
				},
			),
		);
		for (let index = 0; index < organization.count; index += 1) {
			caseSequence += 1;
			unwrap(
				await store.openEmployeeCase(
					{
						organizationId: organization.id,
						employeeId: employee.id,
						employmentId: employment.id,
						caseType: "workplace_conflict",
						severity: index % 10 === 0 ? "high" : "medium",
						allegationSummary: `Benchmark case ${caseSequence}`,
						classificationCode: "LOCAL_PERFORMANCE",
						ownerActorUserId: ACTOR_ID,
						subjectActorUserId: null,
						conflictedActorUserIds: [],
						createIdempotencyKey: `case-${caseSequence}`,
						createRequestFingerprint: `case-${caseSequence}`,
						createdBy: ACTOR_ID,
					},
					mutationPorts,
					{
						correlationId: `corr-case-${caseSequence}`,
						operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_OPEN,
					},
				),
			);
		}
	}
	return store;
}

function createResolvedAttendanceSession(index: number): AttendanceSession {
	const workDay = ((index % 28) + 1).toString().padStart(2, "0");
	const sessionId = unwrap(
		parseHumanResourcesAttendanceSessionId(deterministicUuid(index + 10_000)),
	);
	const employeeId = unwrap(
		parseHumanResourcesEmployeeId(deterministicUuid((index % 500) + 1)),
	);
	const startedAt = new Date(`2026-01-${workDay}T08:00:00.000Z`);
	const endedAt = new Date(`2026-01-${workDay}T16:00:00.000Z`);
	return {
		id: sessionId,
		organizationId: ORGANIZATION_ID,
		employeeId,
		employmentId: null,
		shiftAssignmentId: null,
		localWorkDate: `2026-01-${workDay}`,
		timezone: "UTC",
		firstClockInAt: startedAt,
		finalClockOutAt: endedAt,
		breakMinutes: 60,
		workedMinutes: 420,
		grossMinutes: 480,
		provenance: { automaticBreak: null },
		resolutionStatus: "resolved",
		requiresReview: false,
		version: 1,
		createdBy: ACTOR_ID,
		updatedBy: ACTOR_ID,
		createdAt: startedAt,
		updatedAt: endedAt,
	};
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
	const caseStore = await seedEmployeeCases();
	const attendanceBatches = Array.from({ length: 4 }, (_, batchIndex) =>
		Array.from({ length: 500 }, (_, rowIndex) => {
			const index = batchIndex * 500 + rowIndex;
			const workDay = ((index % 28) + 1).toString().padStart(2, "0");
			return {
				employeeId: deterministicUuid((index % 500) + 1),
				eventType: "clock_in" as const,
				occurredAt: `2026-01-${workDay}T08:00:00.000Z`,
				sourceTimezone: "UTC",
				localWorkDate: `2026-01-${workDay}`,
				sourceReference: `clock-${index}`,
			};
		}),
	);
	const bulkRows = Array.from({ length: 2_000 }, (_, index) => ({
		sourceReference: `bulk-employee-${index}`,
		payload: {
			employeeNumber: `BULK-${index.toString().padStart(6, "0")}`,
			legalName: `Bulk Employee ${index}`,
		},
	}));
	const attendanceSessions = Array.from({ length: 2_000 }, (_, index) =>
		createResolvedAttendanceSession(index),
	);
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
				"Memory store tenant/status employee-case list over 1,000 rows",
			implementation: "real_memory_api",
			fixtureSize: 1_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.case_lists,
			async run() {
				const cases = unwrap(
					await caseStore.listEmployeeCases({
						organizationId: ORGANIZATION_ID,
						status: "open",
					}),
				);
				if (
					cases.some(
						(employeeCase) => employeeCase.organizationId !== ORGANIZATION_ID,
					)
				) {
					throw new Error(
						"Employee case list crossed the organization boundary",
					);
				}
				return cases.length;
			},
		},
		{
			name: "timesheet_generation",
			description:
				"Real timesheet-generation projection over 2,000 resolved sessions",
			implementation: "real_domain_kernel",
			fixtureSize: 2_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.timesheet_generation,
			run() {
				let entryCount = 0;
				let approvedMinutes = 0;
				for (const session of attendanceSessions) {
					for (const entry of buildAttendanceTimesheetEntryPlans(session)) {
						entryCount += 1;
						approvedMinutes += entry.approvedMinutes;
					}
				}
				return entryCount + approvedMinutes;
			},
		},
		{
			name: "attendance_import",
			description:
				"Real attendance import namespacing, deduplication and fingerprint kernels over 2,000 events",
			implementation: "real_domain_kernel",
			fixtureSize: 2_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.attendance_import,
			run() {
				const seenReferences = new Set<string>();
				let fingerprintBytes = 0;
				for (const events of attendanceBatches) {
					for (const event of events) {
						const sourceReference = namespacedImportSourceReference(
							"local-benchmark",
							event.sourceReference,
						);
						if (seenReferences.has(sourceReference)) continue;
						seenReferences.add(sourceReference);
						fingerprintBytes += buildImportEventFingerprint({
							employeeId: event.employeeId,
							employmentId: null,
							shiftAssignmentId: null,
							eventType: event.eventType,
							occurredAtIso: event.occurredAt,
							sourceTimezone: event.sourceTimezone,
							localWorkDate: event.localWorkDate,
							sourceKey: "local-benchmark",
							sourceReference,
							payloadChecksum: null,
						}).length;
					}
				}
				return seenReferences.size + fingerprintBytes;
			},
		},
		{
			name: "bulk_employee_import",
			description: "Real HR bulk employee dry-run pipeline over 2,000 rows",
			implementation: "real_domain_kernel",
			fixtureSize: 2_000,
			thresholdP95Ms: HR_LOCAL_BENCHMARK_THRESHOLDS_MS.bulk_employee_import,
			async run() {
				let accepted = 0;
				for (let batchIndex = 0; batchIndex < 4; batchIndex += 1) {
					const rows = bulkRows.slice(batchIndex * 500, (batchIndex + 1) * 500);
					const result = unwrap(
						await runEmployeeBulkImport(
							{
								organizationId: ORGANIZATION_ID,
								actorUserId: ACTOR_ID,
								correlationId: `corr-bulk-${batchIndex}`,
								batchId: `bulk-${batchIndex}`,
								entityType: "employee",
								mode: "dry_run",
								idempotencyKey: `bulk-${batchIndex}`,
								rows,
							},
							{
								checkpoints: createMemoryBulkCheckpointPort(),
								commands: {
									createEmployee: async () => ok({ id: "dry-run" }),
								},
							},
						),
					);
					accepted += result.totals.accepted;
				}
				return accepted;
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
				const orgA = unwrap(
					await tenantStore.listEmployees({
						organizationId: "org-large-a",
						page: 1,
						pageSize: 100,
					}),
				);
				const orgB = unwrap(
					await tenantStore.listEmployees({
						organizationId: "org-large-b",
						page: 1,
						pageSize: 100,
					}),
				);
				if (
					orgA.employees.some(
						(employee) => employee.organizationId !== "org-large-a",
					) ||
					orgB.employees.some(
						(employee) => employee.organizationId !== "org-large-b",
					)
				) {
					throw new Error("Employee list crossed the organization boundary");
				}
				return (
					orgA.totalCount +
					orgA.employees.length +
					orgB.totalCount +
					orgB.employees.length
				);
			},
		},
	];
}
