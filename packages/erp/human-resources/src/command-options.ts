import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "./authorization";
import { createProductionCurrencyLookup } from "./compensation-benefits/currency-lookup";
import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	humanResourcesErrorDetails,
} from "./error-codes";
import type { HumanResourcesIdentityResolverPort } from "./identity-resolver";
import type {
	ApprovedLeaveQueryPort,
	AttendanceSourcePort,
	CurrencyLookupPort,
	DocumentReferencePort,
	MutationPorts,
	OrganizationDimensionDirectoryPort,
} from "./ports";
import type { HumanResourcesPrivacyPort } from "./privacy";
import { createProductionAssignmentContextQuery } from "./production-assignment-context-query";
import { createProductionMutationPorts } from "./production-ports";
import { resolveHumanResourcesStore } from "./resolve-store";
import type { HumanResourcesStore } from "./store";
import type { AssignmentContextQueryPort } from "./time/handoff/ports";
import type { WorkCalendarPort } from "./time/work-calendar";

export type HumanResourcesCommandOptions = {
	store?: HumanResourcesStore;
	ports?: MutationPorts;
	currency?: CurrencyLookupPort;
	documentReference?: DocumentReferencePort;
	organizationDimensions?: OrganizationDimensionDirectoryPort;
	workCalendar?: WorkCalendarPort;
	approvedLeave?: ApprovedLeaveQueryPort;
	assignmentContext?: AssignmentContextQueryPort;
	attendanceSource?: AttendanceSourcePort;
	authorization?: HumanResourcesAuthorizationPort;
	resourceAwareAuthorization?: HumanResourcesResourceAwareAuthorizationPort;
	identityResolver?: HumanResourcesIdentityResolverPort;
	privacy?: HumanResourcesPrivacyPort;
};

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveCurrencyLookup(
	currency?: CurrencyLookupPort,
): CurrencyLookupPort {
	return currency ?? createProductionCurrencyLookup();
}

export function resolveStore(store?: HumanResourcesStore): HumanResourcesStore {
	return resolveHumanResourcesStore(store);
}

export function requireWorkCalendar(
	options: HumanResourcesCommandOptions,
): Result<WorkCalendarPort> {
	if (options.workCalendar === undefined) {
		return fail(
			"CONFLICT",
			"Work calendar adapter is required for this command.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		);
	}
	return ok(options.workCalendar);
}

export function requireApprovedLeaveQuery(
	options: HumanResourcesCommandOptions,
): Result<ApprovedLeaveQueryPort> {
	if (options.approvedLeave === undefined) {
		return fail(
			"CONFLICT",
			"Approved leave query adapter is required for this command.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		);
	}
	return ok(options.approvedLeave);
}

export function resolveAssignmentContext(
	options: HumanResourcesCommandOptions = {},
): AssignmentContextQueryPort {
	return options.assignmentContext ?? createProductionAssignmentContextQuery();
}

export function requireAttendanceSource(
	options: HumanResourcesCommandOptions,
): Result<AttendanceSourcePort> {
	if (options.attendanceSource === undefined) {
		return fail(
			"CONFLICT",
			"Attendance source adapter is required for this command.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		);
	}
	return ok(options.attendanceSource);
}

export function requireDocumentReference(
	options: HumanResourcesCommandOptions,
): Result<DocumentReferencePort> {
	if (options.documentReference === undefined) {
		return fail(
			"CONFLICT",
			"Document reference adapter is required for this command.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		);
	}
	return ok(options.documentReference);
}

export function requirePrivacyPort(
	options: HumanResourcesCommandOptions,
): Result<HumanResourcesPrivacyPort> {
	if (options.privacy === undefined) {
		return fail(
			"CONFLICT",
			"Human Resources privacy adapter is required for this operation.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		);
	}
	return ok(options.privacy);
}

export function requireOrganizationDimensionDirectory(
	options: HumanResourcesCommandOptions,
): Result<OrganizationDimensionDirectoryPort> {
	if (options.organizationDimensions === undefined) {
		return fail(
			"CONFLICT",
			"Organization dimension directory is required for this command.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		);
	}
	return ok(options.organizationDimensions);
}

export function resolveCommandDeps(
	options: HumanResourcesCommandOptions = {},
): {
	store: HumanResourcesStore;
	ports: MutationPorts;
	currency: CurrencyLookupPort;
	authorization: HumanResourcesAuthorizationPort | undefined;
	resourceAwareAuthorization:
		| HumanResourcesResourceAwareAuthorizationPort
		| undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
	privacy: HumanResourcesPrivacyPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		currency: resolveCurrencyLookup(options.currency),
		authorization: options.authorization,
		resourceAwareAuthorization: options.resourceAwareAuthorization,
		identityResolver: options.identityResolver,
		privacy: options.privacy,
	};
}
