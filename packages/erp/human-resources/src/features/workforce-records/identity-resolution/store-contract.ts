import type { Result } from "@afenda/errors";

import type { HumanResourcesEmployeeId } from "../../../kernel/identity/brands";
import type { HumanResourcesEmployeeIdentity } from "./identity-resolver";

export interface HumanResourcesIdentityStore {
	createUserEmployeeMapping: (input: {
		organizationId: string;
		userId: string;
		employeeId: HumanResourcesEmployeeId;
		relationshipType: "self" | "proxy";
		effectiveFrom: string;
		effectiveUntil?: string | undefined;
		actorUserId: string;
	}) => Promise<Result<{ id: string }>>;

	getManagerEmployeesForUser: (input: {
		organizationId: string;
		userId: string;
		asOf?: string | undefined;
	}) => Promise<Result<HumanResourcesEmployeeId[]>>;
	getUserEmployeeMapping: (input: {
		organizationId: string;
		userId: string;
		asOf?: string | undefined;
	}) => Promise<Result<HumanResourcesEmployeeIdentity | null>>;
}
