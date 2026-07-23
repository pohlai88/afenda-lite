import { ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../../brands";
import type { HumanResourcesEmployeeIdentity } from "../../identity-resolver";
import type { HumanResourcesIdentityStore } from "../../store/identity";
import type { OrganizationMemoryState } from "./organization";

type UserEmployeeMapping = {
	id: string;
	organizationId: string;
	userId: string;
	employeeId: HumanResourcesEmployeeId;
	relationshipType: "self" | "proxy";
	effectiveFrom: string;
	effectiveUntil: string | null;
	createdBy: string;
	createdAt: string;
};

export function createMemoryHumanResourcesIdentityStore(
	organization: OrganizationMemoryState,
): HumanResourcesIdentityStore {
	const mappings: UserEmployeeMapping[] = [];

	return {
		async getUserEmployeeMapping(input: {
			organizationId: string;
			userId: string;
			asOf?: string;
		}): Promise<Result<HumanResourcesEmployeeIdentity | null>> {
			const queryDate = input.asOf ?? new Date().toISOString().slice(0, 10);

			const mapping = mappings.find(
				(m) =>
					m.organizationId === input.organizationId &&
					m.userId === input.userId &&
					m.effectiveFrom <= queryDate &&
					(m.effectiveUntil === null || m.effectiveUntil >= queryDate),
			);

			if (!mapping) {
				return ok(null);
			}

			return ok({
				employeeId: mapping.employeeId,
				relationshipType: mapping.relationshipType,
				effectiveFrom: mapping.effectiveFrom,
				effectiveUntil: mapping.effectiveUntil,
			});
		},

		async getManagerEmployeesForUser(input: {
			organizationId: string;
			userId: string;
			asOf?: string;
		}): Promise<Result<HumanResourcesEmployeeId[]>> {
			const userEmployeeResult = await this.getUserEmployeeMapping({
				organizationId: input.organizationId,
				userId: input.userId,
				asOf: input.asOf,
			});
			if (!userEmployeeResult.ok) {
				return userEmployeeResult;
			}
			if (!userEmployeeResult.data) {
				return ok([]);
			}

			const managerEmployeeId = userEmployeeResult.data.employeeId;
			const queryDate = input.asOf ?? new Date().toISOString().slice(0, 10);

			const employeeIds = Array.from(organization.reportingLines.values())
				.filter(
					(line) =>
						line.organizationId === input.organizationId &&
						line.managerEmployeeId === managerEmployeeId &&
						line.relationshipKind === "primary" &&
						line.startsOn <= queryDate &&
						(line.endsOn === null || line.endsOn >= queryDate),
				)
				.map((line) => line.employeeId);

			return ok(employeeIds);
		},

		async createUserEmployeeMapping(input: {
			organizationId: string;
			userId: string;
			employeeId: HumanResourcesEmployeeId;
			relationshipType: "self" | "proxy";
			effectiveFrom: string;
			effectiveUntil?: string;
			actorUserId: string;
		}): Promise<Result<{ id: string }>> {
			const id = `mapping_${Date.now()}_${Math.random().toString(36).substring(7)}`;

			const mapping: UserEmployeeMapping = {
				id,
				organizationId: input.organizationId,
				userId: input.userId,
				employeeId: input.employeeId,
				relationshipType: input.relationshipType,
				effectiveFrom: input.effectiveFrom,
				effectiveUntil: input.effectiveUntil || null,
				createdBy: input.actorUserId,
				createdAt: new Date().toISOString(),
			};

			mappings.push(mapping);
			return ok({ id });
		},
	};
}
