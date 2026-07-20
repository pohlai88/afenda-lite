import type { MasterAuthorizationPort } from "@afenda/master-data";

import type { FulfillmentAuthorizationPort } from "./authorization";
import { createMasterDataLookupPort } from "./master-lookup";
import type { MasterLookupPort, MutationPorts } from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveFulfillmentStore } from "./resolve-store";
import type { FulfillmentStore } from "./store";

export type FulfillmentCommandOptions = {
	store?: FulfillmentStore;
	ports?: MutationPorts;
	masters?: MasterLookupPort;
	authorization?: FulfillmentAuthorizationPort;
	masterAuthorization?: MasterAuthorizationPort;
};

export function resolveCommandDeps(options: FulfillmentCommandOptions = {}): {
	store: FulfillmentStore;
	ports: MutationPorts;
	masters: MasterLookupPort;
	authorization: FulfillmentAuthorizationPort | undefined;
} {
	return {
		store: resolveFulfillmentStore(options.store),
		ports: options.ports ?? createProductionMutationPorts(),
		masters:
			options.masters ??
			createMasterDataLookupPort(options.masterAuthorization),
		authorization: options.authorization,
	};
}
