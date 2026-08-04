// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous authority ports.
import { randomUUID } from "node:crypto";
import { errorResult } from "@afenda/errors";
import { authorityMandateIdSchema } from "../../../kernel/brands";
import {
	type AuthorityMandateCursorKey,
	authorityMandateCursorScope,
	decodeAuthorityMandateCursor,
	encodeAuthorityMandateCursor,
} from "../pagination";
import { authorityMandateMatchesAsOf } from "../rules";
import type { AuthorityMandateStore } from "../store";
import type { AuthorityMandate, AuthorityMandateListPage } from "../types";

export function createMemoryCorporateAdministrationAuthorityStore(): AuthorityMandateStore {
	const mandates = new Map<string, AuthorityMandate>();

	return {
		async getAuthorityMandate(input) {
			return errorResult.ok(
				cloneNullable(
					mandates.get(key(input.organizationId, input.authorityMandateId)),
				),
			);
		},
		async listAuthorityMandatesAsOf(input) {
			const cursorScope = authorityMandateCursorScope(input);
			const cursor = decodeAuthorityMandateCursor(input.cursor, cursorScope);
			if (!cursor.ok) {
				return cursor;
			}
			const pageSize = input.pageSize ?? 50;
			const ordered = [...mandates.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.legalCompanyId === input.legalCompanyId &&
						(input.mandateType === undefined ||
							row.mandateType === input.mandateType) &&
						(input.holderPartyId === undefined ||
							row.holderPartyId === input.holderPartyId) &&
						authorityMandateMatchesAsOf(row, input.asOf),
				)
				.sort(compareAuthorityMandates)
				.filter(
					(mandate) =>
						cursor.data === null ||
						compareAuthorityMandateCursor(mandate, cursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items: pageRows.map(clone),
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeAuthorityMandateCursor(
								cursorScope,
								authorityMandateCursorKey(last),
							)
						: null,
			} satisfies AuthorityMandateListPage);
		},
		async grantAuthorityMandate(input) {
			const id = authorityMandateIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: AuthorityMandate = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				mandateType: input.mandateType,
				holderPartyId: input.holderPartyId,
				holderOfficerAppointmentId: input.holderOfficerAppointmentId,
				grantedByType: input.grantedByType,
				grantingResolutionId: input.grantingResolutionId,
				scopeDescription: input.scopeDescription,
				monetaryLimitAmount: input.monetaryLimitAmount,
				monetaryLimitCurrencyCode: input.monetaryLimitCurrencyCode,
				jurisdictionCode: input.jurisdictionCode,
				protectedAuthority: input.protectedAuthority,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				status: "active",
				revocationReason: null,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			mandates.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async amendAuthorityMandate(input) {
			const current = mandates.get(
				key(input.organizationId, input.authorityMandateId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: AuthorityMandate = {
				...current,
				scopeDescription: input.scopeDescription,
				monetaryLimitAmount: input.monetaryLimitAmount,
				monetaryLimitCurrencyCode: input.monetaryLimitCurrencyCode,
				jurisdictionCode: input.jurisdictionCode,
				effectiveTo: input.effectiveTo,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			mandates.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async revokeAuthorityMandate(input) {
			const current = mandates.get(
				key(input.organizationId, input.authorityMandateId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const now = new Date(input.recordedAt);
			const updated: AuthorityMandate = {
				...current,
				effectiveTo: input.revokedOn,
				status: "revoked",
				revocationReason: input.reason,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: current.version + 1,
				updatedAt: now,
			};
			mandates.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
	};
}

function compareAuthorityMandates(
	left: AuthorityMandate,
	right: AuthorityMandate,
): number {
	return (
		left.effectiveFrom.localeCompare(right.effectiveFrom) ||
		left.id.localeCompare(right.id)
	);
}

function authorityMandateCursorKey(
	mandate: AuthorityMandate,
): AuthorityMandateCursorKey {
	return [mandate.effectiveFrom, mandate.id];
}

function compareAuthorityMandateCursor(
	mandate: AuthorityMandate,
	cursor: AuthorityMandateCursorKey,
): number {
	return (
		mandate.effectiveFrom.localeCompare(cursor[0]) ||
		mandate.id.localeCompare(cursor[1])
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
