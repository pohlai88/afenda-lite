import { ok, type Result } from "@afenda/errors/result";

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

export async function resolveCanonicalIdentityWithLineage(
	id: string,
	load: CanonicalIdentityResolver,
	maxHops = 16,
): Promise<Result<CanonicalIdentityResolution>> {
	let currentId = id;
	const seen = new Set<string>();
	let lineage: readonly string[] = [];
	let hops = 0;
	while (hops < maxHops) {
		if (seen.has(currentId)) {
			return lifecycleMergeCycle({
				entityType: "canonical_identity",
				entityId: id,
			});
		}
		seen.add(currentId);
		lineage = [...lineage, currentId];
		const current = await load(currentId);
		if (!current.ok) {
			return current;
		}
		if (current.data === null || current.data.mergedIntoId === null) {
			return ok({
				requestedId: id,
				canonicalId: current.data?.id ?? currentId,
				hops,
				lineage,
			});
		}
		currentId = current.data.mergedIntoId;
		hops += 1;
	}
	return lifecycleMergeCycle({
		entityType: "canonical_identity",
		entityId: id,
	});
}

export async function resolveCanonicalIdentity(
	id: string,
	load: CanonicalIdentityResolver,
	maxHops = 16,
): Promise<Result<{ id: string; hops: number }>> {
	const resolved = await resolveCanonicalIdentityWithLineage(id, load, maxHops);
	return resolved.ok
		? ok({ id: resolved.data.canonicalId, hops: resolved.data.hops })
		: resolved;
}
