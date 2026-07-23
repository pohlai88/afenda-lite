import type {
	HumanResourcesIdentityResolverPort,
	HumanResourcesEmployeeIdentity,
} from "@afenda/human-resources/identity-resolver";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources/brands";
import type { Result } from "@afenda/errors/result";
import { resolveHumanResourcesStore } from "@afenda/human-resources/resolve-store";

export function createHumanResourcesIdentityResolverPort(): HumanResourcesIdentityResolverPort {
	const store = resolveHumanResourcesStore();

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