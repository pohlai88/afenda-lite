import { ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../../src/brands";
import type {
	HumanResourcesEmployeeIdentity,
	HumanResourcesIdentityResolverPort,
} from "../../src/identity-resolver";
import type { HumanResourcesStore } from "../../src/store";

/** Identity resolver backed by the HR store's user↔employee mapping. */
export function createStoreBackedIdentityResolver(
	store: HumanResourcesStore,
): HumanResourcesIdentityResolverPort {
	return {
		async resolveEmployeeForActor(input: {
			organizationId: string;
			actorUserId: string;
			asOf?: string;
		}): Promise<Result<HumanResourcesEmployeeIdentity | null>> {
			return store.getUserEmployeeMapping({
				organizationId: input.organizationId,
				userId: input.actorUserId,
				asOf: input.asOf,
			});
		},
		async resolveManagerEmployeesForActor(input: {
			organizationId: string;
			actorUserId: string;
			asOf?: string;
		}): Promise<Result<HumanResourcesEmployeeId[]>> {
			return store.getManagerEmployeesForUser({
				organizationId: input.organizationId,
				userId: input.actorUserId,
				asOf: input.asOf,
			});
		},
	};
}

export async function mapActorToEmployee(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		userId: string;
		employeeId: HumanResourcesEmployeeId;
		actorUserId: string;
		effectiveFrom?: string;
		effectiveUntil?: string;
	},
): Promise<Result<{ id: string }>> {
	return store.createUserEmployeeMapping({
		organizationId: input.organizationId,
		userId: input.userId,
		employeeId: input.employeeId,
		relationshipType: "self",
		effectiveFrom: input.effectiveFrom ?? "2020-01-01",
		effectiveUntil: input.effectiveUntil,
		actorUserId: input.actorUserId,
	});
}

export function createMappingIdentityResolver(
	mappings: Record<string, HumanResourcesEmployeeId>,
	options?: {
		effectiveFrom?: string;
		effectiveUntil?: string | null;
		managerReports?: Record<string, HumanResourcesEmployeeId[]>;
	},
): HumanResourcesIdentityResolverPort {
	const effectiveFrom = options?.effectiveFrom ?? "2024-01-01";
	const effectiveUntil = options?.effectiveUntil ?? null;
	const managerReports = options?.managerReports ?? {};

	return {
		async resolveEmployeeForActor(input) {
			const employeeId = mappings[input.actorUserId];
			if (!employeeId) {
				return ok(null);
			}
			const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
			if (effectiveFrom > asOf) {
				return ok(null);
			}
			if (effectiveUntil !== null && effectiveUntil < asOf) {
				return ok(null);
			}
			return ok({
				employeeId,
				relationshipType: "self",
				effectiveFrom,
				effectiveUntil,
			});
		},
		async resolveManagerEmployeesForActor(input) {
			return ok(managerReports[input.actorUserId] ?? []);
		},
	};
}
