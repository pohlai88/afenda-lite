import type { Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "./brands";

export type HumanResourcesEmployeeIdentity = {
	employeeId: HumanResourcesEmployeeId;
	relationshipType: "self" | "proxy";
	effectiveFrom: string;
	effectiveUntil: string | null;
};

export type HumanResourcesIdentityResolverPort = {
	resolveEmployeeForActor(input: {
		organizationId: string;
		actorUserId: string;
		asOf?: string;
	}): Promise<Result<HumanResourcesEmployeeIdentity | null>>;

	resolveManagerEmployeesForActor(input: {
		organizationId: string;
		actorUserId: string;
		asOf?: string;
	}): Promise<Result<HumanResourcesEmployeeId[]>>;
};