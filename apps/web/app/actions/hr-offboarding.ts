"use server";

import {
	startOffboarding,
	completeOffboardingTask,
	recordExitInterview,
	recordClearance,
	recordOffboardingAccessRevocation,
	recordOffboardingPayrollHandoff,
	completeOffboarding,
	getOffboardingCase,
	listOffboardingTasks,
	getClearanceByOffboardingCase,
	getOffboardingAccessRevocationByCase,
	getOffboardingPayrollHandoffByCase,
} from "@afenda/human-resources";
import type {
	Clearance,
	ExitInterview,
	OffboardingAccessRevocation,
	OffboardingCase,
	OffboardingPayrollHandoff,
	OffboardingTask,
} from "@afenda/human-resources";
import {
	startOffboardingInputSchema,
	completeOffboardingTaskInputSchema,
	recordExitInterviewInputSchema,
	recordClearanceInputSchema,
	recordOffboardingAccessRevocationInputSchema,
	recordOffboardingPayrollHandoffInputSchema,
	completeOffboardingInputSchema,
	getOffboardingCaseInputSchema,
	listOffboardingTasksInputSchema,
	getClearanceByOffboardingCaseInputSchema,
	getOffboardingAccessRevocationByCaseInputSchema,
	getOffboardingPayrollHandoffByCaseInputSchema
} from "@afenda/human-resources/schemas";

import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";


const startOffboardingActionSchema = hrActionSchema(startOffboardingInputSchema);

export async function startOffboardingAction(input: unknown): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return runOperatorPermissionAction({
		path: "startOffboardingAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not start offboarding.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(startOffboardingActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding start request.",
					parsed.details,
				);
			}
			const result = await startOffboarding(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}


const completeOffboardingTaskActionSchema = hrActionSchema(completeOffboardingTaskInputSchema);

export async function completeOffboardingTaskAction(input: unknown): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return runOperatorPermissionAction({
		path: "completeOffboardingTaskAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not complete offboarding task.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(completeOffboardingTaskActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding task completion.",
					parsed.details,
				);
			}
			const result = await completeOffboardingTask(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}


const recordExitInterviewActionSchema = hrActionSchema(recordExitInterviewInputSchema);

export async function recordExitInterviewAction(input: unknown): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return runOperatorPermissionAction({
		path: "recordExitInterviewAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not record exit interview.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordExitInterviewActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid exit interview record.",
					parsed.details,
				);
			}
			const result = await recordExitInterview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}


const recordClearanceActionSchema = hrActionSchema(recordClearanceInputSchema);

export async function recordClearanceAction(input: unknown): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return runOperatorPermissionAction({
		path: "recordClearanceAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not record clearance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordClearanceActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid clearance record.",
					parsed.details,
				);
			}
			const result = await recordClearance(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}


const recordOffboardingAccessRevocationActionSchema = hrActionSchema(recordOffboardingAccessRevocationInputSchema);

export async function recordOffboardingAccessRevocationAction(input: unknown): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return runOperatorPermissionAction({
		path: "recordOffboardingAccessRevocationAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not record offboarding access revocation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordOffboardingAccessRevocationActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding access revocation.",
					parsed.details,
				);
			}
			const result = await recordOffboardingAccessRevocation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}


const recordOffboardingPayrollHandoffActionSchema = hrActionSchema(recordOffboardingPayrollHandoffInputSchema);

export async function recordOffboardingPayrollHandoffAction(input: unknown): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return runOperatorPermissionAction({
		path: "recordOffboardingPayrollHandoffAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not record offboarding payroll handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordOffboardingPayrollHandoffActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding payroll handoff.",
					parsed.details,
				);
			}
			const result = await recordOffboardingPayrollHandoff(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}


const completeOffboardingActionSchema = hrActionSchema(completeOffboardingInputSchema);

export async function completeOffboardingAction(input: unknown): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return runOperatorPermissionAction({
		path: "completeOffboardingAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not complete offboarding.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(completeOffboardingActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding completion.",
					parsed.details,
				);
			}
			const result = await completeOffboarding(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}


const getOffboardingCaseActionSchema = hrActionSchema(getOffboardingCaseInputSchema);

export async function getOffboardingCaseAction(input: unknown): Promise<ActionResult<{ offboardingCase: OffboardingCase | null }>> {
	return runOperatorPermissionAction({
		path: "getOffboardingCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get offboarding case.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getOffboardingCaseActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding case lookup.",
					parsed.details,
				);
			}
			const result = await getOffboardingCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}


const listOffboardingTasksActionSchema = hrActionSchema(listOffboardingTasksInputSchema);

export async function listOffboardingTasksAction(input: unknown): Promise<ActionResult<{ tasks: OffboardingTask[] }>> {
	return runOperatorPermissionAction({
		path: "listOffboardingTasksAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list offboarding tasks.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listOffboardingTasksActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding task list request.",
					parsed.details,
				);
			}
			const result = await listOffboardingTasks(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { tasks: mapped.data } };
		},
	});
}


const getClearanceByOffboardingCaseActionSchema = hrActionSchema(getClearanceByOffboardingCaseInputSchema);

export async function getClearanceByOffboardingCaseAction(input: unknown): Promise<ActionResult<{ clearance: Clearance | null }>> {
	return runOperatorPermissionAction({
		path: "getClearanceByOffboardingCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get clearance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getClearanceByOffboardingCaseActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid clearance lookup.",
					parsed.details,
				);
			}
			const result = await getClearanceByOffboardingCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { clearance: mapped.data } };
		},
	});
}


const getOffboardingAccessRevocationByCaseActionSchema = hrActionSchema(getOffboardingAccessRevocationByCaseInputSchema);

export async function getOffboardingAccessRevocationByCaseAction(input: unknown): Promise<ActionResult<{ accessRevocation: OffboardingAccessRevocation | null }>> {
	return runOperatorPermissionAction({
		path: "getOffboardingAccessRevocationByCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get offboarding access revocation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getOffboardingAccessRevocationByCaseActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding access revocation lookup.",
					parsed.details,
				);
			}
			const result = await getOffboardingAccessRevocationByCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { accessRevocation: mapped.data } };
		},
	});
}


const getOffboardingPayrollHandoffByCaseActionSchema = hrActionSchema(getOffboardingPayrollHandoffByCaseInputSchema);

export async function getOffboardingPayrollHandoffByCaseAction(input: unknown): Promise<ActionResult<{ payrollHandoff: OffboardingPayrollHandoff | null }>> {
	return runOperatorPermissionAction({
		path: "getOffboardingPayrollHandoffByCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get offboarding payroll handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getOffboardingPayrollHandoffByCaseActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid offboarding payroll handoff lookup.",
					parsed.details,
				);
			}
			const result = await getOffboardingPayrollHandoffByCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { payrollHandoff: mapped.data } };
		},
	});
}
