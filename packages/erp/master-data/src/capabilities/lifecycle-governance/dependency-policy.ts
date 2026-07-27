export const LIFECYCLE_DEPENDENCY_CODES = [
	"ACTIVE_CHILDREN",
	"OPEN_OPERATIONAL_REFERENCES",
	"NONZERO_INVENTORY",
	"ACTIVE_VARIANTS",
	"ACTIVE_ROLES",
	"PENDING_CHANGE_REQUEST",
] as const;
export type LifecycleDependencyCode =
	(typeof LIFECYCLE_DEPENDENCY_CODES)[number];

export type DependencyResult =
	| Readonly<{ blocked: false }>
	| Readonly<{
			blocked: true;
			codes: readonly LifecycleDependencyCode[];
	  }>;

export interface MasterLifecycleDependencyPort {
	checkPartyDependencies(input: {
		organizationId: string;
		partyId: string;
		operation: string;
	}): Promise<DependencyResult>;
	checkItemDependencies(input: {
		organizationId: string;
		itemId: string;
		operation: string;
	}): Promise<DependencyResult>;
	checkWarehouseDependencies(input: {
		organizationId: string;
		warehouseId: string;
		operation: string;
	}): Promise<DependencyResult>;
}

export function dependencyResult(
	codes: readonly LifecycleDependencyCode[],
): DependencyResult {
	return codes.length === 0 ? { blocked: false } : { blocked: true, codes };
}
