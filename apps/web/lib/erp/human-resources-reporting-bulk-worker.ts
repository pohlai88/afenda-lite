import type { Result } from "@afenda/errors/result";
import {
	type AssignmentBulkRow,
	type AttendanceBulkRow,
	type BulkAuditEvent,
	type BulkCheckpoint,
	type BulkCommandOutput,
	type BulkErrorArtifact,
	type BulkImportRequest,
	type BulkImportResult,
	buildHumanResourcesReportingSnapshot,
	type CompensationBulkRow,
	type EmployeeBulkRow,
	type HumanResourcesReportingSnapshot,
	type LearningAssignmentBulkRow,
	type LeaveEntitlementBulkRow,
	runAssignmentBulkImport,
	runAttendanceBulkImport,
	runCompensationBulkImport,
	runEmployeeBulkImport,
	runLearningAssignmentBulkImport,
	runLeaveEntitlementBulkImport,
} from "@afenda/human-resources";
import {
	createDrizzleBulkCheckpointPort,
	createDrizzleHumanResourcesReportingSource,
} from "@afenda/human-resources/adapters/drizzle";

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

export interface HumanResourcesReportingWorkerInput {
	actorUserId: string;
	asOf: string;
	correlationId: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
}

export function buildHumanResourcesReportingSnapshotWorker(
	input: HumanResourcesReportingWorkerInput,
): Promise<Result<HumanResourcesReportingSnapshot>> {
	return buildHumanResourcesReportingSnapshot(
		{
			organizationId: input.organizationId,
			asOf: input.asOf,
			periodStart: input.periodStart,
			periodEnd: input.periodEnd,
		},
		createDrizzleHumanResourcesReportingSource(),
	);
}

function bulkDependencies() {
	return {
		checkpoints: createDrizzleBulkCheckpointPort<BulkCommandOutput>(),
		commandOptions: createHumanResourcesCommandOptions(),
	};
}

type SourceRequest<
	Row,
	Entity extends BulkImportRequest<Row>["entityType"],
> = BulkImportRequest<Row> & { entityType: Entity };

export function runEmployeeBulkImportWorker(
	input: SourceRequest<EmployeeBulkRow, "employee">,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runEmployeeBulkImport(input, bulkDependencies());
}

export function runAssignmentBulkImportWorker(
	input: SourceRequest<AssignmentBulkRow, "assignment">,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runAssignmentBulkImport(input, bulkDependencies());
}

export function runLeaveEntitlementBulkImportWorker(
	input: SourceRequest<LeaveEntitlementBulkRow, "leave_entitlement">,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runLeaveEntitlementBulkImport(input, bulkDependencies());
}

export function runAttendanceBulkImportWorker(
	input: SourceRequest<AttendanceBulkRow, "attendance">,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runAttendanceBulkImport(input, bulkDependencies());
}

export function runCompensationBulkImportWorker(
	input: SourceRequest<CompensationBulkRow, "compensation">,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runCompensationBulkImport(input, bulkDependencies());
}

export function runLearningAssignmentBulkImportWorker(
	input: SourceRequest<LearningAssignmentBulkRow, "learning_assignment">,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runLearningAssignmentBulkImport(input, bulkDependencies());
}

export async function loadHumanResourcesBulkStatusWorker(input: {
	organizationId: string;
	idempotencyKey: string;
}): Promise<
	Result<{
		checkpoint: BulkCheckpoint<BulkCommandOutput> | null;
		auditEvents: readonly BulkAuditEvent[];
	}>
> {
	const checkpoints = createDrizzleBulkCheckpointPort<BulkCommandOutput>();
	const checkpoint = await checkpoints.load(input);
	if (!checkpoint.ok) {
		return checkpoint;
	}
	const auditEvents = await checkpoints.listAuditEvents(input);
	if (!auditEvents.ok) {
		return auditEvents;
	}
	return {
		ok: true,
		data: { checkpoint: checkpoint.data, auditEvents: auditEvents.data },
	};
}

export function loadHumanResourcesBulkErrorArtifactWorker(input: {
	organizationId: string;
	idempotencyKey: string;
}): Promise<Result<BulkErrorArtifact | null>> {
	return createDrizzleBulkCheckpointPort<BulkCommandOutput>().loadLatestErrorArtifact(
		input,
	);
}
