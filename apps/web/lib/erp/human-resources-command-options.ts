import type { HumanResourcesCommandOptions } from "@afenda/human-resources";

import { createHumanResourcesAuthorizationPort } from "@/lib/erp/human-resources-authorization-port";

/** Composition-root options for `@afenda/human-resources` public APIs. */
export function createHumanResourcesCommandOptions(): HumanResourcesCommandOptions {
	return {
		authorization: createHumanResourcesAuthorizationPort(),
	};
}
