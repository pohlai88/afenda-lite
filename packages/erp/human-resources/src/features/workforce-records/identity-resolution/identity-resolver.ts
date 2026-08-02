import type { Result } from "@afenda/errors";

import type { HumanResourcesEmployeeId } from "../../../kernel/identity/brands";

export interface HumanResourcesEmployeeIdentity {
	effectiveFrom: string;
	effectiveUntil: string | null;
	employeeId: HumanResourcesEmployeeId;
	relationshipType: "self" | "proxy";
}

export interface HumanResourcesIdentityResolverPort {
	resolveEmployeeForActor: (input: {
		organizationId: string;
		actorUserId: string;
		asOf?: string | undefined;
	}) => Promise<Result<HumanResourcesEmployeeIdentity | null>>;

	resolveManagerEmployeesForActor: (input: {
		organizationId: string;
		actorUserId: string;
		asOf?: string | undefined;
	}) => Promise<Result<HumanResourcesEmployeeId[]>>;
}
