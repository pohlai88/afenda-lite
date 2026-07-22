import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
	HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT,
	HUMAN_RESOURCES_COMMAND_OFFER_CREATE,
	HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
	HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE,
	HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
	HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
	HUMAN_RESOURCES_QUERY_OFFER_GET,
	HUMAN_RESOURCES_QUERY_OFFER_LIST,
	type HumanResourcesCommandId,
} from "../module-ids";
import {
	acceptOfferInputSchema,
	amendOfferDraftInputSchema,
	createOfferInputSchema,
	getOfferInputSchema,
	listOffersInputSchema,
	offerStatusTransitionInputSchema,
} from "../schemas/recruitment";
import { fingerprintOfferAccept } from "../shared/fingerprint";
import {
	runRecruitmentCommand,
	runRecruitmentQuery,
} from "../shared/recruitment-command";
import type { OfferStatus } from "../shared/recruitment-status";
import type {
	EmploymentOffer,
	OfferAcceptanceHandoff,
	OfferListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_OFFER = "offer" as const;
export type HumanResourcesOfferAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_OFFER;

function todayUtcDate(): string {
	return new Date().toISOString().slice(0, 10);
}

export async function createOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return runRecruitmentCommand(input, options, {
		schema: createOfferInputSchema,
		invalidMessage: "Invalid offer create input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_CREATE,
		execute: (data, { store, ports }) =>
			store.createOffer(
				{
					organizationId: data.organizationId,
					applicationId: data.applicationId,
					termsSummary: data.termsSummary.trim(),
					expiresOn: data.expiresOn,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function amendOfferDraft(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return runRecruitmentCommand(input, options, {
		schema: amendOfferDraftInputSchema,
		invalidMessage: "Invalid offer amend-draft input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT,
		execute: (data, { store, ports }) =>
			store.amendOfferDraft(
				{
					organizationId: data.organizationId,
					offerId: data.offerId,
					termsSummary: data.termsSummary?.trim(),
					expiresOn: data.expiresOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

async function transitionOffer(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		invalidMessage: string;
		command: HumanResourcesCommandId;
		status: Exclude<OfferStatus, "draft" | "accepted">;
		asOfDate?: string;
	},
): Promise<Result<EmploymentOffer>> {
	return runRecruitmentCommand(input, options, {
		schema: offerStatusTransitionInputSchema,
		invalidMessage: config.invalidMessage,
		command: config.command,
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
				{ correlationId: data.correlationId },
			),
	});
}

export async function issueOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return transitionOffer(input, options, {
		invalidMessage: "Invalid offer issue input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
		status: "issued",
	});
}

export async function acceptOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OfferAcceptanceHandoff>> {
	return runRecruitmentCommand(input, options, {
		schema: acceptOfferInputSchema,
		invalidMessage: "Invalid offer accept input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
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
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.handoff);
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function declineOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return transitionOffer(input, options, {
		invalidMessage: "Invalid offer decline input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
		status: "declined",
	});
}

export async function expireOffer(
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

export async function withdrawOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return transitionOffer(input, options, {
		invalidMessage: "Invalid offer withdraw input",
		command: HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
		status: "withdrawn",
	});
}

export async function getOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentOffer>> {
	return runRecruitmentQuery(input, options, {
		schema: getOfferInputSchema,
		invalidMessage: "Invalid offer get input",
		query: HUMAN_RESOURCES_QUERY_OFFER_GET,
		execute: async (data, { store }) => {
			const offer = await store.getOfferById({
				organizationId: data.organizationId,
				offerId: data.offerId,
			});
			if (!offer.ok) {
				return offer;
			}
			if (offer.data === null) {
				return fail(
					"NOT_FOUND",
					"Offer not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(offer.data);
		},
	});
}

export async function listOffers(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OfferListPage>> {
	return runRecruitmentQuery(input, options, {
		schema: listOffersInputSchema,
		invalidMessage: "Invalid offer list input",
		query: HUMAN_RESOURCES_QUERY_OFFER_LIST,
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
