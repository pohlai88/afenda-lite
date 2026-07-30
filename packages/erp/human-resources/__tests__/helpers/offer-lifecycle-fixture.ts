import { randomUUID } from "node:crypto";

import type { Result } from "@afenda/errors/result";

import type {
	HumanResourcesApplicationId,
	HumanResourcesCompensationProposalId,
} from "../../src/brands";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import {
	approveCompensationProposal,
	createCompensationProposal,
} from "../../src/compensation-benefits/compensation-proposal";
import { createMemoryCurrencyLookup } from "../../src/compensation-benefits/currency-lookup";
import {
	amendOfferDraft,
	approveOffer,
	createOffer,
	issueOffer,
} from "../../src/recruitment/offer";
import type { CompensationProposal, EmploymentOffer } from "../../src/types";

export function withOfferLifecycleDeps(
	ready: HumanResourcesCommandOptions,
): HumanResourcesCommandOptions {
	return {
		...ready,
		currency: ready.currency ?? createMemoryCurrencyLookup(),
	};
}

export async function seedApprovedCompensationProposal(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		applicationId: HumanResourcesApplicationId;
		tag?: string;
		proposedBaseAmount?: string;
		proposedCurrencyCode?: string;
	},
): Promise<Result<CompensationProposal>> {
	const opts = withOfferLifecycleDeps(ready);
	const tag = input.tag ?? randomUUID().slice(0, 8);

	const created = await createCompensationProposal(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-prop-create-${tag}`,
			applicationId: input.applicationId,
			proposedBaseAmount: input.proposedBaseAmount ?? "85000.00",
			proposedCurrencyCode: input.proposedCurrencyCode ?? "USD",
		},
		opts,
	);
	if (!created.ok) {
		return created;
	}

	return approveCompensationProposal(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-prop-approve-${tag}`,
			proposalId: created.data.id,
			expectedVersion: created.data.version,
		},
		opts,
	);
}

export async function approveAndIssueExistingOffer(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		offer: EmploymentOffer;
		correlationPrefix: string;
	},
): Promise<Result<EmploymentOffer>> {
	const approved = await approveOffer(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationPrefix}-approve`,
			offerId: input.offer.id,
			expectedVersion: input.offer.version,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	return issueOffer(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationPrefix}-issue`,
			offerId: approved.data.id,
			expectedVersion: approved.data.version,
		},
		ready,
	);
}

export async function attachApprovedProposalAndIssueExistingOffer(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		offer: EmploymentOffer;
		tag: string;
		correlationPrefix?: string;
	},
): Promise<Result<EmploymentOffer>> {
	const opts = withOfferLifecycleDeps(ready);
	const prefix = input.correlationPrefix ?? input.tag;

	const proposal = await seedApprovedCompensationProposal(opts, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		applicationId: input.offer.applicationId,
		tag: input.tag,
	});
	if (!proposal.ok) {
		return proposal;
	}

	const amended = await amendOfferDraft(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${prefix}-amend-proposal`,
			offerId: input.offer.id,
			compensationProposalId: proposal.data.id,
			expectedVersion: input.offer.version,
		},
		opts,
	);
	if (!amended.ok) {
		return amended;
	}

	return approveAndIssueExistingOffer(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		offer: amended.data,
		correlationPrefix: prefix,
	});
}

export async function createAndIssueOffer(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		applicationId: HumanResourcesApplicationId;
		termsSummary: string;
		expiresOn: string;
		correlationPrefix: string;
		proposedBaseAmount?: string;
		proposedCurrencyCode?: string;
		compensationProposalId?: HumanResourcesCompensationProposalId;
	},
): Promise<Result<EmploymentOffer>> {
	const opts = withOfferLifecycleDeps(ready);
	const tag = input.correlationPrefix;

	let { compensationProposalId } = input;
	if (compensationProposalId === undefined) {
		const proposal = await seedApprovedCompensationProposal(opts, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			applicationId: input.applicationId,
			tag,
			proposedBaseAmount: input.proposedBaseAmount,
			proposedCurrencyCode: input.proposedCurrencyCode,
		});
		if (!proposal.ok) {
			return proposal;
		}
		compensationProposalId = proposal.data.id;
	}

	const offer = await createOffer(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${tag}-create`,
			applicationId: input.applicationId,
			termsSummary: input.termsSummary,
			expiresOn: input.expiresOn,
			compensationProposalId,
		},
		opts,
	);
	if (!offer.ok) {
		return offer;
	}

	return approveAndIssueExistingOffer(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		offer: offer.data,
		correlationPrefix: tag,
	});
}
