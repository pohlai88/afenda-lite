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
import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import {
	MASTER_COMMAND_ORGANIZATION_DIMENSION_CREATE,
	MASTER_QUERY_ORGANIZATION_DIMENSION_GET_EFFECTIVE,
	MASTER_QUERY_ORGANIZATION_DIMENSION_RESOLVE_AS_OF,
} from "../../module-ids";
import { normalizeMasterCode } from "./normalized-code";
import type {
	OrganizationDimensionOptions,
	OrganizationDimensionStore,
} from "./organization-dimension-store";

// 1. Constants and domain types

export const ORGANIZATION_DIMENSION_KINDS = [
	"legal_entity",
	"business_unit",
	"location",
	"cost_centre",
	"project",
] as const;

export type OrganizationDimensionKind =
	(typeof ORGANIZATION_DIMENSION_KINDS)[number];

export type OrganizationDimension = {
	id: string;
	organizationId: string;
	kind: OrganizationDimensionKind;
	key: string;
	name: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesId: string | null;
	version: number;
	createdBy: string;
	createdAt: Date;
};

export type OrganizationDimensionReference = Pick<
	OrganizationDimension,
	"id" | "kind" | "key" | "name"
>;

// 2. Input schemas

const isoDateSchema = z.iso.date();

const commandContextSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
});

const queryContextSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
});

export const createOrganizationDimensionInputSchema = commandContextSchema
	.extend({
		kind: z.enum(ORGANIZATION_DIMENSION_KINDS),
		key: z.string().trim().min(1).max(100),
		name: z.string().trim().min(1).max(200),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		supersedesId: z.uuid().nullable().optional(),
		supersedesExpectedVersion: z
			.number()
			.int()
			.positive()
			.nullable()
			.optional(),
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

export const resolveOrganizationDimensionsAsOfInputSchema = queryContextSchema
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
	queryContextSchema
		.extend({
			kind: z.enum(ORGANIZATION_DIMENSION_KINDS),
			asOf: isoDateSchema,
			id: z.uuid(),
			key: z.never().optional(),
		})
		.strict(),
	queryContextSchema
		.extend({
			kind: z.enum(ORGANIZATION_DIMENSION_KINDS),
			asOf: isoDateSchema,
			id: z.never().optional(),
			key: z.string().trim().min(1).max(100),
		})
		.strict(),
]);

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
	version: number;
	created_by: string;
	created_at: Date;
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
			effectiveFrom: row.effective_from,
			effectiveTo: row.effective_to,
			supersedesId: row.supersedes_id,
			version: row.version,
			createdBy: row.created_by,
			createdAt: row.created_at,
		};
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		kind: z.enum(ORGANIZATION_DIMENSION_KINDS).parse(row.kind),
		key: row.key,
		name: row.name,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesId: row.supersedesId,
		version: row.version,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
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
								version = predecessor_row.version + 1
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
								effective_from, effective_to, supersedes_id, version,
								created_by
							)
							SELECT
								${id}, ${record.organizationId}, ${record.kind}, ${record.key},
								${record.normalizedKey}, ${record.name}, ${record.effectiveFrom},
								${record.effectiveTo}, ${record.supersedesId}, 1, ${record.createdBy}
							FROM create_guard
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes
							)
							SELECT
								${createAuditId}, organization_id, ${record.createdBy},
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
									jsonb_build_object('field', 'effectiveFrom', 'before', NULL, 'after', effective_from),
									jsonb_build_object('field', 'effectiveTo', 'before', NULL, 'after', effective_to),
									jsonb_build_object('field', 'supersedesId', 'before', NULL, 'after', supersedes_id)
								)
							FROM mutated
							UNION ALL
							SELECT
								${predecessorAuditId}, closed_predecessor.organization_id,
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
								${eventId}, organization_id,
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
									'actorId', ${record.createdBy},
									'correlationId', ${record.correlationId}
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
				return fail(
					"INTERNAL_ERROR",
					"Failed to create organization dimension",
					{
						reason: "MASTER_PERSISTENCE_FAILURE",
						cause: error instanceof Error ? error.message : "unknown",
					},
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
				return fail(
					"INTERNAL_ERROR",
					"Failed to resolve organization dimension",
					{
						reason: "MASTER_PERSISTENCE_FAILURE",
						cause: error instanceof Error ? error.message : "unknown",
					},
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
				return fail(
					"INTERNAL_ERROR",
					"Failed to resolve organization dimension by id",
					{
						reason: "MASTER_PERSISTENCE_FAILURE",
						cause: error instanceof Error ? error.message : "unknown",
					},
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
		id?: string;
		key?: string;
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
		id?: string;
		key?: string;
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
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: parsed.data.effectiveTo ?? null,
		supersedesId: parsed.data.supersedesId ?? null,
		supersedesExpectedVersion: parsed.data.supersedesExpectedVersion ?? null,
		createdBy: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

// 9. Public queries

export async function resolveOrganizationDimensionsAsOf(
	input: unknown,
	options: OrganizationDimensionOptions = {},
): Promise<
	Result<Record<OrganizationDimensionKind, OrganizationDimensionReference>>
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
