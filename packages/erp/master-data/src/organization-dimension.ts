import { randomUUID } from "node:crypto";

import {
	and,
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
	type MasterAuthorizationPort,
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "./authorization";
import {
	MASTER_COMMAND_ORGANIZATION_DIMENSION_CREATE,
	MASTER_QUERY_ORGANIZATION_DIMENSION_RESOLVE_AS_OF,
} from "./module-ids";
import { normalizeMasterCode } from "./shared/code";

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

export type OrganizationDimensionStore = {
	create(
		record: Omit<OrganizationDimension, "id" | "version" | "createdAt"> & {
			normalizedKey: string;
			correlationId: string;
		},
	): Promise<Result<OrganizationDimension>>;
	findEffective(input: {
		organizationId: string;
		kind: OrganizationDimensionKind;
		normalizedKey: string;
		asOf: string;
	}): Promise<Result<OrganizationDimension[]>>;
};

export type OrganizationDimensionOptions = {
	store?: OrganizationDimensionStore;
	authorization?: MasterAuthorizationPort;
};

const isoDate = z.iso.date();
const context = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
});

export const createOrganizationDimensionInputSchema = context
	.extend({
		correlationId: z.string().trim().min(1),
		kind: z.enum(ORGANIZATION_DIMENSION_KINDS),
		key: z.string().trim().min(1).max(100),
		name: z.string().trim().min(1).max(200),
		effectiveFrom: isoDate,
		effectiveTo: isoDate.nullable().optional(),
		supersedesId: z.uuid().nullable().optional(),
	})
	.strict()
	.refine(
		(value) =>
			value.effectiveTo === undefined ||
			value.effectiveTo === null ||
			value.effectiveTo >= value.effectiveFrom,
		{ message: "effectiveTo must be on or after effectiveFrom" },
	);

export const resolveOrganizationDimensionsAsOfInputSchema = context
	.extend({
		asOf: isoDate,
		keys: z
			.object({
				legal_entity: z.string().trim().min(1),
				business_unit: z.string().trim().min(1),
				location: z.string().trim().min(1),
				cost_centre: z.string().trim().min(1),
				project: z.string().trim().min(1),
			})
			.strict(),
	})
	.strict();

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
		kind: row.kind as OrganizationDimensionKind,
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

export function createDrizzleOrganizationDimensionStore(): OrganizationDimensionStore {
	return {
		async create(record) {
			const id = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			try {
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], OrganizationDimensionSqlRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${record.organizationId}:${record.kind}:${record.normalizedKey}`}, 0))`,
					sql`
						WITH candidate AS (
							SELECT 1
							WHERE NOT EXISTS (
								SELECT 1
								FROM md_organization_dimension existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.kind = ${record.kind}
									AND existing.normalized_key = ${record.normalizedKey}
									AND existing.effective_from <= COALESCE(${record.effectiveTo}, '9999-12-31'::date)
									AND (existing.effective_to IS NULL OR existing.effective_to >= ${record.effectiveFrom})
							)
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
							FROM candidate
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${record.createdBy},
								${record.correlationId}, 'master_data',
								'organization_dimension', id, 'CREATE', '[]'::jsonb
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
								'master_data.organization_dimension.created.v1',
								'master_data', ${record.correlationId}, ${record.createdBy},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'organization_dimension',
									'entityId', id,
									'code', key,
									'version', version,
									'actorId', ${record.createdBy},
									'correlationId', ${record.correlationId}
								), 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
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
	};
}

function resolveStore(
	store?: OrganizationDimensionStore,
): OrganizationDimensionStore {
	return store ?? createDrizzleOrganizationDimensionStore();
}

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
		createdBy: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

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
	const resolved = {} as Record<
		OrganizationDimensionKind,
		OrganizationDimensionReference
	>;
	for (const kind of ORGANIZATION_DIMENSION_KINDS) {
		const normalized = normalizeMasterCode(parsed.data.keys[kind]);
		if (!normalized.ok) return normalized;
		const matches = await store.findEffective({
			organizationId: parsed.data.organizationId,
			kind,
			normalizedKey: normalized.data.normalizedCode,
			asOf: parsed.data.asOf,
		});
		if (!matches.ok) return matches;
		if (matches.data.length === 0) {
			return fail("NOT_FOUND", "Organization dimension is not effective", {
				reason: "MASTER_DIMENSION_NOT_EFFECTIVE",
				kind,
				key: parsed.data.keys[kind],
				asOf: parsed.data.asOf,
			});
		}
		if (matches.data.length > 1) {
			return fail("CONFLICT", "Organization dimension is ambiguous", {
				reason: "MASTER_DIMENSION_AMBIGUOUS",
				kind,
				key: parsed.data.keys[kind],
				asOf: parsed.data.asOf,
			});
		}
		const match = matches.data[0];
		if (!match) {
			return fail("INTERNAL_ERROR", "Resolved organization dimension missing");
		}
		resolved[kind] = {
			id: match.id,
			kind: match.kind,
			key: match.key,
			name: match.name,
		};
	}
	return ok(resolved);
}
