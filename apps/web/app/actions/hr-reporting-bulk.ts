"use server";

import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";
import {
	assignmentBulkRowSchema,
	attendanceBulkRowSchema,
	type BulkAuditEvent,
	type BulkCheckpoint,
	type BulkCommandOutput,
	type BulkErrorArtifact,
	type BulkImportResult,
	compensationBulkRowSchema,
	createHumanResourcesBulkJobCapability,
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

interface BulkActionInput<Row> {
	batchId: string;
	expectedCheckpointVersion?: number | undefined;
	idempotencyKey: string;
	maxRowsPerRun?: number | undefined;
	mode: "dry_run" | "commit";
	rows: Array<{ sourceReference: string; payload: Row }>;
}

interface CompactBulkActionInput<Row> {
	batchId: string;
	expectedCheckpointVersion?: number;
	idempotencyKey: string;
	maxRowsPerRun?: number;
	mode: "dry_run" | "commit";
	rows: Array<{ sourceReference: string; payload: Row }>;
}

type BulkWorkerRequest<
	Row,
	Entity extends HumanResourcesBulkEntityType,
> = CompactBulkActionInput<Row> & {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	entityType: Entity;
};

type BulkActionResult =
	| { mode: "dry_run"; result: BulkImportResult<BulkCommandOutput> }
	| { mode: "queued"; job: HumanResourcesBulkImportJob };

function toBulkRequest<Row>(
	input: BulkActionInput<Row>,
): CompactBulkActionInput<Row> {
	return {
		batchId: input.batchId,
		mode: input.mode,
		idempotencyKey: input.idempotencyKey,
		rows: input.rows,
		...(input.maxRowsPerRun === undefined
			? {}
			: { maxRowsPerRun: input.maxRowsPerRun }),
		...(input.expectedCheckpointVersion === undefined
			? {}
			: { expectedCheckpointVersion: input.expectedCheckpointVersion }),
	};
}

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
}): Promise<ActionResult<BulkActionResult>> {
	return await runOperatorPermissionAction<BulkActionResult>({
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
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid Human Resources bulk request.",
				});
			}
			const request = toBulkRequest(parsed.data);
			if (parsed.data.mode === "commit") {
				const queued = await enqueueHumanResourcesBulkImport(
					{
						...request,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						entityType: input.entityType,
						requiredPermission: input.permission,
					},
					createHumanResourcesBulkJobCapability(),
				);
				const mapped = mapPackageResult(queued);
				return mapped.ok
					? { ok: true, data: { mode: "queued" as const, job: mapped.data } }
					: mapped;
			}
			const result = await input.worker({
				...request,
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				entityType: input.entityType,
			});
			if (!result.ok) {
				await recordHrBulkError(
					{
						stage: "validate",
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
	return await runOperatorPermissionAction({
		path: "buildHumanResourcesReportingSnapshotAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not build the Human Resources reporting snapshot.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(reportingInputSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid Human Resources reporting window.",
				});
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
	return await runOperatorPermissionAction({
		path: "loadHumanResourcesBulkStatusAction",
		permission: "human-resources.privacy.export",
		safeMessage: "Could not load the Human Resources bulk status.",
		execute: async (session) => {
			const parsed = parseSchema(bulkRecoveryInputSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid bulk key.",
				});
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
	return await runOperatorPermissionAction({
		path: "loadHumanResourcesBulkErrorArtifactAction",
		permission: "human-resources.privacy.export",
		safeMessage: "Could not load the Human Resources bulk error artifact.",
		execute: async (session) => {
			const parsed = parseSchema(bulkRecoveryInputSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid bulk key.",
				});
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
