import { createParty, getPartyById, updateParty } from "../../src";
import type { Party } from "../../src/types";
import {
	createDrizzleHarness,
	createMemoryHarness,
	defineRootParityTests,
	type RootParityContract,
} from "./parity-harness";

const contract: RootParityContract<Party> = {
	create: (harness) =>
		createParty(
			{
				...harness.context(),
				code: "PARITY-PARTY",
				name: "Parity Party",
				partyKind: "organization",
			},
			harness.options,
		),
	get: (harness, id, organizationId) =>
		getPartyById(
			{ ...harness.queryContext(organizationId), id },
			harness.options,
		),
	update: (harness, row, expectedVersion) =>
		updateParty(
			{
				...harness.context(),
				id: row.id,
				expectedVersion,
				name: "Parity Party Updated",
			},
			harness.options,
		),
};

defineRootParityTests(
	"MemoryMasterDataStore party",
	createMemoryHarness,
	contract,
);
defineRootParityTests(
	"DrizzleMasterDataStore party",
	createDrizzleHarness,
	contract,
);
