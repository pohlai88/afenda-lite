import type { Result } from "@afenda/errors/result";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources/brands";
import type {
	HumanResourcesEmployeeIdentity,
	HumanResourcesIdentityResolverPort,
} from "@afenda/human-resources/identity-resolver";
import { resolveHumanResourcesStore } from "@afenda/human-resources/resolve-store";

export function createHumanResourcesIdentityResolverPort(): HumanResourcesIdentityResolverPort {
	const store = resolveHumanResourcesStore();

	return {
		async resolveEmployeeForActor(input: {
			organizationId: string;
			actorUserId: string;
			asOf?: string | undefined;
		}): Promise<Result<HumanResourcesEmployeeIdentity | null>> {
			return await store.getUserEmployeeMapping({
				organizationId: input.organizationId,
				userId: input.actorUserId,
				...(input.asOf === undefined ? {} : { asOf: input.asOf }),
			});
		},

		async resolveManagerEmployeesForActor(input: {
			organizationId: string;
			actorUserId: string;
			asOf?: string | undefined;
		}): Promise<Result<HumanResourcesEmployeeId[]>> {
			return await store.getManagerEmployeesForUser({
				organizationId: input.organizationId,
				userId: input.actorUserId,
				...(input.asOf === undefined ? {} : { asOf: input.asOf }),
			});
		},
	};
}
