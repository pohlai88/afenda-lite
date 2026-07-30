import type { DependencyInspector, MasterDependency } from "../../types";

type DependencyLookupInput = Parameters<DependencyInspector["listBlockers"]>[0];

/** No-op inspector for tests and deliberately isolated compositions. */
export function createEmptyDependencyInspector(): DependencyInspector {
	return {
		listBlockers(_input: DependencyLookupInput): Promise<MasterDependency[]> {
			return Promise.resolve([]);
		},
	};
}

/** Fail-closed fallback when dependency inspection has not been configured. */
export function createUnavailableDependencyInspector(): DependencyInspector {
	return {
		listBlockers(input: DependencyLookupInput): Promise<MasterDependency[]> {
			return Promise.resolve([
				{
					module: "master-data",
					entityType: input.entityType,
					entityId: input.entityId,
					reason: "Dependency inspection is not configured for this operation.",
				},
			]);
		},
	};
}
