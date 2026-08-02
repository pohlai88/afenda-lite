import { errorResult, type Result } from "@afenda/errors";
import { createProductionAssignmentContextQuery } from "../../composition/production/assignment-context-query";
import { createProductionMutationPorts } from "../../composition/production/ports";
import type { HumanResourcesStore } from "../../composition/store/index";
import { resolveHumanResourcesStore } from "../../composition/store/resolve-store";
import { createUnavailableCurrencyLookup } from "../../features/compensation-benefits/currency-lookup";
import { createVaultDocumentReferenceAdapter } from "../../features/compliance/vault-document-reference-adapter";
import type { HumanResourcesPrivacyPort } from "../../features/privacy/contract";
import type { AssignmentContextQueryPort } from "../../features/time/handoff/ports";
import type { WorkCalendarPort } from "../../features/time/work-calendar";
import type { HumanResourcesIdentityResolverPort } from "../../features/workforce-records/identity-resolution/identity-resolver";
import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "../authorization/authorization-types";
import type { HrObservabilityPorts } from "../observability/index";
import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	humanResourcesErrorDetails,
} from "./error-codes";
import type {
	ApprovedLeaveQueryPort,
	AttendanceSourcePort,
	CurrencyLookupPort,
	DocumentObjectResolverPort,
	DocumentReferencePort,
	MutationPorts,
	OrganizationDimensionDirectoryPort,
} from "./ports";

export interface HumanResourcesCommandOptions {
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
	ports?: MutationPorts | undefined;
	privacy?: HumanResourcesPrivacyPort | undefined;
	resourceAwareAuthorization?:
		| HumanResourcesResourceAwareAuthorizationPort
		| undefined;
	store?: HumanResourcesStore | undefined;
	workCalendar?: WorkCalendarPort | undefined;
}

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveCurrencyLookup(
	currency?: CurrencyLookupPort,
): CurrencyLookupPort {
	return currency ?? createUnavailableCurrencyLookup();
}

export function resolveStore(store?: HumanResourcesStore): HumanResourcesStore {
	return resolveHumanResourcesStore(store);
}

function requireCommandOptionPort<T>(
	value: T | undefined,
	_message: string,
): Result<T> {
	if (value === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
			),
		});
	}
	return errorResult.ok(value);
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
		return errorResult.ok(options.documentReference);
	}
	if (options.documentObjectResolver !== undefined) {
		return errorResult.ok(
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
