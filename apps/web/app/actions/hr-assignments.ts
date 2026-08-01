"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	createAssignment,
	createAssignmentInputSchema,
	type EmployeeOrgContextAsOf,
	type EmploymentMovement,
	endAssignment,
	endAssignmentInputSchema,
	getAssignment,
	getAssignmentAsOf,
	getAssignmentAsOfInputSchema,
	getAssignmentInputSchema,
	resolveEmployeeOrgContextAsOf,
	resolveEmployeeOrgContextAsOfInputSchema,
	transferAssignment,
	transferAssignmentInputSchema,
	type WorkAssignment,
} from "@afenda/human-resources";
import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrWorkforceOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const createAssignmentActionSchema = hrActionSchema(
	createAssignmentInputSchema,
);
const endAssignmentActionSchema = hrActionSchema(endAssignmentInputSchema);
const transferAssignmentActionSchema = hrActionSchema(
	transferAssignmentInputSchema,
);
const getAssignmentActionSchema = hrActionSchema(getAssignmentInputSchema);
const getAssignmentAsOfActionSchema = hrActionSchema(
	getAssignmentAsOfInputSchema,
);
const resolveEmployeeOrgContextAsOfActionSchema = hrActionSchema(
	resolveEmployeeOrgContextAsOfInputSchema,
);

export async function createAssignmentAction(input: {
	correlationId?: string;
	employmentId: string;
	positionId: string;
	legalEntityKey: string;
	businessUnitKey: string;
	locationKey: string;
	costCentreKey: string;
	projectKey: string;
	startsOn: string;
	endsOn?: string | null;
}): Promise<ActionResult<{ assignment: WorkAssignment }>> {
	return await runOperatorPermissionAction({
		path: "createAssignmentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not create assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createAssignmentActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid assignment.",
				});
			}
			const result = await createAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function endAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
	endsOn: string;
	expectedVersion: number;
}): Promise<ActionResult<{ assignment: WorkAssignment }>> {
	return await runOperatorPermissionAction({
		path: "endAssignmentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not end assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(endAssignmentActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid assignment end request.",
				});
			}
			const result = await endAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function transferAssignmentAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employmentId: string;
	toPositionId: string;
	legalEntityKey: string;
	businessUnitKey: string;
	locationKey: string;
	costCentreKey: string;
	projectKey: string;
	effectiveOn: string;
	reason: string;
}): Promise<ActionResult<{ movement: EmploymentMovement }>> {
	return await runOperatorPermissionAction({
		path: "transferAssignmentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not transfer assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(transferAssignmentActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid assignment transfer.",
				});
			}
			const result = await transferAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { movement: mapped.data } };
		},
	});
}

export async function getAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
}): Promise<ActionResult<{ assignment: WorkAssignment }>> {
	return await runOperatorPermissionAction({
		path: "getAssignmentAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getAssignmentActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid assignment request.",
				});
			}
			const result = await getAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function getAssignmentAsOfAction(input: {
	correlationId?: string;
	employmentId: string;
	asOf: string;
}): Promise<ActionResult<{ assignment: WorkAssignment | null }>> {
	return await runOperatorPermissionAction({
		path: "getAssignmentAsOfAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get assignment as of date.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getAssignmentAsOfActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid assignment as-of request.",
				});
			}
			const result = await getAssignmentAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function resolveEmployeeOrgContextAsOfAction(input: {
	correlationId?: string;
	employeeId: string;
	asOf: string;
}): Promise<ActionResult<{ orgContext: EmployeeOrgContextAsOf }>> {
	return await runOperatorPermissionAction({
		path: "resolveEmployeeOrgContextAsOfAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not resolve employee org context.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				resolveEmployeeOrgContextAsOfActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid employee org context request.",
				});
			}
			const result = await resolveEmployeeOrgContextAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { orgContext: mapped.data } };
		},
	});
}
