import { createDrizzleCorporateAdministrationStore } from "../../src/adapters/drizzle";
import type { CorporateAdministrationCommandOptions } from "../../src/command-options";
import { createMemoryCorporateAdministrationStore } from "../../src/memory-store";
import { CA_PERMISSION_CODES } from "../../src/permissions";
import type { MutationPorts } from "../../src/ports";
import { createGrantingCaAuthorization } from "./memory-authorization";
import type { createMemoryCaMasterLookup } from "./memory-masters";
import { createMemoryMutationPorts } from "./memory-ports";

export type CaStoreAdapter = "memory" | "drizzle";

export type CaParityHarness = CorporateAdministrationCommandOptions & {
	adapter: CaStoreAdapter;
	ports: MutationPorts;
};

export function createCaParityHarness(
	adapter: CaStoreAdapter,
	masters: ReturnType<typeof createMemoryCaMasterLookup>,
): CaParityHarness {
	const store =
		adapter === "memory"
			? createMemoryCorporateAdministrationStore()
			: createDrizzleCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return {
		store,
		ports,
		masters,
		authorization,
		adapter,
	};
}

export { hasDatabase, runDrizzleParity } from "./database-gate";
