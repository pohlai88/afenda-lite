"use server";

import type { Result } from "@afenda/errors/result";
import {
	assignmentBulkRowSchema,
	attendanceBulkRowSchema,
	type BulkAuditEvent,
	type BulkCheckpoint,
	type BulkCommandOutput,
	type BulkErrorArtifact,
	type BulkImportResult,
	compensationBulkRowSchema,
	employeeBulkRowSchema,
	enqueueHumanResourcesBulkImport,
	type HumanResourcesBulkEntityType,
	type HumanResourcesBulkImportJob,
	type HumanResourcesPermission,
	type HumanResourcesReportingSnapshot,
	learningAssignmentBulkRowSchema,
	leaveEntitlementBulkRowSchema,
	recordHrBulkError,
} from "@afenda/human-resources";
import { createDrizzleHumanResourcesBulkJobStore } from "@afenda/human-resources/adapters/drizzle";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrBulkOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import {
	buildHumanResourcesReportingSnapshotWorker,
	loadHumanResourcesBulkErrorArtifactWorker,
	loadHumanResourcesBulkStatusWorker,
	runAssignmentBulkImportWorker,
	runAttendanceBulkImportWorker,
	runCompensationBulkImportWorker,
	runEmployeeBulkImportWorker,
	runLearningAssignmentBulkImportWorker,
	runLeaveEntitlementBulkImportWorker,
} from "@/lib/erp/human-resources-reporting-bulk-worker";
import {
	classifyHrFailure,
	createProductionHrObservabilityPorts,
} from "@/modules/platform/observability/human-resources-observability";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const reportingInputSchema = z
	.object({
		asOf: isoDateSchema,
		periodStart: isoDateSchema,
		periodEnd: isoDateSchema,
	})
	.strict();

const bulkCommonShape = {
	batchId: z.uuid(),
	mode: z.enum(["dry_run", "commit"]),
	idempotencyKey: z.string().trim().min(1).max(200),
	maxRowsPerRun: z.number().int().min(1).max(500).optional(),
	expectedCheckpointVersion: z.number().int().positive().optional(),
};

function bulkActionSchema<Row>(rowSchema: z.ZodType<Row>) {
	return z
		.object({
			...bulkCommonShape,
			rows: z
				.array(
					z.object({
						sourceReference: z.string().trim().min(1).max(200),
						payload: rowSchema,
					}),
				)
				.min(1)
				.max(500),
		})
		.strict();
}

const employeeBulkActionSchema = bulkActionSchema(employeeBulkRowSchema);
const assignmentBulkActionSchema = bulkActionSchema(assignmentBulkRowSchema);
const leaveEntitlementBulkActionSchema = bulkActionSchema(
	leaveEntitlementBulkRowSchema,
);
const attendanceBulkActionSchema = bulkActionSchema(attendanceBulkRowSchema);
const compensationBulkActionSchema = bulkActionSchema(
	compensationBulkRowSchema,
);
const learningAssignmentBulkActionSchema = bulkActionSchema(
	learningAssignmentBulkRowSchema,
);

const bulkRecoveryInputSchema = z
	.object({
		idempotencyKey: z.string().trim().min(1).max(200),
	})
	.strict();

type BulkActionInput<Row> = {
	batchId: string;
	mode: "dry_run" | "commit";
	idempotencyKey: string;
	maxRowsPerRun?: number;
	expectedCheckpointVersion?: number;
	rows: Array<{ sourceReference: string; payload: Row }>;
};

type BulkWorkerRequest<
	Row,
	Entity extends HumanResourcesBulkEntityType,
> = BulkActionInput<Row> & {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	entityType: Entity;
};

async function runBulkAction<
	Row,
	Entity extends HumanResourcesBulkEntityType,
>(input: {
	path: string;
	permission: HumanResourcesPermission;
	schema: z.ZodType<BulkActionInput<Row>>;
	rawInput: unknown;
	entityType: Entity;
	worker: (
		request: BulkWorkerRequest<Row, Entity>,
	) => Promise<Result<BulkImportResult<BulkCommandOutput>>>;
}): Promise<
	ActionResult<
		| { mode: "dry_run"; result: BulkImportResult<BulkCommandOutput> }
		| { mode: "queued"; job: HumanResourcesBulkImportJob }
	>
> {
	return runOperatorPermissionAction({
		path: input.path,
		permission: input.permission,
		safeMessage: "Could not run the Human Resources bulk operation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(input.schema, input.rawInput);
			if (!parsed.success) {
				await recordHrBulkError(
					{ stage: "parse", reason: "validation" },
					createProductionHrObservabilityPorts(),
				);
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid Human Resources bulk request.",
					parsed.details,
				);
			}
			if (parsed.data.mode === "commit") {
				const queued = await enqueueHumanResourcesBulkImport(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						entityType: input.entityType,
						requiredPermission: input.permission,
					},
					createDrizzleHumanResourcesBulkJobStore(),
				);
				const mapped = mapPackageResult(queued);
				return mapped.ok
					? { ok: true, data: { mode: "queued" as const, job: mapped.data } }
					: mapped;
			}
			const result = await input.worker({
				...parsed.data,
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				entityType: input.entityType,
			});
			if (!result.ok) {
				await recordHrBulkError(
					{
						stage: parsed.data.mode === "commit" ? "commit" : "validate",
						reason: classifyHrFailure(result.code),
					},
					createProductionHrObservabilityPorts(),
				);
			}
			const mapped = mapPackageResult(result);
			return mapped.ok
				? { ok: true, data: { mode: "dry_run" as const, result: mapped.data } }
				: mapped;
		},
	});
}

export async function buildHumanResourcesReportingSnapshotAction(
	input: z.input<typeof reportingInputSchema>,
): Promise<ActionResult<{ snapshot: HumanResourcesReportingSnapshot }>> {
	return runOperatorPermissionAction({
		path: "buildHumanResourcesReportingSnapshotAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not build the Human Resources reporting snapshot.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(reportingInputSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid Human Resources reporting window.",
					parsed.details,
				);
			}
			const result = await buildHumanResourcesReportingSnapshotWorker({
				...parsed.data,
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
			});
			const mapped = mapPackageResult(result);
			return mapped.ok ? { ok: true, data: { snapshot: mapped.data } } : mapped;
		},
	});
}

export function runEmployeeBulkImportAction(
	input: z.input<typeof employeeBulkActionSchema>,
) {
	return runBulkAction({
		path: "runEmployeeBulkImportAction",
		permission: "human-resources.employee.create",
		schema: employeeBulkActionSchema,
		rawInput: input,
		entityType: "employee",
		worker: runEmployeeBulkImportWorker,
	});
}

export function runAssignmentBulkImportAction(
	input: z.input<typeof assignmentBulkActionSchema>,
) {
	return runBulkAction({
		path: "runAssignmentBulkImportAction",
		permission: "human-resources.assignment.manage",
		schema: assignmentBulkActionSchema,
		rawInput: input,
		entityType: "assignment",
		worker: runAssignmentBulkImportWorker,
	});
}

export function runLeaveEntitlementBulkImportAction(
	input: z.input<typeof leaveEntitlementBulkActionSchema>,
) {
	return runBulkAction({
		path: "runLeaveEntitlementBulkImportAction",
		permission: "human-resources.leave-entitlement.grant",
		schema: leaveEntitlementBulkActionSchema,
		rawInput: input,
		entityType: "leave_entitlement",
		worker: runLeaveEntitlementBulkImportWorker,
	});
}

export function runAttendanceBulkImportAction(
	input: z.input<typeof attendanceBulkActionSchema>,
) {
	return runBulkAction({
		path: "runAttendanceBulkImportAction",
		permission: "human-resources.time.attendance.manage",
		schema: attendanceBulkActionSchema,
		rawInput: input,
		entityType: "attendance",
		worker: runAttendanceBulkImportWorker,
	});
}

export function runCompensationBulkImportAction(
	input: z.input<typeof compensationBulkActionSchema>,
) {
	return runBulkAction({
		path: "runCompensationBulkImportAction",
		permission: "human-resources.compensation.manage",
		schema: compensationBulkActionSchema,
		rawInput: input,
		entityType: "compensation",
		worker: runCompensationBulkImportWorker,
	});
}

export function runLearningAssignmentBulkImportAction(
	input: z.input<typeof learningAssignmentBulkActionSchema>,
) {
	return runBulkAction({
		path: "runLearningAssignmentBulkImportAction",
		permission: "human-resources.learning.manage",
		schema: learningAssignmentBulkActionSchema,
		rawInput: input,
		entityType: "learning_assignment",
		worker: runLearningAssignmentBulkImportWorker,
	});
}

export async function loadHumanResourcesBulkStatusAction(input: {
	idempotencyKey: string;
}): Promise<
	ActionResult<{
		checkpoint: BulkCheckpoint<BulkCommandOutput> | null;
		auditEvents: readonly BulkAuditEvent[];
	}>
> {
	return runOperatorPermissionAction({
		path: "loadHumanResourcesBulkStatusAction",
		permission: "human-resources.privacy.export",
		safeMessage: "Could not load the Human Resources bulk status.",
		execute: async (session) => {
			const parsed = parseSchema(bulkRecoveryInputSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid bulk key.",
					parsed.details,
				);
			}
			return mapPackageResult(
				await loadHumanResourcesBulkStatusWorker({
					organizationId: session.orgId,
					idempotencyKey: parsed.data.idempotencyKey,
				}),
			);
		},
	});
}

export async function loadHumanResourcesBulkErrorArtifactAction(input: {
	idempotencyKey: string;
}): Promise<ActionResult<{ artifact: BulkErrorArtifact | null }>> {
	return runOperatorPermissionAction({
		path: "loadHumanResourcesBulkErrorArtifactAction",
		permission: "human-resources.privacy.export",
		safeMessage: "Could not load the Human Resources bulk error artifact.",
		execute: async (session) => {
			const parsed = parseSchema(bulkRecoveryInputSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid bulk key.",
					parsed.details,
				);
			}
			const mapped = mapPackageResult(
				await loadHumanResourcesBulkErrorArtifactWorker({
					organizationId: session.orgId,
					idempotencyKey: parsed.data.idempotencyKey,
				}),
			);
			return mapped.ok ? { ok: true, data: { artifact: mapped.data } } : mapped;
		},
	});
}
