import { randomUUID } from "node:crypto";
import {
	audit as afendaAudit,
	type PreparedTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	desc,
	eq,
	gte,
	hrPriorEmployerYtd,
	hrStatutoryProfile,
	isNull,
	lte,
	or,
	sql,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";
import type { HumanResourcesStore } from "../../../composition/store/index";
import type {
	PriorEmployerYtd,
	StatutoryProfile,
	StatutoryReliefDeclaration,
} from "../../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../../kernel/emissions/mutation-meta";
import { conflict } from "../../../kernel/execution/domain-guards";
import {
	isCreateIdempotencyUniqueViolation,
	mapPersistenceFailure,
} from "../../../kernel/execution/persistence-errors";
import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesPriorEmployerYtdId,
	parseHumanResourcesStatutoryProfileId,
} from "../../../kernel/identity/brands";
import { statutoryReliefDeclarationSchema } from "../schema";
import {
	regionalMinimumWageZoneSchema,
	statutoryJurisdictionCodeSchema,
	statutoryProfileStatusSchema,
	taxResidencyStatusSchema,
} from "../status";

const STATUTORY_PROFILE_AUDIT_SOURCE =
	"human-resources.statutory-profile-drizzle";

const reliefDeclarationsSchema = z.array(statutoryReliefDeclarationSchema);

type StatutoryProfileRow = typeof hrStatutoryProfile.$inferSelect;
type PriorEmployerYtdRow = typeof hrPriorEmployerYtd.$inferSelect;

function prepareStatutoryAudit(input: {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity: "hr_prior_employer_ytd" | "hr_statutory_profile";
	entityId: string;
	meta: HumanResourcesMutationMeta;
	newValue?: Record<string, unknown> | null | undefined;
	organizationId: string;
}): Result<PreparedTransactionalAuditInsertValues> {
	return afendaAudit.transaction.prepare({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: null,
		newValue: input.newValue,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: STATUTORY_PROFILE_AUDIT_SOURCE,
			causationId:
				input.meta.causationId ??
				input.meta.idempotencyKey ??
				input.correlationId,
			reasonCode: null,
		},
	});
}

function mapStatutoryProfile(
	row: StatutoryProfileRow,
): Result<StatutoryProfile> {
	const id = parseHumanResourcesStatutoryProfileId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let supersedesStatutoryProfileId: StatutoryProfile["supersedesStatutoryProfileId"] =
		null;
	if (row.supersedesStatutoryProfileId !== null) {
		const parsed = parseHumanResourcesStatutoryProfileId(
			row.supersedesStatutoryProfileId,
		);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesStatutoryProfileId = parsed.data;
	}
	const jurisdictionCode = statutoryJurisdictionCodeSchema.safeParse(
		row.jurisdictionCode,
	);
	const taxResidencyStatus = taxResidencyStatusSchema.safeParse(
		row.taxResidencyStatus,
	);
	const status = statutoryProfileStatusSchema.safeParse(row.status);
	const declarations = reliefDeclarationsSchema.safeParse(
		row.reliefDeclarations,
	);
	if (
		!(
			jurisdictionCode.success &&
			taxResidencyStatus.success &&
			status.success &&
			declarations.success
		)
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let minimumWageZone: StatutoryProfile["minimumWageZone"] = null;
	if (row.minimumWageZone !== null) {
		const parsedZone = regionalMinimumWageZoneSchema.safeParse(
			row.minimumWageZone,
		);
		if (!parsedZone.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		minimumWageZone = parsedZone.data;
	}
	const reliefDeclarations: StatutoryReliefDeclaration[] =
		declarations.data.map((declaration) => ({
			reliefCode: declaration.reliefCode,
			amount: declaration.amount ?? null,
			currencyCode: declaration.currencyCode ?? null,
			dependantReference: declaration.dependantReference ?? null,
			evidenceRef: declaration.evidenceRef ?? null,
		}));
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		jurisdictionCode: jurisdictionCode.data,
		taxResidencyStatus: taxResidencyStatus.data,
		nationalityCountryCode: row.nationalityCountryCode,
		expatriate: row.expatriate,
		minimumWageZone,
		taxFileNumber: row.taxFileNumber,
		employeeProvidentFundNumber: row.employeeProvidentFundNumber,
		socialSecurityNumber: row.socialSecurityNumber,
		socialInsuranceBookNumber: row.socialInsuranceBookNumber,
		dependantCount: row.dependantCount,
		reliefDeclarationVersion: row.reliefDeclarationVersion,
		reliefDeclarations,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: status.data,
		supersedesStatutoryProfileId,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapPriorEmployerYtd(
	row: PriorEmployerYtdRow,
): Result<PriorEmployerYtd> {
	const id = parseHumanResourcesPriorEmployerYtdId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const jurisdictionCode = statutoryJurisdictionCodeSchema.safeParse(
		row.jurisdictionCode,
	);
	if (!jurisdictionCode.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		jurisdictionCode: jurisdictionCode.data,
		taxYear: row.taxYear,
		priorEmployerName: row.priorEmployerName,
		grossAmount: row.grossAmount,
		taxWithheldAmount: row.taxWithheldAmount,
		statutoryContributionAmount: row.statutoryContributionAmount,
		currencyCode: row.currencyCode,
		recordedOn: row.recordedOn,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

export type DrizzleStatutoryProfileMethods = Pick<
	HumanResourcesStore,
	| "findPriorEmployerYtdByIdempotencyKey"
	| "findPriorEmployerYtdByTaxYear"
	| "findStatutoryProfileByIdempotencyKey"
	| "getStatutoryProfileAsOf"
	| "getStatutoryProfileById"
	| "listPriorEmployerYtd"
	| "listStatutoryProfiles"
	| "recordPriorEmployerYtd"
	| "upsertStatutoryProfile"
>;

export const drizzleStatutoryProfileMethods: DrizzleStatutoryProfileMethods &
	ThisType<DrizzleStatutoryProfileMethods> = {
	async findStatutoryProfileByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrStatutoryProfile)
				.where(
					and(
						eq(hrStatutoryProfile.organizationId, input.organizationId),
						eq(hrStatutoryProfile.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapStatutoryProfile(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				profile: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find statutory profile by idempotency key",
			);
		}
	},

	async getStatutoryProfileById(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrStatutoryProfile)
				.where(
					and(
						eq(hrStatutoryProfile.organizationId, input.organizationId),
						eq(hrStatutoryProfile.id, input.statutoryProfileId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapStatutoryProfile(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load statutory profile by id",
			);
		}
	},

	async getStatutoryProfileAsOf(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrStatutoryProfile)
				.where(
					and(
						eq(hrStatutoryProfile.organizationId, input.organizationId),
						eq(hrStatutoryProfile.employeeId, input.employeeId),
						lte(hrStatutoryProfile.effectiveFrom, input.asOf),
						or(
							isNull(hrStatutoryProfile.effectiveTo),
							gte(hrStatutoryProfile.effectiveTo, input.asOf),
						),
					),
				)
				.orderBy(desc(hrStatutoryProfile.effectiveFrom))
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapStatutoryProfile(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve statutory profile as of date",
			);
		}
	},

	async listStatutoryProfiles(input) {
		try {
			const conditions = [
				eq(hrStatutoryProfile.organizationId, input.organizationId),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrStatutoryProfile.employeeId, input.employeeId));
			}
			if (input.jurisdictionCode !== undefined) {
				conditions.push(
					eq(hrStatutoryProfile.jurisdictionCode, input.jurisdictionCode),
				);
			}
			if (input.statutoryProfileId !== undefined) {
				conditions.push(eq(hrStatutoryProfile.id, input.statutoryProfileId));
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				afendaDatabase.client
					.select()
					.from(hrStatutoryProfile)
					.where(and(...conditions))
					.orderBy(
						desc(hrStatutoryProfile.effectiveFrom),
						asc(hrStatutoryProfile.id),
					)
					.limit(input.pageSize)
					.offset(offset),
				afendaDatabase.client
					.select({ count: sql<number>`count(*)::int` })
					.from(hrStatutoryProfile)
					.where(and(...conditions)),
			]);
			const profiles: StatutoryProfile[] = [];
			for (const row of rows) {
				const mapped = mapStatutoryProfile(row);
				if (!mapped.ok) {
					return mapped;
				}
				profiles.push(mapped.data);
			}
			return errorResult.ok({
				profiles,
				page: input.page,
				pageSize: input.pageSize,
				restrictedExcluded: 0,
				total: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list statutory profiles");
		}
	},

	async upsertStatutoryProfile(record, _ports, meta) {
		const brandedId = parseHumanResourcesStatutoryProfileId(randomUUID());
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareStatutoryAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_statutory_profile",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: {
				employeeId: record.employeeId,
				jurisdictionCode: record.jurisdictionCode,
				effectiveFrom: record.effectiveFrom,
				status: "active",
				version: 1,
			},
			meta,
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const declarationsJson = JSON.stringify(record.reliefDeclarations);

		try {
			const [, , , insertedRows] = await afendaDatabase.transaction(
				(sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${`hr-statutory-profile:${record.organizationId}:${record.employeeId}`}, 0))`,
					sqlValue`
						UPDATE hr_statutory_profile
						SET status = 'superseded',
							effective_to = (${record.effectiveFrom}::date - INTERVAL '1 day')::date,
							version = version + 1,
							updated_by = ${record.createdBy},
							updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND employee_id = ${record.employeeId}
							AND status = 'active'
							AND effective_to IS NULL
							AND effective_from < ${record.effectiveFrom}::date
					`,
					sqlValue`
						INSERT INTO hr_statutory_profile (
							id, organization_id, employee_id, jurisdiction_code,
							tax_residency_status, nationality_country_code, expatriate,
							minimum_wage_zone, tax_file_number,
							employee_provident_fund_number, social_security_number,
							social_insurance_book_number, dependant_count,
							relief_declaration_version, relief_declarations,
							effective_from, effective_to, status,
							supersedes_statutory_profile_id, create_idempotency_key,
							create_request_fingerprint, version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, ${record.organizationId}, ${record.employeeId},
							${record.jurisdictionCode}, ${record.taxResidencyStatus},
							${record.nationalityCountryCode}, ${record.expatriate},
							${record.minimumWageZone}, ${record.taxFileNumber},
							${record.employeeProvidentFundNumber},
							${record.socialSecurityNumber},
							${record.socialInsuranceBookNumber}, ${record.dependantCount},
							${record.reliefDeclarationVersion}, ${declarationsJson}::jsonb,
							${record.effectiveFrom}::date, NULL, 'active',
							(
								SELECT prior.id FROM hr_statutory_profile AS prior
								WHERE prior.organization_id = ${record.organizationId}
									AND prior.employee_id = ${record.employeeId}
									AND prior.status = 'superseded'
									AND prior.effective_to = (${record.effectiveFrom}::date - INTERVAL '1 day')::date
								ORDER BY prior.effective_from DESC
								LIMIT 1
							),
							${record.createIdempotencyKey},
							${record.createRequestFingerprint}, 1, ${record.createdBy},
							${record.createdBy}
						RETURNING id
					`,
					sqlValue`
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						) VALUES (
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						)
						RETURNING id
					`,
				],
			);
			if (insertedRows[0] === undefined) {
				return conflict("Unable to record statutory profile");
			}
			const sealed = await afendaDatabase.client
				.select()
				.from(hrStatutoryProfile)
				.where(
					and(
						eq(hrStatutoryProfile.organizationId, record.organizationId),
						eq(hrStatutoryProfile.id, brandedId.data),
					),
				)
				.limit(1);
			const [row] = sealed;
			if (!row) {
				return conflict("Unable to record statutory profile");
			}
			return mapStatutoryProfile(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const existing = await this.findStatutoryProfileByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) {
					return existing;
				}
				if (
					existing.data !== null &&
					existing.data.createRequestFingerprint ===
						record.createRequestFingerprint
				) {
					return errorResult.ok(existing.data.profile);
				}
				return conflict("Statutory profile idempotency key conflict");
			}
			return mapPersistenceFailure(error, "Failed to record statutory profile");
		}
	},

	async findPriorEmployerYtdByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrPriorEmployerYtd)
				.where(
					and(
						eq(hrPriorEmployerYtd.organizationId, input.organizationId),
						eq(hrPriorEmployerYtd.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapPriorEmployerYtd(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				record: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find prior-employer year-to-date by idempotency key",
			);
		}
	},

	async findPriorEmployerYtdByTaxYear(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrPriorEmployerYtd)
				.where(
					and(
						eq(hrPriorEmployerYtd.organizationId, input.organizationId),
						eq(hrPriorEmployerYtd.employeeId, input.employeeId),
						eq(hrPriorEmployerYtd.taxYear, input.taxYear),
						eq(hrPriorEmployerYtd.jurisdictionCode, input.jurisdictionCode),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapPriorEmployerYtd(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load prior-employer year-to-date",
			);
		}
	},

	async listPriorEmployerYtd(input) {
		try {
			const conditions = [
				eq(hrPriorEmployerYtd.organizationId, input.organizationId),
				eq(hrPriorEmployerYtd.employeeId, input.employeeId),
			];
			if (input.taxYear !== undefined) {
				conditions.push(eq(hrPriorEmployerYtd.taxYear, input.taxYear));
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrPriorEmployerYtd)
				.where(and(...conditions))
				.orderBy(desc(hrPriorEmployerYtd.taxYear));
			const records: PriorEmployerYtd[] = [];
			for (const row of rows) {
				const mapped = mapPriorEmployerYtd(row);
				if (!mapped.ok) {
					return mapped;
				}
				records.push(mapped.data);
			}
			return errorResult.ok(records);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list prior-employer year-to-date records",
			);
		}
	},

	async recordPriorEmployerYtd(record, _ports, meta) {
		const brandedId = parseHumanResourcesPriorEmployerYtdId(randomUUID());
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareStatutoryAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_prior_employer_ytd",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: {
				employeeId: record.employeeId,
				jurisdictionCode: record.jurisdictionCode,
				taxYear: record.taxYear,
				version: 1,
			},
			meta,
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH mutated AS (
						INSERT INTO hr_prior_employer_ytd (
							id, organization_id, employee_id, jurisdiction_code, tax_year,
							prior_employer_name, gross_amount, tax_withheld_amount,
							statutory_contribution_amount, currency_code, recorded_on,
							create_idempotency_key, create_request_fingerprint, version,
							created_by, updated_by
						) VALUES (
							${brandedId.data}, ${record.organizationId}, ${record.employeeId},
							${record.jurisdictionCode}, ${record.taxYear},
							${record.priorEmployerName}, ${record.grossAmount},
							${record.taxWithheldAmount},
							${record.statutoryContributionAmount}, ${record.currencyCode},
							${record.recordedOn}::date, ${record.createIdempotencyKey},
							${record.createRequestFingerprint}, 1, ${record.createdBy},
							${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated JOIN audited ON true
				`,
			]);
			if (rows[0] === undefined) {
				return conflict("Unable to record prior-employer year-to-date");
			}
			const sealed = await afendaDatabase.client
				.select()
				.from(hrPriorEmployerYtd)
				.where(
					and(
						eq(hrPriorEmployerYtd.organizationId, record.organizationId),
						eq(hrPriorEmployerYtd.id, brandedId.data),
					),
				)
				.limit(1);
			const [row] = sealed;
			if (!row) {
				return conflict("Unable to record prior-employer year-to-date");
			}
			return mapPriorEmployerYtd(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const existing = await this.findPriorEmployerYtdByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) {
					return existing;
				}
				if (
					existing.data !== null &&
					existing.data.createRequestFingerprint ===
						record.createRequestFingerprint
				) {
					return errorResult.ok(existing.data.record);
				}
			}
			return conflict("Prior-employer year-to-date conflict");
		}
	},
};
