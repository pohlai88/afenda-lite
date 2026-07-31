import type { Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_AMEND,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_APPROVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_CREATE,
	HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_LIST,
} from "../module-ids";
import {
	amendCompensationProposalInputSchema,
	approveCompensationProposalInputSchema,
	createCompensationProposalInputSchema,
	getCompensationProposalInputSchema,
	listCompensationProposalsInputSchema,
} from "../schemas/compensation";
import {
	assertCurrencyExists,
	runCompensationCommand,
	runCompensationQuery,
} from "../shared/compensation-command";
import { notFound } from "../shared/domain-guards";
import { buildMutationMeta } from "../shared/mutation-meta";
import type {
	CompensationProposal,
	CompensationProposalListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_COMPENSATION_PROPOSAL =
	"compensation_proposal" as const;
export type HumanResourcesCompensationProposalAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPENSATION_PROPOSAL;

export function createCompensationProposal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationProposal>> {
	return runCompensationCommand(input, options, {
		schema: createCompensationProposalInputSchema,
		invalidMessage: "Invalid compensation proposal create input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_CREATE,
		execute: async (data, { store, ports, currency }) => {
			if (data.proposedCurrencyCode !== undefined) {
				const currencyCheck = await assertCurrencyExists(
					currency,
					data.proposedCurrencyCode,
				);
				if (!currencyCheck.ok) {
					return currencyCheck;
				}
			}
			return store.createCompensationProposal(
				{
					organizationId: data.organizationId,
					applicationId: data.applicationId,
					proposedBaseAmount: data.proposedBaseAmount ?? null,
					proposedCurrencyCode: data.proposedCurrencyCode ?? null,
					proposedGradeId: data.proposedGradeId ?? null,
					proposedSalaryBandId: data.proposedSalaryBandId ?? null,
					confidentialNote: data.confidentialNote ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_CREATE,
				}),
			);
		},
	});
}

export function amendCompensationProposal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationProposal>> {
	return runCompensationCommand(input, options, {
		schema: amendCompensationProposalInputSchema,
		invalidMessage: "Invalid compensation proposal amend input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_AMEND,
		execute: async (data, { store, ports, currency }) => {
			if (data.proposedCurrencyCode !== undefined) {
				const currencyCheck = await assertCurrencyExists(
					currency,
					data.proposedCurrencyCode,
				);
				if (!currencyCheck.ok) {
					return currencyCheck;
				}
			}
			return store.amendCompensationProposal(
				{
					organizationId: data.organizationId,
					proposalId: data.proposalId,
					proposedBaseAmount: data.proposedBaseAmount,
					proposedCurrencyCode: data.proposedCurrencyCode,
					proposedGradeId: data.proposedGradeId,
					proposedSalaryBandId: data.proposedSalaryBandId,
					confidentialNote: data.confidentialNote,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_AMEND,
				}),
			);
		},
	});
}

export function approveCompensationProposal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationProposal>> {
	return runCompensationCommand(input, options, {
		schema: approveCompensationProposalInputSchema,
		invalidMessage: "Invalid compensation proposal approve input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_APPROVE,
		execute: (data, { store, ports }) =>
			store.approveCompensationProposal(
				{
					organizationId: data.organizationId,
					proposalId: data.proposalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_APPROVE,
				}),
			),
	});
}

export function getCompensationProposal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationProposal>> {
	return runCompensationQuery<
		typeof getCompensationProposalInputSchema,
		CompensationProposal
	>(input, options, {
		schema: getCompensationProposalInputSchema,
		invalidMessage: "Invalid compensation proposal get input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_GET,
		execute: async (data, { store }) => {
			const proposal = await store.getCompensationProposal({
				organizationId: data.organizationId,
				proposalId: data.proposalId,
			});
			if (!proposal.ok) {
				return proposal;
			}
			if (proposal.data === null) {
				return notFound("Compensation proposal not found");
			}
			return { ok: true, data: proposal.data };
		},
	});
}

export function listCompensationProposals(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationProposalListPage>> {
	return runCompensationQuery(input, options, {
		schema: listCompensationProposalsInputSchema,
		invalidMessage: "Invalid compensation proposal list input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_LIST,
		execute: (data, { store }) =>
			store.listCompensationProposals({
				organizationId: data.organizationId,
				applicationId: data.applicationId,
				page: data.page,
				pageSize: data.pageSize,
			}),
	});
}
