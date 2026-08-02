import type { GovernanceStore } from "./store";
import type { GovernanceMembership } from "./types";

export type GovernanceMeetingReferencePort = Pick<
	GovernanceStore,
	| "getGovernanceBody"
	| "getGovernanceMembership"
	| "listGovernanceMembershipsAsOf"
>;

export type GovernanceMeetingMembership = GovernanceMembership;
