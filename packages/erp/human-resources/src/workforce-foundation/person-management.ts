import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD,
	HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE,
	HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET,
	HUMAN_RESOURCES_QUERY_PERSON_CONTACTS_LIST,
	HUMAN_RESOURCES_QUERY_PERSON_DUPLICATES_DETECT,
	HUMAN_RESOURCES_QUERY_PERSON_IDENTIFIERS_LIST,
} from "../module-ids";
import {
	addPersonContactInputSchema,
	addPersonIdentifierInputSchema,
	detectPersonDuplicatesInputSchema,
	listPersonContactsInputSchema,
	listPersonIdentifiersInputSchema,
	retirePersonContactInputSchema,
	retirePersonIdentifierInputSchema,
	setPersonPrivacyClassificationInputSchema,
	updatePersonContactInputSchema,
	updatePersonPreferredNameInputSchema,
} from "../schemas/workforce-foundation";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import {
	fingerprintPersonContactAdd,
	fingerprintPersonIdentifierAdd,
} from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	fingerprintPersonIdentifier,
	last4PersonIdentifier,
	normalizePersonContactValue,
} from "./person-privacy";
import type {
	Person,
	PersonContact,
	PersonDuplicateCandidate,
	PersonIdentifier,
} from "./types";

export function updatePersonPreferredName(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Person>> {
	return runCoreCommand(input, options, {
		schema: updatePersonPreferredNameInputSchema,
		invalidMessage: "Invalid person preferred name update input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updatePersonPreferredName(
				{
					organizationId: data.organizationId,
					personId: data.personId,
					preferredName: data.preferredName?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE,
				}),
			),
	});
}

export function setPersonPrivacyClassification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Person>> {
	return runCoreCommand(input, options, {
		schema: setPersonPrivacyClassificationInputSchema,
		invalidMessage: "Invalid person privacy classification input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET,
		execute: async (data, { store, ports }) =>
			store.setPersonPrivacyClassification(
				{
					organizationId: data.organizationId,
					personId: data.personId,
					privacyClassification: data.privacyClassification,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET,
				}),
			),
	});
}

export function addPersonContact(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PersonContact>> {
	return runCoreCommand(input, options, {
		schema: addPersonContactInputSchema,
		invalidMessage: "Invalid person contact add input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD,
		execute: async (data, { store, ports }) => {
			const normalizedValue = normalizePersonContactValue(
				data.contactType,
				data.valueText,
			);
			const requestFingerprint = fingerprintPersonContactAdd({
				personId: data.personId,
				contactType: data.contactType,
				normalizedValue,
				isPrimary: data.isPrimary,
			});

			const existingByKey = await store.findPersonContactByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.contact);
			}

			return store.addPersonContact(
				{
					organizationId: data.organizationId,
					personId: data.personId,
					contactType: data.contactType,
					valueText: data.valueText.trim(),
					normalizedValue,
					isPrimary: data.isPrimary,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD,
				}),
			);
		},
	});
}

export function updatePersonContact(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PersonContact>> {
	return runCoreCommand(input, options, {
		schema: updatePersonContactInputSchema,
		invalidMessage: "Invalid person contact update input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE,
		execute: async (data, { store, ports }) => {
			const contacts = await store.listPersonContacts({
				organizationId: data.organizationId,
				personId: data.personId,
			});
			if (!contacts.ok) {
				return contacts;
			}
			const contact = contacts.data.find((row) => row.id === data.contactId);
			if (contact === undefined) {
				return fail("NOT_FOUND", "Person contact not found");
			}

			const normalizedValue = normalizePersonContactValue(
				contact.contactType,
				data.valueText,
			);
			return store.updatePersonContact(
				{
					organizationId: data.organizationId,
					personId: data.personId,
					contactId: data.contactId,
					valueText: data.valueText.trim(),
					normalizedValue,
					...(data.isPrimary === undefined
						? {}
						: { isPrimary: data.isPrimary }),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE,
				}),
			);
		},
	});
}

export function retirePersonContact(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PersonContact>> {
	return runCoreCommand(input, options, {
		schema: retirePersonContactInputSchema,
		invalidMessage: "Invalid person contact retire input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE,
		execute: async (data, { store, ports }) =>
			store.retirePersonContact(
				{
					organizationId: data.organizationId,
					personId: data.personId,
					contactId: data.contactId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE,
				}),
			),
	});
}

export function listPersonContacts(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<readonly PersonContact[]>> {
	return runCoreQuery(input, options, {
		schema: listPersonContactsInputSchema,
		invalidMessage: "Invalid person contacts list input",
		query: HUMAN_RESOURCES_QUERY_PERSON_CONTACTS_LIST,
		execute: async (data, { store }) =>
			store.listPersonContacts({
				organizationId: data.organizationId,
				personId: data.personId,
			}),
	});
}

export function addPersonIdentifier(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PersonIdentifier>> {
	return runCoreCommand(input, options, {
		schema: addPersonIdentifierInputSchema,
		invalidMessage: "Invalid person identifier add input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD,
		execute: async (data, { store, ports }) => {
			const identifierFingerprint = fingerprintPersonIdentifier(
				data.identifierValue,
			);
			const identifierLast4 = last4PersonIdentifier(data.identifierValue);
			const requestFingerprint = fingerprintPersonIdentifierAdd({
				personId: data.personId,
				identifierType: data.identifierType,
				identifierFingerprint,
				effectiveFrom: data.effectiveFrom,
			});

			const existingByKey = await store.findPersonIdentifierByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.identifier);
			}

			return store.addPersonIdentifier(
				{
					organizationId: data.organizationId,
					personId: data.personId,
					identifierType: data.identifierType.trim(),
					identifierFingerprint,
					identifierLast4,
					documentRef: data.documentRef ?? null,
					effectiveFrom: data.effectiveFrom,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD,
				}),
			);
		},
	});
}

export function retirePersonIdentifier(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PersonIdentifier>> {
	return runCoreCommand(input, options, {
		schema: retirePersonIdentifierInputSchema,
		invalidMessage: "Invalid person identifier retire input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE,
		execute: async (data, { store, ports }) =>
			store.retirePersonIdentifier(
				{
					organizationId: data.organizationId,
					personId: data.personId,
					identifierId: data.identifierId,
					effectiveTo: data.effectiveTo,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE,
				}),
			),
	});
}

export function listPersonIdentifiers(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<readonly PersonIdentifier[]>> {
	return runCoreQuery(input, options, {
		schema: listPersonIdentifiersInputSchema,
		invalidMessage: "Invalid person identifiers list input",
		query: HUMAN_RESOURCES_QUERY_PERSON_IDENTIFIERS_LIST,
		execute: async (data, { store }) =>
			store.listPersonIdentifiers({
				organizationId: data.organizationId,
				personId: data.personId,
			}),
	});
}

export function detectPersonDuplicates(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<readonly PersonDuplicateCandidate[]>> {
	return runCoreQuery(input, options, {
		schema: detectPersonDuplicatesInputSchema,
		invalidMessage: "Invalid person duplicate detection input",
		query: HUMAN_RESOURCES_QUERY_PERSON_DUPLICATES_DETECT,
		execute: async (data, { store }) =>
			store.detectPersonDuplicates({
				organizationId: data.organizationId,
				personId: data.personId,
			}),
	});
}
