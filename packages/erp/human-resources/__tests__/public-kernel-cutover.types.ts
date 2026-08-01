import {
	createEmployee,
	createHumanResourcesCapabilityOptions,
} from "@afenda/human-resources";

const context = createHumanResourcesCapabilityOptions({});

export const validPublicCapabilityCall = createEmployee(
	{
		organizationId: "org-contract",
		actorUserId: "user-contract",
		correlationId: "corr-contract",
		idempotencyKey: "idem-contract",
		employeeNumber: "E-CONTRACT",
		legalName: "Contract Fixture",
	},
	context,
);

// @ts-expect-error broad execution infrastructure is not a public option
export const leakedStore = context.store;
