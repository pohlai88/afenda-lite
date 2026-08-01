import type { HumanResourcesEmployeeId } from "../brands";
import type { HumanResourcesCommandOptions } from "../command-options";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET } from "../module-ids";
import {
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
	type HumanResourcesPermission,
} from "../permissions";
import {
	actorHoldsAnyPermission,
	isInManagerScope,
	isSubjectEmployee,
	resolveActorPermissions,
} from "../shared/authorization-policy-helpers";
import type {
	HumanResourcesActorContext,
	HumanResourcesFieldProjection,
	HumanResourcesResourceContext,
} from "../shared/authorization-types";
import {
	PERSONAL_IDENTIFIER_MASK_FIELDS,
	type ProjectedData,
} from "../shared/field-projection";
import type { EmployeeProfile } from "./types";

type EmployeeProfileProjection = Omit<
	ProjectedData<EmployeeProfile>,
	"data"
> & {
	data: EmployeeProfile;
};

export type EmployeeProfileAudienceTier = "manager" | "self" | "hr";

/** Tiered employee profile field classes — managers receive public only. */
export const EMPLOYEE_PROFILE_FIELD_TIERS = {
	public: [
		"employeeId",
		"employeeNumber",
		"legalName",
		"employmentStatus",
		"employmentId",
		"personId",
		"personDisplayName",
		"preferredName",
		"workerType",
		"workerStatus",
		"organizationEntry",
	],
	self: ["personalPhoneNumber", "homeAddress", "emergencyContacts", "contacts"],
	sensitive: [...PERSONAL_IDENTIFIER_MASK_FIELDS, "identifiers", "bankAccount"],
} as const;

export function employeeProfileQueryRequestedFields(): readonly string[] {
	return [
		...EMPLOYEE_PROFILE_FIELD_TIERS.public,
		...EMPLOYEE_PROFILE_FIELD_TIERS.self,
		...EMPLOYEE_PROFILE_FIELD_TIERS.sensitive,
	];
}

export function resolveEmployeeProfileAudienceTier(input: {
	actor: HumanResourcesActorContext;
	resource: HumanResourcesResourceContext;
}): EmployeeProfileAudienceTier {
	if (isSubjectEmployee(input.actor, input.resource)) {
		return "self";
	}
	if (isInManagerScope(input.actor, input.resource)) {
		return "manager";
	}
	return "hr";
}

function allowedFieldsForAudienceTier(
	tier: EmployeeProfileAudienceTier,
	actorPermissions: ReadonlySet<HumanResourcesPermission>,
): ReadonlySet<string> {
	const allowed = new Set<string>(EMPLOYEE_PROFILE_FIELD_TIERS.public);
	if (tier === "manager") {
		return allowed;
	}
	for (const field of EMPLOYEE_PROFILE_FIELD_TIERS.self) {
		allowed.add(field);
	}
	if (tier === "self") {
		if (canReadEmployeeProfileSensitiveFields(actorPermissions)) {
			for (const field of EMPLOYEE_PROFILE_FIELD_TIERS.sensitive) {
				allowed.add(field);
			}
		}
		return allowed;
	}
	for (const field of EMPLOYEE_PROFILE_FIELD_TIERS.sensitive) {
		if (canReadEmployeeProfileSensitiveFields(actorPermissions)) {
			allowed.add(field);
		}
	}
	return allowed;
}

function canReadEmployeeProfileSensitiveFields(
	actorPermissions: ReadonlySet<HumanResourcesPermission>,
): boolean {
	return (
		actorPermissions.has(
			HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
		) ||
		actorPermissions.has(HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ)
	);
}

export function partitionEmployeeProfileFieldsByAudience(input: {
	requestedFields: readonly string[];
	audienceTier: EmployeeProfileAudienceTier;
	actorPermissions: ReadonlySet<HumanResourcesPermission>;
}): { allowedFields: string[]; deniedFields: string[] } {
	const allowedSet = allowedFieldsForAudienceTier(
		input.audienceTier,
		input.actorPermissions,
	);
	const allowedFields: string[] = [];
	const deniedFields: string[] = [];
	for (const field of input.requestedFields) {
		if (allowedSet.has(field)) {
			allowedFields.push(field);
		} else {
			deniedFields.push(field);
		}
	}
	return { allowedFields, deniedFields };
}

const EMPLOYEE_PROFILE_PROJECTION_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
] as const satisfies readonly HumanResourcesPermission[];

async function probeEmployeeProfilePermissionAtIndex(
	authRequest: Parameters<typeof actorHoldsAnyPermission>[0],
	options: HumanResourcesCommandOptions,
	permissions: Set<HumanResourcesPermission>,
	index: number,
): Promise<ReadonlySet<HumanResourcesPermission>> {
	const permission = EMPLOYEE_PROFILE_PROJECTION_PERMISSIONS[index];
	if (permission === undefined) {
		return permissions;
	}
	if (await actorHoldsAnyPermission(authRequest, options, [permission])) {
		permissions.add(permission);
	}
	return probeEmployeeProfilePermissionAtIndex(
		authRequest,
		options,
		permissions,
		index + 1,
	);
}

/** Probe supplemental sensitive-read permissions for tier projection. */
export function resolveEmployeeProfileActorPermissions(
	request: {
		actor: HumanResourcesActorContext;
		requiredPermission: HumanResourcesPermission;
	},
	options: HumanResourcesCommandOptions,
): Promise<ReadonlySet<HumanResourcesPermission>> {
	const authRequest = {
		...request,
		operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
		operationKind: "query" as const,
	};
	const permissions = new Set(resolveActorPermissions(authRequest));
	return probeEmployeeProfilePermissionAtIndex(
		authRequest,
		options,
		permissions,
		0,
	);
}

function redactNestedIdentifiers(
	identifiers: EmployeeProfile["identifiers"],
): EmployeeProfile["identifiers"] {
	if (identifiers === null) {
		return null;
	}
	return identifiers.map((identifier) => ({
		...identifier,
		identifierLast4: "",
		identifierFingerprint: "",
		documentRef: null,
	}));
}

function redactProfileField(
	profile: EmployeeProfile,
	field: string,
): EmployeeProfile {
	switch (field) {
		case "personalPhoneNumber":
		case "homeAddress":
		case "bankAccount":
		case "ssn":
		case "taxId":
		case "socialSecurityNumber":
		case "identifierLast4":
		case "identifierFingerprint":
		case "documentRef":
			return { ...profile, [field]: null };
		case "emergencyContacts":
		case "contacts":
			return { ...profile, [field]: null };
		case "identifiers":
			return {
				...profile,
				identifiers: redactNestedIdentifiers(profile.identifiers),
			};
		default:
			return profile;
	}
}

export function projectEmployeeProfileFields(input: {
	profile: EmployeeProfile;
	projection: HumanResourcesFieldProjection | undefined;
	audienceTier: EmployeeProfileAudienceTier;
	actorPermissions: ReadonlySet<HumanResourcesPermission>;
}): EmployeeProfileProjection {
	const requested = employeeProfileQueryRequestedFields();
	const tierProjection = partitionEmployeeProfileFieldsByAudience({
		requestedFields: requested,
		audienceTier: input.audienceTier,
		actorPermissions: input.actorPermissions,
	});
	const denied = new Set<string>([
		...tierProjection.deniedFields,
		...(input.projection?.deniedFields ?? []),
	]);
	let profile = { ...input.profile };
	const redactedFields: string[] = [];
	for (const field of denied) {
		if (!(field in profile)) {
			continue;
		}
		profile = redactProfileField(profile, field);
		redactedFields.push(field);
	}
	return { data: profile, redactedFields };
}

export function projectEmployeeProfileFromDecision(
	profile: EmployeeProfile,
	projection: HumanResourcesFieldProjection | undefined,
	input: {
		actor: HumanResourcesActorContext;
		resource: HumanResourcesResourceContext;
		actorPermissions: ReadonlySet<HumanResourcesPermission>;
		subjectEmployeeId: HumanResourcesEmployeeId;
	},
): EmployeeProfile {
	const resource: HumanResourcesResourceContext = {
		...input.resource,
		subjectEmployeeId: input.subjectEmployeeId,
	};
	const audienceTier = resolveEmployeeProfileAudienceTier({
		actor: input.actor,
		resource,
	});
	return projectEmployeeProfileFields({
		profile,
		projection,
		audienceTier,
		actorPermissions: input.actorPermissions,
	}).data;
}
