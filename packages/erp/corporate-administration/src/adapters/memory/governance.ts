// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous governance ports.
// biome-ignore-all lint/suspicious/noShadow: Domain-local callbacks intentionally mirror governance records.
import { randomUUID } from "node:crypto";
import { fail, ok } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../../error-codes";
import {
	governanceBodyMatchesAsOf,
	governanceMembershipMatchesAsOf,
} from "../../governance/rules";
import type { GovernanceStore } from "../../governance/store";
import type {
	GovernanceBody,
	GovernanceMembership,
} from "../../governance/types";
import {
	governanceBodyIdSchema,
	governanceMembershipIdSchema,
} from "../../kernel/brands";

export function createMemoryCorporateAdministrationGovernanceStore(): GovernanceStore {
	const bodies = new Map<string, GovernanceBody>();
	const memberships = new Map<string, GovernanceMembership>();

	return {
		async getGovernanceBody(input) {
			return ok(
				cloneNullable(
					bodies.get(key(input.organizationId, input.governanceBodyId)),
				),
			);
		},
		async listGovernanceBodiesAsOf(input) {
			return ok(
				[...bodies.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							(input.bodyType === undefined ||
								row.bodyType === input.bodyType) &&
							governanceBodyMatchesAsOf(row, input.asOf, input.includeRetired),
					)
					.sort(
						(left, right) =>
							left.bodyType.localeCompare(right.bodyType) ||
							left.normalizedBodyCode.localeCompare(right.normalizedBodyCode) ||
							left.id.localeCompare(right.id),
					)
					.map(clone),
			);
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
			return ok(clone(row));
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
			return ok(clone(updated));
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
			return ok(clone(updated));
		},
		async getGovernanceMembership(input) {
			return ok(
				cloneNullable(
					memberships.get(
						key(input.organizationId, input.governanceMembershipId),
					),
				),
			);
		},
		async listGovernanceMemberships(input) {
			return ok(
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
			return ok(
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
			return ok(clone(row));
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
			return ok(clone(updated));
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
			return ok(clone(updated));
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

function conflict(field: string) {
	return fail(
		"CONFLICT",
		"Corporate Administration governance conflicts with existing history.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_CONFLICT", {
			field,
		}),
	);
}

function notFound() {
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND"),
	);
}

function stale(expectedVersion: number, actualVersion: number) {
	return fail(
		"CONFLICT",
		"Corporate Administration record version is stale.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_STALE_VERSION",
			{ expectedVersion, actualVersion },
		),
	);
}
