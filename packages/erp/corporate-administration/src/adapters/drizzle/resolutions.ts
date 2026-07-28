import {
	and,
	asc,
	caMeetingVote,
	caResolution,
	caResolutionAction,
	eq,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../../error-codes";
import {
	governanceMeetingIdSchema,
	legalCompanyIdSchema,
	meetingVoteIdSchema,
	organizationIdSchema,
	resolutionActionIdSchema,
	resolutionIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import { canonicalDateSchema } from "../../kernel/dates";
import {
	isResolutionActionOverdue,
	resolutionMatchesAsOf,
} from "../../resolutions/rules";
import type { ResolutionStore } from "../../resolutions/store";
import type {
	MeetingVote,
	Resolution,
	ResolutionAction,
	ResolutionActionStatus,
	ResolutionApprovalBasis,
	ResolutionStatus,
	VoteOutcome,
	VoteThresholdType,
} from "../../resolutions/types";
import type { CorporateAdministrationDrizzleDatabase } from "./dependencies";
import { translateCorporateAdministrationInfrastructureError } from "./errors";

export type CorporateAdministrationDrizzleResolutionDependencies = Readonly<{
	database: CorporateAdministrationDrizzleDatabase;
	createId: () => string;
}>;

export function createDrizzleCorporateAdministrationResolutionStore(
	dependencies: CorporateAdministrationDrizzleResolutionDependencies,
): ResolutionStore {
	return new DrizzleCorporateAdministrationResolutionStore(dependencies);
}

class DrizzleCorporateAdministrationResolutionStore implements ResolutionStore {
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createId: () => string;

	constructor(
		dependencies: CorporateAdministrationDrizzleResolutionDependencies,
	) {
		this.#database = dependencies.database;
		this.#createId = dependencies.createId;
	}

	async getMeetingVote(
		input: Parameters<ResolutionStore["getMeetingVote"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caMeetingVote)
				.where(
					and(
						eq(caMeetingVote.organizationId, input.organizationId),
						eq(caMeetingVote.id, input.meetingVoteId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapVote(rows[0]);
		});
	}

	async recordMeetingVote(
		input: Parameters<ResolutionStore["recordMeetingVote"]>[0],
	) {
		const id = meetingVoteIdSchema.parse(this.#createId());
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
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_meeting_vote (id, organization_id, legal_company_id, governance_meeting_id, motion_code, eligible_votes, votes_for, votes_against, abstentions, threshold_type, required_for, outcome, outcome_basis, source_document_id, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.governanceMeetingId}, ${input.motionCode}, ${input.eligibleVotes}, ${input.votesFor}, ${input.votesAgainst}, ${input.abstentions}, ${input.thresholdType}, ${input.requiredFor}, ${input.outcome}, ${input.outcomeBasis}, ${input.sourceDocumentId}, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caMeetingVote).values(row);
			return row;
		});
	}

	async getResolution(input: Parameters<ResolutionStore["getResolution"]>[0]) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caResolution)
				.where(
					and(
						eq(caResolution.organizationId, input.organizationId),
						eq(caResolution.id, input.resolutionId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapResolution(rows[0]);
		});
	}

	async listResolutionsAsOf(
		input: Parameters<ResolutionStore["listResolutionsAsOf"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caResolution)
				.where(
					and(
						eq(caResolution.organizationId, input.organizationId),
						eq(caResolution.legalCompanyId, input.legalCompanyId),
					),
				)
				.orderBy(asc(caResolution.effectiveFrom));
			return rows.map(mapResolution).filter((row) =>
				resolutionMatchesAsOf({
					resolution: row,
					asOf: input.asOf,
					status: input.status,
				}),
			);
		});
	}

	async recordResolution(
		input: Parameters<ResolutionStore["recordResolution"]>[0],
	) {
		const id = resolutionIdSchema.parse(this.#createId());
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
			minutesDocumentId: null,
			effectiveFrom: input.effectiveFrom,
			approvedAt: input.approvedAt,
			rejectedAt: input.rejectedAt,
			supersededAt: null,
			supersededByResolutionId: null,
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
				return sql`INSERT INTO ca_resolution (id, organization_id, legal_company_id, governance_meeting_id, meeting_vote_id, approval_basis, status, resolution_code, title, text_digest, document_id, minutes_document_id, effective_from, approved_at, rejected_at, superseded_at, superseded_by_resolution_id, source_document_id, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.governanceMeetingId}, ${input.meetingVoteId}, ${input.approvalBasis}, ${input.status}, ${input.resolutionCode}, ${input.title}, ${input.textDigest}, ${input.documentId}, NULL, ${input.effectiveFrom}, ${input.approvedAt}, ${input.rejectedAt}, NULL, NULL, ${input.sourceDocumentId}, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caResolution).values(row);
			return row;
		});
	}

	async supersedeResolution(
		input: Parameters<ResolutionStore["supersedeResolution"]>[0],
	) {
		const current = await this.getResolution(input);
		if (!current.ok) return current;
		if (current.data === null) return notFound();
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const now = new Date(input.recordedAt);
		const updated: Resolution = {
			...current.data,
			status: "superseded",
			supersededAt: now,
			supersededByResolutionId: input.supersededByResolutionId,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_resolution SET status = 'superseded', superseded_at = ${now}, superseded_by_resolution_id = ${input.supersededByResolutionId}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.resolutionId} AND version = ${input.expectedVersion}`;
			});
			return ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caResolution)
				.set({
					status: "superseded",
					supersededAt: now,
					supersededByResolutionId: input.supersededByResolutionId,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caResolution.organizationId, input.organizationId),
						eq(caResolution.id, input.resolutionId),
						eq(caResolution.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async recordMinutesDocument(
		input: Parameters<ResolutionStore["recordMinutesDocument"]>[0],
	) {
		const current = await this.getResolution(input);
		if (!current.ok) return current;
		if (current.data === null) return notFound();
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const now = new Date(input.recordedAt);
		const updated: Resolution = {
			...current.data,
			minutesDocumentId: input.minutesDocumentId,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_resolution SET minutes_document_id = ${input.minutesDocumentId}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.resolutionId} AND version = ${input.expectedVersion}`;
			});
			return ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caResolution)
				.set({
					minutesDocumentId: input.minutesDocumentId,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caResolution.organizationId, input.organizationId),
						eq(caResolution.id, input.resolutionId),
						eq(caResolution.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async getResolutionAction(
		input: Parameters<ResolutionStore["getResolutionAction"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caResolutionAction)
				.where(
					and(
						eq(caResolutionAction.organizationId, input.organizationId),
						eq(caResolutionAction.id, input.resolutionActionId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapAction(rows[0]);
		});
	}

	async listResolutionActions(
		input: Parameters<ResolutionStore["listResolutionActions"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caResolutionAction)
				.where(
					and(
						eq(caResolutionAction.organizationId, input.organizationId),
						eq(caResolutionAction.resolutionId, input.resolutionId),
					),
				)
				.orderBy(asc(caResolutionAction.dueOn));
			return rows.map(mapAction);
		});
	}

	async listOverdueResolutionActions(
		input: Parameters<ResolutionStore["listOverdueResolutionActions"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caResolutionAction)
				.where(
					and(
						eq(caResolutionAction.organizationId, input.organizationId),
						eq(caResolutionAction.legalCompanyId, input.legalCompanyId),
					),
				)
				.orderBy(asc(caResolutionAction.dueOn));
			return rows
				.map(mapAction)
				.filter((row) =>
					isResolutionActionOverdue({ action: row, asOf: input.asOf }),
				);
		});
	}

	async assignResolutionAction(
		input: Parameters<ResolutionStore["assignResolutionAction"]>[0],
	) {
		const id = resolutionActionIdSchema.parse(this.#createId());
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
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_resolution_action (id, organization_id, legal_company_id, resolution_id, action_type_code, assignee_party_id, status, due_on, completed_at, evidence_document_id, completion_notes, source_document_id, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.resolutionId}, ${input.actionTypeCode}, ${input.assigneePartyId}, 'assigned', ${input.dueOn}, NULL, NULL, NULL, ${input.sourceDocumentId}, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caResolutionAction).values(row);
			return row;
		});
	}

	async completeResolutionAction(
		input: Parameters<ResolutionStore["completeResolutionAction"]>[0],
	) {
		const current = await this.getResolutionAction(input);
		if (!current.ok) return current;
		if (current.data === null) return notFound();
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const now = new Date(input.recordedAt);
		const updated: ResolutionAction = {
			...current.data,
			status: "completed",
			completedAt: input.completedAt,
			evidenceDocumentId: input.evidenceDocumentId,
			completionNotes: input.completionNotes,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_resolution_action SET status = 'completed', completed_at = ${input.completedAt}, evidence_document_id = ${input.evidenceDocumentId}, completion_notes = ${input.completionNotes}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.resolutionActionId} AND version = ${input.expectedVersion}`;
			});
			return ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caResolutionAction)
				.set({
					status: "completed",
					completedAt: input.completedAt,
					evidenceDocumentId: input.evidenceDocumentId,
					completionNotes: input.completionNotes,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caResolutionAction.organizationId, input.organizationId),
						eq(caResolutionAction.id, input.resolutionActionId),
						eq(caResolutionAction.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async #read<T>(operation: () => Promise<T>): Promise<Result<T>> {
		try {
			return ok(await operation());
		} catch (error) {
			return (
				translateCorporateAdministrationInfrastructureError(error) ??
				fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration database operation failed.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "database" },
					),
				)
			);
		}
	}

	async #write<T>(operation: () => Promise<T>): Promise<Result<T>> {
		return this.#read(operation);
	}
}

function mapVote(row: typeof caMeetingVote.$inferSelect): MeetingVote {
	return {
		id: meetingVoteIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		governanceMeetingId: governanceMeetingIdSchema.parse(
			row.governanceMeetingId,
		),
		motionCode: row.motionCode,
		eligibleVotes: row.eligibleVotes,
		votesFor: row.votesFor,
		votesAgainst: row.votesAgainst,
		abstentions: row.abstentions,
		thresholdType: parseThresholdType(row.thresholdType),
		requiredFor: row.requiredFor,
		outcome: parseVoteOutcome(row.outcome),
		outcomeBasis: row.outcomeBasis,
		sourceDocumentId: row.sourceDocumentId,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapResolution(row: typeof caResolution.$inferSelect): Resolution {
	return {
		id: resolutionIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		governanceMeetingId:
			row.governanceMeetingId === null
				? null
				: governanceMeetingIdSchema.parse(row.governanceMeetingId),
		meetingVoteId:
			row.meetingVoteId === null
				? null
				: meetingVoteIdSchema.parse(row.meetingVoteId),
		approvalBasis: parseApprovalBasis(row.approvalBasis),
		status: parseResolutionStatus(row.status),
		resolutionCode: row.resolutionCode,
		title: row.title,
		textDigest: row.textDigest,
		documentId: row.documentId,
		minutesDocumentId: row.minutesDocumentId,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		approvedAt: row.approvedAt,
		rejectedAt: row.rejectedAt,
		supersededAt: row.supersededAt,
		supersededByResolutionId:
			row.supersededByResolutionId === null
				? null
				: resolutionIdSchema.parse(row.supersededByResolutionId),
		sourceDocumentId: row.sourceDocumentId,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapAction(
	row: typeof caResolutionAction.$inferSelect,
): ResolutionAction {
	return {
		id: resolutionActionIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		resolutionId: resolutionIdSchema.parse(row.resolutionId),
		actionTypeCode: row.actionTypeCode,
		assigneePartyId: row.assigneePartyId,
		status: parseActionStatus(row.status),
		dueOn: canonicalDateSchema.parse(row.dueOn),
		completedAt: row.completedAt,
		evidenceDocumentId: row.evidenceDocumentId,
		completionNotes: row.completionNotes,
		sourceDocumentId: row.sourceDocumentId,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function parseThresholdType(value: string): VoteThresholdType {
	return value === "supermajority" ||
		value === "unanimous" ||
		value === "custom"
		? value
		: "simple_majority";
}

function parseVoteOutcome(value: string): VoteOutcome {
	return value === "rejected" ? value : "adopted";
}

function parseApprovalBasis(value: string): ResolutionApprovalBasis {
	return value === "written_resolution" ? value : "meeting_vote";
}

function parseResolutionStatus(value: string): ResolutionStatus {
	return value === "rejected" || value === "superseded" ? value : "adopted";
}

function parseActionStatus(value: string): ResolutionActionStatus {
	return value === "completed" || value === "cancelled" ? value : "assigned";
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
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND"),
	);
}

function stale(expectedVersion: number, actualVersion: number): Result<never> {
	return fail(
		"CONFLICT",
		"Corporate Administration record version is stale.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_STALE_VERSION",
			{ expectedVersion, actualVersion },
		),
	);
}
