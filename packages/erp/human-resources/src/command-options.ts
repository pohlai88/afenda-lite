import { fail, ok, type Result } from "@afenda/errors/result";
import { createProductionCurrencyLookup } from "./compensation-benefits/currency-lookup";
import { createVaultDocumentReferenceAdapter } from "./compliance/vault-document-reference-adapter";
import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	humanResourcesErrorDetails,
} from "./error-codes";
import type { HumanResourcesIdentityResolverPort } from "./identity-resolver";
import type { HrObservabilityPorts } from "./observability";
import type {
	ApprovedLeaveQueryPort,
	AttendanceSourcePort,
	CurrencyLookupPort,
	DocumentObjectResolverPort,
	DocumentReferencePort,
	MutationPorts,
	OrganizationDimensionDirectoryPort,
} from "./ports";
import type { HumanResourcesPrivacyPort } from "./privacy";
import { createProductionAssignmentContextQuery } from "./production-assignment-context-query";
import { createProductionMutationPorts } from "./production-ports";
import { resolveHumanResourcesStore } from "./resolve-store";
import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "./shared/authorization-types";
import type { HumanResourcesStore } from "./store";
import type { AssignmentContextQueryPort } from "./time/handoff/ports";
import type { WorkCalendarPort } from "./time/work-calendar";

export type HumanResourcesCommandOptions = {
	store?: HumanResourcesStore | undefined;
	ports?: MutationPorts | undefined;
	currency?: CurrencyLookupPort | undefined;
	documentReference?: DocumentReferencePort | undefined;
	organizationDimensions?: OrganizationDimensionDirectoryPort | undefined;
	workCalendar?: WorkCalendarPort | undefined;
	approvedLeave?: ApprovedLeaveQueryPort | undefined;
	assignmentContext?: AssignmentContextQueryPort | undefined;
	attendanceSource?: AttendanceSourcePort | undefined;
	authorization?: HumanResourcesAuthorizationPort | undefined;
	resourceAwareAuthorization?:
		| HumanResourcesResourceAwareAuthorizationPort
		| undefined;
	identityResolver?: HumanResourcesIdentityResolverPort | undefined;
	privacy?: HumanResourcesPrivacyPort | undefined;
	documentObjectResolver?: DocumentObjectResolverPort | undefined;
	observability?: HrObservabilityPorts | undefined;
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

function requireCommandOptionPort<T>(
	value: T | undefined,
	message: string,
): Result<T> {
	if (value === undefined) {
		return fail(
			"CONFLICT",
			message,
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE),
		);
	}
	return ok(value);
}

export function requireWorkCalendar(
	options: HumanResourcesCommandOptions,
): Result<WorkCalendarPort> {
	return requireCommandOptionPort(
		options.workCalendar,
		"Work calendar adapter is required for this command.",
	);
}

export function requireApprovedLeaveQuery(
	options: HumanResourcesCommandOptions,
): Result<ApprovedLeaveQueryPort> {
	return requireCommandOptionPort(
		options.approvedLeave,
		"Approved leave query adapter is required for this command.",
	);
}

export function resolveAssignmentContext(
	options: HumanResourcesCommandOptions = {},
): AssignmentContextQueryPort {
	return options.assignmentContext ?? createProductionAssignmentContextQuery();
}

export function requireAttendanceSource(
	options: HumanResourcesCommandOptions,
): Result<AttendanceSourcePort> {
	return requireCommandOptionPort(
		options.attendanceSource,
		"Attendance source adapter is required for this command.",
	);
}

export function requireDocumentReference(
	options: HumanResourcesCommandOptions,
): Result<DocumentReferencePort> {
	if (options.documentReference !== undefined) {
		return ok(options.documentReference);
	}
	if (options.documentObjectResolver !== undefined) {
		return ok(
			createVaultDocumentReferenceAdapter({
				resolver: options.documentObjectResolver,
			}),
		);
	}
	return requireCommandOptionPort<DocumentReferencePort>(
		undefined,
		"Document reference adapter is required for this command.",
	);
}

export function requirePrivacyPort(
	options: HumanResourcesCommandOptions,
): Result<HumanResourcesPrivacyPort> {
	return requireCommandOptionPort(
		options.privacy,
		"Human Resources privacy adapter is required for this operation.",
	);
}

export function requireOrganizationDimensionDirectory(
	options: HumanResourcesCommandOptions,
): Result<OrganizationDimensionDirectoryPort> {
	return requireCommandOptionPort(
		options.organizationDimensions,
		"Organization dimension directory is required for this command.",
	);
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
