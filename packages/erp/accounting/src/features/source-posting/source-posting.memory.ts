import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	PostingException,
	PostingProfile,
	PostingProfileLine,
	SourcePostingLink,
	SourcePostingTrace,
} from "../../kernel/contracts/domain";
import { resolveOperation } from "../../kernel/execution/async";
import {
	findJournal,
	type MemoryAccountingState,
} from "../../kernel/memory/state";
import type { AccountingSourcePostingStore } from "./source-posting.store";

export function createMemorySourcePostingMethods(
	state: MemoryAccountingState,
): AccountingSourcePostingStore {
	return {
		upsertPostingProfile(record): Promise<Result<PostingProfile>> {
			return resolveOperation(() => {
				const existing = state.postingProfiles.find(
					(p) =>
						p.organizationId === record.organizationId &&
						p.code === record.code &&
						p.versionNumber === record.versionNumber,
				);
				const now = new Date();
				const profileLines: PostingProfileLine[] = record.lines.map((l) => ({
					id: randomUUID(),
					lineNo: l.lineNo,
					side: l.side,
					accountRole: l.accountRole,
				}));
				if (existing) {
					existing.eventType = record.eventType;
					existing.status = "active";
					existing.lines = profileLines;
					existing.updatedBy = record.actorUserId;
					existing.updatedAt = now;
					existing.version += 1;
					return errorResult.ok(existing);
				}
				const profile: PostingProfile = {
					id: randomUUID(),
					organizationId: record.organizationId,
					code: record.code,
					eventType: record.eventType,
					versionNumber: record.versionNumber,
					status: "active",
					version: 1,
					lines: profileLines,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					createdAt: now,
					updatedAt: now,
				};
				state.postingProfiles.push(profile);
				return errorResult.ok(profile);
			});
		},

		getActivePostingProfile(
			organizationId,
			code,
		): Promise<Result<PostingProfile | null>> {
			return resolveOperation(() => {
				const active = state.postingProfiles
					.filter(
						(p) =>
							p.organizationId === organizationId &&
							p.code === code &&
							p.status === "active",
					)
					.sort((a, b) => b.versionNumber - a.versionNumber);
				return errorResult.ok(active[0] ?? null);
			});
		},

		findSourcePostingLink(record): Promise<Result<SourcePostingLink | null>> {
			return resolveOperation(() => {
				const link = state.sourcePostingLinks.find(
					(l) =>
						l.organizationId === record.organizationId &&
						l.sourceModule === record.sourceModule &&
						l.sourceAggregateId === record.sourceAggregateId &&
						l.sourceEventId === record.sourceEventId &&
						l.sourceEventVersion === record.sourceEventVersion &&
						l.postingRuleVersion === record.postingRuleVersion,
				);
				return errorResult.ok(link ?? null);
			});
		},

		createSourcePostingLink(record): Promise<Result<SourcePostingLink>> {
			return resolveOperation(() => {
				const now = new Date();
				const link: SourcePostingLink = {
					id: randomUUID(),
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
					createdAt: now,
				};
				state.sourcePostingLinks.push(link);
				return errorResult.ok(link);
			});
		},

		createPostingException(record): Promise<Result<PostingException>> {
			return resolveOperation(() => {
				const now = new Date();
				const exception: PostingException = {
					id: randomUUID(),
					organizationId: record.organizationId,
					sourceModule: record.sourceModule,
					sourceAggregateId: record.sourceAggregateId,
					sourceEventId: record.sourceEventId,
					sourceEventVersion: record.sourceEventVersion,
					postingRuleCode: record.postingRuleCode,
					reasonCode: record.reasonCode,
					message: record.message,
					status: "open",
					resolutionNote: null,
					resolvedBy: null,
					resolvedAt: null,
					payload: record.payload,
					version: 1,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					createdAt: now,
					updatedAt: now,
				};
				state.postingExceptions.push(exception);
				return errorResult.ok(exception);
			});
		},

		listPostingExceptions(filter): Promise<Result<PostingException[]>> {
			return resolveOperation(() => {
				let filtered = state.postingExceptions.filter(
					(e) => e.organizationId === filter.organizationId,
				);
				if (filter.status) {
					filtered = filtered.filter((e) => e.status === filter.status);
				}
				return errorResult.ok(filtered);
			});
		},

		resolvePostingException(record): Promise<Result<PostingException>> {
			return resolveOperation(() => {
				const exception = state.postingExceptions.find(
					(e) =>
						e.organizationId === record.organizationId && e.id === record.id,
				);
				if (!exception) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Posting exception not found",
					});
				}
				if (exception.version !== record.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Version mismatch",
					});
				}
				if (exception.status === "resolved") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Exception is already resolved",
					});
				}
				exception.status = "resolved";
				exception.resolutionNote = record.resolutionNote;
				exception.resolvedBy = record.actorUserId;
				exception.resolvedAt = new Date();
				exception.updatedBy = record.actorUserId;
				exception.updatedAt = new Date();
				exception.version += 1;
				return errorResult.ok(exception);
			});
		},

		getSourcePostingTrace(filter): Promise<Result<SourcePostingTrace[]>> {
			return resolveOperation(() => {
				let links = state.sourcePostingLinks.filter(
					(l) => l.organizationId === filter.organizationId,
				);
				if (filter.journalId) {
					links = links.filter((l) => l.journalId === filter.journalId);
				}
				if (filter.sourceModule) {
					links = links.filter((l) => l.sourceModule === filter.sourceModule);
				}
				if (filter.sourceAggregateId) {
					links = links.filter(
						(l) => l.sourceAggregateId === filter.sourceAggregateId,
					);
				}
				if (filter.sourceEventId) {
					links = links.filter((l) => l.sourceEventId === filter.sourceEventId);
				}
				const traces: SourcePostingTrace[] = [];
				for (const link of links) {
					const journal = findJournal(
						state,
						filter.organizationId,
						link.journalId,
					);
					if (journal) {
						traces.push({ link, journal });
					}
				}
				return errorResult.ok(traces);
			});
		},
	};
}
