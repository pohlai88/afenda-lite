// biome-ignore-all lint/suspicious/useAwait: Drizzle governance wrappers expose uniform asynchronous store contracts.
import {
	and,
	asc,
	caGovernanceBody,
	caGovernanceMembership,
	eq,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

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
	legalCompanyIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import { canonicalDateSchema } from "../../kernel/dates";
import type { CorporateAdministrationDrizzleDatabase } from "./dependencies";
import { translateCorporateAdministrationInfrastructureError } from "./errors";

export type CorporateAdministrationDrizzleGovernanceDependencies = Readonly<{
	database: CorporateAdministrationDrizzleDatabase;
	createId: () => string;
}>;

export function createDrizzleCorporateAdministrationGovernanceStore(
	dependencies: CorporateAdministrationDrizzleGovernanceDependencies,
): GovernanceStore {
	return new DrizzleCorporateAdministrationGovernanceStore(dependencies);
}

class DrizzleCorporateAdministrationGovernanceStore implements GovernanceStore {
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createId: () => string;

	constructor(
		dependencies: CorporateAdministrationDrizzleGovernanceDependencies,
	) {
		this.#database = dependencies.database;
		this.#createId = dependencies.createId;
	}

	async getGovernanceBody(
		input: Parameters<GovernanceStore["getGovernanceBody"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caGovernanceBody)
				.where(
					and(
						eq(caGovernanceBody.organizationId, input.organizationId),
						eq(caGovernanceBody.id, input.governanceBodyId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapGovernanceBody(rows[0]);
		});
	}

	async listGovernanceBodiesAsOf(
		input: Parameters<GovernanceStore["listGovernanceBodiesAsOf"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caGovernanceBody)
				.where(
					and(
						eq(caGovernanceBody.organizationId, input.organizationId),
						eq(caGovernanceBody.legalCompanyId, input.legalCompanyId),
					),
				)
				.orderBy(
					asc(caGovernanceBody.bodyType),
					asc(caGovernanceBody.normalizedBodyCode),
				);
			return rows
				.map(mapGovernanceBody)
				.filter(
					(row) =>
						(input.bodyType === undefined || row.bodyType === input.bodyType) &&
						governanceBodyMatchesAsOf(row, input.asOf, input.includeRetired),
				);
		});
	}

	async createGovernanceBody(
		input: Parameters<GovernanceStore["createGovernanceBody"]>[0],
	) {
		const id = governanceBodyIdSchema.parse(this.#createId());
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
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_governance_body (id, organization_id, legal_company_id, body_type, body_code, normalized_body_code, display_name, description, effective_from, effective_to, status, retirement_reason, recorded_at, recorded_by, source_document_id, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.bodyType}, ${input.bodyCode}, ${input.normalizedBodyCode}, ${input.displayName}, ${input.description}, ${input.effectiveFrom}, NULL, 'active', NULL, ${now}, ${input.recordedBy}, ${input.sourceDocumentId}, 1, ${now}, ${now})`;
			});
			return ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caGovernanceBody).values({
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				bodyType: input.bodyType,
				bodyCode: input.bodyCode,
				normalizedBodyCode: input.normalizedBodyCode,
				displayName: input.displayName,
				description: input.description,
				effectiveFrom: input.effectiveFrom,
				recordedAt: now,
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			return row;
		});
	}

	async amendGovernanceBody(
		input: Parameters<GovernanceStore["amendGovernanceBody"]>[0],
	) {
		const current = await this.getGovernanceBody(input);
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
		const updated: GovernanceBody = {
			...current.data,
			displayName: input.displayName,
			description: input.description,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_governance_body SET display_name = ${input.displayName}, description = ${input.description}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, source_document_id = ${input.sourceDocumentId}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.governanceBodyId} AND version = ${input.expectedVersion}`;
			});
			return ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caGovernanceBody)
				.set({
					displayName: input.displayName,
					description: input.description,
					recordedAt: now,
					recordedBy: input.recordedBy,
					sourceDocumentId: input.sourceDocumentId,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caGovernanceBody.organizationId, input.organizationId),
						eq(caGovernanceBody.id, input.governanceBodyId),
						eq(caGovernanceBody.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async retireGovernanceBody(
		input: Parameters<GovernanceStore["retireGovernanceBody"]>[0],
	) {
		const current = await this.getGovernanceBody(input);
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
		const updated: GovernanceBody = {
			...current.data,
			effectiveTo: input.retiredOn,
			status: "retired",
			retirementReason: input.reason,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_governance_body SET effective_to = ${input.retiredOn}, status = 'retired', retirement_reason = ${input.reason}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, source_document_id = ${input.sourceDocumentId}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.governanceBodyId} AND version = ${input.expectedVersion}`;
			});
			return ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caGovernanceBody)
				.set({
					effectiveTo: input.retiredOn,
					status: "retired",
					retirementReason: input.reason,
					recordedAt: now,
					recordedBy: input.recordedBy,
					sourceDocumentId: input.sourceDocumentId,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caGovernanceBody.organizationId, input.organizationId),
						eq(caGovernanceBody.id, input.governanceBodyId),
						eq(caGovernanceBody.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async getGovernanceMembership(
		input: Parameters<GovernanceStore["getGovernanceMembership"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caGovernanceMembership)
				.where(
					and(
						eq(caGovernanceMembership.organizationId, input.organizationId),
						eq(caGovernanceMembership.id, input.governanceMembershipId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapGovernanceMembership(rows[0]);
		});
	}

	async listGovernanceMemberships(
		input: Parameters<GovernanceStore["listGovernanceMemberships"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caGovernanceMembership)
				.where(
					and(
						eq(caGovernanceMembership.organizationId, input.organizationId),
						eq(caGovernanceMembership.governanceBodyId, input.governanceBodyId),
					),
				);
			return rows.map(mapGovernanceMembership);
		});
	}

	async listGovernanceMembershipsAsOf(
		input: Parameters<GovernanceStore["listGovernanceMembershipsAsOf"]>[0],
	) {
		const listed = await this.listGovernanceMemberships(input);
		if (!listed.ok) {
			return listed;
		}
		return ok(
			listed.data
				.filter(
					(row) =>
						(input.memberPartyId === undefined ||
							row.memberPartyId === input.memberPartyId) &&
						governanceMembershipMatchesAsOf(row, input.asOf),
				)
				.sort(
					(left, right) =>
						Number(right.isChair) - Number(left.isChair) ||
						left.seatLabel.localeCompare(right.seatLabel) ||
						left.id.localeCompare(right.id),
				),
		);
	}

	async appointGovernanceMember(
		input: Parameters<GovernanceStore["appointGovernanceMember"]>[0],
	) {
		const id = governanceMembershipIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row = makeMembershipResult(input, id, now, 1, "active", null);
		const values = {
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
			status: "active" as const,
			endReason: null,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_governance_membership (id, organization_id, legal_company_id, governance_body_id, member_kind, member_party_id, role_seat_code, seat_label, membership_role, voting_entitlement, is_chair, term_from, term_to, status, end_reason, recorded_at, recorded_by, source_document_id, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.governanceBodyId}, ${input.memberKind}, ${input.memberPartyId}, ${input.roleSeatCode}, ${input.seatLabel}, ${input.membershipRole}, ${input.votingEntitlement}, ${input.isChair}, ${input.termFrom}, ${input.termTo}, 'active', NULL, ${now}, ${input.recordedBy}, ${input.sourceDocumentId}, 1, ${now}, ${now})`;
			});
			return ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caGovernanceMembership).values(values);
			return row;
		});
	}

	async changeGovernanceMembership(
		input: Parameters<GovernanceStore["changeGovernanceMembership"]>[0],
	) {
		const current = await this.getGovernanceMembership(input);
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
		const updated: GovernanceMembership = {
			...current.data,
			seatLabel: input.seatLabel,
			membershipRole: input.membershipRole,
			votingEntitlement: input.votingEntitlement,
			isChair: input.isChair,
			termFrom: input.termFrom,
			termTo: input.termTo,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_governance_membership SET seat_label = ${input.seatLabel}, membership_role = ${input.membershipRole}, voting_entitlement = ${input.votingEntitlement}, is_chair = ${input.isChair}, term_from = ${input.termFrom}, term_to = ${input.termTo}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, source_document_id = ${input.sourceDocumentId}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.governanceMembershipId} AND version = ${input.expectedVersion}`;
			});
			return ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caGovernanceMembership)
				.set({
					seatLabel: input.seatLabel,
					membershipRole: input.membershipRole,
					votingEntitlement: input.votingEntitlement,
					isChair: input.isChair,
					termFrom: input.termFrom,
					termTo: input.termTo,
					recordedAt: now,
					recordedBy: input.recordedBy,
					sourceDocumentId: input.sourceDocumentId,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caGovernanceMembership.organizationId, input.organizationId),
						eq(caGovernanceMembership.id, input.governanceMembershipId),
						eq(caGovernanceMembership.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async endGovernanceMembership(
		input: Parameters<GovernanceStore["endGovernanceMembership"]>[0],
	) {
		const current = await this.getGovernanceMembership(input);
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
		const updated: GovernanceMembership = {
			...current.data,
			termTo: input.endedOn,
			status: "ended",
			endReason: input.reason,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_governance_membership SET term_to = ${input.endedOn}, status = 'ended', end_reason = ${input.reason}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, source_document_id = ${input.sourceDocumentId}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.governanceMembershipId} AND version = ${input.expectedVersion}`;
			});
			return ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caGovernanceMembership)
				.set({
					termTo: input.endedOn,
					status: "ended",
					endReason: input.reason,
					recordedAt: now,
					recordedBy: input.recordedBy,
					sourceDocumentId: input.sourceDocumentId,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caGovernanceMembership.organizationId, input.organizationId),
						eq(caGovernanceMembership.id, input.governanceMembershipId),
						eq(caGovernanceMembership.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async #read<T>(work: () => Promise<T>): Promise<Result<T>> {
		try {
			return ok(await work());
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

function makeMembershipResult(
	input: Parameters<GovernanceStore["appointGovernanceMember"]>[0],
	id: string,
	now: Date,
	version: number,
	status: "active" | "ended",
	endReason: string | null,
): GovernanceMembership {
	return {
		id: governanceMembershipIdSchema.parse(id),
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
		status,
		endReason,
		recordedAt: now,
		recordedBy: input.recordedBy,
		sourceDocumentId: input.sourceDocumentId,
		version,
		createdAt: now,
		updatedAt: now,
	};
}

function mapGovernanceBody(
	row: typeof caGovernanceBody.$inferSelect,
): GovernanceBody {
	return {
		id: governanceBodyIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		bodyType:
			row.bodyType === "committee" ||
			row.bodyType === "shareholder_body" ||
			row.bodyType === "configured_statutory_body"
				? row.bodyType
				: "board",
		bodyCode: row.bodyCode,
		normalizedBodyCode: row.normalizedBodyCode,
		displayName: row.displayName,
		description: row.description,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		status: row.status === "retired" ? "retired" : "active",
		retirementReason: row.retirementReason,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapGovernanceMembership(
	row: typeof caGovernanceMembership.$inferSelect,
): GovernanceMembership {
	return {
		id: governanceMembershipIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		governanceBodyId: governanceBodyIdSchema.parse(row.governanceBodyId),
		memberKind: row.memberKind === "role_seat" ? "role_seat" : "party",
		memberPartyId: row.memberPartyId,
		roleSeatCode: row.roleSeatCode,
		seatLabel: row.seatLabel,
		membershipRole:
			row.membershipRole === "secretary" ||
			row.membershipRole === "observer" ||
			row.membershipRole === "advisor"
				? row.membershipRole
				: "member",
		votingEntitlement:
			row.votingEntitlement === "non_voting" ? "non_voting" : "voting",
		isChair: row.isChair,
		termFrom: canonicalDateSchema.parse(row.termFrom),
		termTo: row.termTo === null ? null : canonicalDateSchema.parse(row.termTo),
		status: row.status === "ended" ? "ended" : "active",
		endReason: row.endReason,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
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
