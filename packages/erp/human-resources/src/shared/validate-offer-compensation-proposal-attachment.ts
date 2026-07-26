import { ok, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesApplicationId,
	HumanResourcesCompensationProposalId,
} from "../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../error-codes";
import type { HumanResourcesStore } from "../store";
import { assertCompensationProposalApproved } from "./compensation-proposal-guards";
import {
	isCompensationProposalApproved,
	isCompensationProposalDraft,
} from "./compensation-status";
import { invalidState, notFound } from "./domain-guards";
import type { OfferStatus } from "./recruitment-status";

export async function validateOfferCompensationProposalAttachment(
	store: Pick<HumanResourcesStore, "getCompensationProposal">,
	input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
		compensationProposalId:
			| HumanResourcesCompensationProposalId
			| null
			| undefined;
		offerStatus?: OfferStatus;
	},
): Promise<Result<void>> {
	if (
		input.compensationProposalId === null ||
		input.compensationProposalId === undefined
	) {
		return ok(undefined);
	}

	const proposalResult = await store.getCompensationProposal({
		organizationId: input.organizationId,
		proposalId: input.compensationProposalId,
	});
	if (!proposalResult.ok) {
		return proposalResult;
	}
	if (proposalResult.data === null) {
		return notFound("Compensation proposal not found");
	}
	const proposal = proposalResult.data;

	if (proposal.organizationId !== input.organizationId) {
		return notFound(
			"Compensation proposal not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (proposal.applicationId !== input.applicationId) {
		return invalidState("Compensation proposal does not match application");
	}

	if (input.offerStatus === "approved" || input.offerStatus === "issued") {
		return assertCompensationProposalApproved(proposal.status);
	}

	if (
		!isCompensationProposalDraft(proposal.status) &&
		!isCompensationProposalApproved(proposal.status)
	) {
		return invalidState("Compensation proposal must be draft or approved");
	}

	return ok(undefined);
}
