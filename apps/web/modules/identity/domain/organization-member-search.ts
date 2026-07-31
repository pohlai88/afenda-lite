/**
 * Identity — org member search projection onto `@afenda/search`.
 * Neon Auth remains membership SSOT; index rows are derived.
 */

import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";
import { type SearchCapability, search } from "@afenda/search";

import {
	listOrganizationUsers,
	type OrganizationUser,
} from "@/modules/identity/domain/organization-users";

export const MEMBER_SEARCH_ENTITY = search.entities.identity.member;

export interface OrganizationMemberSearchHit {
	id: string;
	label: string;
}

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
	searchCapability: SearchCapability = search,
): Promise<Result<{ upserted: number; pruned: number }>> {
	let users: OrganizationUser[];
	try {
		users = await listOrganizationUsers(orgId);
	} catch (error) {
		return errorProject.result(
			errorIngress.unknown(error, { operation: "errors.consumer.unknown" }),
		);
	}

	if (users.length > 0) {
		const upserted = await searchCapability.documents.upsertMany(
			users.map((user) => toUpsertInput(orgId, user)),
		);
		if (!upserted.ok) {
			return upserted;
		}
	}

	const listed = await searchCapability.documents.listIds({
		organizationId: orgId,
		entity: MEMBER_SEARCH_ENTITY,
	});
	if (!listed.ok) {
		return listed;
	}

	const liveIds = new Set(users.map((user) => user.userId));
	let pruned = 0;
	const staleDocumentIds = listed.data.filter(
		(documentId) => !liveIds.has(documentId),
	);
	const deleteResults = await Promise.all(
		staleDocumentIds.map((documentId) =>
			searchCapability.documents.delete({
				organizationId: orgId,
				entity: MEMBER_SEARCH_ENTITY,
				documentId,
			}),
		),
	);
	for (const deleted of deleteResults) {
		if (!deleted.ok) {
			return deleted;
		}
		if (deleted.data.deleted) {
			pruned += 1;
		}
	}

	return errorResult.ok({ upserted: users.length, pruned });
}

/** Org-scoped FTS over indexed members. */
export async function searchOrganizationMembers(
	orgId: string,
	query: string,
	limit?: number,
	searchCapability: SearchCapability = search,
): Promise<Result<OrganizationMemberSearchHit[]>> {
	const hits = await searchCapability.query({
		organizationId: orgId,
		query,
		entity: MEMBER_SEARCH_ENTITY,
		limit,
	});
	if (!hits.ok) {
		return hits;
	}
	return errorResult.ok(hits.data.map(toSearchHit));
}
