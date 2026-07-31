import { errorResult, type Result } from "@afenda/errors";

import { lifecycleMergeCycle } from "./lifecycle-errors";

export type CanonicalIdentityNode = Readonly<{
	id: string;
	mergedIntoId: string | null;
}>;

export type CanonicalIdentityResolver = (
	id: string,
) => Promise<Result<CanonicalIdentityNode | null>>;

export type CanonicalIdentityResolution = Readonly<{
	requestedId: string;
	canonicalId: string;
	hops: number;
	lineage: readonly string[];
}>;

async function resolveCanonicalStep(
	requestedId: string,
	currentId: string,
	load: CanonicalIdentityResolver,
	maxHops: number,
	hops: number,
	seen: Set<string>,
	lineage: readonly string[],
): Promise<Result<CanonicalIdentityResolution>> {
	if (hops >= maxHops || seen.has(currentId)) {
		return lifecycleMergeCycle({
			entityType: "canonical_identity",
			entityId: requestedId,
		});
	}
	seen.add(currentId);
	const nextLineage = [...lineage, currentId];
	const current = await load(currentId);
	if (!current.ok) {
		return current;
	}
	if (current.data === null || current.data.mergedIntoId === null) {
		return errorResult.ok({
			requestedId,
			canonicalId: current.data?.id ?? currentId,
			hops,
			lineage: nextLineage,
		});
	}
	return resolveCanonicalStep(
		requestedId,
		current.data.mergedIntoId,
		load,
		maxHops,
		hops + 1,
		seen,
		nextLineage,
	);
}

export function resolveCanonicalIdentityWithLineage(
	id: string,
	load: CanonicalIdentityResolver,
	maxHops = 16,
): Promise<Result<CanonicalIdentityResolution>> {
	return resolveCanonicalStep(id, id, load, maxHops, 0, new Set<string>(), []);
}

export async function resolveCanonicalIdentity(
	id: string,
	load: CanonicalIdentityResolver,
	maxHops = 16,
): Promise<Result<{ id: string; hops: number }>> {
	const resolved = await resolveCanonicalIdentityWithLineage(id, load, maxHops);
	return resolved.ok
		? errorResult.ok({
				id: resolved.data.canonicalId,
				hops: resolved.data.hops,
			})
		: resolved;
}
