import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	eq,
	gte,
	isNull,
	lte,
	mdOrganizationDimension,
	or,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fromPostgresUnknown } from "@afenda/errors/adapters/postgres";
import {
	fail,
	failFromAppError,
	failFromUnknown,
	ok,
	type Result,
} from "@afenda/errors/result";
import { z } from "zod";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import {
	expectedVersionSchema,
	orgActorContextSchema,
	orgQueryActorSchema,
} from "../../contracts/context";
import {
	MASTER_COMMAND_ORGANIZATION_DIMENSION_ACTIVATE,
	MASTER_COMMAND_ORGANIZATION_DIMENSION_ARCHIVE,
	MASTER_COMMAND_ORGANIZATION_DIMENSION_CREATE,
	MASTER_COMMAND_ORGANIZATION_DIMENSION_DEACTIVATE,
	MASTER_COMMAND_ORGANIZATION_DIMENSION_UPDATE,
	MASTER_QUERY_ORGANIZATION_DIMENSION_GET_BY_CODE,
	MASTER_QUERY_ORGANIZATION_DIMENSION_GET_BY_ID,
	MASTER_QUERY_ORGANIZATION_DIMENSION_GET_EFFECTIVE,
	MASTER_QUERY_ORGANIZATION_DIMENSION_LIST,
	MASTER_QUERY_ORGANIZATION_DIMENSION_RESOLVE_AS_OF,
} from "../../module-ids";
import { resolveTenantScopedCasMiss } from "../lifecycle-governance";
import { normalizeMasterCode } from "./normalized-code";
import type {
	OrganizationDimensionOptions,
	OrganizationDimensionStore,
} from "./organization-dimension-store";

function failFromPersistence(error: unknown, fallbackMessage: string) {
	const mapped = fromPostgresUnknown(error);
	return mapped === undefined
		? failFromUnknown(error, fallbackMessage)
		: failFromAppError(mapped);
}

// 1. Constants and domain types

export const ORGANIZATION_DIMENSION_KINDS = [
	"legal_entity",
	"business_unit",
	"location",
	"department",
	"cost_center",
	"cost_centre",
	"profit_center",
	"channel",
	"region",
	"brand",
	"project",
	"custom",
] as const;

export type OrganizationDimensionKind =
	(typeof ORGANIZATION_DIMENSION_KINDS)[number];

export type OrganizationDimension = {
	id: string;
	organizationId: string;
	kind: OrganizationDimensionKind;
	key: string;
	name: string;
	parentId: string | null;
	status: "active" | "inactive" | "archived";
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesId: string | null;
	version: number;
	createdBy: string;
	createdAt: Date;
	updatedBy: string;
	updatedAt: Date;
};

export type OrganizationDimensionReference = Pick<
	OrganizationDimension,
	"id" | "kind" | "key" | "name"
>;

// 2. Input schemas

const isoDateSchema = z.iso.date();
const organizationDimensionStatusSchema = z.enum([
	"active",
	"inactive",
	"archived",
]);
const organizationDimensionPageSchema = z.number().int().positive().default(1);
const organizationDimensionPageSizeSchema = z
	.number()
	.int()
	.positive()
	.max(100)
	.default(25);

export const createOrganizationDimensionInputSchema = orgActorContextSchema
	.extend({
		kind: z.enum(ORGANIZATION_DIMENSION_KINDS),
		key: z.string().trim().min(1).max(100),
		name: z.string().trim().min(1).max(200),
		parentId: z.uuid().nullable().optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		supersedesId: z.uuid().nullable().optional(),
		supersedesExpectedVersion: expectedVersionSchema.nullable().optional(),
	})
	.strict()
	.superRefine((value, context) => {
		if (
			value.effectiveTo !== undefined &&
			value.effectiveTo !== null &&
			value.effectiveTo < value.effectiveFrom
		) {
			context.addIssue({
				code: "custom",
				path: ["effectiveTo"],
				message: "effectiveTo must be on or after effectiveFrom",
			});
		}

		const hasSupersedesId = value.supersedesId != null;
		const hasExpectedVersion = value.supersedesExpectedVersion != null;
		if (hasSupersedesId === hasExpectedVersion) return;

		context.addIssue({
			code: "custom",
			path: hasSupersedesId ? ["supersedesExpectedVersion"] : ["supersedesId"],
			message: hasSupersedesId
				? "supersedesExpectedVersion is required when supersedesId is provided"
				: "supersedesId is required when supersedesExpectedVersion is provided",
		});
	});

export const resolveOrganizationDimensionsAsOfInputSchema = orgQueryActorSchema
	.extend({
		asOf: isoDateSchema,
		keys: z
			.object({
				legal_entity: z.string().trim().min(1).max(100),
				business_unit: z.string().trim().min(1).max(100),
				location: z.string().trim().min(1).max(100),
				cost_centre: z.string().trim().min(1).max(100),
				project: z.string().trim().min(1).max(100),
			})
			.strict(),
	})
	.strict();

export const getOrganizationDimensionEffectiveInputSchema = z.union([
	orgQueryActorSchema
		.extend({
			kind: z.enum(ORGANIZATION_DIMENSION_KINDS),
			asOf: isoDateSchema,
			id: z.uuid(),
			key: z.never().optional(),
		})
		.strict(),
	orgQueryActorSchema
		.extend({
			kind: z.enum(ORGANIZATION_DIMENSION_KINDS),
			asOf: isoDateSchema,
			id: z.never().optional(),
			key: z.string().trim().min(1).max(100),
		})
		.strict(),
]);

export const updateOrganizationDimensionInputSchema = orgActorContextSchema
	.extend({
		id: z.uuid(),
		expectedVersion: expectedVersionSchema,
		name: z.string().trim().min(1).max(200).optional(),
		parentId: z.uuid().nullable().optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
	})
	.strict();

export const organizationDimensionLifecycleInputSchema = orgActorContextSchema
	.extend({
		id: z.uuid(),
		expectedVersion: expectedVersionSchema,
	})
	.strict();

export const getOrganizationDimensionByIdInputSchema = orgQueryActorSchema
	.extend({
		id: z.uuid(),
	})
	.strict();

export const getOrganizationDimensionByCodeInputSchema = orgQueryActorSchema
	.extend({
		kind: z.enum(ORGANIZATION_DIMENSION_KINDS),
		key: z.string().trim().min(1).max(100),
	})
	.strict();

export const listOrganizationDimensionsInputSchema = orgQueryActorSchema
	.extend({
		kind: z.enum(ORGANIZATION_DIMENSION_KINDS).optional(),
		status: organizationDimensionStatusSchema
			.or(z.literal("all"))
			.default("active"),
		parentId: z.uuid().nullable().optional(),
		page: organizationDimensionPageSchema,
		pageSize: organizationDimensionPageSizeSchema,
	})
	.strict();

// 4. SQL row mapping

type OrganizationDimensionSqlRow = {
	id: string;
	organization_id: string;
	kind: OrganizationDimensionKind;
	key: string;
	normalized_key: string;
	name: string;
	effective_from: string;
	effective_to: string | null;
	supersedes_id: string | null;
	parent_id?: string | null;
	status?: "active" | "inactive" | "archived";
	version: number;
	created_by: string;
	created_at: Date;
	updated_by: string | null;
	updated_at: Date | null;
};

function mapDimension(
	row:
		| OrganizationDimensionSqlRow
		| typeof mdOrganizationDimension.$inferSelect,
): OrganizationDimension {
	if ("organization_id" in row) {
		return {
			id: row.id,
			organizationId: row.organization_id,
			kind: row.kind,
			key: row.key,
			name: row.name,
			parentId: row.parent_id ?? null,
			status: row.status ?? "active",
			effectiveFrom: row.effective_from,
			effectiveTo: row.effective_to,
			supersedesId: row.supersedes_id,
			version: row.version,
			createdBy: row.created_by,
			createdAt: row.created_at,
			updatedBy: row.updated_by ?? row.created_by,
			updatedAt: row.updated_at ?? row.created_at,
		};
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		kind: z.enum(ORGANIZATION_DIMENSION_KINDS).parse(row.kind),
		key: row.key,
		name: row.name,
		parentId: "parentId" in row ? row.parentId : null,
		status:
			"status" in row
				? organizationDimensionStatusSchema.parse(row.status)
				: "active",
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesId: row.supersedesId,
		version: row.version,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		updatedBy: row.updatedBy ?? row.createdBy,
		updatedAt: row.updatedAt ?? row.createdAt,
	};
}

async function loadOrganizationDimensionVersion(
	organizationId: string,
	id: string,
): Promise<Result<{ id: string; version: number } | null>> {
	try {
		const [row] = await db
			.select({
				id: mdOrganizationDimension.id,
				version: mdOrganizationDimension.version,
			})
			.from(mdOrganizationDimension)
			.where(
				and(
					eq(mdOrganizationDimension.organizationId, organizationId),
					eq(mdOrganizationDimension.id, id),
				),
			)
			.limit(1);
		return ok(row ?? null);
	} catch (error) {
		return failFromPersistence(
			error,
			"Failed to inspect organization dimension version",
		);
	}
}

// 5. Drizzle store

export function createDrizzleOrganizationDimensionStore(): OrganizationDimensionStore {
	return {
		async create(record) {
			const id = randomUUID();
			const createAuditId = randomUUID();
			const predecessorAuditId = randomUUID();
			const eventId = randomUUID();
			try {
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], OrganizationDimensionSqlRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${record.organizationId}:${record.kind}:${record.normalizedKey}`}, 0))`,
					sql`
						WITH predecessor AS (
							SELECT existing.*
							FROM md_organization_dimension existing
							WHERE ${record.supersedesId}::uuid IS NOT NULL
								AND existing.id = ${record.supersedesId}
								AND existing.organization_id = ${record.organizationId}
								AND existing.kind = ${record.kind}
								AND existing.normalized_key = ${record.normalizedKey}
								AND existing.version = ${record.supersedesExpectedVersion}
								AND existing.effective_from < ${record.effectiveFrom}
								AND (
									existing.effective_to IS NULL
									OR existing.effective_to >= ${record.effectiveFrom}
								)
								AND NOT EXISTS (
									SELECT 1
									FROM md_organization_dimension successor
									WHERE successor.organization_id = existing.organization_id
										AND successor.supersedes_id = existing.id
								)
							FOR UPDATE
						),
						predecessor_guard AS (
							SELECT 1
							WHERE ${record.supersedesId}::uuid IS NULL
								OR EXISTS (SELECT 1 FROM predecessor)
						),
						range_guard AS (
							SELECT 1
							FROM predecessor_guard
							WHERE NOT EXISTS (
								SELECT 1
								FROM md_organization_dimension existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.kind = ${record.kind}
									AND existing.normalized_key = ${record.normalizedKey}
									AND (
										${record.supersedesId}::uuid IS NULL
										OR existing.id <> ${record.supersedesId}
									)
									AND existing.effective_from <= COALESCE(
										${record.effectiveTo}::date,
										'9999-12-31'::date
									)
									AND (
										existing.effective_to IS NULL
										OR existing.effective_to >= ${record.effectiveFrom}
									)
							)
						),
						closed_predecessor AS (
							UPDATE md_organization_dimension predecessor_row
							SET
								effective_to = (${record.effectiveFrom}::date - 1),
								version = predecessor_row.version + 1,
								updated_by = ${record.createdBy},
								updated_at = now()
							FROM predecessor, range_guard
							WHERE predecessor_row.id = predecessor.id
							RETURNING predecessor_row.*
						),
						create_guard AS (
							SELECT 1
							FROM range_guard
							WHERE ${record.supersedesId}::uuid IS NULL
								OR EXISTS (SELECT 1 FROM closed_predecessor)
						),
						mutated AS (
							INSERT INTO md_organization_dimension (
								id, organization_id, kind, key, normalized_key, name,
								parent_id, status, effective_from, effective_to,
								supersedes_id, version, created_by, updated_by, updated_at
							)
							SELECT
								${id}::uuid, ${record.organizationId}, ${record.kind}, ${record.key},
								${record.normalizedKey}, ${record.name}, ${record.parentId}::uuid,
								${record.status}, ${record.effectiveFrom}::date, ${record.effectiveTo}::date,
								${record.supersedesId}::uuid, 1, ${record.createdBy}, ${record.updatedBy}, now()
							FROM create_guard
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes
							)
							SELECT
								${createAuditId}::uuid, organization_id, ${record.createdBy},
								${record.correlationId}, 'master_data',
								'organization_dimension', id,
								CASE
									WHEN supersedes_id IS NULL THEN 'CREATE'
									ELSE 'SUPERSEDE_CREATE'
								END,
								jsonb_build_array(
								jsonb_build_object('field', 'kind', 'before', NULL, 'after', kind),
								jsonb_build_object('field', 'key', 'before', NULL, 'after', key),
								jsonb_build_object('field', 'name', 'before', NULL, 'after', name),
								jsonb_build_object('field', 'parentId', 'before', NULL, 'after', parent_id),
								jsonb_build_object('field', 'status', 'before', NULL, 'after', status),
								jsonb_build_object('field', 'effectiveFrom', 'before', NULL, 'after', effective_from),
									jsonb_build_object('field', 'effectiveTo', 'before', NULL, 'after', effective_to),
									jsonb_build_object('field', 'supersedesId', 'before', NULL, 'after', supersedes_id)
								)
							FROM mutated
							UNION ALL
							SELECT
								${predecessorAuditId}::uuid, closed_predecessor.organization_id,
								${record.createdBy}, ${record.correlationId}, 'master_data',
								'organization_dimension', closed_predecessor.id,
								'SUPERSEDE_CLOSE',
								jsonb_build_array(
									jsonb_build_object(
										'field', 'effectiveTo',
										'before', predecessor.effective_to,
										'after', closed_predecessor.effective_to
									),
									jsonb_build_object(
										'field', 'version',
										'before', predecessor.version,
										'after', closed_predecessor.version
									)
								)
							FROM closed_predecessor
							INNER JOIN predecessor ON predecessor.id = closed_predecessor.id
							RETURNING id
						),
						emitted AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}::uuid, organization_id,
								CASE
									WHEN supersedes_id IS NULL
										THEN 'master_data.organization_dimension.created.v1'
									ELSE 'master_data.organization_dimension.superseded.v1'
								END,
								'master_data', ${record.correlationId}, ${record.createdBy},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'organization_dimension',
									'entityId', id,
									'kind', kind,
									'code', key,
									'effectiveFrom', effective_from,
									'effectiveTo', effective_to,
									'supersedesId', supersedes_id,
									'version', version,
									'actorId', ${record.createdBy}::text,
									'correlationId', ${record.correlationId}::text
								), 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.*
						FROM mutated
						WHERE EXISTS (SELECT 1 FROM audited)
							AND EXISTS (SELECT 1 FROM emitted)
					`,
				]);
				const row = rows[0];
				if (!row) {
					if (record.supersedesId) {
						return fail(
							"CONFLICT",
							"Organization dimension could not supersede the selected revision",
							{
								reason: "MASTER_VERSION_CONFLICT",
								supersedesId: record.supersedesId,
								expectedVersion: record.supersedesExpectedVersion,
								kind: record.kind,
								key: record.key,
								effectiveFrom: record.effectiveFrom,
							},
						);
					}
					return fail(
						"CONFLICT",
						"Organization dimension overlaps an effective version",
						{ reason: "MASTER_EFFECTIVE_RANGE_OVERLAP" },
					);
				}
				return ok(mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to create organization dimension",
				);
			}
		},
		async update(record) {
			try {
				const auditId = randomUUID();
				const eventId = randomUUID();
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], OrganizationDimensionSqlRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${record.organizationId}:${record.id}`}, 0))`,
					sql`
						WITH current_row AS (
							SELECT *
							FROM md_organization_dimension
							WHERE organization_id = ${record.organizationId}
								AND id = ${record.id}
								AND version = ${record.expectedVersion}
								AND status <> 'archived'
							FOR UPDATE
						),
						parent_guard AS (
							SELECT 1
							FROM current_row
							WHERE ${record.parentIdProvided} = false
								OR ${record.parentId}::uuid IS NULL
								OR EXISTS (
									SELECT 1
									FROM md_organization_dimension parent
									WHERE parent.organization_id = ${record.organizationId}
										AND parent.id = ${record.parentId}
										AND parent.status = 'active'
										AND parent.id <> current_row.id
								)
						),
						cycle_guard AS (
							WITH RECURSIVE ancestors AS (
								SELECT parent.id, parent.parent_id
								FROM md_organization_dimension parent, current_row
								WHERE ${record.parentId}::uuid IS NOT NULL
									AND parent.organization_id = ${record.organizationId}
									AND parent.id = ${record.parentId}
								UNION ALL
								SELECT parent.id, parent.parent_id
								FROM md_organization_dimension parent
								INNER JOIN ancestors ON ancestors.parent_id = parent.id
								WHERE parent.organization_id = ${record.organizationId}
							)
							SELECT 1
							FROM parent_guard
							WHERE ${record.parentIdProvided} = false
								OR ${record.parentId}::uuid IS NULL
								OR NOT EXISTS (
									SELECT 1 FROM ancestors WHERE id = ${record.id}
								)
						),
						mutated AS (
							UPDATE md_organization_dimension dimension
							SET
								name = COALESCE(${record.name}, dimension.name),
								parent_id = CASE
									WHEN ${record.parentIdProvided} = false THEN dimension.parent_id
									ELSE ${record.parentId}
								END,
								effective_to = CASE
									WHEN ${record.effectiveTo}::date IS NULL THEN dimension.effective_to
									ELSE ${record.effectiveTo}
								END,
								version = dimension.version + 1,
								updated_by = ${record.updatedBy},
								updated_at = now()
							FROM cycle_guard
							WHERE dimension.organization_id = ${record.organizationId}
								AND dimension.id = ${record.id}
							RETURNING dimension.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes
							)
							SELECT
								${auditId}::uuid, organization_id, ${record.updatedBy},
								${record.correlationId}, 'master_data',
								'organization_dimension', id, 'UPDATE',
								jsonb_build_object('version', version)
							FROM mutated
							RETURNING id
						),
						emitted AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}::uuid, organization_id,
								'master_data.organization_dimension.updated.v1',
								'master_data', ${record.correlationId}, ${record.updatedBy},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'organization_dimension',
									'entityId', id,
									'kind', kind,
									'code', key,
									'version', version,
									'actorId', ${record.updatedBy}::text,
									'correlationId', ${record.correlationId}::text
								), 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.*
						FROM mutated
						WHERE EXISTS (SELECT 1 FROM audited)
							AND EXISTS (SELECT 1 FROM emitted)
					`,
				]);
				const row = rows[0];
				if (row === undefined) {
					return resolveTenantScopedCasMiss({
						entityType: "organization_dimension",
						entityId: record.id,
						expectedVersion: record.expectedVersion,
						loadCurrent: () =>
							loadOrganizationDimensionVersion(
								record.organizationId,
								record.id,
							),
						notFoundMessage: "Organization dimension not found",
						unchangedMissMessage:
							"Organization dimension update did not satisfy mutation guards",
					});
				}
				return ok(mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to update organization dimension",
				);
			}
		},
		async transition(input) {
			try {
				const auditId = randomUUID();
				const eventId = randomUUID();
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], OrganizationDimensionSqlRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.organizationId}:${input.id}`}, 0))`,
					sql`
						WITH current_row AS (
							SELECT *
							FROM md_organization_dimension
							WHERE organization_id = ${input.organizationId}
								AND id = ${input.id}
								AND version = ${input.expectedVersion}
							FOR UPDATE
						),
						mutated AS (
							UPDATE md_organization_dimension dimension
							SET
								status = ${input.status},
								version = dimension.version + 1,
								updated_by = ${input.updatedBy},
								updated_at = now()
							FROM current_row
							WHERE dimension.organization_id = ${input.organizationId}
								AND dimension.id = ${input.id}
							RETURNING dimension.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.updatedBy},
								${input.correlationId}, 'master_data',
								'organization_dimension', id, upper(${input.status}),
								jsonb_build_object('status', status, 'version', version)
							FROM mutated
							RETURNING id
						),
						emitted AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id,
								'master_data.organization_dimension.status_changed.v1',
								'master_data', ${input.correlationId}, ${input.updatedBy},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'organization_dimension',
									'entityId', id,
									'kind', kind,
									'code', key,
									'status', status,
									'version', version,
									'actorId', ${input.updatedBy},
									'correlationId', ${input.correlationId}
								), 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.*
						FROM mutated
						WHERE EXISTS (SELECT 1 FROM audited)
							AND EXISTS (SELECT 1 FROM emitted)
					`,
				]);
				const row = rows[0];
				if (row === undefined) {
					return resolveTenantScopedCasMiss({
						entityType: "organization_dimension",
						entityId: input.id,
						expectedVersion: input.expectedVersion,
						loadCurrent: () =>
							loadOrganizationDimensionVersion(input.organizationId, input.id),
						notFoundMessage: "Organization dimension not found",
						unchangedMissMessage:
							"Organization dimension transition did not satisfy mutation guards",
					});
				}
				return ok(mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to transition organization dimension",
				);
			}
		},
		async getById(input) {
			try {
				const [row] = await db
					.select()
					.from(mdOrganizationDimension)
					.where(
						and(
							eq(mdOrganizationDimension.organizationId, input.organizationId),
							eq(mdOrganizationDimension.id, input.id),
						),
					)
					.limit(1);
				return ok(row === undefined ? null : mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to get organization dimension",
				);
			}
		},
		async getByCode(input) {
			try {
				const rows = await db
					.select()
					.from(mdOrganizationDimension)
					.where(
						and(
							eq(mdOrganizationDimension.organizationId, input.organizationId),
							eq(mdOrganizationDimension.kind, input.kind),
							eq(mdOrganizationDimension.normalizedKey, input.normalizedKey),
						),
					)
					.orderBy(
						asc(mdOrganizationDimension.effectiveFrom),
						asc(mdOrganizationDimension.id),
					)
					.limit(2);
				if (rows.length > 1) {
					return fail("CONFLICT", "Organization dimension code is ambiguous", {
						reason: "MASTER_DIMENSION_AMBIGUOUS",
						kind: input.kind,
					});
				}
				const row = rows[0];
				return ok(row === undefined ? null : mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to get organization dimension by code",
				);
			}
		},
		async list(input) {
			try {
				const predicates = [
					eq(mdOrganizationDimension.organizationId, input.organizationId),
				];
				if (input.kind !== undefined) {
					predicates.push(eq(mdOrganizationDimension.kind, input.kind));
				}
				if (input.status !== undefined && input.status !== "all") {
					predicates.push(eq(mdOrganizationDimension.status, input.status));
				}
				if (input.parentId !== undefined) {
					predicates.push(
						input.parentId === null
							? isNull(mdOrganizationDimension.parentId)
							: eq(mdOrganizationDimension.parentId, input.parentId),
					);
				}
				const offset = (input.page - 1) * input.pageSize;
				const rows = await db
					.select()
					.from(mdOrganizationDimension)
					.where(and(...predicates))
					.orderBy(
						asc(mdOrganizationDimension.kind),
						asc(mdOrganizationDimension.normalizedKey),
						asc(mdOrganizationDimension.effectiveFrom),
					)
					.limit(input.pageSize)
					.offset(offset);
				return ok({ items: rows.map(mapDimension), total: rows.length });
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to list organization dimensions",
				);
			}
		},
		async findEffective(input) {
			try {
				const rows = await db
					.select()
					.from(mdOrganizationDimension)
					.where(
						and(
							eq(mdOrganizationDimension.organizationId, input.organizationId),
							eq(mdOrganizationDimension.kind, input.kind),
							eq(mdOrganizationDimension.normalizedKey, input.normalizedKey),
							lte(mdOrganizationDimension.effectiveFrom, input.asOf),
							or(
								isNull(mdOrganizationDimension.effectiveTo),
								gte(mdOrganizationDimension.effectiveTo, input.asOf),
							),
						),
					)
					.orderBy(
						asc(mdOrganizationDimension.effectiveFrom),
						asc(mdOrganizationDimension.id),
					);
				return ok(rows.map(mapDimension));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to resolve organization dimension",
				);
			}
		},
		async findEffectiveById(input) {
			try {
				const rows = await db
					.select()
					.from(mdOrganizationDimension)
					.where(
						and(
							eq(mdOrganizationDimension.organizationId, input.organizationId),
							eq(mdOrganizationDimension.id, input.id),
							eq(mdOrganizationDimension.kind, input.kind),
							lte(mdOrganizationDimension.effectiveFrom, input.asOf),
							or(
								isNull(mdOrganizationDimension.effectiveTo),
								gte(mdOrganizationDimension.effectiveTo, input.asOf),
							),
						),
					)
					.orderBy(
						asc(mdOrganizationDimension.effectiveFrom),
						asc(mdOrganizationDimension.id),
					);
				return ok(rows.map(mapDimension));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to resolve organization dimension by id",
				);
			}
		},
	};
}

// 6. Store resolver

function resolveStore(
	store?: OrganizationDimensionStore,
): OrganizationDimensionStore {
	return store ?? createDrizzleOrganizationDimensionStore();
}

// 7. Internal policies and helpers

function toDimensionReference(
	dimension: OrganizationDimension,
): OrganizationDimensionReference {
	return {
		id: dimension.id,
		kind: dimension.kind,
		key: dimension.key,
		name: dimension.name,
	};
}

function resolveUniqueEffectiveMatch(
	matches: readonly OrganizationDimension[],
	context: {
		kind: OrganizationDimensionKind;
		asOf: string;
		id?: string | undefined;
		key?: string | undefined;
	},
): Result<OrganizationDimensionReference | null> {
	if (matches.length === 0) return ok(null);

	if (matches.length > 1) {
		return fail("CONFLICT", "Organization dimension is ambiguous", {
			reason: "MASTER_DIMENSION_AMBIGUOUS",
			kind: context.kind,
			asOf: context.asOf,
			...(context.id ? { id: context.id } : {}),
			...(context.key ? { key: context.key } : {}),
		});
	}

	const match = matches[0];
	if (!match) {
		return fail(
			"INTERNAL_ERROR",
			"Resolved organization dimension is unexpectedly missing",
			{ reason: "MASTER_NOT_FOUND", kind: context.kind, asOf: context.asOf },
		);
	}

	return ok(toDimensionReference(match));
}

async function resolveRequiredEffectiveDimension(
	store: OrganizationDimensionStore,
	input: {
		organizationId: string;
		kind: OrganizationDimensionKind;
		key: string;
		asOf: string;
	},
): Promise<Result<OrganizationDimensionReference>> {
	const normalized = normalizeMasterCode(input.key);
	if (!normalized.ok) return normalized;

	const matches = await store.findEffective({
		organizationId: input.organizationId,
		kind: input.kind,
		normalizedKey: normalized.data.normalizedCode,
		asOf: input.asOf,
	});
	if (!matches.ok) return matches;

	const unique = resolveUniqueEffectiveMatch(matches.data, input);
	if (!unique.ok) return unique;
	if (!unique.data) {
		return fail("NOT_FOUND", "Organization dimension is not effective", {
			reason: "MASTER_DIMENSION_NOT_EFFECTIVE",
			kind: input.kind,
			key: input.key,
			asOf: input.asOf,
		});
	}

	return ok(unique.data);
}

async function resolveSingleEffectiveDimension(
	store: OrganizationDimensionStore,
	input: {
		organizationId: string;
		kind: OrganizationDimensionKind;
		asOf: string;
		id?: string | undefined;
		key?: string | undefined;
	},
): Promise<Result<OrganizationDimensionReference | null>> {
	if (input.id) {
		const matches = await store.findEffectiveById({
			organizationId: input.organizationId,
			id: input.id,
			kind: input.kind,
			asOf: input.asOf,
		});
		if (!matches.ok) return matches;
		return resolveUniqueEffectiveMatch(matches.data, {
			kind: input.kind,
			id: input.id,
			asOf: input.asOf,
		});
	}

	const normalized = normalizeMasterCode(input.key ?? "");
	if (!normalized.ok) return normalized;
	const matches = await store.findEffective({
		organizationId: input.organizationId,
		kind: input.kind,
		normalizedKey: normalized.data.normalizedCode,
		asOf: input.asOf,
	});
	if (!matches.ok) return matches;
	return resolveUniqueEffectiveMatch(matches.data, {
		kind: input.kind,
		key: input.key,
		asOf: input.asOf,
	});
}

// 8. Public commands

export async function createOrganizationDimension(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<OrganizationDimension>> {
	const parsed = createOrganizationDimensionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid organization dimension create input", {
			issues: parsed.error.issues,
		});
	}
	const authorized = await requireMasterCommandPermission(
		options.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: MASTER_COMMAND_ORGANIZATION_DIMENSION_CREATE,
		},
	);
	if (!authorized.ok) return authorized;
	const normalized = normalizeMasterCode(parsed.data.key);
	if (!normalized.ok) return normalized;
	return resolveStore(options.store).create({
		organizationId: parsed.data.organizationId,
		kind: parsed.data.kind,
		key: normalized.data.code,
		normalizedKey: normalized.data.normalizedCode,
		name: parsed.data.name,
		parentId: parsed.data.parentId ?? null,
		status: "active",
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: parsed.data.effectiveTo ?? null,
		supersedesId: parsed.data.supersedesId ?? null,
		supersedesExpectedVersion: parsed.data.supersedesExpectedVersion ?? null,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

export async function updateOrganizationDimension(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<OrganizationDimension>> {
	const parsed = updateOrganizationDimensionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid organization dimension update input", {
			issues: parsed.error.issues,
		});
	}
	const authorized = await requireMasterCommandPermission(
		options.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: MASTER_COMMAND_ORGANIZATION_DIMENSION_UPDATE,
		},
	);
	if (!authorized.ok) return authorized;
	return resolveStore(options.store).update({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		expectedVersion: parsed.data.expectedVersion,
		name: parsed.data.name,
		parentId: parsed.data.parentId,
		parentIdProvided: Object.hasOwn(parsed.data, "parentId"),
		effectiveTo: parsed.data.effectiveTo,
		updatedBy: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

async function transitionOrganizationDimension(
	input: unknown,
	options: OrganizationDimensionOptions,
	status: "active" | "inactive" | "archived",
	command:
		| typeof MASTER_COMMAND_ORGANIZATION_DIMENSION_ACTIVATE
		| typeof MASTER_COMMAND_ORGANIZATION_DIMENSION_DEACTIVATE
		| typeof MASTER_COMMAND_ORGANIZATION_DIMENSION_ARCHIVE,
): Promise<Result<OrganizationDimension>> {
	const parsed = organizationDimensionLifecycleInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid organization dimension lifecycle input",
			{ issues: parsed.error.issues },
		);
	}
	const authorized = await requireMasterCommandPermission(
		options.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command,
		},
	);
	if (!authorized.ok) return authorized;
	return resolveStore(options.store).transition({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		expectedVersion: parsed.data.expectedVersion,
		status,
		updatedBy: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

export async function activateOrganizationDimension(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<OrganizationDimension>> {
	return transitionOrganizationDimension(
		input,
		options,
		"active",
		MASTER_COMMAND_ORGANIZATION_DIMENSION_ACTIVATE,
	);
}

export async function deactivateOrganizationDimension(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<OrganizationDimension>> {
	return transitionOrganizationDimension(
		input,
		options,
		"inactive",
		MASTER_COMMAND_ORGANIZATION_DIMENSION_DEACTIVATE,
	);
}

export async function archiveOrganizationDimension(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<OrganizationDimension>> {
	return transitionOrganizationDimension(
		input,
		options,
		"archived",
		MASTER_COMMAND_ORGANIZATION_DIMENSION_ARCHIVE,
	);
}

// 9. Public queries

export async function resolveOrganizationDimensionsAsOf(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<
	Result<
		Partial<Record<OrganizationDimensionKind, OrganizationDimensionReference>>
	>
> {
	const parsed = resolveOrganizationDimensionsAsOfInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid organization dimension resolve input", {
			issues: parsed.error.issues,
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_RESOLVE_AS_OF,
	});
	if (!authorized.ok) return authorized;
	const store = resolveStore(options.store);
	const [legalEntity, businessUnit, location, costCentre, project] =
		await Promise.all([
			resolveRequiredEffectiveDimension(store, {
				organizationId: parsed.data.organizationId,
				kind: "legal_entity",
				key: parsed.data.keys.legal_entity,
				asOf: parsed.data.asOf,
			}),
			resolveRequiredEffectiveDimension(store, {
				organizationId: parsed.data.organizationId,
				kind: "business_unit",
				key: parsed.data.keys.business_unit,
				asOf: parsed.data.asOf,
			}),
			resolveRequiredEffectiveDimension(store, {
				organizationId: parsed.data.organizationId,
				kind: "location",
				key: parsed.data.keys.location,
				asOf: parsed.data.asOf,
			}),
			resolveRequiredEffectiveDimension(store, {
				organizationId: parsed.data.organizationId,
				kind: "cost_centre",
				key: parsed.data.keys.cost_centre,
				asOf: parsed.data.asOf,
			}),
			resolveRequiredEffectiveDimension(store, {
				organizationId: parsed.data.organizationId,
				kind: "project",
				key: parsed.data.keys.project,
				asOf: parsed.data.asOf,
			}),
		]);

	if (!legalEntity.ok) return legalEntity;
	if (!businessUnit.ok) return businessUnit;
	if (!location.ok) return location;
	if (!costCentre.ok) return costCentre;
	if (!project.ok) return project;

	return ok({
		legal_entity: legalEntity.data,
		business_unit: businessUnit.data,
		location: location.data,
		cost_centre: costCentre.data,
		project: project.data,
	});
}

export async function getOrganizationDimensionEffective(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<OrganizationDimensionReference | null>> {
	const parsed = getOrganizationDimensionEffectiveInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid organization dimension lookup input", {
			issues: parsed.error.issues,
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_GET_EFFECTIVE,
	});
	if (!authorized.ok) return authorized;
	return resolveSingleEffectiveDimension(resolveStore(options.store), {
		organizationId: parsed.data.organizationId,
		kind: parsed.data.kind,
		asOf: parsed.data.asOf,
		id: parsed.data.id,
		key: parsed.data.key,
	});
}

export async function getOrganizationDimensionById(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<OrganizationDimension | null>> {
	const parsed = getOrganizationDimensionByIdInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid organization dimension get input", {
			issues: parsed.error.issues,
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_GET_BY_ID,
	});
	if (!authorized.ok) return authorized;
	return resolveStore(options.store).getById({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
	});
}

export async function getOrganizationDimensionByCode(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<OrganizationDimension | null>> {
	const parsed = getOrganizationDimensionByCodeInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid organization dimension get-by-code input",
			{ issues: parsed.error.issues },
		);
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_GET_BY_CODE,
	});
	if (!authorized.ok) return authorized;
	const normalized = normalizeMasterCode(parsed.data.key);
	if (!normalized.ok) return normalized;
	return resolveStore(options.store).getByCode({
		organizationId: parsed.data.organizationId,
		kind: parsed.data.kind,
		normalizedKey: normalized.data.normalizedCode,
	});
}

export async function listOrganizationDimensions(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<Result<{ items: OrganizationDimension[]; total: number }>> {
	const parsed = listOrganizationDimensionsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid organization dimension list input", {
			issues: parsed.error.issues,
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_LIST,
	});
	if (!authorized.ok) return authorized;
	return resolveStore(options.store).list({
		organizationId: parsed.data.organizationId,
		kind: parsed.data.kind,
		status: parsed.data.status,
		parentId: parsed.data.parentId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}
