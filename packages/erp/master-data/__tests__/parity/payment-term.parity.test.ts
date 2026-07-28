import {
	createPaymentTerm,
	getPaymentTermById,
	updatePaymentTerm,
} from "../../src";
import type { PaymentTerm } from "../../src/types";
import {
	createDrizzleHarness,
	createMemoryHarness,
	defineRootParityTests,
	type RootParityContract,
} from "./parity-harness";

const contract: RootParityContract<PaymentTerm> = {
	create: (harness) =>
		createPaymentTerm(
			{
				...harness.context(),
				code: "PARITY-N30",
				name: "Parity Net 30",
				netDays: 30,
			},
			harness.options,
		),
	get: (harness, id, organizationId) =>
		getPaymentTermById(
			{ ...harness.queryContext(organizationId), id },
			harness.options,
		),
	update: (harness, row, expectedVersion) =>
		updatePaymentTerm(
			{
				...harness.context(),
				id: row.id,
				expectedVersion,
				name: "Parity Net 30 Updated",
			},
			harness.options,
		),
};

defineRootParityTests(
	"MemoryMasterDataStore payment term",
	createMemoryHarness,
	contract,
);
defineRootParityTests(
	"DrizzleMasterDataStore payment term",
	createDrizzleHarness,
	contract,
);
