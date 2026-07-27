import type { MasterDataStore } from "./store";

/** Persistence boundary required by the party aggregate. */
export type PartyStore = Pick<
	MasterDataStore,
	| "getPartyById"
	| "getPartyByCode"
	| "listParties"
	| "createParty"
	| "updateParty"
	| "transitionParty"
	| "mergeParties"
>;
