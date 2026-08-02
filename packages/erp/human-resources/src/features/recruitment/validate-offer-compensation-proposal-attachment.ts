import { errorResult, type Result } from "@afenda/errors";
import type { CompensationProposal } from "../../kernel/contracts";
import { invalidState, notFound } from "../../kernel/execution/domain-guards";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../kernel/execution/error-codes";
import type {
	HumanResourcesApplicationId,
	HumanResourcesCompensationProposalId,
} from "../../kernel/identity/brands";
import { assertCompensationProposalApproved } from "../compensation-benefits/proposal-guards";
import {
	isCompensationProposalApproved,
	isCompensationProposalDraft,
} from "../compensation-benefits/status";
import type { OfferStatus } from "./status";

export interface RecruitmentCompensationProposalLookup {
	getCompensationProposal: (input: {
		organizationId: string;
		proposalId: HumanResourcesCompensationProposalId;
	}) => Promise<Result<CompensationProposal | null>>;
}

export async function validateOfferCompensationProposalAttachment(
	store: RecruitmentCompensationProposalLookup,
	input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
		compensationProposalId:
			| HumanResourcesCompensationProposalId
			| null
			| undefined;
		offerStatus?: OfferStatus | undefined;
	},
): Promise<Result<void>> {
	if (
		input.compensationProposalId === null ||
		input.compensationProposalId === undefined
	) {
		return errorResult.ok(undefined);
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
		!(
			isCompensationProposalDraft(proposal.status) ||
			isCompensationProposalApproved(proposal.status)
		)
	) {
		return invalidState("Compensation proposal must be draft or approved");
	}

	return errorResult.ok(undefined);
}
