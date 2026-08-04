import { http } from "@afenda/http";
import {
	listApplications,
	listCandidates,
	listInterviews,
	listOffers,
	listRequisitions,
} from "@afenda/human-resources";

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

import type {
	RecruitmentCapabilities,
	RecruitmentWorkspaceData,
} from "./types";

const LOAD_ERROR = "Recruitment information is temporarily unavailable.";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The loader preserves partial-failure handling across recruitment queues.
export async function loadRecruitmentWorkspace(input: {
	organizationId: string;
	actorUserId: string;
	capabilities: RecruitmentCapabilities;
}): Promise<RecruitmentWorkspaceData> {
	const context = {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: http.correlation.create(),
		page: 1,
		pageSize: 100,
	};
	const options = createHumanResourcesCommandOptions();
	const [requisitions, candidates, applications, interviews, offers] =
		await Promise.all([
			input.capabilities.canManageRequisitions
				? listRequisitions(context, options)
				: null,
			input.capabilities.canManageCandidates
				? listCandidates(context, options)
				: null,
			input.capabilities.canManageCandidates
				? listApplications(context, options)
				: null,
			input.capabilities.canReadInterviews
				? listInterviews(context, options)
				: null,
			input.capabilities.canManageOffers ? listOffers(context, options) : null,
		]);
	const errors: RecruitmentWorkspaceData["errors"] = {};
	if (requisitions && !requisitions.ok) {
		errors.requisitions = LOAD_ERROR;
	}
	if ((candidates && !candidates.ok) || (applications && !applications.ok)) {
		errors.candidates = LOAD_ERROR;
	}
	if (interviews && !interviews.ok) {
		errors.interviews = LOAD_ERROR;
	}
	if (offers && !offers.ok) {
		errors.offers = LOAD_ERROR;
	}
	const requisitionRows = requisitions?.ok
		? requisitions.data.requisitions
		: [];
	const candidateRows = candidates?.ok ? candidates.data.candidates : [];
	const applicationRows = applications?.ok
		? applications.data.applications
		: [];
	const interviewRows = interviews?.ok ? interviews.data.interviews : [];
	const offerRows = offers?.ok ? offers.data.offers : [];
	if (
		requisitionRows.some((row) => row.organizationId !== input.organizationId)
	) {
		errors.requisitions = LOAD_ERROR;
	}
	if (
		candidateRows.some((row) => row.organizationId !== input.organizationId) ||
		applicationRows.some((row) => row.organizationId !== input.organizationId)
	) {
		errors.candidates = LOAD_ERROR;
	}
	if (
		interviewRows.some((row) => row.organizationId !== input.organizationId)
	) {
		errors.interviews = LOAD_ERROR;
	}
	if (offerRows.some((row) => row.organizationId !== input.organizationId)) {
		errors.offers = LOAD_ERROR;
	}
	return {
		requisitions: errors.requisitions ? [] : requisitionRows,
		candidates: errors.candidates ? [] : candidateRows,
		applications: errors.candidates ? [] : applicationRows,
		interviews: errors.interviews ? [] : interviewRows,
		offers: errors.offers ? [] : offerRows,
		errors,
	};
}
