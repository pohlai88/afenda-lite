import type { HumanResourcesEmployeeId } from "./brands";

export type Employee = {
	id: HumanResourcesEmployeeId;
	organizationId: string;
	employeeNumber: string;
	legalName: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type HumanResourcesTenantContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
};
