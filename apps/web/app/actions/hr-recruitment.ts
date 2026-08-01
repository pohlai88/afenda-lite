"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import type {
	ApplicationListPage,
	ApplicationStatusHistory,
	Candidate,
	CandidateApplication,
	CandidateDuplicateMatch,
	CandidateListPage,
	EmploymentOffer,
	Interview,
	InterviewEvaluation,
	InterviewListPage,
	JobRequisition,
	OfferAcceptanceHandoff,
	OfferListPage,
	RequisitionListPage,
} from "@afenda/human-resources";
import {
	acceptOffer,
	acceptOfferInputSchema,
	amendOfferDraft,
	amendOfferDraftInputSchema,
	amendRequisition,
	amendRequisitionInputSchema,
	anonymizeCandidate,
	anonymizeCandidateInputSchema,
	applicationStatusTransitionInputSchema,
	approveOffer,
	approveRequisition,
	assignHiringManager,
	assignHiringManagerInputSchema,
	assignInterviewInterviewer,
	assignInterviewInterviewerInputSchema,
	cancelInterview,
	cancelInterviewInputSchema,
	cancelRequisition,
	changeCandidateRetention,
	changeCandidateRetentionInputSchema,
	closeRequisition,
	createApplication,
	createApplicationInputSchema,
	createCandidate,
	createCandidateInputSchema,
	createDraftRequisition,
	createDraftRequisitionInputSchema,
	createOffer,
	createOfferInputSchema,
	declineOffer,
	detectCandidateDuplicates,
	detectCandidateDuplicatesInputSchema,
	expireOffer,
	getApplication,
	getApplicationInputSchema,
	getCandidate,
	getCandidateInputSchema,
	getInterview,
	getInterviewEvaluation,
	getInterviewEvaluationInputSchema,
	getInterviewInputSchema,
	getOffer,
	getOfferInputSchema,
	getRequisition,
	getRequisitionInputSchema,
	issueOffer,
	listApplicationStatusHistory,
	listApplicationStatusHistoryInputSchema,
	listApplications,
	listApplicationsInputSchema,
	listCandidates,
	listCandidatesInputSchema,
	listInterviews,
	listInterviewsInputSchema,
	listOffers,
	listOffersInputSchema,
	listRequisitions,
	listRequisitionsInputSchema,
	moveApplicationToInReview,
	moveApplicationToInterviewing,
	offerStatusTransitionInputSchema,
	openRequisition,
	placeRequisitionOnHold,
	recordInterviewEvaluation,
	recordInterviewEvaluationInputSchema,
	rejectApplication,
	reopenApplication,
	reopenApplicationInputSchema,
	requisitionStatusTransitionInputSchema,
	scheduleInterview,
	scheduleInterviewInputSchema,
	submitRequisition,
	updateCandidateProfile,
	updateCandidateProfileInputSchema,
	withdrawApplication,
	withdrawCandidateConsent,
	withdrawCandidateConsentInputSchema,
	withdrawOffer,
} from "@afenda/human-resources";
import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrTalentOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const createDraftRequisitionActionSchema = hrActionSchema(
	createDraftRequisitionInputSchema,
);

export async function createDraftRequisitionAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "createDraftRequisitionAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not create requisition draft.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createDraftRequisitionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition draft.",
				});
			}
			const result = await createDraftRequisition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const amendRequisitionActionSchema = hrActionSchema(
	amendRequisitionInputSchema,
);

export async function amendRequisitionAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "amendRequisitionAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not amend requisition.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(amendRequisitionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition amendment.",
				});
			}
			const result = await amendRequisition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const assignHiringManagerActionSchema = hrActionSchema(
	assignHiringManagerInputSchema,
);

export async function assignHiringManagerAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "assignHiringManagerAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not assign hiring manager.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(assignHiringManagerActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid hiring manager assignment.",
				});
			}
			const result = await assignHiringManager(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const submitRequisitionActionSchema = hrActionSchema(
	requisitionStatusTransitionInputSchema,
);

export async function submitRequisitionAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "submitRequisitionAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not submit requisition.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(submitRequisitionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition submission.",
				});
			}
			const result = await submitRequisition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const approveRequisitionActionSchema = hrActionSchema(
	requisitionStatusTransitionInputSchema,
);

export async function approveRequisitionAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "approveRequisitionAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not approve requisition.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(approveRequisitionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition approval.",
				});
			}
			const result = await approveRequisition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const openRequisitionActionSchema = hrActionSchema(
	requisitionStatusTransitionInputSchema,
);

export async function openRequisitionAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "openRequisitionAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not open requisition.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(openRequisitionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition open request.",
				});
			}
			const result = await openRequisition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const placeRequisitionOnHoldActionSchema = hrActionSchema(
	requisitionStatusTransitionInputSchema,
);

export async function placeRequisitionOnHoldAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "placeRequisitionOnHoldAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not place requisition on hold.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(placeRequisitionOnHoldActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition hold request.",
				});
			}
			const result = await placeRequisitionOnHold(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const closeRequisitionActionSchema = hrActionSchema(
	requisitionStatusTransitionInputSchema,
);

export async function closeRequisitionAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "closeRequisitionAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not close requisition.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(closeRequisitionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition close request.",
				});
			}
			const result = await closeRequisition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const cancelRequisitionActionSchema = hrActionSchema(
	requisitionStatusTransitionInputSchema,
);

export async function cancelRequisitionAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "cancelRequisitionAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not cancel requisition.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelRequisitionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition cancellation.",
				});
			}
			const result = await cancelRequisition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const getRequisitionActionSchema = hrActionSchema(getRequisitionInputSchema);

export async function getRequisitionAction(
	input: unknown,
): Promise<ActionResult<{ requisition: JobRequisition }>> {
	return await runOperatorPermissionAction({
		path: "getRequisitionAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not get requisition.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getRequisitionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid requisition lookup.",
				});
			}
			const result = await getRequisition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { requisition: mapped.data } };
		},
	});
}

const listRequisitionsActionSchema = hrActionSchema(
	listRequisitionsInputSchema,
);

export async function listRequisitionsAction(
	input: unknown,
): Promise<ActionResult<{ page: RequisitionListPage }>> {
	return await runOperatorPermissionAction({
		path: "listRequisitionsAction",
		permission: "human-resources.requisition.create",
		safeMessage: "Could not list requisitions.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listRequisitionsActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid requisition list filters.",
				});
			}
			const result = await listRequisitions(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

const createCandidateActionSchema = hrActionSchema(createCandidateInputSchema);

export async function createCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: Candidate }>> {
	return await runOperatorPermissionAction({
		path: "createCandidateAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not create candidate.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createCandidateActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid candidate.",
				});
			}
			const result = await createCandidate(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { candidate: mapped.data } };
		},
	});
}

const updateCandidateProfileActionSchema = hrActionSchema(
	updateCandidateProfileInputSchema,
);

export async function updateCandidateProfileAction(
	input: unknown,
): Promise<ActionResult<{ candidate: Candidate }>> {
	return await runOperatorPermissionAction({
		path: "updateCandidateProfileAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not update candidate profile.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateCandidateProfileActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid candidate profile update.",
				});
			}
			const result = await updateCandidateProfile(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { candidate: mapped.data } };
		},
	});
}

const withdrawCandidateConsentActionSchema = hrActionSchema(
	withdrawCandidateConsentInputSchema,
);

export async function withdrawCandidateConsentAction(
	input: unknown,
): Promise<ActionResult<{ candidate: Candidate }>> {
	return await runOperatorPermissionAction({
		path: "withdrawCandidateConsentAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not withdraw candidate consent.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(withdrawCandidateConsentActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid candidate consent withdrawal.",
				});
			}
			const result = await withdrawCandidateConsent(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { candidate: mapped.data } };
		},
	});
}

const changeCandidateRetentionActionSchema = hrActionSchema(
	changeCandidateRetentionInputSchema,
);

export async function changeCandidateRetentionAction(
	input: unknown,
): Promise<ActionResult<{ candidate: Candidate }>> {
	return await runOperatorPermissionAction({
		path: "changeCandidateRetentionAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not change candidate retention.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(changeCandidateRetentionActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid candidate retention change.",
				});
			}
			const result = await changeCandidateRetention(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { candidate: mapped.data } };
		},
	});
}

const anonymizeCandidateActionSchema = hrActionSchema(
	anonymizeCandidateInputSchema,
);

export async function anonymizeCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: Candidate }>> {
	return await runOperatorPermissionAction({
		path: "anonymizeCandidateAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not anonymize candidate.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(anonymizeCandidateActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid candidate anonymization.",
				});
			}
			const result = await anonymizeCandidate(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { candidate: mapped.data } };
		},
	});
}

const getCandidateActionSchema = hrActionSchema(getCandidateInputSchema);

export async function getCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: Candidate }>> {
	return await runOperatorPermissionAction({
		path: "getCandidateAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not get candidate.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getCandidateActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid candidate lookup.",
				});
			}
			const result = await getCandidate(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { candidate: mapped.data } };
		},
	});
}

const listCandidatesActionSchema = hrActionSchema(listCandidatesInputSchema);

export async function listCandidatesAction(
	input: unknown,
): Promise<ActionResult<{ page: CandidateListPage }>> {
	return await runOperatorPermissionAction({
		path: "listCandidatesAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not list candidates.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listCandidatesActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid candidate list filters.",
				});
			}
			const result = await listCandidates(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

const detectCandidateDuplicatesActionSchema = hrActionSchema(
	detectCandidateDuplicatesInputSchema,
);

export async function detectCandidateDuplicatesAction(
	input: unknown,
): Promise<ActionResult<{ matches: readonly CandidateDuplicateMatch[] }>> {
	return await runOperatorPermissionAction({
		path: "detectCandidateDuplicatesAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not detect candidate duplicates.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(detectCandidateDuplicatesActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid candidate duplicate detection filters.",
				});
			}
			const result = await detectCandidateDuplicates(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { matches: mapped.data } };
		},
	});
}

const createApplicationActionSchema = hrActionSchema(
	createApplicationInputSchema,
);

export async function createApplicationAction(
	input: unknown,
): Promise<ActionResult<{ application: CandidateApplication }>> {
	return await runOperatorPermissionAction({
		path: "createApplicationAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not create application.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createApplicationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid application.",
				});
			}
			const result = await createApplication(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { application: mapped.data } };
		},
	});
}

const moveApplicationToInReviewActionSchema = hrActionSchema(
	applicationStatusTransitionInputSchema,
);

export async function moveApplicationToInReviewAction(
	input: unknown,
): Promise<ActionResult<{ application: CandidateApplication }>> {
	return await runOperatorPermissionAction({
		path: "moveApplicationToInReviewAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not move application to in review.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(moveApplicationToInReviewActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid application in-review transition.",
				});
			}
			const result = await moveApplicationToInReview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { application: mapped.data } };
		},
	});
}

const moveApplicationToInterviewingActionSchema = hrActionSchema(
	applicationStatusTransitionInputSchema,
);

export async function moveApplicationToInterviewingAction(
	input: unknown,
): Promise<ActionResult<{ application: CandidateApplication }>> {
	return await runOperatorPermissionAction({
		path: "moveApplicationToInterviewingAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not move application to interviewing.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				moveApplicationToInterviewingActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid application interviewing transition.",
				});
			}
			const result = await moveApplicationToInterviewing(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { application: mapped.data } };
		},
	});
}

const rejectApplicationActionSchema = hrActionSchema(
	applicationStatusTransitionInputSchema,
);

export async function rejectApplicationAction(
	input: unknown,
): Promise<ActionResult<{ application: CandidateApplication }>> {
	return await runOperatorPermissionAction({
		path: "rejectApplicationAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not reject application.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(rejectApplicationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid application rejection.",
				});
			}
			const result = await rejectApplication(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { application: mapped.data } };
		},
	});
}

const withdrawApplicationActionSchema = hrActionSchema(
	applicationStatusTransitionInputSchema,
);

export async function withdrawApplicationAction(
	input: unknown,
): Promise<ActionResult<{ application: CandidateApplication }>> {
	return await runOperatorPermissionAction({
		path: "withdrawApplicationAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not withdraw application.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(withdrawApplicationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid application withdrawal.",
				});
			}
			const result = await withdrawApplication(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { application: mapped.data } };
		},
	});
}

const reopenApplicationActionSchema = hrActionSchema(
	reopenApplicationInputSchema,
);

export async function reopenApplicationAction(
	input: unknown,
): Promise<ActionResult<{ application: CandidateApplication }>> {
	return await runOperatorPermissionAction({
		path: "reopenApplicationAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not reopen application.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(reopenApplicationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid application reopen request.",
				});
			}
			const result = await reopenApplication(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { application: mapped.data } };
		},
	});
}

const getApplicationActionSchema = hrActionSchema(getApplicationInputSchema);

export async function getApplicationAction(
	input: unknown,
): Promise<ActionResult<{ application: CandidateApplication }>> {
	return await runOperatorPermissionAction({
		path: "getApplicationAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not get application.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getApplicationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid application lookup.",
				});
			}
			const result = await getApplication(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { application: mapped.data } };
		},
	});
}

const listApplicationsActionSchema = hrActionSchema(
	listApplicationsInputSchema,
);

export async function listApplicationsAction(
	input: unknown,
): Promise<ActionResult<{ page: ApplicationListPage }>> {
	return await runOperatorPermissionAction({
		path: "listApplicationsAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not list applications.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listApplicationsActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid application list filters.",
				});
			}
			const result = await listApplications(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

const listApplicationStatusHistoryActionSchema = hrActionSchema(
	listApplicationStatusHistoryInputSchema,
);

export async function listApplicationStatusHistoryAction(
	input: unknown,
): Promise<ActionResult<{ history: ApplicationStatusHistory[] }>> {
	return await runOperatorPermissionAction({
		path: "listApplicationStatusHistoryAction",
		permission: "human-resources.candidate.manage",
		safeMessage: "Could not list application status history.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listApplicationStatusHistoryActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid application status history request.",
				});
			}
			const result = await listApplicationStatusHistory(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { history: mapped.data } };
		},
	});
}

const scheduleInterviewActionSchema = hrActionSchema(
	scheduleInterviewInputSchema,
);

export async function scheduleInterviewAction(
	input: unknown,
): Promise<ActionResult<{ interview: Interview }>> {
	return await runOperatorPermissionAction({
		path: "scheduleInterviewAction",
		permission: "human-resources.interview.record",
		safeMessage: "Could not schedule interview.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(scheduleInterviewActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid interview schedule.",
				});
			}
			const result = await scheduleInterview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { interview: mapped.data } };
		},
	});
}

const cancelInterviewActionSchema = hrActionSchema(cancelInterviewInputSchema);

export async function cancelInterviewAction(
	input: unknown,
): Promise<ActionResult<{ interview: Interview }>> {
	return await runOperatorPermissionAction({
		path: "cancelInterviewAction",
		permission: "human-resources.interview.record",
		safeMessage: "Could not cancel interview.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelInterviewActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid interview cancellation.",
				});
			}
			const result = await cancelInterview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { interview: mapped.data } };
		},
	});
}

const assignInterviewInterviewerActionSchema = hrActionSchema(
	assignInterviewInterviewerInputSchema,
);

export async function assignInterviewInterviewerAction(
	input: unknown,
): Promise<ActionResult<{ interview: Interview }>> {
	return await runOperatorPermissionAction({
		path: "assignInterviewInterviewerAction",
		permission: "human-resources.interview.record",
		safeMessage: "Could not assign interview interviewer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(assignInterviewInterviewerActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid interviewer assignment.",
				});
			}
			const result = await assignInterviewInterviewer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { interview: mapped.data } };
		},
	});
}

const recordInterviewEvaluationActionSchema = hrActionSchema(
	recordInterviewEvaluationInputSchema,
);

export async function recordInterviewEvaluationAction(
	input: unknown,
): Promise<ActionResult<{ evaluation: InterviewEvaluation }>> {
	return await runOperatorPermissionAction({
		path: "recordInterviewEvaluationAction",
		permission: "human-resources.interview.record",
		safeMessage: "Could not record interview evaluation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordInterviewEvaluationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid interview evaluation.",
				});
			}
			const result = await recordInterviewEvaluation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { evaluation: mapped.data } };
		},
	});
}

const getInterviewActionSchema = hrActionSchema(getInterviewInputSchema);

export async function getInterviewAction(
	input: unknown,
): Promise<ActionResult<{ interview: Interview }>> {
	return await runOperatorPermissionAction({
		path: "getInterviewAction",
		permission: "human-resources.interview.read",
		safeMessage: "Could not get interview.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getInterviewActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid interview lookup.",
				});
			}
			const result = await getInterview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { interview: mapped.data } };
		},
	});
}

const listInterviewsActionSchema = hrActionSchema(listInterviewsInputSchema);

export async function listInterviewsAction(
	input: unknown,
): Promise<ActionResult<{ page: InterviewListPage }>> {
	return await runOperatorPermissionAction({
		path: "listInterviewsAction",
		permission: "human-resources.interview.read",
		safeMessage: "Could not list interviews.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listInterviewsActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid interview list filters.",
				});
			}
			const result = await listInterviews(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

const getInterviewEvaluationActionSchema = hrActionSchema(
	getInterviewEvaluationInputSchema,
);

export async function getInterviewEvaluationAction(
	input: unknown,
): Promise<ActionResult<{ evaluation: InterviewEvaluation }>> {
	return await runOperatorPermissionAction({
		path: "getInterviewEvaluationAction",
		permission: "human-resources.interview.read",
		safeMessage: "Could not get interview evaluation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getInterviewEvaluationActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid interview evaluation lookup.",
				});
			}
			const result = await getInterviewEvaluation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { evaluation: mapped.data } };
		},
	});
}

const createOfferActionSchema = hrActionSchema(createOfferInputSchema);

export async function createOfferAction(
	input: unknown,
): Promise<ActionResult<{ offer: EmploymentOffer }>> {
	return await runOperatorPermissionAction({
		path: "createOfferAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not create offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer.",
				});
			}
			const result = await createOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offer: mapped.data } };
		},
	});
}

const amendOfferDraftActionSchema = hrActionSchema(amendOfferDraftInputSchema);

export async function amendOfferDraftAction(
	input: unknown,
): Promise<ActionResult<{ offer: EmploymentOffer }>> {
	return await runOperatorPermissionAction({
		path: "amendOfferDraftAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not amend offer draft.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(amendOfferDraftActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer draft amendment.",
				});
			}
			const result = await amendOfferDraft(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offer: mapped.data } };
		},
	});
}

const approveOfferActionSchema = hrActionSchema(
	offerStatusTransitionInputSchema,
);

export async function approveOfferAction(
	input: unknown,
): Promise<ActionResult<{ offer: EmploymentOffer }>> {
	return await runOperatorPermissionAction({
		path: "approveOfferAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not approve offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(approveOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer approval.",
				});
			}
			const result = await approveOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offer: mapped.data } };
		},
	});
}

const issueOfferActionSchema = hrActionSchema(offerStatusTransitionInputSchema);

export async function issueOfferAction(
	input: unknown,
): Promise<ActionResult<{ offer: EmploymentOffer }>> {
	return await runOperatorPermissionAction({
		path: "issueOfferAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not issue offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(issueOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer issue request.",
				});
			}
			const result = await issueOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offer: mapped.data } };
		},
	});
}

const acceptOfferActionSchema = hrActionSchema(acceptOfferInputSchema);

export async function acceptOfferAction(
	input: unknown,
): Promise<ActionResult<{ handoff: OfferAcceptanceHandoff }>> {
	return await runOperatorPermissionAction({
		path: "acceptOfferAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not accept offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(acceptOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer acceptance.",
				});
			}
			const result = await acceptOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { handoff: mapped.data } };
		},
	});
}

const declineOfferActionSchema = hrActionSchema(
	offerStatusTransitionInputSchema,
);

export async function declineOfferAction(
	input: unknown,
): Promise<ActionResult<{ offer: EmploymentOffer }>> {
	return await runOperatorPermissionAction({
		path: "declineOfferAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not decline offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(declineOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer decline.",
				});
			}
			const result = await declineOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offer: mapped.data } };
		},
	});
}

const expireOfferActionSchema = hrActionSchema(
	offerStatusTransitionInputSchema,
);

export async function expireOfferAction(
	input: unknown,
): Promise<ActionResult<{ offer: EmploymentOffer }>> {
	return await runOperatorPermissionAction({
		path: "expireOfferAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not expire offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(expireOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer expiration.",
				});
			}
			const result = await expireOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offer: mapped.data } };
		},
	});
}

const withdrawOfferActionSchema = hrActionSchema(
	offerStatusTransitionInputSchema,
);

export async function withdrawOfferAction(
	input: unknown,
): Promise<ActionResult<{ offer: EmploymentOffer }>> {
	return await runOperatorPermissionAction({
		path: "withdrawOfferAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not withdraw offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(withdrawOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer withdrawal.",
				});
			}
			const result = await withdrawOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offer: mapped.data } };
		},
	});
}

const getOfferActionSchema = hrActionSchema(getOfferInputSchema);

export async function getOfferAction(
	input: unknown,
): Promise<ActionResult<{ offer: EmploymentOffer }>> {
	return await runOperatorPermissionAction({
		path: "getOfferAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not get offer.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getOfferActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid offer lookup.",
				});
			}
			const result = await getOffer(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { offer: mapped.data } };
		},
	});
}

const listOffersActionSchema = hrActionSchema(listOffersInputSchema);

export async function listOffersAction(
	input: unknown,
): Promise<ActionResult<{ page: OfferListPage }>> {
	return await runOperatorPermissionAction({
		path: "listOffersAction",
		permission: "human-resources.offer.approve",
		safeMessage: "Could not list offers.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listOffersActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid offer list filters.",
				});
			}
			const result = await listOffers(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}
