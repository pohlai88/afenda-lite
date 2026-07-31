// biome-ignore-all lint/suspicious/useAwait: Drizzle meeting wrappers expose uniform asynchronous store contracts.
import {
	and,
	asc,
	caGovernanceMeeting,
	caMeetingNotice,
	caMeetingParticipant,
	caMeetingQuorumResult,
	desc,
	eq,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	governanceBodyIdSchema,
	governanceMeetingIdSchema,
	governanceMembershipIdSchema,
	legalCompanyIdSchema,
	meetingNoticeIdSchema,
	meetingParticipantIdSchema,
	meetingQuorumResultIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import type { MeetingStore } from "../../meetings/store";
import type {
	GovernanceMeeting,
	GovernanceMeetingProcedureType,
	GovernanceMeetingStatus,
	MeetingNotice,
	MeetingNoticeStatus,
	MeetingParticipant,
	MeetingParticipantAttendanceStatus,
	MeetingQuorumResult,
	QuorumRuleSnapshot,
} from "../../meetings/types";
import type { CorporateAdministrationDrizzleDatabase } from "./dependencies";
import { translateCorporateAdministrationInfrastructureError } from "./errors";

export type CorporateAdministrationDrizzleMeetingDependencies = Readonly<{
	database: CorporateAdministrationDrizzleDatabase;
	createId: () => string;
}>;

export function createDrizzleCorporateAdministrationMeetingStore(
	dependencies: CorporateAdministrationDrizzleMeetingDependencies,
): MeetingStore {
	return new DrizzleCorporateAdministrationMeetingStore(dependencies);
}

class DrizzleCorporateAdministrationMeetingStore implements MeetingStore {
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createId: () => string;

	constructor(dependencies: CorporateAdministrationDrizzleMeetingDependencies) {
		this.#database = dependencies.database;
		this.#createId = dependencies.createId;
	}

	async getGovernanceMeeting(
		input: Parameters<MeetingStore["getGovernanceMeeting"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caGovernanceMeeting)
				.where(
					and(
						eq(caGovernanceMeeting.organizationId, input.organizationId),
						eq(caGovernanceMeeting.id, input.governanceMeetingId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapMeeting(rows[0]);
		});
	}

	async listGovernanceMeetings(
		input: Parameters<MeetingStore["listGovernanceMeetings"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caGovernanceMeeting)
				.where(
					and(
						eq(caGovernanceMeeting.organizationId, input.organizationId),
						eq(caGovernanceMeeting.legalCompanyId, input.legalCompanyId),
					),
				)
				.orderBy(asc(caGovernanceMeeting.scheduledStartAt));
			return rows
				.map(mapMeeting)
				.filter(
					(row) =>
						(input.governanceBodyId === undefined ||
							row.governanceBodyId === input.governanceBodyId) &&
						(input.status === undefined || row.status === input.status),
				);
		});
	}

	async scheduleGovernanceMeeting(
		input: Parameters<MeetingStore["scheduleGovernanceMeeting"]>[0],
	) {
		const id = governanceMeetingIdSchema.parse(this.#createId());
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
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_governance_meeting (id, organization_id, legal_company_id, governance_body_id, procedure_type, status, title, scheduled_start_at, scheduled_end_at, notice_period_days, location_summary, remote_access_summary, source_document_id, opened_at, adjourned_at, adjourned_to, closed_at, no_quorum_reason, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.governanceBodyId}, ${input.procedureType}, 'scheduled', ${input.title}, ${input.scheduledStartAt}, ${input.scheduledEndAt}, ${input.noticePeriodDays}, ${input.locationSummary}, ${input.remoteAccessSummary}, ${input.sourceDocumentId}, NULL, NULL, NULL, NULL, NULL, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caGovernanceMeeting).values({
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
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			return row;
		});
	}

	async changeMeetingStatus(
		input: Parameters<MeetingStore["changeMeetingStatus"]>[0],
	) {
		const current = await this.getGovernanceMeeting(input);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound();
		}
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const now = new Date(input.recordedAt);
		const updated: GovernanceMeeting = {
			...current.data,
			status: input.status,
			openedAt: input.openedAt ?? current.data.openedAt,
			adjournedAt: input.adjournedAt ?? current.data.adjournedAt,
			adjournedTo: input.adjournedTo ?? current.data.adjournedTo,
			closedAt: input.closedAt ?? current.data.closedAt,
			noQuorumReason: input.noQuorumReason ?? current.data.noQuorumReason,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_governance_meeting SET status = ${input.status}, opened_at = ${updated.openedAt}, adjourned_at = ${updated.adjournedAt}, adjourned_to = ${updated.adjournedTo}, closed_at = ${updated.closedAt}, no_quorum_reason = ${updated.noQuorumReason}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.governanceMeetingId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caGovernanceMeeting)
				.set({
					status: input.status,
					openedAt: updated.openedAt,
					adjournedAt: updated.adjournedAt,
					adjournedTo: updated.adjournedTo,
					closedAt: updated.closedAt,
					noQuorumReason: updated.noQuorumReason,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caGovernanceMeeting.organizationId, input.organizationId),
						eq(caGovernanceMeeting.id, input.governanceMeetingId),
						eq(caGovernanceMeeting.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async getMeetingNotice(
		input: Parameters<MeetingStore["getMeetingNotice"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caMeetingNotice)
				.where(
					and(
						eq(caMeetingNotice.organizationId, input.organizationId),
						eq(caMeetingNotice.id, input.meetingNoticeId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapNotice(rows[0]);
		});
	}

	async listMeetingNotices(
		input: Parameters<MeetingStore["listMeetingNotices"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caMeetingNotice)
				.where(
					and(
						eq(caMeetingNotice.organizationId, input.organizationId),
						eq(caMeetingNotice.governanceMeetingId, input.governanceMeetingId),
					),
				)
				.orderBy(asc(caMeetingNotice.issuedAt));
			return rows.map(mapNotice);
		});
	}

	async issueMeetingNotice(
		input: Parameters<MeetingStore["issueMeetingNotice"]>[0],
	) {
		const id = meetingNoticeIdSchema.parse(this.#createId());
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
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_meeting_notice (id, organization_id, legal_company_id, governance_meeting_id, recipient_membership_id, recipient_party_id, status, issued_at, delivered_at, waived_at, delivery_method, waiver_reason, source_document_id, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.governanceMeetingId}, ${input.recipientMembershipId}, ${input.recipientPartyId}, 'issued', ${input.issuedAt}, NULL, NULL, ${input.deliveryMethod}, NULL, ${input.sourceDocumentId}, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caMeetingNotice).values(row);
			return row;
		});
	}

	async recordNoticeDelivery(
		input: Parameters<MeetingStore["recordNoticeDelivery"]>[0],
	) {
		const current = await this.getMeetingNotice(input);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound();
		}
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const updated = updateNotice(current.data, {
			status: "delivered",
			deliveredAt: input.deliveredAt,
			waivedAt: null,
			waiverReason: null,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedBy,
		});
		return this.#persistNotice(input, updated);
	}

	async waiveNotice(input: Parameters<MeetingStore["waiveNotice"]>[0]) {
		const current = await this.getMeetingNotice(input);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound();
		}
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const updated = updateNotice(current.data, {
			status: "waived",
			deliveredAt: null,
			waivedAt: input.waivedAt,
			waiverReason: input.waiverReason,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedBy,
		});
		return this.#persistNotice(input, updated);
	}

	async #persistNotice(
		input:
			| Parameters<MeetingStore["recordNoticeDelivery"]>[0]
			| Parameters<MeetingStore["waiveNotice"]>[0],
		updated: MeetingNotice,
	) {
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_meeting_notice SET status = ${updated.status}, delivered_at = ${updated.deliveredAt}, waived_at = ${updated.waivedAt}, waiver_reason = ${updated.waiverReason}, source_document_id = ${updated.sourceDocumentId}, recorded_at = ${updated.recordedAt}, recorded_by = ${updated.recordedBy}, version = version + 1, updated_at = ${updated.updatedAt} WHERE organization_id = ${input.organizationId} AND id = ${input.meetingNoticeId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caMeetingNotice)
				.set({
					status: updated.status,
					deliveredAt: updated.deliveredAt,
					waivedAt: updated.waivedAt,
					waiverReason: updated.waiverReason,
					sourceDocumentId: updated.sourceDocumentId,
					recordedAt: updated.recordedAt,
					recordedBy: updated.recordedBy,
					version: updated.version,
					updatedAt: updated.updatedAt,
				})
				.where(
					and(
						eq(caMeetingNotice.organizationId, input.organizationId),
						eq(caMeetingNotice.id, input.meetingNoticeId),
						eq(caMeetingNotice.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async listMeetingParticipants(
		input: Parameters<MeetingStore["listMeetingParticipants"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caMeetingParticipant)
				.where(
					and(
						eq(caMeetingParticipant.organizationId, input.organizationId),
						eq(
							caMeetingParticipant.governanceMeetingId,
							input.governanceMeetingId,
						),
					),
				)
				.orderBy(asc(caMeetingParticipant.createdAt));
			return rows.map(mapParticipant);
		});
	}

	async recordMeetingParticipant(
		input: Parameters<MeetingStore["recordMeetingParticipant"]>[0],
	) {
		const id = meetingParticipantIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
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
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_meeting_participant (id, organization_id, legal_company_id, governance_meeting_id, governance_membership_id, participant_party_id, attendance_status, represented_by_party_id, proxy_document_id, recusal_reason, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.governanceMeetingId}, ${input.governanceMembershipId}, ${input.participantPartyId}, ${input.attendanceStatus}, ${input.representedByPartyId}, ${input.proxyDocumentId}, ${input.recusalReason}, ${now}, ${input.recordedBy}, 1, ${now}, ${now}) ON CONFLICT (organization_id, governance_meeting_id, governance_membership_id) DO UPDATE SET participant_party_id = EXCLUDED.participant_party_id, attendance_status = EXCLUDED.attendance_status, represented_by_party_id = EXCLUDED.represented_by_party_id, proxy_document_id = EXCLUDED.proxy_document_id, recusal_reason = EXCLUDED.recusal_reason, recorded_at = EXCLUDED.recorded_at, recorded_by = EXCLUDED.recorded_by, version = ca_meeting_participant.version + 1, updated_at = EXCLUDED.updated_at`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caMeetingParticipant).values(row);
			return row;
		});
	}

	async getLatestQuorumResult(
		input: Parameters<MeetingStore["getLatestQuorumResult"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caMeetingQuorumResult)
				.where(
					and(
						eq(caMeetingQuorumResult.organizationId, input.organizationId),
						eq(
							caMeetingQuorumResult.governanceMeetingId,
							input.governanceMeetingId,
						),
					),
				)
				.orderBy(desc(caMeetingQuorumResult.recordedAt))
				.limit(1);
			return rows[0] === undefined ? null : mapQuorum(rows[0]);
		});
	}

	async recordQuorum(input: Parameters<MeetingStore["recordQuorum"]>[0]) {
		const id = meetingQuorumResultIdSchema.parse(this.#createId());
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
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_meeting_quorum_result (id, organization_id, legal_company_id, governance_meeting_id, rule_snapshot, eligible_member_count, present_member_count, required_present_count, has_quorum, no_quorum_reason, source_document_id, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.governanceMeetingId}, ${JSON.stringify(input.ruleSnapshot)}, ${input.eligibleMemberCount}, ${input.presentMemberCount}, ${input.requiredPresentCount}, ${input.hasQuorum}, ${input.noQuorumReason}, ${input.sourceDocumentId}, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caMeetingQuorumResult).values({
				...row,
				ruleSnapshot: row.ruleSnapshot,
			});
			return row;
		});
	}

	async #read<T>(work: () => Promise<T>): Promise<Result<T>> {
		try {
			return errorResult.ok(await work());
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) {
				return translated;
			}
			throw error;
		}
	}

	async #write<T>(work: () => Promise<T>): Promise<Result<T>> {
		return this.#read(work);
	}
}

function updateNotice(
	current: MeetingNotice,
	patch: Pick<
		MeetingNotice,
		| "status"
		| "deliveredAt"
		| "waivedAt"
		| "waiverReason"
		| "sourceDocumentId"
		| "recordedAt"
		| "recordedBy"
	>,
): MeetingNotice {
	return {
		...current,
		...patch,
		version: current.version + 1,
		updatedAt: patch.recordedAt,
	};
}

function mapMeeting(
	row: typeof caGovernanceMeeting.$inferSelect,
): GovernanceMeeting {
	return {
		id: governanceMeetingIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		governanceBodyId: governanceBodyIdSchema.parse(row.governanceBodyId),
		procedureType: parseProcedureType(row.procedureType),
		status: parseMeetingStatus(row.status),
		title: row.title,
		scheduledStartAt: row.scheduledStartAt,
		scheduledEndAt: row.scheduledEndAt,
		noticePeriodDays: row.noticePeriodDays,
		locationSummary: row.locationSummary,
		remoteAccessSummary: row.remoteAccessSummary,
		sourceDocumentId: row.sourceDocumentId,
		openedAt: row.openedAt,
		adjournedAt: row.adjournedAt,
		adjournedTo: row.adjournedTo,
		closedAt: row.closedAt,
		noQuorumReason: row.noQuorumReason,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapNotice(row: typeof caMeetingNotice.$inferSelect): MeetingNotice {
	return {
		id: meetingNoticeIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		governanceMeetingId: governanceMeetingIdSchema.parse(
			row.governanceMeetingId,
		),
		recipientMembershipId:
			row.recipientMembershipId === null
				? null
				: governanceMembershipIdSchema.parse(row.recipientMembershipId),
		recipientPartyId: row.recipientPartyId,
		status: parseNoticeStatus(row.status),
		issuedAt: row.issuedAt,
		deliveredAt: row.deliveredAt,
		waivedAt: row.waivedAt,
		deliveryMethod: row.deliveryMethod,
		waiverReason: row.waiverReason,
		sourceDocumentId: row.sourceDocumentId,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapParticipant(
	row: typeof caMeetingParticipant.$inferSelect,
): MeetingParticipant {
	return {
		id: meetingParticipantIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		governanceMeetingId: governanceMeetingIdSchema.parse(
			row.governanceMeetingId,
		),
		governanceMembershipId: governanceMembershipIdSchema.parse(
			row.governanceMembershipId,
		),
		participantPartyId: row.participantPartyId,
		attendanceStatus: parseAttendanceStatus(row.attendanceStatus),
		representedByPartyId: row.representedByPartyId,
		proxyDocumentId: row.proxyDocumentId,
		recusalReason: row.recusalReason,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapQuorum(
	row: typeof caMeetingQuorumResult.$inferSelect,
): MeetingQuorumResult {
	return {
		id: meetingQuorumResultIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		governanceMeetingId: governanceMeetingIdSchema.parse(
			row.governanceMeetingId,
		),
		ruleSnapshot: row.ruleSnapshot as QuorumRuleSnapshot,
		eligibleMemberCount: row.eligibleMemberCount,
		presentMemberCount: row.presentMemberCount,
		requiredPresentCount: row.requiredPresentCount,
		hasQuorum: row.hasQuorum,
		noQuorumReason: row.noQuorumReason,
		sourceDocumentId: row.sourceDocumentId,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function parseProcedureType(value: string): GovernanceMeetingProcedureType {
	return value === "virtual" ||
		value === "hybrid" ||
		value === "written_resolution"
		? value
		: "physical";
}

function parseMeetingStatus(value: string): GovernanceMeetingStatus {
	return value === "open" ||
		value === "adjourned" ||
		value === "closed" ||
		value === "cancelled"
		? value
		: "scheduled";
}

function parseNoticeStatus(value: string): MeetingNoticeStatus {
	return value === "delivered" || value === "waived" ? value : "issued";
}

function parseAttendanceStatus(
	value: string,
): MeetingParticipantAttendanceStatus {
	return value === "absent" || value === "represented" || value === "recused"
		? value
		: "present";
}

function asSql(
	database: unknown,
): (strings: TemplateStringsArray, ...values: unknown[]) => unknown {
	return database as (
		strings: TemplateStringsArray,
		...values: unknown[]
	) => unknown;
}

function notFound(): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}
