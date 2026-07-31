// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous resolution ports.
import { randomUUID } from "node:crypto";
import { errorResult } from "@afenda/errors";
import {
	meetingVoteIdSchema,
	resolutionActionIdSchema,
	resolutionIdSchema,
} from "../../kernel/brands";
import {
	isResolutionActionOverdue,
	resolutionMatchesAsOf,
} from "../../resolutions/rules";
import type { ResolutionStore } from "../../resolutions/store";
import type {
	MeetingVote,
	Resolution,
	ResolutionAction,
} from "../../resolutions/types";

export function createMemoryCorporateAdministrationResolutionStore(): ResolutionStore {
	const votes = new Map<string, MeetingVote>();
	const resolutions = new Map<string, Resolution>();
	const actions = new Map<string, ResolutionAction>();

	return {
		async getMeetingVote(input) {
			return errorResult.ok(
				cloneNullable(
					votes.get(key(input.organizationId, input.meetingVoteId)),
				),
			);
		},
		async recordMeetingVote(input) {
			const id = meetingVoteIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: MeetingVote = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				governanceMeetingId: input.governanceMeetingId,
				motionCode: input.motionCode,
				eligibleVotes: input.eligibleVotes,
				votesFor: input.votesFor,
				votesAgainst: input.votesAgainst,
				abstentions: input.abstentions,
				thresholdType: input.thresholdType,
				requiredFor: input.requiredFor,
				outcome: input.outcome,
				outcomeBasis: input.outcomeBasis,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			votes.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async getResolution(input) {
			return errorResult.ok(
				cloneNullable(
					resolutions.get(key(input.organizationId, input.resolutionId)),
				),
			);
		},
		async listResolutionsAsOf(input) {
			return errorResult.ok(
				[...resolutions.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							resolutionMatchesAsOf({
								resolution: row,
								asOf: input.asOf,
								status: input.status,
							}),
					)
					.sort((left, right) =>
						left.effectiveFrom.localeCompare(right.effectiveFrom),
					)
					.map(clone),
			);
		},
		async recordResolution(input) {
			const id = resolutionIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: Resolution = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				governanceMeetingId: input.governanceMeetingId,
				meetingVoteId: input.meetingVoteId,
				approvalBasis: input.approvalBasis,
				status: input.status,
				resolutionCode: input.resolutionCode,
				title: input.title,
				textDigest: input.textDigest,
				documentId: input.documentId,
				effectiveFrom: input.effectiveFrom,
				approvedAt: input.approvedAt,
				rejectedAt: input.rejectedAt,
				supersededAt: null,
				supersededByResolutionId: null,
				minutesDocumentId: null,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			resolutions.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async supersedeResolution(input) {
			const current = resolutions.get(
				key(input.organizationId, input.resolutionId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: Resolution = {
				...current,
				status: "superseded",
				supersededAt: now,
				supersededByResolutionId: input.supersededByResolutionId,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			resolutions.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async recordMinutesDocument(input) {
			const current = resolutions.get(
				key(input.organizationId, input.resolutionId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: Resolution = {
				...current,
				minutesDocumentId: input.minutesDocumentId,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			resolutions.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async getResolutionAction(input) {
			return errorResult.ok(
				cloneNullable(
					actions.get(key(input.organizationId, input.resolutionActionId)),
				),
			);
		},
		async listResolutionActions(input) {
			return errorResult.ok(
				[...actions.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.resolutionId === input.resolutionId,
					)
					.sort((left, right) => left.dueOn.localeCompare(right.dueOn))
					.map(clone),
			);
		},
		async listOverdueResolutionActions(input) {
			return errorResult.ok(
				[...actions.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							isResolutionActionOverdue({ action: row, asOf: input.asOf }),
					)
					.sort((left, right) => left.dueOn.localeCompare(right.dueOn))
					.map(clone),
			);
		},
		async assignResolutionAction(input) {
			const id = resolutionActionIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: ResolutionAction = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				resolutionId: input.resolutionId,
				actionTypeCode: input.actionTypeCode,
				assigneePartyId: input.assigneePartyId,
				status: "assigned",
				dueOn: input.dueOn,
				completedAt: null,
				evidenceDocumentId: null,
				completionNotes: null,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			actions.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async completeResolutionAction(input) {
			const current = actions.get(
				key(input.organizationId, input.resolutionActionId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: ResolutionAction = {
				...current,
				status: "completed",
				completedAt: input.completedAt,
				evidenceDocumentId: input.evidenceDocumentId,
				completionNotes: input.completionNotes,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			actions.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
	};
}

function key(organizationId: string, id: string) {
	return `${organizationId}:${id}`;
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function cloneNullable<T>(value: T | undefined): T | null {
	return value === undefined ? null : clone(value);
}

function notFound() {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(_expectedVersion: number, _actualVersion: number) {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}
