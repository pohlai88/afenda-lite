import { createDrizzleHumanResourcesStore } from "../../src/adapters/drizzle";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../../src/permissions";
import { createMemoryHumanResourcesStore } from "../../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";
import { createMemoryMutationPorts } from "./memory-ports";
import { seedDepartmentAndJob } from "./seed-department-and-job";

export { seedDepartmentAndJob };

export type WorkforceStoreAdapter = "memory" | "drizzle";

export type WorkforceHarness = HumanResourcesCommandOptions & {
	adapter: WorkforceStoreAdapter;
	ports: ReturnType<typeof createMemoryMutationPorts>;
};

/** Shared Memory / Drizzle harness for workforce semantic parity suites. */
export function createWorkforceHarness(
	adapter: WorkforceStoreAdapter,
): WorkforceHarness {
	const store =
		adapter === "memory"
			? createMemoryHumanResourcesStore()
			: createDrizzleHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	return { adapter, store, ports, authorization };
}
