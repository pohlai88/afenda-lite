import {
	createDrizzleAssignmentContextQuery,
	createDrizzleWorkCalendarLookup,
} from "./adapters/drizzle";
import type { HumanResourcesCommandOptions } from "./command-options";
import type { HumanResourcesIdentityResolverPort } from "./identity-resolver";
import type { HrObservabilityPorts } from "./observability";
import type {
	ApprovedLeaveQueryPort,
	AttendanceSourcePort,
	CurrencyLookupPort,
	DocumentObjectResolverPort,
	DocumentReferencePort,
	OrganizationDimensionDirectoryPort,
} from "./ports";
import type { HumanResourcesPrivacyPort } from "./privacy";
import { createProductionApprovedLeaveQuery } from "./production-approved-leave-query";
import { createProductionAssignmentContextQuery } from "./production-assignment-context-query";
import { createProductionWorkCalendar } from "./production-work-calendar";
import type {
	AttendanceSourceCapability,
	HrObservabilityCapabilities,
	HumanResourcesAuthorizationCapability,
	HumanResourcesPrivacyCapability,
	HumanResourcesResourceAuthorizationCapability,
} from "./public-contracts";
import { resolveHumanResourcesStore } from "./resolve-store";
import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "./shared/authorization-types";
import type { AssignmentContextQueryPort } from "./time/handoff/ports";
import type { WorkCalendarPort } from "./time/work-calendar";

const HUMAN_RESOURCES_CONTEXT = Symbol("afenda.human-resources.context");

/**
 * Permanent public execution input. The private symbol makes the context
 * impossible to construct outside the package while retaining explicit
 * authorization for diagnostics and contract tests.
 */
export interface HumanResourcesCapabilityOptions {
	readonly attendanceSource?: AttendanceSourceCapability | undefined;
	readonly authorization?: HumanResourcesAuthorizationCapability | undefined;
	readonly observability?: HrObservabilityCapabilities | undefined;
	readonly privacy?: HumanResourcesPrivacyCapability | undefined;
	readonly resourceAwareAuthorization?:
		| HumanResourcesResourceAuthorizationCapability
		| undefined;
	readonly [HUMAN_RESOURCES_CONTEXT]: true;
}

interface HumanResourcesComposition {
	approvedLeave?: ApprovedLeaveQueryPort | undefined;
	assignmentContext?: AssignmentContextQueryPort | undefined;
	attendanceSource?: AttendanceSourcePort | undefined;
	authorization?: HumanResourcesAuthorizationPort | undefined;
	currency?: CurrencyLookupPort | undefined;
	documentObjectResolver?: DocumentObjectResolverPort | undefined;
	documentReference?: DocumentReferencePort | undefined;
	identityResolver?: HumanResourcesIdentityResolverPort | undefined;
	observability?: HrObservabilityPorts | undefined;
	organizationDimensions?: OrganizationDimensionDirectoryPort | undefined;
	privacy?: HumanResourcesPrivacyPort | undefined;
	resourceAwareAuthorization?:
		| HumanResourcesResourceAwareAuthorizationPort
		| undefined;
	workCalendar?: WorkCalendarPort | undefined;
}

const internalOptions = new WeakMap<
	HumanResourcesCapabilityOptions,
	HumanResourcesCommandOptions
>();

/** Create one opaque execution context at the application composition root. */
export function createHumanResourcesCapabilityOptions(
	composition: HumanResourcesComposition,
): HumanResourcesCapabilityOptions {
	const store = resolveHumanResourcesStore();
	const workCalendarLookup = createDrizzleWorkCalendarLookup();
	const context = Object.freeze({
		[HUMAN_RESOURCES_CONTEXT]: true,
		authorization: composition.authorization,
		resourceAwareAuthorization: composition.resourceAwareAuthorization,
		attendanceSource: composition.attendanceSource,
		observability: composition.observability,
		privacy: composition.privacy,
	} satisfies HumanResourcesCapabilityOptions);
	internalOptions.set(context, {
		...composition,
		approvedLeave:
			composition.approvedLeave ??
			createProductionApprovedLeaveQuery({
				store,
				lookup: workCalendarLookup,
			}),
		assignmentContext:
			composition.assignmentContext ??
			createProductionAssignmentContextQuery({
				query: createDrizzleAssignmentContextQuery(),
			}),
		workCalendar:
			composition.workCalendar ??
			createProductionWorkCalendar({ lookup: workCalendarLookup }),
	});
	return context;
}

export function resolveHumanResourcesCapabilityOptions(
	context: HumanResourcesCapabilityOptions,
): HumanResourcesCommandOptions {
	const options = internalOptions.get(context);
	if (options === undefined) {
		throw new TypeError(
			"Human Resources operations require a context created by createHumanResourcesCapabilityOptions().",
		);
	}
	return options;
}
