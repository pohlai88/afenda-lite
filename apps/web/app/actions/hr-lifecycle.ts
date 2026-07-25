"use server";

import {
	openProbation,
	extendProbation,
	recordProbationAssessment,
	recordProbationOutcome,
	getProbationReview,
	listProbationReviewsByEmployment,
	listProbationAssessments,
	confirmEmployment,
	getEmploymentConfirmation,
	proposeTermination,
	approveTermination,
	finalizeTermination,
	getTermination,
} from "@afenda/human-resources";
import type {
	EmploymentConfirmation,
	ProbationAssessment,
	ProbationReview,
	Termination,
} from "@afenda/human-resources";
import {
	openProbationInputSchema,
	extendProbationInputSchema,
	recordProbationAssessmentInputSchema,
	recordProbationOutcomeInputSchema,
	getProbationReviewInputSchema,
	listProbationReviewsByEmploymentInputSchema,
	listProbationAssessmentsInputSchema,
	confirmEmploymentInputSchema,
	getEmploymentConfirmationInputSchema,
	proposeTerminationInputSchema,
	approveTerminationInputSchema,
	finalizeTerminationInputSchema,
	getTerminationInputSchema
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


const openProbationActionSchema = hrActionSchema(openProbationInputSchema);

export async function openProbationAction(input: unknown): Promise<ActionResult<{ probationReview: ProbationReview }>> {
	return runOperatorPermissionAction({
		path: "openProbationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not open probation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(openProbationActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid probation open request.",
					parsed.details,
				);
			}
			const result = await openProbation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { probationReview: mapped.data } };
		},
	});
}


const extendProbationActionSchema = hrActionSchema(extendProbationInputSchema);

export async function extendProbationAction(input: unknown): Promise<ActionResult<{ probationReview: ProbationReview }>> {
	return runOperatorPermissionAction({
		path: "extendProbationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not extend probation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(extendProbationActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid probation extension.",
					parsed.details,
				);
			}
			const result = await extendProbation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { probationReview: mapped.data } };
		},
	});
}


const recordProbationAssessmentActionSchema = hrActionSchema(recordProbationAssessmentInputSchema);

export async function recordProbationAssessmentAction(input: unknown): Promise<ActionResult<{ assessment: ProbationAssessment }>> {
	return runOperatorPermissionAction({
		path: "recordProbationAssessmentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not record probation assessment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordProbationAssessmentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid probation assessment.",
					parsed.details,
				);
			}
			const result = await recordProbationAssessment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { assessment: mapped.data } };
		},
	});
}


const recordProbationOutcomeActionSchema = hrActionSchema(recordProbationOutcomeInputSchema);

export async function recordProbationOutcomeAction(input: unknown): Promise<ActionResult<{ probationReview: ProbationReview }>> {
	return runOperatorPermissionAction({
		path: "recordProbationOutcomeAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not record probation outcome.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordProbationOutcomeActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid probation outcome.",
					parsed.details,
				);
			}
			const result = await recordProbationOutcome(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { probationReview: mapped.data } };
		},
	});
}


const getProbationReviewActionSchema = hrActionSchema(getProbationReviewInputSchema);

export async function getProbationReviewAction(input: unknown): Promise<ActionResult<{ probationReview: ProbationReview | null }>> {
	return runOperatorPermissionAction({
		path: "getProbationReviewAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get probation review.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getProbationReviewActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid probation review lookup.",
					parsed.details,
				);
			}
			const result = await getProbationReview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { probationReview: mapped.data } };
		},
	});
}


const listProbationReviewsByEmploymentActionSchema = hrActionSchema(listProbationReviewsByEmploymentInputSchema);

export async function listProbationReviewsByEmploymentAction(input: unknown): Promise<ActionResult<{ reviews: ProbationReview[] }>> {
	return runOperatorPermissionAction({
		path: "listProbationReviewsByEmploymentAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list probation reviews.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listProbationReviewsByEmploymentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid probation review list request.",
					parsed.details,
				);
			}
			const result = await listProbationReviewsByEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { reviews: mapped.data } };
		},
	});
}


const listProbationAssessmentsActionSchema = hrActionSchema(listProbationAssessmentsInputSchema);

export async function listProbationAssessmentsAction(input: unknown): Promise<ActionResult<{ assessments: ProbationAssessment[] }>> {
	return runOperatorPermissionAction({
		path: "listProbationAssessmentsAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list probation assessments.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listProbationAssessmentsActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid probation assessment list request.",
					parsed.details,
				);
			}
			const result = await listProbationAssessments(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { assessments: mapped.data } };
		},
	});
}


const confirmEmploymentActionSchema = hrActionSchema(confirmEmploymentInputSchema);

export async function confirmEmploymentAction(input: unknown): Promise<ActionResult<{ confirmation: EmploymentConfirmation }>> {
	return runOperatorPermissionAction({
		path: "confirmEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not confirm employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(confirmEmploymentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment confirmation.",
					parsed.details,
				);
			}
			const result = await confirmEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { confirmation: mapped.data } };
		},
	});
}


const getEmploymentConfirmationActionSchema = hrActionSchema(getEmploymentConfirmationInputSchema);

export async function getEmploymentConfirmationAction(input: unknown): Promise<ActionResult<{ confirmation: EmploymentConfirmation | null }>> {
	return runOperatorPermissionAction({
		path: "getEmploymentConfirmationAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get employment confirmation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getEmploymentConfirmationActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment confirmation lookup.",
					parsed.details,
				);
			}
			const result = await getEmploymentConfirmation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { confirmation: mapped.data } };
		},
	});
}


const proposeTerminationActionSchema = hrActionSchema(proposeTerminationInputSchema);

export async function proposeTerminationAction(input: unknown): Promise<ActionResult<{ termination: Termination }>> {
	return runOperatorPermissionAction({
		path: "proposeTerminationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not propose termination.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(proposeTerminationActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid termination proposal.",
					parsed.details,
				);
			}
			const result = await proposeTermination(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { termination: mapped.data } };
		},
	});
}


const approveTerminationActionSchema = hrActionSchema(approveTerminationInputSchema);

export async function approveTerminationAction(input: unknown): Promise<ActionResult<{ termination: Termination }>> {
	return runOperatorPermissionAction({
		path: "approveTerminationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not approve termination.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(approveTerminationActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid termination approval.",
					parsed.details,
				);
			}
			const result = await approveTermination(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { termination: mapped.data } };
		},
	});
}


const finalizeTerminationActionSchema = hrActionSchema(finalizeTerminationInputSchema);

export async function finalizeTerminationAction(input: unknown): Promise<ActionResult<{ termination: Termination }>> {
	return runOperatorPermissionAction({
		path: "finalizeTerminationAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not finalize termination.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(finalizeTerminationActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid termination finalization.",
					parsed.details,
				);
			}
			const result = await finalizeTermination(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { termination: mapped.data } };
		},
	});
}


const getTerminationActionSchema = hrActionSchema(getTerminationInputSchema);

export async function getTerminationAction(input: unknown): Promise<ActionResult<{ termination: Termination | null }>> {
	return runOperatorPermissionAction({
		path: "getTerminationAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get termination.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getTerminationActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid termination lookup.",
					parsed.details,
				);
			}
			const result = await getTermination(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { termination: mapped.data } };
		},
	});
}
