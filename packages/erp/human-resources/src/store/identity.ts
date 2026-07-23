import type { Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../brands";
import type { HumanResourcesEmployeeIdentity } from "../identity-resolver";

export interface HumanResourcesIdentityStore {
	getUserEmployeeMapping(input: {
		organizationId: string;
		userId: string;
		asOf?: string;
	}): Promise<Result<HumanResourcesEmployeeIdentity | null>>;

	getManagerEmployeesForUser(input: {
		organizationId: string;
		userId: string;
		asOf?: string;
	}): Promise<Result<HumanResourcesEmployeeId[]>>;

	createUserEmployeeMapping(input: {
		organizationId: string;
		userId: string;
		employeeId: HumanResourcesEmployeeId;
		relationshipType: "self" | "proxy";
		effectiveFrom: string;
		effectiveUntil?: string;
		actorUserId: string;
	}): Promise<Result<{ id: string }>>;
}
