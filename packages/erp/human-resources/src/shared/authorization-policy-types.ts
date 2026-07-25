import type { HumanResourcesCommandOptions } from "../command-options";
import type {
	HumanResourcesAuthorizationDecision,
	HumanResourcesAuthorizationDenyCode,
	HumanResourcesAuthorizationRequest,
} from "./authorization-types";

export type HumanResourcesPolicyMode =
	| "manifest_only"
	| "subject_scoped"
	| "resource_scoped"
	| "privileged_only"
	| "specialized";

export interface HumanResourcesAuthorizationPolicy {
	id: string;
	mode: HumanResourcesPolicyMode;
	operationPrefixes: readonly string[];
	resourceRequired: boolean;
	evaluate(
		request: HumanResourcesAuthorizationRequest,
		options: HumanResourcesCommandOptions,
	): Promise<HumanResourcesAuthorizationDecision>;
}

export type HumanResourcesAuthorizationPolicyResolveCode = Extract<
	HumanResourcesAuthorizationDenyCode,
	"policy_not_registered" | "ambiguous_policy"
>;

/** Thrown by resolveHumanResourcesAuthorizationPolicy — CI fails; facade maps to deny. */
export class HumanResourcesAuthorizationPolicyResolveError extends Error {
	readonly code: HumanResourcesAuthorizationPolicyResolveCode;

	constructor(
		code: HumanResourcesAuthorizationPolicyResolveCode,
		message: string,
	) {
		super(message);
		this.name = "HumanResourcesAuthorizationPolicyResolveError";
		this.code = code;
	}
}
