// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous governance ports.
// biome-ignore-all lint/suspicious/noShadow: Domain-local callbacks intentionally mirror governance records.
import { randomUUID } from "node:crypto";
import { errorResult } from "@afenda/errors";
import {
	governanceBodyIdSchema,
	governanceMembershipIdSchema,
} from "../../../kernel/brands";
import {
	decodeGovernanceBodyCursor,
	decodeGovernanceMembershipCursor,
	encodeGovernanceBodyCursor,
	encodeGovernanceMembershipCursor,
	type GovernanceBodyCursorKey,
	type GovernanceMembershipCursorKey,
	governanceBodyCursorScope,
	governanceMembershipCursorScope,
} from "../pagination";
import {
	governanceBodyMatchesAsOf,
	governanceMembershipMatchesAsOf,
} from "../rules";
import type { GovernanceStore } from "../store";
import type {
	GovernanceBody,
	GovernanceBodyListPage,
	GovernanceMembership,
	GovernanceMembershipListPage,
} from "../types";

export function createMemoryCorporateAdministrationGovernanceStore(): GovernanceStore {
	const bodies = new Map<string, GovernanceBody>();
	const memberships = new Map<string, GovernanceMembership>();

	return {
		async getGovernanceBody(input) {
			return errorResult.ok(
				cloneNullable(
					bodies.get(key(input.organizationId, input.governanceBodyId)),
				),
			);
		},
		async listGovernanceBodiesAsOf(input) {
			const cursorScope = governanceBodyCursorScope(input);
			const cursor = decodeGovernanceBodyCursor(input.cursor, cursorScope);
			if (!cursor.ok) {
				return cursor;
			}
			const pageSize = input.pageSize ?? 50;
			const ordered = [...bodies.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.legalCompanyId === input.legalCompanyId &&
						(input.bodyType === undefined || row.bodyType === input.bodyType) &&
						governanceBodyMatchesAsOf(row, input.asOf, input.includeRetired),
				)
				.sort(compareGovernanceBodies)
				.filter(
					(body) =>
						cursor.data === null ||
						compareGovernanceBodyCursor(body, cursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items: pageRows.map(clone),
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeGovernanceBodyCursor(
								cursorScope,
								governanceBodyCursorKey(last),
							)
						: null,
			} satisfies GovernanceBodyListPage);
		},
		async createGovernanceBody(input) {
			const duplicate = [...bodies.values()].some(
				(row) =>
					row.organizationId === input.organizationId &&
					row.legalCompanyId === input.legalCompanyId &&
					row.normalizedBodyCode === input.normalizedBodyCode,
			);
			if (duplicate) {
				return conflict("bodyCode");
			}
			const id = governanceBodyIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: GovernanceBody = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				bodyType: input.bodyType,
				bodyCode: input.bodyCode,
				normalizedBodyCode: input.normalizedBodyCode,
				displayName: input.displayName,
				description: input.description,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: null,
				status: "active",
				retirementReason: null,
				recordedAt: now,
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			bodies.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async amendGovernanceBody(input) {
			const current = bodies.get(
				key(input.organizationId, input.governanceBodyId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const updated: GovernanceBody = {
				...current,
				displayName: input.displayName,
				description: input.description,
				recordedAt: new Date(input.recordedAt),
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: current.version + 1,
				updatedAt: new Date(input.recordedAt),
			};
			bodies.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async retireGovernanceBody(input) {
			const current = bodies.get(
				key(input.organizationId, input.governanceBodyId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const updated: GovernanceBody = {
				...current,
				effectiveTo: input.retiredOn,
				status: "retired",
				retirementReason: input.reason,
				recordedAt: new Date(input.recordedAt),
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: current.version + 1,
				updatedAt: new Date(input.recordedAt),
			};
			bodies.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async getGovernanceMembership(input) {
			return errorResult.ok(
				cloneNullable(
					memberships.get(
						key(input.organizationId, input.governanceMembershipId),
					),
				),
			);
		},
		async listGovernanceMemberships(input) {
			return errorResult.ok(
				[...memberships.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.governanceBodyId === input.governanceBodyId,
					)
					.map(clone),
			);
		},
		async listGovernanceMembershipsAsOf(input) {
			return errorResult.ok(
				[...memberships.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.governanceBodyId === input.governanceBodyId &&
							(input.memberPartyId === undefined ||
								row.memberPartyId === input.memberPartyId) &&
							governanceMembershipMatchesAsOf(row, input.asOf),
					)
					.sort(
						(left, right) =>
							Number(right.isChair) - Number(left.isChair) ||
							left.seatLabel.localeCompare(right.seatLabel) ||
							left.id.localeCompare(right.id),
					)
					.map(clone),
			);
		},
		async listGovernanceMembershipPageAsOf(input) {
			const cursorScope = governanceMembershipCursorScope(input);
			const cursor = decodeGovernanceMembershipCursor(
				input.cursor,
				cursorScope,
			);
			if (!cursor.ok) {
				return cursor;
			}
			const pageSize = input.pageSize ?? 50;
			const ordered = [...memberships.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.governanceBodyId === input.governanceBodyId &&
						(input.memberPartyId === undefined ||
							row.memberPartyId === input.memberPartyId) &&
						governanceMembershipMatchesAsOf(row, input.asOf),
				)
				.sort(compareGovernanceMemberships)
				.filter(
					(membership) =>
						cursor.data === null ||
						compareGovernanceMembershipCursor(membership, cursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items: pageRows.map(clone),
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeGovernanceMembershipCursor(
								cursorScope,
								governanceMembershipCursorKey(last),
							)
						: null,
			} satisfies GovernanceMembershipListPage);
		},
		async appointGovernanceMember(input) {
			const id = governanceMembershipIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: GovernanceMembership = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				governanceBodyId: input.governanceBodyId,
				memberKind: input.memberKind,
				memberPartyId: input.memberPartyId,
				roleSeatCode: input.roleSeatCode,
				seatLabel: input.seatLabel,
				membershipRole: input.membershipRole,
				votingEntitlement: input.votingEntitlement,
				isChair: input.isChair,
				termFrom: input.termFrom,
				termTo: input.termTo,
				status: "active",
				endReason: null,
				recordedAt: now,
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			memberships.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async changeGovernanceMembership(input) {
			const current = memberships.get(
				key(input.organizationId, input.governanceMembershipId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const updated: GovernanceMembership = {
				...current,
				seatLabel: input.seatLabel,
				membershipRole: input.membershipRole,
				votingEntitlement: input.votingEntitlement,
				isChair: input.isChair,
				termFrom: input.termFrom,
				termTo: input.termTo,
				recordedAt: new Date(input.recordedAt),
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: current.version + 1,
				updatedAt: new Date(input.recordedAt),
			};
			memberships.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
		async endGovernanceMembership(input) {
			const current = memberships.get(
				key(input.organizationId, input.governanceMembershipId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const updated: GovernanceMembership = {
				...current,
				termTo: input.endedOn,
				status: "ended",
				endReason: input.reason,
				recordedAt: new Date(input.recordedAt),
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: current.version + 1,
				updatedAt: new Date(input.recordedAt),
			};
			memberships.set(key(input.organizationId, updated.id), updated);
			return errorResult.ok(clone(updated));
		},
	};
}

function compareGovernanceBodies(
	left: GovernanceBody,
	right: GovernanceBody,
): number {
	return (
		left.bodyType.localeCompare(right.bodyType) ||
		left.normalizedBodyCode.localeCompare(right.normalizedBodyCode) ||
		left.id.localeCompare(right.id)
	);
}

function governanceBodyCursorKey(
	body: GovernanceBody,
): GovernanceBodyCursorKey {
	return [body.bodyType, body.normalizedBodyCode, body.id];
}

function compareGovernanceBodyCursor(
	body: GovernanceBody,
	cursor: GovernanceBodyCursorKey,
): number {
	return (
		body.bodyType.localeCompare(cursor[0]) ||
		body.normalizedBodyCode.localeCompare(cursor[1]) ||
		body.id.localeCompare(cursor[2])
	);
}

function compareGovernanceMemberships(
	left: GovernanceMembership,
	right: GovernanceMembership,
): number {
	return (
		Number(right.isChair) - Number(left.isChair) ||
		left.seatLabel.localeCompare(right.seatLabel) ||
		left.id.localeCompare(right.id)
	);
}

function governanceMembershipCursorKey(
	membership: GovernanceMembership,
): GovernanceMembershipCursorKey {
	return [membership.isChair, membership.seatLabel, membership.id];
}

function compareGovernanceMembershipCursor(
	membership: GovernanceMembership,
	cursor: GovernanceMembershipCursorKey,
): number {
	return (
		Number(cursor[0]) - Number(membership.isChair) ||
		membership.seatLabel.localeCompare(cursor[1]) ||
		membership.id.localeCompare(cursor[2])
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

function conflict(_field: string) {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Corporate Administration governance conflicts with existing history.",
	});
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
