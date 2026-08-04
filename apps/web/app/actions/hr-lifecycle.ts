"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import type {
	EmploymentConfirmation,
	ProbationAssessment,
	ProbationReview,
	Termination,
} from "@afenda/human-resources";
import {
	approveTermination,
	approveTerminationInputSchema,
	confirmEmployment,
	confirmEmploymentInputSchema,
	extendProbation,
	extendProbationInputSchema,
	finalizeTermination,
	finalizeTerminationInputSchema,
	getEmploymentConfirmation,
	getEmploymentConfirmationInputSchema,
	getProbationReview,
	getProbationReviewInputSchema,
	getTermination,
	getTerminationInputSchema,
	listProbationAssessments,
	listProbationAssessmentsInputSchema,
	listProbationReviewsByEmployment,
	listProbationReviewsByEmploymentInputSchema,
	openProbation,
	openProbationInputSchema,
	proposeTermination,
	proposeTerminationInputSchema,
	recordProbationAssessment,
	recordProbationAssessmentInputSchema,
	recordProbationOutcome,
	recordProbationOutcomeInputSchema,
} from "@afenda/human-resources";
import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrWorkforceOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/_runtime/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const openProbationActionSchema = hrActionSchema(openProbationInputSchema);

export async function openProbationAction(
	input: unknown,
): Promise<ActionResult<{ probationReview: ProbationReview }>> {
	return await runOperatorPermissionAction({
		path: "openProbationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not open probation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(openProbationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid probation open request.",
				});
			}
			const result = await openProbation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { probationReview: mapped.data } };
		},
	});
}

const extendProbationActionSchema = hrActionSchema(extendProbationInputSchema);

export async function extendProbationAction(
	input: unknown,
): Promise<ActionResult<{ probationReview: ProbationReview }>> {
	return await runOperatorPermissionAction({
		path: "extendProbationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not extend probation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(extendProbationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid probation extension.",
				});
			}
			const result = await extendProbation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { probationReview: mapped.data } };
		},
	});
}

const recordProbationAssessmentActionSchema = hrActionSchema(
	recordProbationAssessmentInputSchema,
);

export async function recordProbationAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: ProbationAssessment }>> {
	return await runOperatorPermissionAction({
		path: "recordProbationAssessmentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not record probation assessment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordProbationAssessmentActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid probation assessment.",
				});
			}
			const result = await recordProbationAssessment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assessment: mapped.data } };
		},
	});
}

const recordProbationOutcomeActionSchema = hrActionSchema(
	recordProbationOutcomeInputSchema,
);

export async function recordProbationOutcomeAction(
	input: unknown,
): Promise<ActionResult<{ probationReview: ProbationReview }>> {
	return await runOperatorPermissionAction({
		path: "recordProbationOutcomeAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not record probation outcome.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordProbationOutcomeActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid probation outcome.",
				});
			}
			const result = await recordProbationOutcome(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { probationReview: mapped.data } };
		},
	});
}

const getProbationReviewActionSchema = hrActionSchema(
	getProbationReviewInputSchema,
);

export async function getProbationReviewAction(
	input: unknown,
): Promise<ActionResult<{ probationReview: ProbationReview | null }>> {
	return await runOperatorPermissionAction({
		path: "getProbationReviewAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get probation review.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getProbationReviewActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid probation review lookup.",
				});
			}
			const result = await getProbationReview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { probationReview: mapped.data } };
		},
	});
}

const listProbationReviewsByEmploymentActionSchema = hrActionSchema(
	listProbationReviewsByEmploymentInputSchema,
);

export async function listProbationReviewsByEmploymentAction(
	input: unknown,
): Promise<ActionResult<{ reviews: ProbationReview[] }>> {
	return await runOperatorPermissionAction({
		path: "listProbationReviewsByEmploymentAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list probation reviews.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listProbationReviewsByEmploymentActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid probation review list request.",
				});
			}
			const result = await listProbationReviewsByEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { reviews: mapped.data } };
		},
	});
}

const listProbationAssessmentsActionSchema = hrActionSchema(
	listProbationAssessmentsInputSchema,
);

export async function listProbationAssessmentsAction(
	input: unknown,
): Promise<ActionResult<{ assessments: ProbationAssessment[] }>> {
	return await runOperatorPermissionAction({
		path: "listProbationAssessmentsAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list probation assessments.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listProbationAssessmentsActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid probation assessment list request.",
				});
			}
			const result = await listProbationAssessments(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assessments: mapped.data } };
		},
	});
}

const confirmEmploymentActionSchema = hrActionSchema(
	confirmEmploymentInputSchema,
);

export async function confirmEmploymentAction(
	input: unknown,
): Promise<ActionResult<{ confirmation: EmploymentConfirmation }>> {
	return await runOperatorPermissionAction({
		path: "confirmEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not confirm employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(confirmEmploymentActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid employment confirmation.",
				});
			}
			const result = await confirmEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { confirmation: mapped.data } };
		},
	});
}

const getEmploymentConfirmationActionSchema = hrActionSchema(
	getEmploymentConfirmationInputSchema,
);

export async function getEmploymentConfirmationAction(
	input: unknown,
): Promise<ActionResult<{ confirmation: EmploymentConfirmation | null }>> {
	return await runOperatorPermissionAction({
		path: "getEmploymentConfirmationAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get employment confirmation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getEmploymentConfirmationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid employment confirmation lookup.",
				});
			}
			const result = await getEmploymentConfirmation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { confirmation: mapped.data } };
		},
	});
}

const proposeTerminationActionSchema = hrActionSchema(
	proposeTerminationInputSchema,
);

export async function proposeTerminationAction(
	input: unknown,
): Promise<ActionResult<{ termination: Termination }>> {
	return await runOperatorPermissionAction({
		path: "proposeTerminationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not propose termination.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(proposeTerminationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid termination proposal.",
				});
			}
			const result = await proposeTermination(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { termination: mapped.data } };
		},
	});
}

const approveTerminationActionSchema = hrActionSchema(
	approveTerminationInputSchema,
);

export async function approveTerminationAction(
	input: unknown,
): Promise<ActionResult<{ termination: Termination }>> {
	return await runOperatorPermissionAction({
		path: "approveTerminationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not approve termination.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(approveTerminationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid termination approval.",
				});
			}
			const result = await approveTermination(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { termination: mapped.data } };
		},
	});
}

const finalizeTerminationActionSchema = hrActionSchema(
	finalizeTerminationInputSchema,
);

export async function finalizeTerminationAction(
	input: unknown,
): Promise<ActionResult<{ termination: Termination }>> {
	return await runOperatorPermissionAction({
		path: "finalizeTerminationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not finalize termination.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(finalizeTerminationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid termination finalization.",
				});
			}
			const result = await finalizeTermination(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { termination: mapped.data } };
		},
	});
}

const getTerminationActionSchema = hrActionSchema(getTerminationInputSchema);

export async function getTerminationAction(
	input: unknown,
): Promise<ActionResult<{ termination: Termination | null }>> {
	return await runOperatorPermissionAction({
		path: "getTerminationAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get termination.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getTerminationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid termination lookup.",
				});
			}
			const result = await getTermination(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { termination: mapped.data } };
		},
	});
}
