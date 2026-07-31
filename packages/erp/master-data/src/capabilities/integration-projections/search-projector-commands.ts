import { errorResult, type Result } from "@afenda/errors";
import { type SearchCapability, search } from "@afenda/search";
import { z } from "zod";
import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "../../command-options";
import { orgQueryActorSchema } from "../../contracts/context";
import {
	MASTER_COMMAND_SEARCH_REBUILD,
	MASTER_QUERY_SEARCH_QUERY,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import { runSequentiallyUntil } from "../../resolve-async";
import type {
	Item,
	ItemGroup,
	MasterStatus,
	Party,
	PaymentTerm,
	Warehouse,
} from "../../types";
import {
	createDrizzleOrganizationDimensionStore,
	type OrganizationDimension,
} from "../core-organization-masters/organization-dimension";
import type { MasterDataStore } from "../core-organization-masters/store";

/** Search entity keys for Authority B roots (derived; rebuildable). */
export const MASTER_SEARCH_ENTITY = search.entities.masterData;

export type MasterSearchEntity =
	(typeof MASTER_SEARCH_ENTITY)[keyof typeof MASTER_SEARCH_ENTITY];

export const MASTER_SEARCH_ENTITY_VALUES = search.masterDataEntityValues;

/** Index draft/active/inactive; remove blocked/retired from the derived index. */
type ProjectableMasterStatus = MasterStatus | OrganizationDimension["status"];

export function shouldIndexMasterStatus(
	status: ProjectableMasterStatus,
): boolean {
	return status !== "retired" && status !== "blocked" && status !== "archived";
}

type MasterRoot =
	| Party
	| Item
	| ItemGroup
	| Warehouse
	| PaymentTerm
	| OrganizationDimension;

function getRootCode(root: MasterRoot): string {
	return "code" in root ? root.code : root.key;
}

function getRootNormalizedCode(root: MasterRoot): string {
	return "normalizedCode" in root ? root.normalizedCode : root.key;
}

function getRootDescription(root: MasterRoot): string {
	return `${getRootCode(root)} · ${root.status}`;
}

function getRootMetadata(
	entity: MasterSearchEntity,
	root: MasterRoot,
): Record<string, unknown> {
	const base = {
		organizationId: root.organizationId,
		entityType: entity,
		entityId: root.id,
		code: getRootCode(root),
		normalizedCode: getRootNormalizedCode(root),
		status: root.status,
		version: root.version,
		projectedAt: new Date().toISOString(),
	};
	if ("kind" in root) {
		return {
			...base,
			dimensionKind: root.kind,
			effectiveFrom: root.effectiveFrom,
			effectiveTo: root.effectiveTo,
		};
	}
	return base;
}

function toUpsertInput(
	entity: MasterSearchEntity,
	root: MasterRoot,
): {
	organizationId: string;
	entity: MasterSearchEntity;
	documentId: string;
	title: string;
	description: string;
	metadata: Record<string, unknown>;
} {
	return {
		organizationId: root.organizationId,
		entity,
		documentId: root.id,
		title: root.name,
		description: getRootDescription(root),
		metadata: getRootMetadata(entity, root),
	};
}

export async function projectMasterRoot(
	entity: MasterSearchEntity,
	root: MasterRoot,
	searchCapability?: SearchCapability,
): Promise<Result<{ projected: boolean }>> {
	if (!shouldIndexMasterStatus(root.status)) {
		const deleted = await (searchCapability ?? search).documents.delete({
			organizationId: root.organizationId,
			entity,
			documentId: root.id,
		});
		if (!deleted.ok) {
			return deleted;
		}
		return errorResult.ok({ projected: false });
	}

	const upserted = await (searchCapability ?? search).documents.upsert(
		toUpsertInput(entity, root),
	);
	if (!upserted.ok) {
		return upserted;
	}
	return errorResult.ok({ projected: true });
}

/**
 * Best-effort, non-authoritative projection after a successful root mutation.
 * Search failure never rewrites the mutation Result; the committed outbox event
 * and rebuild command remain the recovery authority for the derived index.
 */
export async function syncMasterRootProjection(
	entity: MasterSearchEntity,
	root: MasterRoot,
	searchCapability?: SearchCapability,
): Promise<void> {
	await projectMasterRoot(entity, root, searchCapability);
}

const rebuildInputSchema = orgQueryActorSchema.extend({
	entity: z.enum(MASTER_SEARCH_ENTITY_VALUES).optional(),
});

const searchQueryInputSchema = orgQueryActorSchema.extend({
	query: z.string().trim().min(1),
	entity: z.enum(MASTER_SEARCH_ENTITY_VALUES).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

export interface RebuildMasterDataSearchResult {
	entities: MasterSearchEntity[];
	pruned: number;
	upserted: number;
}

async function rebuildOneEntity(
	organizationId: string,
	entity: MasterSearchEntity,
	roots: MasterRoot[],
	searchCapability?: SearchCapability,
): Promise<Result<{ upserted: number; pruned: number }>> {
	const live = roots.filter((root) => shouldIndexMasterStatus(root.status));
	if (live.length > 0) {
		const upserted = await (searchCapability ?? search).documents.upsertMany(
			live.map((root) => toUpsertInput(entity, root)),
		);
		if (!upserted.ok) {
			return upserted;
		}
	}

	const listed = await (searchCapability ?? search).documents.listIds({
		organizationId,
		entity,
	});
	if (!listed.ok) {
		return listed;
	}

	const liveIds = new Set(live.map((root) => root.id));
	let pruned = 0;
	const failedDelete = await runSequentiallyUntil(
		listed.data,
		async (documentId) => {
			if (liveIds.has(documentId)) {
				return;
			}
			const deleted = await (searchCapability ?? search).documents.delete({
				organizationId,
				entity,
				documentId,
			});
			if (!deleted.ok) {
				return deleted;
			}
			if (deleted.data.deleted) {
				pruned += 1;
			}
		},
	);
	if (failedDelete !== undefined) {
		return failedDelete;
	}

	return errorResult.ok({ upserted: live.length, pruned });
}

async function listSearchRoots(
	organizationId: string,
	entity: MasterSearchEntity,
	store: MasterDataStore,
	options: MasterCommandOptions,
): Promise<Result<MasterRoot[]>> {
	const page = { organizationId, page: 1, pageSize: 100 };
	switch (entity) {
		case MASTER_SEARCH_ENTITY.party:
			return store.listParties(page);
		case MASTER_SEARCH_ENTITY.item:
			return store.listItems(page);
		case MASTER_SEARCH_ENTITY.itemGroup:
			return store.listItemGroups(page);
		case MASTER_SEARCH_ENTITY.warehouse:
			return store.listWarehouses(page);
		case MASTER_SEARCH_ENTITY.organizationDimension: {
			const organizationDimensionStore =
				options.organizationDimensionStore ??
				createDrizzleOrganizationDimensionStore();
			const listed = await organizationDimensionStore.list({
				...page,
				status: "all",
			});
			return listed.ok ? errorResult.ok(listed.data.items) : listed;
		}
		case MASTER_SEARCH_ENTITY.paymentTerm:
			return store.listPaymentTerms(page);
		default:
			return unsupportedSearchEntity(entity);
	}
}

function unsupportedSearchEntity(value: never): never {
	throw new TypeError(`Unsupported master search entity: ${value}`);
}

/**
 * Rebuild derived search documents from master-data SSOT for an org
 * (optional single entity filter).
 */
export async function rebuildMasterDataSearchIndex(
	input: unknown,
	options: MasterCommandOptions & { searchCapability?: SearchCapability } = {},
): Promise<Result<RebuildMasterDataSearchResult>> {
	const parsed = parseMasterInput(
		rebuildInputSchema,
		input,
		"Invalid master-data search rebuild input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_SEARCH_REBUILD,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const { searchCapability } = options;
	const entities: MasterSearchEntity[] = parsed.data.entity
		? [parsed.data.entity]
		: [...MASTER_SEARCH_ENTITY_VALUES];

	let upserted = 0;
	let pruned = 0;

	const failedRebuild = await runSequentiallyUntil(entities, async (entity) => {
		const listed = await listSearchRoots(
			parsed.data.organizationId,
			entity,
			store,
			options,
		);
		if (!listed.ok) {
			return listed;
		}
		const rebuilt = await rebuildOneEntity(
			parsed.data.organizationId,
			entity,
			listed.data,
			searchCapability,
		);
		if (!rebuilt.ok) {
			return rebuilt;
		}
		upserted += rebuilt.data.upserted;
		pruned += rebuilt.data.pruned;
	});
	if (failedRebuild !== undefined) {
		return failedRebuild;
	}

	return errorResult.ok({ upserted, pruned, entities });
}

export async function searchMasterDataDocuments(
	input: unknown,
	options: MasterCommandOptions & { searchCapability?: SearchCapability } = {},
): Promise<
	Result<
		ReadonlyArray<{
			documentId: string;
			entity: string;
			title: string;
			description: string | null;
			score: number;
		}>
	>
> {
	const parsed = parseMasterInput(
		searchQueryInputSchema,
		input,
		"Invalid master-data search query input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_SEARCH_QUERY,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await (options.searchCapability ?? search).query({
		organizationId: parsed.data.organizationId,
		query: parsed.data.query,
		entity: parsed.data.entity,
		limit: parsed.data.limit,
	});
	if (!result.ok) {
		return result;
	}
	return errorResult.ok(
		result.data.map((hit) => ({
			documentId: hit.documentId,
			entity: hit.entity,
			title: hit.title,
			description: hit.description,
			score: hit.score,
		})),
	);
}
