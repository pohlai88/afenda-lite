import type { Result } from "@afenda/errors/result";
import type { z } from "zod";
import type { HumanResourcesCommandOptions } from "../command-options";
import { createEmployeeCompensation } from "../compensation-benefits/employee-compensation";
import { createAssignment } from "../core/assignment";
import { createEmployee } from "../core/employee";
import { assignLearning } from "../learning/learning-assignment";
import { grantLeaveEntitlement } from "../leave/entitlement";
import {
	createAssignmentInputSchema,
	createEmployeeCompensationInputSchema,
	createEmployeeInputSchema,
	createLearningAssignmentInputSchema,
	grantLeaveEntitlementInputSchema,
	recordAttendanceEventInputSchema,
} from "../schemas";
import { recordAttendanceEvent } from "../time/attendance/events";
import { runHumanResourcesBulkImport } from "./kernel";
import type {
	BulkCheckpointPort,
	BulkImportPorts,
	BulkImportRequest,
	BulkImportResult,
	BulkRowExecutionResult,
} from "./types";

const mutationContextOmit = {
	organizationId: true,
	actorUserId: true,
	correlationId: true,
} as const;

export const employeeBulkRowSchema = createEmployeeInputSchema.omit({
	...mutationContextOmit,
	idempotencyKey: true,
});
export const assignmentBulkRowSchema =
	createAssignmentInputSchema.omit(mutationContextOmit);
export const leaveEntitlementBulkRowSchema =
	grantLeaveEntitlementInputSchema.omit({
		...mutationContextOmit,
		idempotencyKey: true,
	});
export const attendanceBulkRowSchema = recordAttendanceEventInputSchema.omit({
	...mutationContextOmit,
	idempotencyKey: true,
	sourceReference: true,
});
export const compensationBulkRowSchema =
	createEmployeeCompensationInputSchema.omit({
		...mutationContextOmit,
		idempotencyKey: true,
	});
export const learningAssignmentBulkRowSchema =
	createLearningAssignmentInputSchema.omit({
		...mutationContextOmit,
		idempotencyKey: true,
	});

export type EmployeeBulkRow = z.infer<typeof employeeBulkRowSchema>;
export type AssignmentBulkRow = z.infer<typeof assignmentBulkRowSchema>;
export type LeaveEntitlementBulkRow = z.infer<
	typeof leaveEntitlementBulkRowSchema
>;
export type AttendanceBulkRow = z.infer<typeof attendanceBulkRowSchema>;
export type CompensationBulkRow = z.infer<typeof compensationBulkRowSchema>;
export type LearningAssignmentBulkRow = z.infer<
	typeof learningAssignmentBulkRowSchema
>;

export type BulkCommandOutput = { id: string };

type EmployeeInput = z.infer<typeof createEmployeeInputSchema>;
type AssignmentInput = z.infer<typeof createAssignmentInputSchema>;
type LeaveEntitlementInput = z.infer<typeof grantLeaveEntitlementInputSchema>;
type AttendanceInput = z.infer<typeof recordAttendanceEventInputSchema>;
type CompensationInput = z.infer<typeof createEmployeeCompensationInputSchema>;
type LearningAssignmentInput = z.infer<
	typeof createLearningAssignmentInputSchema
>;

export type HumanResourcesBulkCommandStamp = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	sourceReference: string;
	idempotencyKey: string;
};

type Command<Input> = (
	input: Input,
	options?: HumanResourcesCommandOptions,
	stamp?: HumanResourcesBulkCommandStamp,
) => Promise<Result<{ id: unknown }>>;

export type HumanResourcesBulkCommandPorts = {
	createEmployee: Command<EmployeeInput>;
	createAssignment: Command<AssignmentInput>;
	grantLeaveEntitlement: Command<LeaveEntitlementInput>;
	recordAttendanceEvent: Command<AttendanceInput>;
	createEmployeeCompensation: Command<CompensationInput>;
	assignLearning: Command<LearningAssignmentInput>;
};

const defaultCommands: HumanResourcesBulkCommandPorts = {
	createEmployee,
	createAssignment,
	grantLeaveEntitlement,
	recordAttendanceEvent,
	createEmployeeCompensation,
	assignLearning,
};

export type HumanResourcesBulkSourceDependencies = {
	checkpoints: BulkCheckpointPort<BulkCommandOutput>;
	commandOptions?: HumanResourcesCommandOptions;
	commands?: Partial<HumanResourcesBulkCommandPorts>;
};

type ExecutionContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	sourceReference: string;
	rowIdempotencyKey: string;
};

const retryableCodes = new Set(["INTERNAL_ERROR", "SERVICE_UNAVAILABLE"]);
const BULK_ROW_COMMAND_FAILED_MESSAGE = "Bulk row command failed";

function mapCommandResult(
	result: Result<{ id: unknown }>,
): BulkRowExecutionResult<BulkCommandOutput> {
	if (result.ok)
		return { status: "applied", output: { id: String(result.data.id) } };
	const issue = { code: result.code, message: BULK_ROW_COMMAND_FAILED_MESSAGE };
	return retryableCodes.has(result.code)
		? { status: "retryable_failure", issue }
		: { status: "terminal_failure", issues: [issue] };
}

function validationIssues(error: z.ZodError) {
	return error.issues.map((issue) => ({
		code: "INVALID_ROW",
		message: issue.message,
		field: issue.path.join(".") || undefined,
	}));
}

function createSourcePorts<Row, Input extends object>(input: {
	schema: z.ZodType<Row>;
	dependencies: HumanResourcesBulkSourceDependencies;
	command: Command<Input>;
	buildInput(context: ExecutionContext, row: Row): Input;
}): BulkImportPorts<Row, Row, BulkCommandOutput> {
	return {
		checkpoints: input.dependencies.checkpoints,
		async validate({ row }) {
			const parsed = input.schema.safeParse(row.payload);
			return parsed.success
				? { valid: true, value: parsed.data }
				: { valid: false, issues: validationIssues(parsed.error) };
		},
		async execute(context) {
			return mapCommandResult(
				await input.command(
					input.buildInput(context, context.value),
					input.dependencies.commandOptions,
					{
						organizationId: context.organizationId,
						actorUserId: context.actorUserId,
						correlationId: context.correlationId,
						sourceReference: context.sourceReference,
						idempotencyKey: context.rowIdempotencyKey,
					},
				),
			);
		},
	};
}

function commandPorts(dependencies: HumanResourcesBulkSourceDependencies) {
	return { ...defaultCommands, ...dependencies.commands };
}

type SourceRequest<
	Row,
	Entity extends BulkImportRequest<Row>["entityType"],
> = BulkImportRequest<Row> & { entityType: Entity };

export function runEmployeeBulkImport(
	request: SourceRequest<EmployeeBulkRow, "employee">,
	dependencies: HumanResourcesBulkSourceDependencies,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runHumanResourcesBulkImport(
		request,
		createSourcePorts({
			schema: employeeBulkRowSchema,
			dependencies,
			command: commandPorts(dependencies).createEmployee,
			buildInput: (context, row) => ({
				...row,
				organizationId: context.organizationId,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				idempotencyKey: context.rowIdempotencyKey,
			}),
		}),
	);
}

export function runAssignmentBulkImport(
	request: SourceRequest<AssignmentBulkRow, "assignment">,
	dependencies: HumanResourcesBulkSourceDependencies,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runHumanResourcesBulkImport(
		request,
		createSourcePorts({
			schema: assignmentBulkRowSchema,
			dependencies,
			command: commandPorts(dependencies).createAssignment,
			buildInput: (context, row) => ({
				...row,
				organizationId: context.organizationId,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		}),
	);
}

export function runLeaveEntitlementBulkImport(
	request: SourceRequest<LeaveEntitlementBulkRow, "leave_entitlement">,
	dependencies: HumanResourcesBulkSourceDependencies,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runHumanResourcesBulkImport(
		request,
		createSourcePorts({
			schema: leaveEntitlementBulkRowSchema,
			dependencies,
			command: commandPorts(dependencies).grantLeaveEntitlement,
			buildInput: (context, row) => ({
				...row,
				organizationId: context.organizationId,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				idempotencyKey: context.rowIdempotencyKey,
			}),
		}),
	);
}

export function runAttendanceBulkImport(
	request: SourceRequest<AttendanceBulkRow, "attendance">,
	dependencies: HumanResourcesBulkSourceDependencies,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runHumanResourcesBulkImport(
		request,
		createSourcePorts({
			schema: attendanceBulkRowSchema,
			dependencies,
			command: commandPorts(dependencies).recordAttendanceEvent,
			buildInput: (context, row) => ({
				...row,
				organizationId: context.organizationId,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				idempotencyKey: context.rowIdempotencyKey,
				sourceReference: context.sourceReference,
			}),
		}),
	);
}

export function runCompensationBulkImport(
	request: SourceRequest<CompensationBulkRow, "compensation">,
	dependencies: HumanResourcesBulkSourceDependencies,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runHumanResourcesBulkImport(
		request,
		createSourcePorts({
			schema: compensationBulkRowSchema,
			dependencies,
			command: commandPorts(dependencies).createEmployeeCompensation,
			buildInput: (context, row) => ({
				...row,
				organizationId: context.organizationId,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				idempotencyKey: context.rowIdempotencyKey,
			}),
		}),
	);
}

export function runLearningAssignmentBulkImport(
	request: SourceRequest<LearningAssignmentBulkRow, "learning_assignment">,
	dependencies: HumanResourcesBulkSourceDependencies,
): Promise<Result<BulkImportResult<BulkCommandOutput>>> {
	return runHumanResourcesBulkImport(
		request,
		createSourcePorts({
			schema: learningAssignmentBulkRowSchema,
			dependencies,
			command: commandPorts(dependencies).assignLearning,
			buildInput: (context, row) => ({
				...row,
				organizationId: context.organizationId,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				idempotencyKey: context.rowIdempotencyKey,
			}),
		}),
	);
}
