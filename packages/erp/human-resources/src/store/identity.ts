import type { Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../brands";
import type { HumanResourcesEmployeeIdentity } from "../identity-resolver";

export interface HumanResourcesIdentityStore {
	getUserEmployeeMapping(input: {
		organizationId: string;
		userId: string;
		asOf?: string | undefined;
	}): Promise<Result<HumanResourcesEmployeeIdentity | null>>;

	getManagerEmployeesForUser(input: {
		organizationId: string;
		userId: string;
		asOf?: string | undefined;
	}): Promise<Result<HumanResourcesEmployeeId[]>>;

	createUserEmployeeMapping(input: {
		organizationId: string;
		userId: string;
		employeeId: HumanResourcesEmployeeId;
		relationshipType: "self" | "proxy";
		effectiveFrom: string;
		effectiveUntil?: string | undefined;
		actorUserId: string;
	}): Promise<Result<{ id: string }>>;
}
