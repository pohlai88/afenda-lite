import { MASTER_DATA_PERMISSION_CODES } from "../../src/permissions";
import { createGrantingMasterAuthorization } from "./memory-authorization";
import {
	createMemoryMasterDataStore,
	seedDefaultPlatformRefs,
} from "./memory-master-data-store";
import { createMemoryMutationPorts } from "./memory-ports";

export function createMasterDataTestHarness(seedRefs = true) {
	const store = createMemoryMasterDataStore();
	if (seedRefs) {
		seedDefaultPlatformRefs(store);
	}
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingMasterAuthorization([
		...MASTER_DATA_PERMISSION_CODES,
	]);
	return {
		store,
		ports,
		authorization,
		options: { store, ports, authorization },
	};
}
