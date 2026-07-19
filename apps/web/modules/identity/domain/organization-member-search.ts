/**
 * Identity — org member search projection onto `@afenda/search`.
 * Neon Auth remains membership SSOT; index rows are derived.
 */

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	deleteSearchDocument,
	listSearchDocumentIds,
	type SearchStore,
	searchDocuments,
	upsertSearchDocuments,
} from "@afenda/search";

import {
	listOrganizationUsers,
	type OrganizationUser,
} from "@/modules/identity/domain/organization-users";

export const MEMBER_SEARCH_ENTITY = "member" as const;

export type OrganizationMemberSearchHit = {
	id: string;
	label: string;
};

function memberSearchLabel(name: string, email: string): string {
	return `${name} · ${email}`;
}

function toUpsertInput(orgId: string, user: OrganizationUser) {
	return {
		organizationId: orgId,
		entity: MEMBER_SEARCH_ENTITY,
		documentId: user.userId,
		title: user.name,
		description: user.email,
	};
}

function toSearchHit(hit: {
	documentId: string;
	title: string;
	description: string | null;
}): OrganizationMemberSearchHit {
	const label =
		hit.description === null || hit.description.trim().length === 0
			? hit.title
			: memberSearchLabel(hit.title, hit.description);
	return { id: hit.documentId, label };
}

/**
 * Upsert current Neon Auth members into the search index and prune stale
 * `member` documents for the org.
 */
export async function syncOrganizationMemberSearchIndex(
	orgId: string,
	store?: SearchStore,
): Promise<Result<{ upserted: number; pruned: number }>> {
	let users: OrganizationUser[];
	try {
		users = await listOrganizationUsers(orgId);
	} catch (error) {
		return fail(
			"INTERNAL_ERROR",
			error instanceof Error
				? error.message
				: "Failed to list organization users for search sync",
		);
	}

	if (users.length > 0) {
		const upserted = await upsertSearchDocuments(
			users.map((user) => toUpsertInput(orgId, user)),
			store,
		);
		if (!upserted.ok) {
			return upserted;
		}
	}

	const listed = await listSearchDocumentIds(
		{ organizationId: orgId, entity: MEMBER_SEARCH_ENTITY },
		store,
	);
	if (!listed.ok) {
		return listed;
	}

	const liveIds = new Set(users.map((user) => user.userId));
	let pruned = 0;
	for (const documentId of listed.data) {
		if (liveIds.has(documentId)) {
			continue;
		}
		const deleted = await deleteSearchDocument(
			{
				organizationId: orgId,
				entity: MEMBER_SEARCH_ENTITY,
				documentId,
			},
			store,
		);
		if (!deleted.ok) {
			return deleted;
		}
		if (deleted.data.deleted) {
			pruned += 1;
		}
	}

	return ok({ upserted: users.length, pruned });
}

/** Org-scoped FTS over indexed members. */
export async function searchOrganizationMembers(
	orgId: string,
	query: string,
	limit?: number,
	store?: SearchStore,
): Promise<Result<OrganizationMemberSearchHit[]>> {
	const hits = await searchDocuments(
		{
			organizationId: orgId,
			query,
			entity: MEMBER_SEARCH_ENTITY,
			limit,
		},
		store,
	);
	if (!hits.ok) {
		return hits;
	}
	return ok(hits.data.map(toSearchHit));
}
