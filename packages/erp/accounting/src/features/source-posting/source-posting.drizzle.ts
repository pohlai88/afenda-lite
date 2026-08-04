import { randomUUID } from "node:crypto";

import { database as afendaDatabase } from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";
import { z } from "zod";

import type {
	Journal,
	PostingException,
	PostingExceptionStatus,
	PostingProfile,
	SourcePostingLink,
	SourcePostingTrace,
} from "../../kernel/contracts/domain";
import type { AccountingSourcePostingStore } from "./source-posting.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

const postingProfileLineSqlSchema = z.object({
	id: z.string().uuid(),
	lineNo: z.number().int().positive(),
	side: z.enum(["debit", "credit"]),
	accountRole: z.string().min(1),
});

interface SourcePostingLinkSqlRow {
	causation_id: string | null;
	created_at: Date;
	created_by: string;
	id: string;
	journal_id: string;
	organization_id: string;
	posting_rule_id: string;
	posting_rule_version: number;
	source_aggregate_id: string;
	source_event_id: string;
	source_event_version: number;
	source_module: string;
}

interface PostingExceptionSqlRow {
	created_at: Date;
	created_by: string;
	id: string;
	message: string;
	organization_id: string;
	payload: unknown;
	posting_rule_code: string;
	reason_code: string;
	resolution_note: string | null;
	resolved_at: Date | null;
	resolved_by: string | null;
	source_aggregate_id: string;
	source_event_id: string;
	source_event_version: number;
	source_module: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function exceptionStatus(value: string): PostingExceptionStatus {
	switch (value) {
		case "open":
		case "resolved":
		case "retrying":
			return value;
		default:
			throw new Error(`Invalid financial_posting_exception.status: ${value}`);
	}
}

function mapSourcePostingLinkSql(
	row: SourcePostingLinkSqlRow,
): SourcePostingLink {
	return {
		id: row.id,
		organizationId: row.organization_id,
		sourceModule: row.source_module,
		sourceAggregateId: row.source_aggregate_id,
		sourceEventId: row.source_event_id,
		sourceEventVersion: row.source_event_version,
		postingRuleId: row.posting_rule_id,
		postingRuleVersion: row.posting_rule_version,
		journalId: row.journal_id,
		causationId: row.causation_id,
		createdBy: row.created_by,
		createdAt: row.created_at,
	};
}

function mapPostingExceptionSql(row: PostingExceptionSqlRow): PostingException {
	return {
		id: row.id,
		organizationId: row.organization_id,
		sourceModule: row.source_module,
		sourceAggregateId: row.source_aggregate_id,
		sourceEventId: row.source_event_id,
		sourceEventVersion: row.source_event_version,
		postingRuleCode: row.posting_rule_code,
		reasonCode: row.reason_code,
		message: row.message,
		status: exceptionStatus(row.status),
		resolutionNote: row.resolution_note,
		resolvedBy: row.resolved_by,
		resolvedAt: row.resolved_at,
		payload: row.payload,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export interface DrizzleSourcePostingDeps {
	/** Narrow journals capability: load a journal with lines and postings. */
	getJournalById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Journal | null>>;
}

export function createDrizzleSourcePostingMethods(
	deps: DrizzleSourcePostingDeps,
): AccountingSourcePostingStore {
	return {
		async upsertPostingProfile(
			record: Parameters<
				AccountingSourcePostingStore["upsertPostingProfile"]
			>[0],
		): Promise<Result<PostingProfile>> {
			const id = randomUUID();
			const lineRows = record.lines.map((line) => ({
				id: randomUUID(),
				lineNo: line.lineNo,
				side: line.side,
				accountRole: line.accountRole,
			}));
			try {
				const [profileRows] = await afendaDatabase.transaction((sql) => {
					const statements = [
						sql`
							INSERT INTO posting_profile (
								id, organization_id, code, event_type, version_number,
								status, version, created_by, updated_by
							)
							VALUES (
								${id}, ${record.organizationId}, ${record.code},
								${record.eventType}, ${record.versionNumber}, 'active', 1,
								${record.actorUserId}, ${record.actorUserId}
							)
							ON CONFLICT (organization_id, code, version_number) DO UPDATE
							SET event_type = EXCLUDED.event_type, status = 'active',
								version = posting_profile.version + 1,
								updated_by = EXCLUDED.updated_by, updated_at = now()
							RETURNING id, version
						`,
						sql`
					DELETE FROM posting_profile_line
					WHERE posting_profile_line.organization_id = ${record.organizationId}
							AND posting_profile_id IN (
								SELECT id FROM posting_profile
								WHERE posting_profile.organization_id = ${record.organizationId}
									AND code = ${record.code}
									AND version_number = ${record.versionNumber}
							)
					`,
					];
					for (const line of lineRows) {
						statements.push(sql`
							INSERT INTO posting_profile_line (
								id, organization_id, posting_profile_id, line_no, side,
								account_role, version, created_by, updated_by
							)
							SELECT ${line.id}, ${record.organizationId}, pp.id,
								${line.lineNo}, ${line.side}, ${line.accountRole}, 1,
								${record.actorUserId}, ${record.actorUserId}
							FROM posting_profile pp
							WHERE pp.organization_id = ${record.organizationId}
								AND pp.code = ${record.code}
								AND pp.version_number = ${record.versionNumber}
						`);
					}
					return statements;
				});
				const [profile] = profileRows;
				if (profile === undefined) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				const now = new Date();
				return errorResult.ok({
					id: profile.id,
					organizationId: record.organizationId,
					code: record.code,
					eventType: record.eventType,
					versionNumber: record.versionNumber,
					status: "active",
					version: profile.version,
					lines: lineRows,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					createdAt: now,
					updatedAt: now,
				});
			} catch (error) {
				return failFromPersistence(error, "Failed to upsert posting profile");
			}
		},

		async getActivePostingProfile(
			organizationId: string,
			code: string,
		): Promise<Result<PostingProfile | null>> {
			try {
				const [rows] = await afendaDatabase.transaction(
					(sql) => [
						sql`
					SELECT pp.*, json_agg(json_build_object(
						'id', ppl.id, 'lineNo', ppl.line_no,
						'side', ppl.side, 'accountRole', ppl.account_role
					) ORDER BY ppl.line_no) FILTER (WHERE ppl.id IS NOT NULL) AS lines
					FROM posting_profile pp
					LEFT JOIN posting_profile_line ppl ON ppl.posting_profile_id = pp.id
						AND ppl.organization_id = ${organizationId}
					WHERE pp.organization_id = ${organizationId}
							AND pp.code = ${code} AND pp.status = 'active'
						GROUP BY pp.id
						ORDER BY pp.version_number DESC
						LIMIT 1
					`,
					],
					{ readOnly: true },
				);
				const [r] = rows;
				if (r === undefined) {
					return errorResult.ok(null);
				}
				const parsedLines = z
					.array(postingProfileLineSqlSchema)
					.safeParse(r.lines ?? []);
				if (!parsedLines.success) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				return errorResult.ok({
					id: r.id,
					organizationId: r.organization_id,
					code: r.code,
					eventType: r.event_type,
					versionNumber: r.version_number,
					status: r.status === "inactive" ? "inactive" : "active",
					version: r.version,
					lines: parsedLines.data,
					createdBy: r.created_by,
					updatedBy: r.updated_by,
					createdAt: r.created_at,
					updatedAt: r.updated_at,
				});
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to get active posting profile",
				);
			}
		},

		async findSourcePostingLink(
			record: Parameters<
				AccountingSourcePostingStore["findSourcePostingLink"]
			>[0],
		): Promise<Result<SourcePostingLink | null>> {
			try {
				const [rows] = await afendaDatabase.transaction(
					(sql) => [
						sql`
						SELECT * FROM source_posting_link
						WHERE organization_id = ${record.organizationId}
							AND source_module = ${record.sourceModule}
							AND source_aggregate_id = ${record.sourceAggregateId}
							AND source_event_id = ${record.sourceEventId}
							AND source_event_version = ${record.sourceEventVersion}
							AND posting_rule_version = ${record.postingRuleVersion}
						LIMIT 1
					`,
					],
					{ readOnly: true },
				);
				const [row] = rows;
				return errorResult.ok(
					row === undefined ? null : mapSourcePostingLinkSql(row),
				);
			} catch (error) {
				return failFromPersistence(error, "Failed to find source posting link");
			}
		},

		async createSourcePostingLink(
			record: Parameters<
				AccountingSourcePostingStore["createSourcePostingLink"]
			>[0],
		): Promise<Result<SourcePostingLink>> {
			const id = randomUUID();
			try {
				await afendaDatabase.transaction((sql) => [
					sql`
						INSERT INTO source_posting_link (
							id, organization_id, source_module, source_aggregate_id,
							source_event_id, source_event_version, posting_rule_id,
							posting_rule_version, journal_id, causation_id, created_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.sourceModule},
							${record.sourceAggregateId}, ${record.sourceEventId},
							${record.sourceEventVersion}, ${record.postingRuleId},
							${record.postingRuleVersion}, ${record.journalId},
							${record.causationId}, ${record.actorUserId}
						) RETURNING id
					`,
				]);
				return errorResult.ok({
					id,
					organizationId: record.organizationId,
					sourceModule: record.sourceModule,
					sourceAggregateId: record.sourceAggregateId,
					sourceEventId: record.sourceEventId,
					sourceEventVersion: record.sourceEventVersion,
					postingRuleId: record.postingRuleId,
					postingRuleVersion: record.postingRuleVersion,
					journalId: record.journalId,
					causationId: record.causationId,
					createdBy: record.actorUserId,
					createdAt: new Date(),
				});
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to create source posting link",
				);
			}
		},

		async createPostingException(
			record: Parameters<
				AccountingSourcePostingStore["createPostingException"]
			>[0],
		): Promise<Result<PostingException>> {
			const id = randomUUID();
			try {
				await afendaDatabase.transaction((sql) => [
					sql`
						INSERT INTO financial_posting_exception (
							id, organization_id, source_module, source_aggregate_id,
							source_event_id, source_event_version, posting_rule_code,
							reason_code, message, status, payload, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.sourceModule},
							${record.sourceAggregateId}, ${record.sourceEventId},
							${record.sourceEventVersion}, ${record.postingRuleCode},
							${record.reasonCode}, ${record.message}, 'open',
							${JSON.stringify(record.payload)}::jsonb, 1,
							${record.actorUserId}, ${record.actorUserId}
						) RETURNING id
					`,
				]);
				const now = new Date();
				return errorResult.ok({
					id,
					organizationId: record.organizationId,
					sourceModule: record.sourceModule,
					sourceAggregateId: record.sourceAggregateId,
					sourceEventId: record.sourceEventId,
					sourceEventVersion: record.sourceEventVersion,
					postingRuleCode: record.postingRuleCode,
					reasonCode: record.reasonCode,
					message: record.message,
					status: "open" as const,
					resolutionNote: null,
					resolvedBy: null,
					resolvedAt: null,
					payload: record.payload,
					version: 1,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					createdAt: now,
					updatedAt: now,
				});
			} catch (error) {
				return failFromPersistence(error, "Failed to create posting exception");
			}
		},

		async listPostingExceptions(
			filter: Parameters<
				AccountingSourcePostingStore["listPostingExceptions"]
			>[0],
		): Promise<Result<PostingException[]>> {
			try {
				const [rows] = await afendaDatabase.transaction(
					(sql) => [
						sql`
						SELECT * FROM financial_posting_exception
						WHERE organization_id = ${filter.organizationId}
							AND (${filter.status ?? null}::text IS NULL
								OR status = ${filter.status ?? null}::text)
						ORDER BY created_at DESC
					`,
					],
					{ readOnly: true },
				);
				return errorResult.ok(
					rows.map((r: PostingExceptionSqlRow) => mapPostingExceptionSql(r)),
				);
			} catch (error) {
				return failFromPersistence(error, "Failed to list posting exceptions");
			}
		},

		async resolvePostingException(
			record: Parameters<
				AccountingSourcePostingStore["resolvePostingException"]
			>[0],
		): Promise<Result<PostingException>> {
			try {
				const [rows] = await afendaDatabase.transaction((sql) => [
					sql`
						UPDATE financial_posting_exception
						SET status = 'resolved', resolution_note = ${record.resolutionNote},
							resolved_by = ${record.actorUserId}, resolved_at = now(),
							version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.id} AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion} AND status != 'resolved'
						RETURNING *
					`,
				]);
				const [r] = rows;
				if (r === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Exception resolve conflict",
					});
				}
				return errorResult.ok(mapPostingExceptionSql(r));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to resolve posting exception",
				);
			}
		},

		async getSourcePostingTrace(
			filter: Parameters<
				AccountingSourcePostingStore["getSourcePostingTrace"]
			>[0],
		): Promise<Result<SourcePostingTrace[]>> {
			try {
				const [rows] = await afendaDatabase.transaction(
					(sql) => [
						sql`
						SELECT * FROM source_posting_link
						WHERE organization_id = ${filter.organizationId}
							AND (${filter.journalId ?? null}::uuid IS NULL
								OR journal_id = ${filter.journalId ?? null}::uuid)
							AND (${filter.sourceModule ?? null}::text IS NULL
								OR source_module = ${filter.sourceModule ?? null}::text)
							AND (${filter.sourceAggregateId ?? null}::text IS NULL
								OR source_aggregate_id = ${filter.sourceAggregateId ?? null}::text)
							AND (${filter.sourceEventId ?? null}::text IS NULL
								OR source_event_id = ${filter.sourceEventId ?? null}::text)
					`,
					],
					{ readOnly: true },
				);
				const loadedTraces = await Promise.all(
					rows.map(
						async (
							r: SourcePostingLinkSqlRow,
						): Promise<SourcePostingTrace | null> => {
							const link = mapSourcePostingLinkSql(r);
							const journalResult = await deps.getJournalById(
								filter.organizationId,
								link.journalId,
							);
							if (journalResult.ok && journalResult.data) {
								return { link, journal: journalResult.data };
							}
							return null;
						},
					),
				);
				const traces = loadedTraces.filter(
					(trace): trace is SourcePostingTrace => trace !== null,
				);
				return errorResult.ok(traces);
			} catch (error) {
				return failFromPersistence(error, "Failed to get source posting trace");
			}
		},
	};
}
