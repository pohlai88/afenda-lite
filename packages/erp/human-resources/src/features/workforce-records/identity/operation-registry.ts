import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_PERMISSION_PERSON_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERSON_READ,
	HUMAN_RESOURCES_PERMISSION_PERSONAL_DETAILS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERSONAL_DETAILS_READ,
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
	HUMAN_RESOURCES_PERMISSION_WORKER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_WORKER_READ,
} from "../../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../../kernel/operations/define-registry";
import { HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY } from "../../../kernel/operations/sensitivity-defaults";

const WORKFORCE_FOUNDATION_OWNER = "workforce-foundation" as const;
const EMPLOYEE_SUBJECT_POLICY = "hr.employee-subject" as const;
const EMPLOYEE_PROFILE_POLICY = "hr.employee-profile" as const;

export const HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createPerson: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.create",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSON_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "createPerson",
		},
		updatePersonName: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.update",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSON_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "updatePersonName",
		},
		updatePersonPreferredName: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.preferred-name.update",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSON_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "updatePersonPreferredName",
		},
		setPersonPrivacyClassification: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.privacy-classification.set",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSON_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "setPersonPrivacyClassification",
		},
		addPersonContact: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.contact.add",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSONAL_DETAILS_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "addPersonContact",
		},
		updatePersonContact: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.contact.update",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSONAL_DETAILS_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "updatePersonContact",
		},
		retirePersonContact: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.contact.retire",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSONAL_DETAILS_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "retirePersonContact",
		},
		addPersonIdentifier: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.identifier.add",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "addPersonIdentifier",
		},
		retirePersonIdentifier: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.identifier.retire",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "retirePersonIdentifier",
		},
		createWorker: {
			id: "human-resources.worker.create",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_WORKER_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "createWorker",
		},
		changeWorkerType: {
			id: "human-resources.worker.change-type",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_WORKER_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "changeWorkerType",
		},
		changeWorkerStatus: {
			id: "human-resources.worker.change-status",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_WORKER_MANAGE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "changeWorkerStatus",
		},
		createEmployee: {
			id: "human-resources.employee.create",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "createEmployee",
		},
		updateEmployee: {
			id: "human-resources.employee.update",
			kind: "command",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_UPDATE,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "updateEmployee",
		},
	});

export const HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES =
	defineHumanResourcesOperationRegistry({
		getPersonById: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.get",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSON_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "getPersonById",
		},
		getPersonAsOf: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.get-as-of",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSON_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "getPersonAsOf",
		},
		listPersonContacts: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.contacts.list",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSONAL_DETAILS_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "listPersonContacts",
		},
		listPersonIdentifiers: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.identifiers.list",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_SENSITIVE_IDENTIFIERS_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "listPersonIdentifiers",
		},
		detectPersonDuplicates: {
			sensitivity: HUMAN_RESOURCES_PERSONAL_IDENTIFIER_SENSITIVITY,
			id: "human-resources.person.duplicates.detect",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_PERSON_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "detectPersonDuplicates",
		},
		getWorkerById: {
			id: "human-resources.worker.get",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_WORKER_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "getWorkerById",
		},
		getWorkerAsOf: {
			id: "human-resources.worker.get-as-of",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_WORKER_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "getWorkerAsOf",
		},
		getEmployeeById: {
			id: "human-resources.employee.get",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "getEmployeeById",
		},
		listEmployees: {
			id: "human-resources.employee.list",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			publicName: "listEmployees",
		},
		getEmployeeProfile: {
			id: "human-resources.employee.profile.get",
			kind: "query",
			owner: WORKFORCE_FOUNDATION_OWNER,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			authorizationPolicy: EMPLOYEE_PROFILE_POLICY,
			publicName: "getEmployeeProfile",
		},
	});

export const HUMAN_RESOURCES_COMMAND_PERSON_CREATE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.createPerson.id;
export const HUMAN_RESOURCES_COMMAND_PERSON_UPDATE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.updatePersonName.id;
export const HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.updatePersonPreferredName.id;
export const HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.setPersonPrivacyClassification
		.id;
export const HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.addPersonContact.id;
export const HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.updatePersonContact.id;
export const HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.retirePersonContact.id;
export const HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.addPersonIdentifier.id;
export const HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.retirePersonIdentifier.id;
export const HUMAN_RESOURCES_COMMAND_WORKER_CREATE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.createWorker.id;
export const HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.changeWorkerType.id;
export const HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.changeWorkerStatus.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.createEmployee.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS.updateEmployee.id;

export const HUMAN_RESOURCES_QUERY_PERSON_GET =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.getPersonById.id;
export const HUMAN_RESOURCES_QUERY_PERSON_AS_OF =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.getPersonAsOf.id;
export const HUMAN_RESOURCES_QUERY_PERSON_CONTACTS_LIST =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.listPersonContacts.id;
export const HUMAN_RESOURCES_QUERY_PERSON_IDENTIFIERS_LIST =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.listPersonIdentifiers.id;
export const HUMAN_RESOURCES_QUERY_PERSON_DUPLICATES_DETECT =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.detectPersonDuplicates.id;
export const HUMAN_RESOURCES_QUERY_WORKER_GET =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.getWorkerById.id;
export const HUMAN_RESOURCES_QUERY_WORKER_AS_OF =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.getWorkerAsOf.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_GET =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.getEmployeeById.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.listEmployees.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET =
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.getEmployeeProfile.id;

export const HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS,
	);
export const HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERY_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES,
	);

export const HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS,
	);
export const HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES,
	);
