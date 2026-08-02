import { errorResult, type Result } from "@afenda/errors";
import type {
	EmploymentOffer,
	OfferAcceptanceHandoff,
	OfferListPage,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintOfferAccept } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
	HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT,
	HUMAN_RESOURCES_COMMAND_OFFER_APPROVE,
	HUMAN_RESOURCES_COMMAND_OFFER_CREATE,
	HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
	HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE,
	HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
	HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
	HUMAN_RESOURCES_QUERY_OFFER_GET,
	HUMAN_RESOURCES_QUERY_OFFER_LIST,
} from "../../kernel/operations/module-ids";
import {
	runRecruitmentCapabilityCommand,
	runRecruitmentCapabilityQuery,
} from "./run-operation";
import {
	acceptOfferInputSchema,
	amendOfferDraftInputSchema,
	createOfferInputSchema,
	getOfferInputSchema,
	listOffersInputSchema,
	offerStatusTransitionInputSchema,
} from "./schema";
import type { OfferStatus } from "./status";

export const HUMAN_RESOURCES_AGGREGATE_OFFER = "offer" as const;
export type HumanResourcesOfferAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_OFFER;

function todayUtcDate(): string {
	return new Date().toISOString().slice(0, 10);
}

export function createOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: createOfferInputSchema,
		invalidMessage: "Invalid offer create input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_CREATE,
		storeMethods: ["createOffer"],
		execute: (data, { store, ports }) =>
			store.createOffer(
				{
					organizationId: data.organizationId,
					applicationId: data.applicationId,
					termsSummary: data.termsSummary.trim(),
					expiresOn: data.expiresOn,
					compensationProposalId: data.compensationProposalId ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_OFFER_CREATE,
				}),
			),
	});
}

export function amendOfferDraft(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: amendOfferDraftInputSchema,
		invalidMessage: "Invalid offer amend-draft input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT,
		storeMethods: ["amendOfferDraft"],
		execute: (data, { store, ports }) =>
			store.amendOfferDraft(
				{
					organizationId: data.organizationId,
					offerId: data.offerId,
					termsSummary: data.termsSummary?.trim(),
					expiresOn: data.expiresOn,
					compensationProposalId: data.compensationProposalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT,
				}),
			),
	});
}

function transitionOffer(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		invalidMessage: string;
		command: typeof import("./operation-registry").HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS[number];
		status: Exclude<OfferStatus, "draft" | "accepted">;
		asOfDate?: string;
	},
): Promise<Result<EmploymentOffer>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: offerStatusTransitionInputSchema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		storeMethods: ["transitionOfferStatus"],
		execute: (data, { store, ports }) =>
			store.transitionOfferStatus(
				{
					organizationId: data.organizationId,
					offerId: data.offerId,
					status: config.status,
					asOfDate: config.asOfDate,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: config.command,
				}),
			),
	});
}

export function approveOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return transitionOffer(input, options, {
		invalidMessage: "Invalid offer approve input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_APPROVE,
		status: "approved",
	});
}

export function issueOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return transitionOffer(input, options, {
		invalidMessage: "Invalid offer issue input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
		status: "issued",
	});
}

export function acceptOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OfferAcceptanceHandoff>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: acceptOfferInputSchema,
		invalidMessage: "Invalid offer accept input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
		storeMethods: ["acceptOffer", "findOfferByAcceptIdempotencyKey"],
		execute: async (data, { store, ports }) => {
			const asOfDate = data.asOfDate ?? todayUtcDate();
			const requestFingerprint = fingerprintOfferAccept({
				offerId: data.offerId,
			});

			const existingByKey = await store.findOfferByAcceptIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.acceptRequestFingerprint !== requestFingerprint
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.handoff);
			}

			return store.acceptOffer(
				{
					organizationId: data.organizationId,
					offerId: data.offerId,
					idempotencyKey: data.idempotencyKey,
					acceptRequestFingerprint: requestFingerprint,
					asOfDate,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
				}),
			);
		},
	});
}

export function declineOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return transitionOffer(input, options, {
		invalidMessage: "Invalid offer decline input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
		status: "declined",
	});
}

export function expireOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return transitionOffer(input, options, {
		invalidMessage: "Invalid offer expire input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE,
		status: "expired",
		asOfDate: todayUtcDate(),
	});
}

export function withdrawOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return transitionOffer(input, options, {
		invalidMessage: "Invalid offer withdraw input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
		status: "withdrawn",
	});
}

export function getOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: getOfferInputSchema,
		invalidMessage: "Invalid offer get input",
		query: HUMAN_RESOURCES_QUERY_OFFER_GET,
		storeMethods: ["getOfferById"],
		execute: async (data, { store }) => {
			const offer = await store.getOfferById({
				organizationId: data.organizationId,
				offerId: data.offerId,
			});
			if (!offer.ok) {
				return offer;
			}
			if (offer.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(offer.data);
		},
	});
}

export function listOffers(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OfferListPage>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: listOffersInputSchema,
		invalidMessage: "Invalid offer list input",
		query: HUMAN_RESOURCES_QUERY_OFFER_LIST,
		storeMethods: ["listOffers"],
		execute: (data, { store }) =>
			store.listOffers({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				applicationId: data.applicationId,
			}),
	});
}
