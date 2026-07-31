"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import type {
	Clearance,
	OffboardingAccessRevocation,
	OffboardingCase,
	OffboardingPayrollHandoff,
	OffboardingTask,
} from "@afenda/human-resources";
import {
	completeOffboarding,
	completeOffboardingTask,
	getClearanceByOffboardingCase,
	getOffboardingAccessRevocationByCase,
	getOffboardingCase,
	getOffboardingPayrollHandoffByCase,
	listOffboardingTasks,
	recordClearance,
	recordExitInterview,
	recordOffboardingAccessRevocation,
	recordOffboardingPayrollHandoff,
	startOffboarding,
} from "@afenda/human-resources";
import {
	completeOffboardingInputSchema,
	completeOffboardingTaskInputSchema,
	getClearanceByOffboardingCaseInputSchema,
	getOffboardingAccessRevocationByCaseInputSchema,
	getOffboardingCaseInputSchema,
	getOffboardingPayrollHandoffByCaseInputSchema,
	listOffboardingTasksInputSchema,
	recordClearanceInputSchema,
	recordExitInterviewInputSchema,
	recordOffboardingAccessRevocationInputSchema,
	recordOffboardingPayrollHandoffInputSchema,
	startOffboardingInputSchema,
} from "@afenda/human-resources/schemas";
import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrWorkforceOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const startOffboardingActionSchema = hrActionSchema(
	startOffboardingInputSchema,
);

export async function startOffboardingAction(
	input: unknown,
): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return await runOperatorPermissionAction({
		path: "startOffboardingAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not start offboarding.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(startOffboardingActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding start request.",
				});
			}
			const result = await startOffboarding(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}

const completeOffboardingTaskActionSchema = hrActionSchema(
	completeOffboardingTaskInputSchema,
);

export async function completeOffboardingTaskAction(
	input: unknown,
): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return await runOperatorPermissionAction({
		path: "completeOffboardingTaskAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not complete offboarding task.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(completeOffboardingTaskActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding task completion.",
				});
			}
			const result = await completeOffboardingTask(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}

const recordExitInterviewActionSchema = hrActionSchema(
	recordExitInterviewInputSchema,
);

export async function recordExitInterviewAction(
	input: unknown,
): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return await runOperatorPermissionAction({
		path: "recordExitInterviewAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not record exit interview.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordExitInterviewActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid exit interview record.",
				});
			}
			const result = await recordExitInterview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}

const recordClearanceActionSchema = hrActionSchema(recordClearanceInputSchema);

export async function recordClearanceAction(
	input: unknown,
): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return await runOperatorPermissionAction({
		path: "recordClearanceAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not record clearance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordClearanceActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid clearance record.",
				});
			}
			const result = await recordClearance(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}

const recordOffboardingAccessRevocationActionSchema = hrActionSchema(
	recordOffboardingAccessRevocationInputSchema,
);

export async function recordOffboardingAccessRevocationAction(
	input: unknown,
): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return await runOperatorPermissionAction({
		path: "recordOffboardingAccessRevocationAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not record offboarding access revocation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				recordOffboardingAccessRevocationActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding access revocation.",
				});
			}
			const result = await recordOffboardingAccessRevocation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}

const recordOffboardingPayrollHandoffActionSchema = hrActionSchema(
	recordOffboardingPayrollHandoffInputSchema,
);

export async function recordOffboardingPayrollHandoffAction(
	input: unknown,
): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return await runOperatorPermissionAction({
		path: "recordOffboardingPayrollHandoffAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not record offboarding payroll handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				recordOffboardingPayrollHandoffActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding payroll handoff.",
				});
			}
			const result = await recordOffboardingPayrollHandoff(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}

const completeOffboardingActionSchema = hrActionSchema(
	completeOffboardingInputSchema,
);

export async function completeOffboardingAction(
	input: unknown,
): Promise<ActionResult<{ offboardingCase: OffboardingCase }>> {
	return await runOperatorPermissionAction({
		path: "completeOffboardingAction",
		permission: "human-resources.offboarding.manage",
		safeMessage: "Could not complete offboarding.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(completeOffboardingActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding completion.",
				});
			}
			const result = await completeOffboarding(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}

const getOffboardingCaseActionSchema = hrActionSchema(
	getOffboardingCaseInputSchema,
);

export async function getOffboardingCaseAction(
	input: unknown,
): Promise<ActionResult<{ offboardingCase: OffboardingCase | null }>> {
	return await runOperatorPermissionAction({
		path: "getOffboardingCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get offboarding case.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getOffboardingCaseActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding case lookup.",
				});
			}
			const result = await getOffboardingCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offboardingCase: mapped.data } };
		},
	});
}

const listOffboardingTasksActionSchema = hrActionSchema(
	listOffboardingTasksInputSchema,
);

export async function listOffboardingTasksAction(
	input: unknown,
): Promise<ActionResult<{ tasks: OffboardingTask[] }>> {
	return await runOperatorPermissionAction({
		path: "listOffboardingTasksAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list offboarding tasks.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listOffboardingTasksActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding task list request.",
				});
			}
			const result = await listOffboardingTasks(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { tasks: mapped.data } };
		},
	});
}

const getClearanceByOffboardingCaseActionSchema = hrActionSchema(
	getClearanceByOffboardingCaseInputSchema,
);

export async function getClearanceByOffboardingCaseAction(
	input: unknown,
): Promise<ActionResult<{ clearance: Clearance | null }>> {
	return await runOperatorPermissionAction({
		path: "getClearanceByOffboardingCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get clearance.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				getClearanceByOffboardingCaseActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid clearance lookup.",
				});
			}
			const result = await getClearanceByOffboardingCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { clearance: mapped.data } };
		},
	});
}

const getOffboardingAccessRevocationByCaseActionSchema = hrActionSchema(
	getOffboardingAccessRevocationByCaseInputSchema,
);

export async function getOffboardingAccessRevocationByCaseAction(
	input: unknown,
): Promise<
	ActionResult<{ accessRevocation: OffboardingAccessRevocation | null }>
> {
	return await runOperatorPermissionAction({
		path: "getOffboardingAccessRevocationByCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get offboarding access revocation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				getOffboardingAccessRevocationByCaseActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding access revocation lookup.",
				});
			}
			const result = await getOffboardingAccessRevocationByCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { accessRevocation: mapped.data } };
		},
	});
}

const getOffboardingPayrollHandoffByCaseActionSchema = hrActionSchema(
	getOffboardingPayrollHandoffByCaseInputSchema,
);

export async function getOffboardingPayrollHandoffByCaseAction(
	input: unknown,
): Promise<ActionResult<{ payrollHandoff: OffboardingPayrollHandoff | null }>> {
	return await runOperatorPermissionAction({
		path: "getOffboardingPayrollHandoffByCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get offboarding payroll handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				getOffboardingPayrollHandoffByCaseActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offboarding payroll handoff lookup.",
				});
			}
			const result = await getOffboardingPayrollHandoffByCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { payrollHandoff: mapped.data } };
		},
	});
}
