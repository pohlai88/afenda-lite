import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesActorContext } from "../../../kernel/authorization/authorization-types";
import { authorizeHumanResourcesOperation } from "../../../kernel/authorization/contextual-authorization";
import { resolveManifestOperationPermission } from "../../../kernel/authorization/manifest-permission";
import {
	authorizationDecisionToFailure,
	resolveActorContextFromInput,
} from "../../../kernel/authorization/run-authorized-operation";
import type { Employment } from "../../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import { resolveCommandDeps } from "../../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";
import type { HumanResourcesEmployeeId } from "../../../kernel/identity/brands";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET } from "../../../kernel/operations/module-ids";
import { parseHumanResourcesInput } from "../../../kernel/validation/parse-input";
import {
	type EmployeeOrgContextResolutionStore,
	resolveEmployeeOrgContextForEmployment,
} from "../employment/employee-org-context-resolution";
import { resolveEmployeeProfileResourceFromInput } from "../employment/employee-profile-resource";
import { getEmployeeProfileInputSchema } from "../employment/schema";
import type { HumanResourcesCoreStore } from "../employment/store-contract";
import {
	employeeProfileQueryRequestedFields,
	projectEmployeeProfileFromDecision,
	resolveEmployeeProfileActorPermissions,
} from "./employee-profile-field-projection";
import type { HumanResourcesWorkforceFoundationOperationStore } from "./store-contract";
import type {
	EmployeeOrganizationEntry,
	EmployeeProfile,
	PersonContact,
	Worker,
} from "./types";

type EmployeeProfileStore = Pick<
	HumanResourcesWorkforceFoundationOperationStore,
	| "findWorkerByEmployeeId"
	| "getEmployeeById"
	| "getPersonById"
	| "listPersonContacts"
	| "listPersonIdentifiers"
> &
	Pick<
		HumanResourcesCoreStore,
		"findEmploymentByEmployeeAsOf" | "findOpenEmploymentByEmployee"
	> &
	EmployeeOrgContextResolutionStore;

async function resolveOrganizationEntry(input: {
	store: EmployeeProfileStore;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employment: Employment;
	asOf: string;
}): Promise<Result<EmployeeOrganizationEntry>> {
	const orgContext = await resolveEmployeeOrgContextForEmployment({
		store: input.store,
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		employmentId: input.employment.id,
		asOf: input.asOf,
		mode: "soft",
	});
	if (!orgContext.ok) {
		return orgContext;
	}
	return errorResult.ok({
		enteredOn: input.employment.startsOn,
		employmentId: input.employment.id,
		orgContext: orgContext.data,
	});
}

function contactValue(
	contacts: readonly PersonContact[],
	contactType: PersonContact["contactType"],
): string | null {
	const match = contacts.find(
		(contact) =>
			contact.contactType === contactType && contact.status === "active",
	);
	return match?.valueText ?? null;
}

function emergencyContactsFromPerson(
	contacts: readonly PersonContact[],
): readonly PersonContact[] {
	return contacts.filter(
		(contact) =>
			contact.status === "active" &&
			(contact.contactType === "phone" || contact.contactType === "email"),
	);
}

interface PersonProfileDetails {
	contacts: readonly PersonContact[];
	homeAddress: string | null;
	identifiers: EmployeeProfile["identifiers"];
	personalPhoneNumber: string | null;
	personDisplayName: string | null;
	preferredName: string | null;
}

async function loadPersonProfileDetails(input: {
	store: EmployeeProfileStore;
	organizationId: string;
	personId: Worker["personId"];
}): Promise<Result<PersonProfileDetails>> {
	const person = await input.store.getPersonById({
		organizationId: input.organizationId,
		personId: input.personId,
	});
	if (!person.ok) {
		return person;
	}
	const contacts = await input.store.listPersonContacts({
		organizationId: input.organizationId,
		personId: input.personId,
	});
	if (!contacts.ok) {
		return contacts;
	}
	const identifiers = await input.store.listPersonIdentifiers({
		organizationId: input.organizationId,
		personId: input.personId,
	});
	if (!identifiers.ok) {
		return identifiers;
	}
	return errorResult.ok({
		contacts: contacts.data,
		homeAddress: contactValue(contacts.data, "postal_address"),
		identifiers: identifiers.data,
		personDisplayName: person.data?.legalName ?? null,
		personalPhoneNumber: contactValue(contacts.data, "phone"),
		preferredName: person.data?.preferredName ?? null,
	});
}

async function resolveProfileEmployment(input: {
	store: EmployeeProfileStore;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	asOf: string;
}): Promise<Result<Employment | null>> {
	const employmentAsOf = await input.store.findEmploymentByEmployeeAsOf({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		asOf: input.asOf,
	});
	if (!employmentAsOf.ok || employmentAsOf.data !== null) {
		return employmentAsOf;
	}
	return input.store.findOpenEmploymentByEmployee({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
}

async function assembleEmployeeProfile(input: {
	store: EmployeeProfileStore;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	asOf: string;
}): Promise<Result<EmployeeProfile>> {
	const employee = await input.store.getEmployeeById({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!employee.ok) {
		return employee;
	}
	if (employee.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}

	const employmentResult = await resolveProfileEmployment({
		store: input.store,
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		asOf: input.asOf,
	});
	if (!employmentResult.ok) {
		return employmentResult;
	}
	const employment = employmentResult.data;

	const workerResult = await input.store.findWorkerByEmployeeId({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!workerResult.ok) {
		return workerResult;
	}
	const worker = workerResult.data;

	let personDetails: PersonProfileDetails = {
		contacts: [],
		homeAddress: null,
		identifiers: null,
		personDisplayName: null,
		personalPhoneNumber: null,
		preferredName: null,
	};
	if (worker !== null) {
		const loadedPersonDetails = await loadPersonProfileDetails({
			store: input.store,
			organizationId: input.organizationId,
			personId: worker.personId,
		});
		if (!loadedPersonDetails.ok) {
			return loadedPersonDetails;
		}
		personDetails = loadedPersonDetails.data;
	}

	let organizationEntry: EmployeeOrganizationEntry | null = null;
	if (employment !== null) {
		const entry = await resolveOrganizationEntry({
			store: input.store,
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			employment,
			asOf: input.asOf,
		});
		if (!entry.ok) {
			return entry;
		}
		organizationEntry = entry.data;
	}

	const primaryIdentifier = personDetails.identifiers?.find(
		(identifier) => identifier.status === "active",
	);

	return errorResult.ok({
		employeeId: employee.data.id,
		employeeNumber: employee.data.employeeNumber,
		legalName: employee.data.legalName,
		employmentStatus: employment?.status ?? null,
		employmentId: employment?.id ?? null,
		personId: worker?.personId ?? null,
		personDisplayName: personDetails.personDisplayName,
		preferredName: personDetails.preferredName,
		workerType: worker?.workerType ?? null,
		workerStatus: worker?.status ?? null,
		organizationEntry,
		personalPhoneNumber: personDetails.personalPhoneNumber,
		homeAddress: personDetails.homeAddress,
		emergencyContacts: emergencyContactsFromPerson(personDetails.contacts),
		contacts: personDetails.contacts,
		identifiers: personDetails.identifiers,
		ssn: primaryIdentifier?.identifierLast4 ?? null,
		taxId: null,
		socialSecurityNumber: null,
		identifierLast4: primaryIdentifier?.identifierLast4 ?? null,
		identifierFingerprint: primaryIdentifier?.identifierFingerprint ?? null,
		documentRef: primaryIdentifier?.documentRef ?? null,
		bankAccount: null,
	});
}

export async function getEmployeeProfile(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeProfile>> {
	const parsed = parseHumanResourcesInput(
		getEmployeeProfileInputSchema,
		input,
		"Invalid employee profile get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const requiredPermission = resolveManifestOperationPermission(
		HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
		"query",
	);
	if (requiredPermission === undefined) {
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
			),
		});
	}

	const resource = await resolveEmployeeProfileResourceFromInput(
		parsed.data,
		options,
	);
	let actor: HumanResourcesActorContext = resolveActorContextFromInput(
		parsed.data,
	);
	if (
		actor.actorEmployeeId === undefined &&
		options.identityResolver !== undefined
	) {
		const identity = await options.identityResolver.resolveEmployeeForActor({
			organizationId: actor.organizationId,
			actorUserId: actor.actorUserId,
		});
		if (identity.ok && identity.data !== null) {
			actor = { ...actor, actorEmployeeId: identity.data.employeeId };
		}
	}
	const authorizationResult = await authorizeHumanResourcesOperation(
		{
			operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
			operationKind: "query",
			requiredPermission,
			actor,
			resource,
			requestedFields: [...employeeProfileQueryRequestedFields()],
		},
		options,
	);
	if (!authorizationResult.ok) {
		return authorizationResult;
	}
	const decision = authorizationResult.data;
	if (!decision.allowed) {
		return authorizationDecisionToFailure(
			decision,
			HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
		);
	}

	const { store } = resolveCommandDeps(options);
	const assembled = await assembleEmployeeProfile({
		store,
		organizationId: parsed.data.organizationId,
		employeeId: parsed.data.employeeId,
		asOf: parsed.data.asOf,
	});
	if (!assembled.ok) {
		return assembled;
	}

	const actorPermissions = await resolveEmployeeProfileActorPermissions(
		{ actor, requiredPermission },
		options,
	);
	const projected = projectEmployeeProfileFromDecision(
		assembled.data,
		decision.projection,
		{
			actor,
			resource: resource ?? {
				organizationId: parsed.data.organizationId,
				kind: "employee",
				subjectEmployeeId: parsed.data.employeeId,
			},
			actorPermissions,
			subjectEmployeeId: parsed.data.employeeId,
		},
	);
	return errorResult.ok(projected);
}
