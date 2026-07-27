import type { DependencyInspector, MasterDependency } from "../../types";

type DependencyLookupInput = Parameters<DependencyInspector["listBlockers"]>[0];

/** No-op inspector for tests and deliberately isolated compositions. */
export function createEmptyDependencyInspector(): DependencyInspector {
	return {
		async listBlockers(
			_input: DependencyLookupInput,
		): Promise<MasterDependency[]> {
			return [];
		},
	};
}

/** Fail-closed fallback when dependency inspection has not been configured. */
export function createUnavailableDependencyInspector(): DependencyInspector {
	return {
		async listBlockers(
			input: DependencyLookupInput,
		): Promise<MasterDependency[]> {
			return [
				{
					module: "master-data",
					entityType: input.entityType,
					entityId: input.entityId,
					reason: "Dependency inspection is not configured for this operation.",
				},
			];
		},
	};
}
