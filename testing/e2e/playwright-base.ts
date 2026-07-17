/**
 * Playwright factory entry — specs import from `@/testing/e2e/playwright-base`
 * (see `e2e/tsconfig.json` paths → `../testing/*`; no `baseUrl`). Do not import
 * `@playwright/test` directly in specs.
 */

import { test as base, expect } from "@playwright/test";
import {
	cleanupWorkerTenant,
	isFactoryEnvReady,
	provisionWorkerTenant,
	type WorkerTenantHandle,
} from "./tenancy";

type WorkerFixtures = {
	/** Worker-scoped unique orgs/users when `E2E_FACTORY_*` + DATABASE_URL are set. */
	workerTenant: WorkerTenantHandle | null;
};

export const test = base.extend<object, WorkerFixtures>({
	workerTenant: [
		async (_fixtures, use, workerInfo) => {
			if (!isFactoryEnvReady()) {
				await use(null);
				return;
			}
			const handle = await provisionWorkerTenant(workerInfo.workerIndex);
			try {
				await use(handle);
			} finally {
				await cleanupWorkerTenant(handle);
			}
		},
		{ scope: "worker" },
	],
});

export { expect };
