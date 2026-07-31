import { randomUUID } from "node:crypto";

import {
	audit as afendaAudit,
	type Change,
	type PreparedTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	eq,
	gte,
	isNull,
	lte,
	mdOrganizationDimension,
	or,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import { z } from "zod";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import {
	expectedVersionSchema,
	masterDataMutationContextSchema,
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

const ORGANIZATION_DIMENSION_AUDIT_SOURCE =
	"master-data.organization-dimension-drizzle";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
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

export interface OrganizationDimension {
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	id: string;
	key: string;
	kind: OrganizationDimensionKind;
	name: string;
	organizationId: string;
	parentId: string | null;
	status: "active" | "inactive" | "archived";
	supersedesId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

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

export const createOrganizationDimensionInputSchema =
	masterDataMutationContextSchema
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

			const hasSupersedesId =
				value.supersedesId !== undefined && value.supersedesId !== null;
			const hasExpectedVersion =
				value.supersedesExpectedVersion !== undefined &&
				value.supersedesExpectedVersion !== null;
			if (hasSupersedesId === hasExpectedVersion) {
				return;
			}

			context.addIssue({
				code: "custom",
				path: hasSupersedesId
					? ["supersedesExpectedVersion"]
					: ["supersedesId"],
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

export const updateOrganizationDimensionInputSchema =
	masterDataMutationContextSchema
		.extend({
			id: z.uuid(),
			expectedVersion: expectedVersionSchema,
			name: z.string().trim().min(1).max(200).optional(),
			parentId: z.uuid().nullable().optional(),
			effectiveTo: isoDateSchema.nullable().optional(),
		})
		.strict();

export const organizationDimensionLifecycleInputSchema =
	masterDataMutationContextSchema
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

interface OrganizationDimensionSqlRow {
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	id: string;
	key: string;
	kind: OrganizationDimensionKind;
	name: string;
	normalized_key: string;
	organization_id: string;
	parent_id?: string | null;
	status?: "active" | "inactive" | "archived";
	supersedes_id: string | null;
	updated_at: Date | null;
	updated_by: string | null;
	version: number;
}

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
		const [row] = await afendaDatabase.client
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
		return errorResult.ok(row ?? null);
	} catch (error) {
		return failFromPersistence(
			error,
			"Failed to inspect organization dimension version",
		);
	}
}

async function loadOrganizationDimensionForAudit(input: {
	id: string;
	organizationId: string;
}): Promise<Result<OrganizationDimension | null>> {
	try {
		const [row] = await afendaDatabase.client
			.select()
			.from(mdOrganizationDimension)
			.where(
				and(
					eq(mdOrganizationDimension.organizationId, input.organizationId),
					eq(mdOrganizationDimension.id, input.id),
				),
			)
			.limit(1);
		return errorResult.ok(row === undefined ? null : mapDimension(row));
	} catch (error) {
		return failFromPersistence(
			error,
			"Failed to inspect organization dimension audit state",
		);
	}
}

function previousIsoDate(value: string): string {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - 1);
	return date.toISOString().slice(0, 10);
}

async function prepareCreateOrganizationDimensionAudits(input: {
	id: string;
	record: Parameters<OrganizationDimensionStore["create"]>[0];
}): Promise<
	Result<{
		createAudit: PreparedTransactionalAuditInsertValues;
		predecessorAudit: PreparedTransactionalAuditInsertValues | null;
	}>
> {
	const preparedCreateAudit = afendaAudit.transaction.prepare({
		organizationId: input.record.organizationId,
		actorUserId: input.record.createdBy,
		correlationId: input.record.correlationId,
		module: "master_data",
		entity: "organization_dimension",
		entityId: input.id,
		action: "CREATE",
		changes: [
			{ field: "kind", oldValue: null, newValue: input.record.kind },
			{ field: "key", oldValue: null, newValue: input.record.key },
			{ field: "name", oldValue: null, newValue: input.record.name },
			{ field: "parentId", oldValue: null, newValue: input.record.parentId },
			{ field: "status", oldValue: null, newValue: input.record.status },
			{
				field: "effectiveFrom",
				oldValue: null,
				newValue: input.record.effectiveFrom,
			},
			{
				field: "effectiveTo",
				oldValue: null,
				newValue: input.record.effectiveTo,
			},
			{
				field: "supersedesId",
				oldValue: null,
				newValue: input.record.supersedesId,
			},
		],
		newValue: {
			effectiveFrom: input.record.effectiveFrom,
			effectiveTo: input.record.effectiveTo,
			key: input.record.key,
			kind: input.record.kind,
			name: input.record.name,
			parentId: input.record.parentId,
			status: input.record.status,
			supersedesId: input.record.supersedesId,
			version: 1,
		},
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: ORGANIZATION_DIMENSION_AUDIT_SOURCE,
			causationId: input.record.correlationId,
			reasonCode:
				input.record.supersedesId === null ? null : "SUPERSEDE_CREATE",
		},
	});
	if (!preparedCreateAudit.ok) {
		return preparedCreateAudit;
	}
	if (input.record.supersedesId === null) {
		return errorResult.ok({
			createAudit: preparedCreateAudit.data,
			predecessorAudit: null,
		});
	}

	const predecessor = await loadOrganizationDimensionForAudit({
		organizationId: input.record.organizationId,
		id: input.record.supersedesId,
	});
	if (!predecessor.ok) {
		return predecessor;
	}
	if (
		predecessor.data === null ||
		predecessor.data.version !== input.record.supersedesExpectedVersion
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Organization dimension could not supersede the selected revision",
		});
	}
	const predecessorEffectiveTo = previousIsoDate(input.record.effectiveFrom);
	const preparedPredecessorAudit = afendaAudit.transaction.prepare({
		organizationId: input.record.organizationId,
		actorUserId: input.record.createdBy,
		correlationId: input.record.correlationId,
		module: "master_data",
		entity: "organization_dimension",
		entityId: predecessor.data.id,
		action: "UPDATE",
		changes: [
			{
				field: "effectiveTo",
				oldValue: predecessor.data.effectiveTo,
				newValue: predecessorEffectiveTo,
			},
			{
				field: "version",
				oldValue: predecessor.data.version,
				newValue: predecessor.data.version + 1,
			},
		],
		oldValue: {
			effectiveTo: predecessor.data.effectiveTo,
			version: predecessor.data.version,
		},
		newValue: {
			effectiveTo: predecessorEffectiveTo,
			version: predecessor.data.version + 1,
		},
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: ORGANIZATION_DIMENSION_AUDIT_SOURCE,
			causationId: input.record.correlationId,
			reasonCode: "SUPERSEDE_CLOSE",
		},
	});
	if (!preparedPredecessorAudit.ok) {
		return preparedPredecessorAudit;
	}
	return errorResult.ok({
		createAudit: preparedCreateAudit.data,
		predecessorAudit: preparedPredecessorAudit.data,
	});
}

async function prepareUpdateOrganizationDimensionAudit(
	record: Parameters<OrganizationDimensionStore["update"]>[0],
): Promise<Result<PreparedTransactionalAuditInsertValues>> {
	const current = await loadOrganizationDimensionForAudit({
		organizationId: record.organizationId,
		id: record.id,
	});
	if (!current.ok) {
		return current;
	}
	if (
		current.data === null ||
		current.data.version !== record.expectedVersion
	) {
		return resolveTenantScopedCasMiss({
			entityType: "organization_dimension",
			entityId: record.id,
			expectedVersion: record.expectedVersion,
			loadCurrent: () =>
				loadOrganizationDimensionVersion(record.organizationId, record.id),
			notFoundMessage: "Organization dimension not found",
			unchangedMissMessage:
				"Organization dimension update did not satisfy mutation guards",
		});
	}
	const nextName = record.name ?? current.data.name;
	const nextParentId = record.parentIdProvided
		? (record.parentId ?? null)
		: current.data.parentId;
	const nextEffectiveTo =
		record.effectiveTo === undefined || record.effectiveTo === null
			? current.data.effectiveTo
			: record.effectiveTo;
	const nextVersion = current.data.version + 1;
	const changes: Change[] = [];
	if (nextName !== current.data.name) {
		changes.push({
			field: "name",
			oldValue: current.data.name,
			newValue: nextName,
		});
	}
	if (nextParentId !== current.data.parentId) {
		changes.push({
			field: "parentId",
			oldValue: current.data.parentId,
			newValue: nextParentId,
		});
	}
	if (nextEffectiveTo !== current.data.effectiveTo) {
		changes.push({
			field: "effectiveTo",
			oldValue: current.data.effectiveTo,
			newValue: nextEffectiveTo,
		});
	}
	changes.push({
		field: "version",
		oldValue: current.data.version,
		newValue: nextVersion,
	});
	return afendaAudit.transaction.prepare({
		organizationId: record.organizationId,
		actorUserId: record.updatedBy,
		correlationId: record.correlationId,
		module: "master_data",
		entity: "organization_dimension",
		entityId: record.id,
		action: "UPDATE",
		changes,
		oldValue: {
			effectiveTo: current.data.effectiveTo,
			name: current.data.name,
			parentId: current.data.parentId,
			version: current.data.version,
		},
		newValue: {
			effectiveTo: nextEffectiveTo,
			name: nextName,
			parentId: nextParentId,
			version: nextVersion,
		},
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: ORGANIZATION_DIMENSION_AUDIT_SOURCE,
			causationId: record.correlationId,
		},
	});
}

// 5. Drizzle store

export function createDrizzleOrganizationDimensionStore(): OrganizationDimensionStore {
	return {
		async create(record) {
			const id = randomUUID();
			const createAuditId = randomUUID();
			const predecessorAuditId = randomUUID();
			const eventId = randomUUID();
			const preparedAudits = await prepareCreateOrganizationDimensionAudits({
				record,
				id,
			});
			if (!preparedAudits.ok) {
				return preparedAudits;
			}
			const { createAudit, predecessorAudit } = preparedAudits.data;
			try {
				const [, rows] = await afendaDatabase.transaction((sql) => [
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
								entity, entity_id, action, changes, old_value, new_value,
								metadata, ip_address, user_agent
							)
							SELECT
								${createAuditId}::uuid, ${createAudit.organizationId},
								${createAudit.actorUserId}, ${createAudit.correlationId},
								${createAudit.module}, ${createAudit.entity}, ${createAudit.entityId},
								${createAudit.action}, ${createAudit.changesJson}::jsonb,
								${createAudit.oldValueJson}::jsonb, ${createAudit.newValueJson}::jsonb,
								${createAudit.metadataJson}::jsonb, ${createAudit.ipAddress},
								${createAudit.userAgent}
							FROM mutated
							UNION ALL
							SELECT
								${predecessorAuditId}::uuid, ${predecessorAudit?.organizationId ?? null},
								${predecessorAudit?.actorUserId ?? null},
								${predecessorAudit?.correlationId ?? null},
								${predecessorAudit?.module ?? null}, ${predecessorAudit?.entity ?? null},
								${predecessorAudit?.entityId ?? null}, ${predecessorAudit?.action ?? null},
								${predecessorAudit?.changesJson ?? null}::jsonb,
								${predecessorAudit?.oldValueJson ?? null}::jsonb,
								${predecessorAudit?.newValueJson ?? null}::jsonb,
								${predecessorAudit?.metadataJson ?? null}::jsonb,
								${predecessorAudit?.ipAddress ?? null},
								${predecessorAudit?.userAgent ?? null}
							FROM closed_predecessor
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
				const [row] = rows;
				if (!row) {
					if (record.supersedesId) {
						return errorResult.fail("CONFLICT", {
							publicMessage:
								"Organization dimension could not supersede the selected revision",
						});
					}
					return errorResult.fail("CONFLICT", {
						publicMessage:
							"Organization dimension overlaps an effective version",
					});
				}
				return errorResult.ok(mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to create organization dimension",
				);
			}
		},
		async update(record) {
			const preparedAudit =
				await prepareUpdateOrganizationDimensionAudit(record);
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			try {
				const auditId = randomUUID();
				const eventId = randomUUID();
				const [, rows] = await afendaDatabase.transaction((sql) => [
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
								entity, entity_id, action, changes, old_value, new_value,
								metadata, ip_address, user_agent
							)
							SELECT
								${auditId}::uuid, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
				const [row] = rows;
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
				return errorResult.ok(mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to update organization dimension",
				);
			}
		},
		async transition(input) {
			const current = await loadOrganizationDimensionForAudit({
				organizationId: input.organizationId,
				id: input.id,
			});
			if (!current.ok) {
				return current;
			}
			if (
				current.data === null ||
				current.data.version !== input.expectedVersion
			) {
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
			const nextVersion = current.data.version + 1;
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: input.organizationId,
				actorUserId: input.updatedBy,
				correlationId: input.correlationId,
				module: "master_data",
				entity: "organization_dimension",
				entityId: input.id,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: current.data.status,
						newValue: input.status,
					},
					{
						field: "version",
						oldValue: current.data.version,
						newValue: nextVersion,
					},
				],
				oldValue: {
					status: current.data.status,
					version: current.data.version,
				},
				newValue: { status: input.status, version: nextVersion },
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: ORGANIZATION_DIMENSION_AUDIT_SOURCE,
					causationId: input.correlationId,
					reasonCode: input.status.toUpperCase(),
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			try {
				const auditId = randomUUID();
				const eventId = randomUUID();
				const [, rows] = await afendaDatabase.transaction((sql) => [
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
								entity, entity_id, action, changes, old_value, new_value,
								metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
				const [row] = rows;
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
				return errorResult.ok(mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to transition organization dimension",
				);
			}
		},
		async getById(input) {
			try {
				const [row] = await afendaDatabase.client
					.select()
					.from(mdOrganizationDimension)
					.where(
						and(
							eq(mdOrganizationDimension.organizationId, input.organizationId),
							eq(mdOrganizationDimension.id, input.id),
						),
					)
					.limit(1);
				return errorResult.ok(row === undefined ? null : mapDimension(row));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to get organization dimension",
				);
			}
		},
		async getByCode(input) {
			try {
				const rows = await afendaDatabase.client
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "Organization dimension code is ambiguous",
					});
				}
				const [row] = rows;
				return errorResult.ok(row === undefined ? null : mapDimension(row));
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
				const rows = await afendaDatabase.client
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
				return errorResult.ok({
					items: rows.map(mapDimension),
					total: rows.length,
				});
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to list organization dimensions",
				);
			}
		},
		async findEffective(input) {
			try {
				const rows = await afendaDatabase.client
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
				return errorResult.ok(rows.map(mapDimension));
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to resolve organization dimension",
				);
			}
		},
		async findEffectiveById(input) {
			try {
				const rows = await afendaDatabase.client
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
				return errorResult.ok(rows.map(mapDimension));
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
	_context: {
		kind: OrganizationDimensionKind;
		asOf: string;
		id?: string | undefined;
		key?: string | undefined;
	},
): Result<OrganizationDimensionReference | null> {
	if (matches.length === 0) {
		return errorResult.ok(null);
	}

	if (matches.length > 1) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Organization dimension is ambiguous",
		});
	}

	const [match] = matches;
	if (!match) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	return errorResult.ok(toDimensionReference(match));
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
	if (!normalized.ok) {
		return normalized;
	}

	const matches = await store.findEffective({
		organizationId: input.organizationId,
		kind: input.kind,
		normalizedKey: normalized.data.normalizedCode,
		asOf: input.asOf,
	});
	if (!matches.ok) {
		return matches;
	}

	const unique = resolveUniqueEffectiveMatch(matches.data, input);
	if (!unique.ok) {
		return unique;
	}
	if (!unique.data) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Organization dimension is not effective",
		});
	}

	return errorResult.ok(unique.data);
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
		if (!matches.ok) {
			return matches;
		}
		return resolveUniqueEffectiveMatch(matches.data, {
			kind: input.kind,
			id: input.id,
			asOf: input.asOf,
		});
	}

	const normalized = normalizeMasterCode(input.key ?? "");
	if (!normalized.ok) {
		return normalized;
	}
	const matches = await store.findEffective({
		organizationId: input.organizationId,
		kind: input.kind,
		normalizedKey: normalized.data.normalizedCode,
		asOf: input.asOf,
	});
	if (!matches.ok) {
		return matches;
	}
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid organization dimension create input",
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
	if (!authorized.ok) {
		return authorized;
	}
	const normalized = normalizeMasterCode(parsed.data.key);
	if (!normalized.ok) {
		return normalized;
	}
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid organization dimension update input",
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
	if (!authorized.ok) {
		return authorized;
	}
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid organization dimension lifecycle input",
		});
	}
	const authorized = await requireMasterCommandPermission(
		options.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}
	return resolveStore(options.store).transition({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		expectedVersion: parsed.data.expectedVersion,
		status,
		updatedBy: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

export function activateOrganizationDimension(
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

export function deactivateOrganizationDimension(
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

export function archiveOrganizationDimension(
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid organization dimension resolve input",
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_RESOLVE_AS_OF,
	});
	if (!authorized.ok) {
		return authorized;
	}
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

	if (!legalEntity.ok) {
		return legalEntity;
	}
	if (!businessUnit.ok) {
		return businessUnit;
	}
	if (!location.ok) {
		return location;
	}
	if (!costCentre.ok) {
		return costCentre;
	}
	if (!project.ok) {
		return project;
	}

	return errorResult.ok({
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid organization dimension lookup input",
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_GET_EFFECTIVE,
	});
	if (!authorized.ok) {
		return authorized;
	}
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid organization dimension get input",
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid organization dimension get-by-code input",
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_GET_BY_CODE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const normalized = normalizeMasterCode(parsed.data.key);
	if (!normalized.ok) {
		return normalized;
	}
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid organization dimension list input",
		});
	}
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ORGANIZATION_DIMENSION_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return resolveStore(options.store).list({
		organizationId: parsed.data.organizationId,
		kind: parsed.data.kind,
		status: parsed.data.status,
		parentId: parsed.data.parentId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}
