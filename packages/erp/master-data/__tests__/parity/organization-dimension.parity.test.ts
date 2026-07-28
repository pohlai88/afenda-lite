import {
	createOrganizationDimension,
	getOrganizationDimensionById,
	updateOrganizationDimension,
} from "../../src";
import type { OrganizationDimension } from "../../src/capabilities/core-organization-masters/organization-dimension";
import {
	createDrizzleHarness,
	createMemoryHarness,
	defineRootParityTests,
	type RootParityContract,
} from "./parity-harness";

const contract: RootParityContract<OrganizationDimension> = {
	create: (harness) =>
		createOrganizationDimension(
			{
				...harness.context(),
				kind: "department",
				key: "PARITY-DEPARTMENT",
				name: "Parity Department",
				effectiveFrom: "2026-01-01",
			},
			{
				store: harness.store,
				authorization: harness.options.authorization,
			},
		),
	get: (harness, id, organizationId) =>
		getOrganizationDimensionById(
			{ ...harness.queryContext(organizationId), id },
			{
				store: harness.store,
				authorization: harness.options.authorization,
			},
		),
	update: (harness, row, expectedVersion) =>
		updateOrganizationDimension(
			{
				...harness.context(),
				id: row.id,
				expectedVersion,
				name: "Parity Department Updated",
			},
			{
				store: harness.store,
				authorization: harness.options.authorization,
			},
		),
};

defineRootParityTests(
	"MemoryMasterDataStore organization dimension",
	createMemoryHarness,
	contract,
);
defineRootParityTests(
	"DrizzleMasterDataStore organization dimension",
	createDrizzleHarness,
	contract,
);
