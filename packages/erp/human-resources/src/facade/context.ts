import {
	createDrizzleAssignmentContextQuery,
	createDrizzleWorkCalendarLookup,
} from "../composition/adapters/drizzle/index";
import { createProductionApprovedLeaveQuery } from "../composition/production/approved-leave-query";
import { createProductionAssignmentContextQuery } from "../composition/production/assignment-context-query";
import { createProductionWorkCalendar } from "../composition/production/work-calendar";
import { resolveHumanResourcesStore } from "../composition/store/resolve-store";
import type { HumanResourcesPrivacyPort } from "../features/privacy/contract";
import type { AssignmentContextQueryPort } from "../features/time/handoff/ports";
import type { WorkCalendarPort } from "../features/time/work-calendar";
import type { HumanResourcesIdentityResolverPort } from "../features/workforce-records/identity-resolution/identity-resolver";
import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "../kernel/authorization/authorization-types";
import type { HumanResourcesCommandOptions } from "../kernel/execution/command-options";
import type {
	ApprovedLeaveQueryPort,
	AttendanceSourcePort,
	CurrencyLookupPort,
	DocumentObjectResolverPort,
	DocumentReferencePort,
	OrganizationDimensionDirectoryPort,
} from "../kernel/execution/ports";
import type { HrObservabilityPorts } from "../kernel/observability/index";
import type {
	AttendanceSourceCapability,
	HrObservabilityCapabilities,
	HumanResourcesAuthorizationCapability,
	HumanResourcesPrivacyCapability,
	HumanResourcesResourceAuthorizationCapability,
} from "./contracts";

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
	const assignmentContextQuery = createDrizzleAssignmentContextQuery();
	const workCalendarLookup = createDrizzleWorkCalendarLookup({
		store,
		assignmentContext: assignmentContextQuery,
	});
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
				query: assignmentContextQuery,
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
