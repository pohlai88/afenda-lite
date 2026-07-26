import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesEmployeeId } from "../brands";
import type { HumanResourcesCommandOptions } from "../command-options";
import { resolveCommandDeps } from "../command-options";
import { resolveEmployeeOrgContextForEmployment } from "../core/employee-org-context-resolution";
import {
	HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import { HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET } from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import { getEmployeeProfileInputSchema } from "../schemas/core";
import type { HumanResourcesActorContext } from "../shared/authorization-types";
import { authorizeHumanResourcesOperation } from "../shared/contextual-authorization";
import { resolveEmployeeProfileResourceFromInput } from "../shared/employee-profile-resource";
import { resolveManifestOperationPermission } from "../shared/manifest-permission";
import {
	authorizationDecisionToFailure,
	resolveActorContextFromInput,
} from "../shared/run-authorized-operation";
import type { HumanResourcesStore } from "../store";
import type { Employment } from "../types";
import {
	employeeProfileQueryRequestedFields,
	projectEmployeeProfileFromDecision,
	resolveEmployeeProfileActorPermissions,
} from "./employee-profile-field-projection";
import type {
	EmployeeOrganizationEntry,
	EmployeeProfile,
	PersonContact,
} from "./types";

async function resolveOrganizationEntry(input: {
	store: HumanResourcesStore;
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
	return ok({
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

async function assembleEmployeeProfile(input: {
	store: HumanResourcesStore;
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
		return fail(
			"NOT_FOUND",
			"Employee not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const employmentAsOf = await input.store.findEmploymentByEmployeeAsOf({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		asOf: input.asOf,
	});
	if (!employmentAsOf.ok) {
		return employmentAsOf;
	}
	let employment = employmentAsOf.data;
	if (employment === null) {
		const openEmployment = await input.store.findOpenEmploymentByEmployee({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!openEmployment.ok) {
			return openEmployment;
		}
		employment = openEmployment.data;
	}

	const workerResult = await input.store.findWorkerByEmployeeId({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!workerResult.ok) {
		return workerResult;
	}
	const worker = workerResult.data;

	let personDisplayName: string | null = null;
	let preferredName: string | null = null;
	let contacts: readonly PersonContact[] = [];
	let identifiers: EmployeeProfile["identifiers"] = null;
	let personalPhoneNumber: string | null = null;
	let homeAddress: string | null = null;

	if (worker !== null) {
		const person = await input.store.getPersonById({
			organizationId: input.organizationId,
			personId: worker.personId,
		});
		if (!person.ok) {
			return person;
		}
		if (person.data !== null) {
			personDisplayName = person.data.legalName;
			preferredName = person.data.preferredName;
		}
		const listedContacts = await input.store.listPersonContacts({
			organizationId: input.organizationId,
			personId: worker.personId,
		});
		if (!listedContacts.ok) {
			return listedContacts;
		}
		contacts = listedContacts.data;
		personalPhoneNumber = contactValue(contacts, "phone");
		homeAddress = contactValue(contacts, "postal_address");
		const listedIdentifiers = await input.store.listPersonIdentifiers({
			organizationId: input.organizationId,
			personId: worker.personId,
		});
		if (!listedIdentifiers.ok) {
			return listedIdentifiers;
		}
		identifiers = listedIdentifiers.data;
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

	const primaryIdentifier = identifiers?.find(
		(identifier) => identifier.status === "active",
	);

	return ok({
		employeeId: employee.data.id,
		employeeNumber: employee.data.employeeNumber,
		legalName: employee.data.legalName,
		employmentStatus: employment?.status ?? null,
		employmentId: employment?.id ?? null,
		personId: worker?.personId ?? null,
		personDisplayName,
		preferredName,
		workerType: worker?.workerType ?? null,
		workerStatus: worker?.status ?? null,
		organizationEntry,
		personalPhoneNumber,
		homeAddress,
		emergencyContacts: emergencyContactsFromPerson(contacts),
		contacts,
		identifiers,
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
		return fail(
			"FORBIDDEN",
			"Human Resources authorization denied",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED),
		);
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
	return ok(projected);
}
