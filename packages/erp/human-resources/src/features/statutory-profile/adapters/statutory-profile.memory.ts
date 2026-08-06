import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesStore } from "../../../composition/store/index";
import type {
	PriorEmployerYtd,
	StatutoryProfile,
	StatutoryProfileListPage,
} from "../../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../../kernel/emissions/mutation-meta";
import { conflict } from "../../../kernel/execution/domain-guards";
import { idempotencyMapKey } from "../../../kernel/execution/idempotency";
import type { MutationPorts } from "../../../kernel/execution/ports";
import type {
	HumanResourcesEmployeeId,
	HumanResourcesStatutoryProfileId,
} from "../../../kernel/identity/brands";
import {
	parseHumanResourcesPriorEmployerYtdId,
	parseHumanResourcesStatutoryProfileId,
} from "../../../kernel/identity/brands";
import type { StatutoryJurisdictionCode } from "../status";
import type {
	IdempotentPriorEmployerYtdRecord,
	IdempotentStatutoryProfileRecord,
	PriorEmployerYtdRecordInput,
	StatutoryProfileUpsertRecord,
} from "../store-contract";

export interface StatutoryProfileMemoryState {
	priorEmployerYtd: Map<string, PriorEmployerYtd>;
	priorEmployerYtdIdempotency: Map<string, IdempotentPriorEmployerYtdRecord>;
	statutoryProfileIdempotency: Map<string, IdempotentStatutoryProfileRecord>;
	statutoryProfiles: Map<string, StatutoryProfile>;
}

export function createStatutoryProfileMemoryState(): StatutoryProfileMemoryState {
	return {
		statutoryProfiles: new Map(),
		statutoryProfileIdempotency: new Map(),
		priorEmployerYtd: new Map(),
		priorEmployerYtdIdempotency: new Map(),
	};
}

export function resetStatutoryProfileMemoryState(
	state: StatutoryProfileMemoryState,
): void {
	state.statutoryProfiles.clear();
	state.statutoryProfileIdempotency.clear();
	state.priorEmployerYtd.clear();
	state.priorEmployerYtdIdempotency.clear();
}

export type MemoryStatutoryProfileMethods = Pick<
	HumanResourcesStore,
	| "findPriorEmployerYtdByIdempotencyKey"
	| "findPriorEmployerYtdByTaxYear"
	| "findStatutoryProfileByIdempotencyKey"
	| "getStatutoryProfileAsOf"
	| "listPriorEmployerYtd"
	| "listStatutoryProfiles"
	| "recordPriorEmployerYtd"
	| "upsertStatutoryProfile"
>;

async function recordAudit(
	ports: MutationPorts,
	input: {
		action: "CREATE" | "UPDATE";
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		organizationId: string;
	},
): Promise<Result<{ id: string }>> {
	return await ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

function previousIsoDay(isoDate: string): string {
	const parsed = new Date(`${isoDate}T00:00:00.000Z`);
	parsed.setUTCDate(parsed.getUTCDate() - 1);
	return parsed.toISOString().slice(0, 10);
}

function openProfileFor(
	state: StatutoryProfileMemoryState,
	organizationId: string,
	employeeId: HumanResourcesEmployeeId,
): StatutoryProfile | undefined {
	return Array.from(state.statutoryProfiles.values()).find(
		(profile) =>
			profile.organizationId === organizationId &&
			profile.employeeId === employeeId &&
			profile.status === "active" &&
			profile.effectiveTo === null,
	);
}

export function createMemoryStatutoryProfileMethods(
	state: StatutoryProfileMemoryState,
): MemoryStatutoryProfileMethods & ThisType<MemoryStatutoryProfileMethods> {
	return {
		async findStatutoryProfileByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentStatutoryProfileRecord | null>> {
			const record =
				state.statutoryProfileIdempotency.get(
					idempotencyMapKey(input.organizationId, input.idempotencyKey),
				) ?? null;
			return await errorResult.ok(
				record === null ? null : { ...record, profile: { ...record.profile } },
			);
		},

		async getStatutoryProfileAsOf(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			asOf: string;
		}): Promise<Result<StatutoryProfile | null>> {
			const resolved =
				Array.from(state.statutoryProfiles.values()).find(
					(profile) =>
						profile.organizationId === input.organizationId &&
						profile.employeeId === input.employeeId &&
						profile.effectiveFrom <= input.asOf &&
						(profile.effectiveTo === null || profile.effectiveTo >= input.asOf),
				) ?? null;
			return await errorResult.ok(resolved === null ? null : { ...resolved });
		},

		async listStatutoryProfiles(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId | undefined;
			jurisdictionCode?: StatutoryJurisdictionCode | undefined;
			statutoryProfileId?: HumanResourcesStatutoryProfileId | undefined;
		}): Promise<Result<StatutoryProfileListPage>> {
			const matches = Array.from(state.statutoryProfiles.values())
				.filter(
					(profile) =>
						profile.organizationId === input.organizationId &&
						(input.employeeId === undefined ||
							profile.employeeId === input.employeeId) &&
						(input.jurisdictionCode === undefined ||
							profile.jurisdictionCode === input.jurisdictionCode) &&
						(input.statutoryProfileId === undefined ||
							profile.id === input.statutoryProfileId),
				)
				.sort((left: StatutoryProfile, right: StatutoryProfile) =>
					right.effectiveFrom.localeCompare(left.effectiveFrom),
				);
			const start = (input.page - 1) * input.pageSize;
			return await errorResult.ok({
				profiles: matches
					.slice(start, start + input.pageSize)
					.map((profile) => ({ ...profile })),
				page: input.page,
				pageSize: input.pageSize,
				restrictedExcluded: 0,
				total: matches.length,
			});
		},

		async upsertStatutoryProfile(
			record: StatutoryProfileUpsertRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<StatutoryProfile>> {
			const open = openProfileFor(
				state,
				record.organizationId,
				record.employeeId,
			);
			if (open !== undefined && open.effectiveFrom >= record.effectiveFrom) {
				return conflict(
					"A statutory profile segment already starts on or after this effective date",
				);
			}

			const parsedId = parseHumanResourcesStatutoryProfileId(randomUUID());
			if (!parsedId.ok) {
				return parsedId;
			}
			const now = new Date();
			const created: StatutoryProfile = {
				id: parsedId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				jurisdictionCode: record.jurisdictionCode,
				taxResidencyStatus: record.taxResidencyStatus,
				nationalityCountryCode: record.nationalityCountryCode,
				expatriate: record.expatriate,
				minimumWageZone: record.minimumWageZone,
				taxFileNumber: record.taxFileNumber,
				employeeProvidentFundNumber: record.employeeProvidentFundNumber,
				socialSecurityNumber: record.socialSecurityNumber,
				socialInsuranceBookNumber: record.socialInsuranceBookNumber,
				dependantCount: record.dependantCount,
				reliefDeclarationVersion: record.reliefDeclarationVersion,
				reliefDeclarations: record.reliefDeclarations.map((declaration) => ({
					...declaration,
				})),
				effectiveFrom: record.effectiveFrom,
				effectiveTo: null,
				status: "active",
				supersedesStatutoryProfileId: open?.id ?? null,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			const supersededSnapshot = open === undefined ? null : { ...open };
			if (open !== undefined) {
				state.statutoryProfiles.set(open.id, {
					...open,
					status: "superseded",
					effectiveTo: previousIsoDay(record.effectiveFrom),
					version: open.version + 1,
					updatedBy: record.createdBy,
					updatedAt: now,
				});
			}
			state.statutoryProfiles.set(created.id, created);
			state.statutoryProfileIdempotency.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					createRequestFingerprint: record.createRequestFingerprint,
					profile: { ...created },
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_statutory_profile",
				entityId: created.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.statutoryProfiles.delete(created.id);
				state.statutoryProfileIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				if (supersededSnapshot !== null) {
					state.statutoryProfiles.set(
						supersededSnapshot.id,
						supersededSnapshot,
					);
				}
				return audit;
			}

			return errorResult.ok({ ...created });
		},

		async findPriorEmployerYtdByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPriorEmployerYtdRecord | null>> {
			const record =
				state.priorEmployerYtdIdempotency.get(
					idempotencyMapKey(input.organizationId, input.idempotencyKey),
				) ?? null;
			return await errorResult.ok(
				record === null ? null : { ...record, record: { ...record.record } },
			);
		},

		async findPriorEmployerYtdByTaxYear(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			taxYear: number;
			jurisdictionCode: StatutoryJurisdictionCode;
		}): Promise<Result<PriorEmployerYtd | null>> {
			const found =
				Array.from(state.priorEmployerYtd.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.employeeId === input.employeeId &&
						row.taxYear === input.taxYear &&
						row.jurisdictionCode === input.jurisdictionCode,
				) ?? null;
			return await errorResult.ok(found === null ? null : { ...found });
		},

		async listPriorEmployerYtd(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			taxYear?: number | undefined;
		}): Promise<Result<PriorEmployerYtd[]>> {
			const rows = Array.from(state.priorEmployerYtd.values())
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.employeeId === input.employeeId &&
						(input.taxYear === undefined || row.taxYear === input.taxYear),
				)
				.sort(
					(left: PriorEmployerYtd, right: PriorEmployerYtd) =>
						right.taxYear - left.taxYear,
				)
				.map((row: PriorEmployerYtd) => ({ ...row }));
			return await errorResult.ok(rows);
		},

		async recordPriorEmployerYtd(
			record: PriorEmployerYtdRecordInput,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PriorEmployerYtd>> {
			const parsedId = parseHumanResourcesPriorEmployerYtdId(randomUUID());
			if (!parsedId.ok) {
				return parsedId;
			}
			const now = new Date();
			const created: PriorEmployerYtd = {
				id: parsedId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				jurisdictionCode: record.jurisdictionCode,
				taxYear: record.taxYear,
				priorEmployerName: record.priorEmployerName,
				grossAmount: record.grossAmount,
				taxWithheldAmount: record.taxWithheldAmount,
				statutoryContributionAmount: record.statutoryContributionAmount,
				currencyCode: record.currencyCode,
				recordedOn: record.recordedOn,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.priorEmployerYtd.set(created.id, created);
			state.priorEmployerYtdIdempotency.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					createRequestFingerprint: record.createRequestFingerprint,
					record: { ...created },
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_prior_employer_ytd",
				entityId: created.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.priorEmployerYtd.delete(created.id);
				state.priorEmployerYtdIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			return errorResult.ok({ ...created });
		},
	};
}
