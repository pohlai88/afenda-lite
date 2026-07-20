import { ok, type Result } from "@afenda/errors/result";
import {
	deleteSearchDocument,
	listSearchDocumentIds,
	type SearchStore,
	searchDocuments,
	upsertSearchDocument,
	upsertSearchDocuments,
} from "@afenda/search";
import { z } from "zod";
import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "./authorization";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	MASTER_COMMAND_SEARCH_REBUILD,
	MASTER_QUERY_SEARCH_QUERY,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import type {
	Item,
	ItemGroup,
	MasterStatus,
	Party,
	PaymentTerm,
	Warehouse,
} from "./types";

/** Search entity keys for Authority B roots (derived; rebuildable). */
export const MASTER_SEARCH_ENTITY = {
	party: "md_party",
	item: "md_item",
	itemGroup: "md_item_group",
	warehouse: "md_warehouse",
	paymentTerm: "md_payment_term",
} as const;

export type MasterSearchEntity =
	(typeof MASTER_SEARCH_ENTITY)[keyof typeof MASTER_SEARCH_ENTITY];

export const MASTER_SEARCH_ENTITY_VALUES = [
	MASTER_SEARCH_ENTITY.party,
	MASTER_SEARCH_ENTITY.item,
	MASTER_SEARCH_ENTITY.itemGroup,
	MASTER_SEARCH_ENTITY.warehouse,
	MASTER_SEARCH_ENTITY.paymentTerm,
] as const;

/** Index draft/active/inactive; remove blocked/retired from the derived index. */
export function shouldIndexMasterStatus(status: MasterStatus): boolean {
	return status !== "retired" && status !== "blocked";
}

type MasterRoot = Party | Item | ItemGroup | Warehouse | PaymentTerm;

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
		description: `${root.code} · ${root.status}`,
		metadata: {
			code: root.code,
			normalizedCode: root.normalizedCode,
			status: root.status,
			version: root.version,
		},
	};
}

export async function projectMasterRoot(
	entity: MasterSearchEntity,
	root: MasterRoot,
	searchStore?: SearchStore,
): Promise<Result<{ projected: boolean }>> {
	if (!shouldIndexMasterStatus(root.status)) {
		const deleted = await deleteSearchDocument(
			{
				organizationId: root.organizationId,
				entity,
				documentId: root.id,
			},
			searchStore,
		);
		if (!deleted.ok) {
			return deleted;
		}
		return ok({ projected: false });
	}

	const upserted = await upsertSearchDocument(
		toUpsertInput(entity, root),
		searchStore,
	);
	if (!upserted.ok) {
		return upserted;
	}
	return ok({ projected: true });
}

/**
 * Best-effort projection after a successful root mutation.
 * Search failure never rewrites the mutation Result (derived index).
 */
export async function syncMasterRootProjection(
	entity: MasterSearchEntity,
	root: MasterRoot,
	searchStore?: SearchStore,
): Promise<void> {
	await projectMasterRoot(entity, root, searchStore);
}

const rebuildInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	entity: z.enum(MASTER_SEARCH_ENTITY_VALUES).optional(),
});

const searchQueryInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	query: z.string().trim().min(1),
	entity: z.enum(MASTER_SEARCH_ENTITY_VALUES).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

export type RebuildMasterDataSearchResult = {
	upserted: number;
	pruned: number;
	entities: MasterSearchEntity[];
};

async function rebuildOneEntity(
	organizationId: string,
	entity: MasterSearchEntity,
	roots: MasterRoot[],
	searchStore?: SearchStore,
): Promise<Result<{ upserted: number; pruned: number }>> {
	const live = roots.filter((root) => shouldIndexMasterStatus(root.status));
	if (live.length > 0) {
		const upserted = await upsertSearchDocuments(
			live.map((root) => toUpsertInput(entity, root)),
			searchStore,
		);
		if (!upserted.ok) {
			return upserted;
		}
	}

	const listed = await listSearchDocumentIds(
		{ organizationId, entity },
		searchStore,
	);
	if (!listed.ok) {
		return listed;
	}

	const liveIds = new Set(live.map((root) => root.id));
	let pruned = 0;
	for (const documentId of listed.data) {
		if (liveIds.has(documentId)) {
			continue;
		}
		const deleted = await deleteSearchDocument(
			{ organizationId, entity, documentId },
			searchStore,
		);
		if (!deleted.ok) {
			return deleted;
		}
		if (deleted.data.deleted) {
			pruned += 1;
		}
	}

	return ok({ upserted: live.length, pruned });
}

/**
 * Rebuild derived search documents from master-data SSOT for an org
 * (optional single entity filter).
 */
export async function rebuildMasterDataSearchIndex(
	input: unknown,
	options: MasterCommandOptions & { searchStore?: SearchStore } = {},
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
	const searchStore = options.searchStore;
	const entities: MasterSearchEntity[] = parsed.data.entity
		? [parsed.data.entity]
		: [...MASTER_SEARCH_ENTITY_VALUES];

	let upserted = 0;
	let pruned = 0;

	for (const entity of entities) {
		let roots: MasterRoot[] = [];
		if (entity === MASTER_SEARCH_ENTITY.party) {
			const listed = await store.listParties({
				organizationId: parsed.data.organizationId,
				page: 1,
				pageSize: 100,
			});
			if (!listed.ok) {
				return listed;
			}
			roots = listed.data;
		} else if (entity === MASTER_SEARCH_ENTITY.item) {
			const listed = await store.listItems({
				organizationId: parsed.data.organizationId,
				page: 1,
				pageSize: 100,
			});
			if (!listed.ok) {
				return listed;
			}
			roots = listed.data;
		} else if (entity === MASTER_SEARCH_ENTITY.itemGroup) {
			const listed = await store.listItemGroups({
				organizationId: parsed.data.organizationId,
				page: 1,
				pageSize: 100,
			});
			if (!listed.ok) {
				return listed;
			}
			roots = listed.data;
		} else if (entity === MASTER_SEARCH_ENTITY.warehouse) {
			const listed = await store.listWarehouses({
				organizationId: parsed.data.organizationId,
				page: 1,
				pageSize: 100,
			});
			if (!listed.ok) {
				return listed;
			}
			roots = listed.data;
		} else {
			const listed = await store.listPaymentTerms({
				organizationId: parsed.data.organizationId,
				page: 1,
				pageSize: 100,
			});
			if (!listed.ok) {
				return listed;
			}
			roots = listed.data;
		}

		const rebuilt = await rebuildOneEntity(
			parsed.data.organizationId,
			entity,
			roots,
			searchStore,
		);
		if (!rebuilt.ok) {
			return rebuilt;
		}
		upserted += rebuilt.data.upserted;
		pruned += rebuilt.data.pruned;
	}

	return ok({ upserted, pruned, entities });
}

export async function searchMasterDataDocuments(
	input: unknown,
	options: MasterCommandOptions & { searchStore?: SearchStore } = {},
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
	const result = await searchDocuments(
		{
			organizationId: parsed.data.organizationId,
			query: parsed.data.query,
			entity: parsed.data.entity,
			limit: parsed.data.limit,
		},
		options.searchStore,
	);
	if (!result.ok) {
		return result;
	}
	return ok(
		result.data.map((hit) => ({
			documentId: hit.documentId,
			entity: hit.entity,
			title: hit.title,
			description: hit.description,
			score: hit.score,
		})),
	);
}
