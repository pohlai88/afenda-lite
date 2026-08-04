// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous meeting ports.
// biome-ignore-all lint/suspicious/noShadow: Domain-local callbacks intentionally mirror meeting records.
import { randomUUID } from "node:crypto";
import { errorResult } from "@afenda/errors";
import {
	governanceMeetingIdSchema,
	meetingNoticeIdSchema,
	meetingParticipantIdSchema,
	meetingQuorumResultIdSchema,
} from "../../../kernel/brands";
import { canonicalInstantSchema } from "../../../kernel/dates";
import {
	decodeGovernanceMeetingCursor,
	encodeGovernanceMeetingCursor,
	type GovernanceMeetingCursorKey,
	governanceMeetingCursorScope,
} from "../pagination";
import type { MeetingStore } from "../store";
import type {
	GovernanceMeeting,
	GovernanceMeetingListPage,
	MeetingNotice,
	MeetingParticipant,
	MeetingQuorumResult,
} from "../types";

export function createMemoryCorporateAdministrationMeetingStore(): MeetingStore {
	const meetings = new Map<string, GovernanceMeeting>();
	const notices = new Map<string, MeetingNotice>();
	const participants = new Map<string, MeetingParticipant>();
	const quorumResults = new Map<string, MeetingQuorumResult>();

	return {
		async getGovernanceMeeting(input) {
			return errorResult.ok(
				cloneNullable(
					meetings.get(key(input.organizationId, input.governanceMeetingId)),
				),
			);
		},
		async listGovernanceMeetings(input) {
			const cursorScope = governanceMeetingCursorScope(input);
			const cursor = decodeGovernanceMeetingCursor(input.cursor, cursorScope);
			if (!cursor.ok) {
				return cursor;
			}
			const pageSize = input.pageSize ?? 50;
			const ordered = [...meetings.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.legalCompanyId === input.legalCompanyId &&
						(input.governanceBodyId === undefined ||
							row.governanceBodyId === input.governanceBodyId) &&
						(input.status === undefined || row.status === input.status),
				)
				.sort(compareGovernanceMeetings)
				.filter(
					(meeting) =>
						cursor.data === null ||
						compareGovernanceMeetingCursor(meeting, cursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items: pageRows.map(clone),
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeGovernanceMeetingCursor(
								cursorScope,
								governanceMeetingCursorKey(last),
							)
						: null,
			} satisfies GovernanceMeetingListPage);
		},
		async scheduleGovernanceMeeting(input) {
			const id = governanceMeetingIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: GovernanceMeeting = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				governanceBodyId: input.governanceBodyId,
				procedureType: input.procedureType,
				status: "scheduled",
				title: input.title,
				scheduledStartAt: input.scheduledStartAt,
				scheduledEndAt: input.scheduledEndAt,
				noticePeriodDays: input.noticePeriodDays,
				locationSummary: input.locationSummary,
				remoteAccessSummary: input.remoteAccessSummary,
				sourceDocumentId: input.sourceDocumentId,
				openedAt: null,
				adjournedAt: null,
				adjournedTo: null,
				closedAt: null,
				noQuorumReason: null,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			meetings.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async changeMeetingStatus(input) {
			const current = meetings.get(
				key(input.organizationId, input.governanceMeetingId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: GovernanceMeeting = {
				...current,
				status: input.status,
				openedAt: input.openedAt ?? current.openedAt,
				adjournedAt: input.adjournedAt ?? current.adjournedAt,
				adjournedTo: input.adjournedTo ?? current.adjournedTo,
				closedAt: input.closedAt ?? current.closedAt,
				noQuorumReason: input.noQuorumReason ?? current.noQuorumReason,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			meetings.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async getMeetingNotice(input) {
			return errorResult.ok(
				cloneNullable(
					notices.get(key(input.organizationId, input.meetingNoticeId)),
				),
			);
		},
		async listMeetingNotices(input) {
			return errorResult.ok(
				[...notices.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.governanceMeetingId === input.governanceMeetingId,
					)
					.sort(
						(left, right) => left.issuedAt.getTime() - right.issuedAt.getTime(),
					)
					.map(clone),
			);
		},
		async issueMeetingNotice(input) {
			const id = meetingNoticeIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: MeetingNotice = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				governanceMeetingId: input.governanceMeetingId,
				recipientMembershipId: input.recipientMembershipId,
				recipientPartyId: input.recipientPartyId,
				status: "issued",
				issuedAt: input.issuedAt,
				deliveredAt: null,
				waivedAt: null,
				deliveryMethod: input.deliveryMethod,
				waiverReason: null,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			notices.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async recordNoticeDelivery(input) {
			const current = notices.get(
				key(input.organizationId, input.meetingNoticeId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: MeetingNotice = {
				...current,
				status: "delivered",
				deliveredAt: input.deliveredAt,
				waivedAt: null,
				waiverReason: null,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			notices.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async waiveNotice(input) {
			const current = notices.get(
				key(input.organizationId, input.meetingNoticeId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: MeetingNotice = {
				...current,
				status: "waived",
				deliveredAt: null,
				waivedAt: input.waivedAt,
				waiverReason: input.waiverReason,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			notices.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async listMeetingParticipants(input) {
			return errorResult.ok(
				[...participants.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.governanceMeetingId === input.governanceMeetingId,
					)
					.sort(
						(left, right) =>
							left.createdAt.getTime() - right.createdAt.getTime(),
					)
					.map(clone),
			);
		},
		async recordMeetingParticipant(input) {
			const existing = [...participants.values()].find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.governanceMeetingId === input.governanceMeetingId &&
					row.governanceMembershipId === input.governanceMembershipId,
			);
			const now = new Date(input.recordedAt);
			if (existing !== undefined) {
				const updated: MeetingParticipant = {
					...existing,
					participantPartyId: input.participantPartyId,
					attendanceStatus: input.attendanceStatus,
					representedByPartyId: input.representedByPartyId,
					proxyDocumentId: input.proxyDocumentId,
					recusalReason: input.recusalReason,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: existing.version + 1,
					updatedAt: now,
				};
				participants.set(key(input.organizationId, updated.id), updated);
				return errorResult.ok(clone(updated));
			}
			const id = meetingParticipantIdSchema.parse(randomUUID());
			const row: MeetingParticipant = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				governanceMeetingId: input.governanceMeetingId,
				governanceMembershipId: input.governanceMembershipId,
				participantPartyId: input.participantPartyId,
				attendanceStatus: input.attendanceStatus,
				representedByPartyId: input.representedByPartyId,
				proxyDocumentId: input.proxyDocumentId,
				recusalReason: input.recusalReason,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			participants.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async getLatestQuorumResult(input) {
			const rows = [...quorumResults.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.governanceMeetingId === input.governanceMeetingId,
				)
				.sort(
					(left, right) =>
						right.recordedAt.getTime() - left.recordedAt.getTime(),
				);
			return errorResult.ok(cloneNullable(rows[0]));
		},
		async recordQuorum(input) {
			const id = meetingQuorumResultIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: MeetingQuorumResult = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				governanceMeetingId: input.governanceMeetingId,
				ruleSnapshot: input.ruleSnapshot,
				eligibleMemberCount: input.eligibleMemberCount,
				presentMemberCount: input.presentMemberCount,
				requiredPresentCount: input.requiredPresentCount,
				hasQuorum: input.hasQuorum,
				noQuorumReason: input.noQuorumReason,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			quorumResults.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
	};
}

function compareGovernanceMeetings(
	left: GovernanceMeeting,
	right: GovernanceMeeting,
): number {
	return (
		left.scheduledStartAt.getTime() - right.scheduledStartAt.getTime() ||
		left.id.localeCompare(right.id)
	);
}

function governanceMeetingCursorKey(
	meeting: GovernanceMeeting,
): GovernanceMeetingCursorKey {
	return [
		canonicalInstantSchema.parse(meeting.scheduledStartAt.toISOString()),
		meeting.id,
	];
}

function compareGovernanceMeetingCursor(
	meeting: GovernanceMeeting,
	cursor: GovernanceMeetingCursorKey,
): number {
	return (
		meeting.scheduledStartAt.toISOString().localeCompare(cursor[0]) ||
		meeting.id.localeCompare(cursor[1])
	);
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
