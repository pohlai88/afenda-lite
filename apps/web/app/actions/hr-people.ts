"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	addPersonContact,
	addPersonIdentifier,
	changeWorkerStatus,
	changeWorkerType,
	createPerson,
	createWorker,
	detectPersonDuplicates,
	getPersonAsOf,
	getPersonById,
	getWorkerAsOf,
	getWorkerById,
	listPersonContacts,
	listPersonIdentifiers,
	type Person,
	type PersonContact,
	type PersonDuplicateCandidate,
	type PersonIdentifier,
	type PersonIdentityAtAsOf,
	retirePersonContact,
	retirePersonIdentifier,
	setPersonPrivacyClassification,
	updatePersonContact,
	updatePersonName,
	updatePersonPreferredName,
	type Worker,
	type WorkerClassificationAtAsOf,
} from "@afenda/human-resources";
import { z } from "zod";
import {
	hrMutationContextSchema as mutationContextSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrWorkforceOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const nonEmployeeWorkerTypeSchema = z.enum([
	"contractor",
	"contingent_worker",
	"intern",
]);

const workerStatusSchema = z.enum(["active", "inactive", "former"]);

const contactTypeSchema = z.enum(["email", "phone", "postal_address"]);

const privacyClassificationSchema = z.enum([
	"workforce_core",
	"pay_and_benefits",
	"medical_and_leave",
	"recruitment_and_background",
	"employee_relations_and_legal",
	"performance_and_talent",
]);

const inclusiveEffectiveRangeIssue = {
	message: "Effective end date must be on or after effective start date",
	path: ["effectiveTo"],
};

function hasValidInclusiveEffectiveRange(range: {
	effectiveFrom: string;
	effectiveTo?: string | null | undefined;
}): boolean {
	return (
		range.effectiveTo === null ||
		range.effectiveTo === undefined ||
		range.effectiveTo >= range.effectiveFrom
	);
}

const createWorkerEmployeeInputSchema = mutationContextSchema
	.extend({
		idempotencyKey: z.string().trim().min(1).max(128),
		personId: z.string().uuid(),
		workerType: z.literal("employee"),
		employeeId: z.string().uuid().nullable().optional().default(null),
		status: workerStatusSchema.optional().default("active"),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
	})
	.refine(hasValidInclusiveEffectiveRange, inclusiveEffectiveRangeIssue);

const createWorkerNonEmployeeInputSchema = mutationContextSchema
	.extend({
		idempotencyKey: z.string().trim().min(1).max(128),
		personId: z.string().uuid(),
		workerType: nonEmployeeWorkerTypeSchema,
		employeeId: z.null().optional().default(null),
		status: workerStatusSchema.optional().default("active"),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
	})
	.refine(hasValidInclusiveEffectiveRange, inclusiveEffectiveRangeIssue);

const createWorkerActionSchema = z.discriminatedUnion("workerType", [
	createWorkerEmployeeInputSchema,
	createWorkerNonEmployeeInputSchema,
]);

const changeWorkerTypeEmployeeInputSchema = mutationContextSchema.extend({
	workerId: z.string().uuid(),
	workerType: z.literal("employee"),
	employeeId: z.string().uuid().nullable().optional().default(null),
	effectiveOn: isoDateSchema,
	reasonCode: z.string().trim().min(1).max(64),
	evidenceRef: z.string().trim().min(1).max(500).optional(),
	expectedVersion: z.number().int().positive(),
});

const changeWorkerTypeNonEmployeeInputSchema = mutationContextSchema.extend({
	workerId: z.string().uuid(),
	workerType: nonEmployeeWorkerTypeSchema,
	employeeId: z.null().optional().default(null),
	effectiveOn: isoDateSchema,
	reasonCode: z.string().trim().min(1).max(64),
	evidenceRef: z.string().trim().min(1).max(500).optional(),
	expectedVersion: z.number().int().positive(),
});

const changeWorkerTypeActionSchema = z.discriminatedUnion("workerType", [
	changeWorkerTypeEmployeeInputSchema,
	changeWorkerTypeNonEmployeeInputSchema,
]);

export async function createPersonAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	legalName: string;
	preferredName?: string | null;
	privacyClassification?:
		| "workforce_core"
		| "pay_and_benefits"
		| "medical_and_leave"
		| "recruitment_and_background"
		| "employee_relations_and_legal"
		| "performance_and_talent";
}): Promise<ActionResult<{ person: Person }>> {
	return await runOperatorPermissionAction({
		path: "createPersonAction",
		permission: "human-resources.person.manage",
		safeMessage: "Could not create person.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					idempotencyKey: z.string().trim().min(1).max(128),
					legalName: z.string().trim().min(1).max(200),
					preferredName: z
						.string()
						.trim()
						.min(1)
						.max(200)
						.nullable()
						.optional(),
					privacyClassification: privacyClassificationSchema
						.optional()
						.default("workforce_core"),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person.",
				});
			}
			const result = await createPerson(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { person: mapped.data } };
		},
	});
}

export async function updatePersonNameAction(input: {
	correlationId?: string;
	personId: string;
	legalName: string;
	effectiveOn: string;
	reasonCode: string;
	evidenceRef?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ person: Person }>> {
	return await runOperatorPermissionAction({
		path: "updatePersonNameAction",
		permission: "human-resources.person.manage",
		safeMessage: "Could not update person name.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					legalName: z.string().trim().min(1).max(200),
					effectiveOn: isoDateSchema,
					reasonCode: z.string().trim().min(1).max(64),
					evidenceRef: z.string().trim().min(1).max(500).optional(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person name update.",
				});
			}
			const result = await updatePersonName(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { person: mapped.data } };
		},
	});
}

export async function updatePersonPreferredNameAction(input: {
	correlationId?: string;
	personId: string;
	preferredName: string | null;
	expectedVersion: number;
}): Promise<ActionResult<{ person: Person }>> {
	return await runOperatorPermissionAction({
		path: "updatePersonPreferredNameAction",
		permission: "human-resources.person.manage",
		safeMessage: "Could not update person preferred name.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					preferredName: z.string().trim().min(1).max(200).nullable(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid preferred name update.",
				});
			}
			const result = await updatePersonPreferredName(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { person: mapped.data } };
		},
	});
}

export async function setPersonPrivacyClassificationAction(input: {
	correlationId?: string;
	personId: string;
	privacyClassification:
		| "workforce_core"
		| "pay_and_benefits"
		| "medical_and_leave"
		| "recruitment_and_background"
		| "employee_relations_and_legal"
		| "performance_and_talent";
	expectedVersion: number;
}): Promise<ActionResult<{ person: Person }>> {
	return await runOperatorPermissionAction({
		path: "setPersonPrivacyClassificationAction",
		permission: "human-resources.person.manage",
		safeMessage: "Could not set person privacy classification.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					privacyClassification: privacyClassificationSchema,
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid privacy classification update.",
				});
			}
			const result = await setPersonPrivacyClassification(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { person: mapped.data } };
		},
	});
}

export async function addPersonContactAction(input: {
	correlationId?: string;
	personId: string;
	idempotencyKey: string;
	contactType: "email" | "phone" | "postal_address";
	valueText: string;
	isPrimary?: boolean;
}): Promise<ActionResult<{ contact: PersonContact }>> {
	return await runOperatorPermissionAction({
		path: "addPersonContactAction",
		permission: "human-resources.personal-details.manage",
		safeMessage: "Could not add person contact.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					idempotencyKey: z.string().trim().min(1).max(128),
					contactType: contactTypeSchema,
					valueText: z.string().trim().min(1).max(500),
					isPrimary: z.boolean().optional().default(false),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person contact.",
				});
			}
			const result = await addPersonContact(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contact: mapped.data } };
		},
	});
}

export async function updatePersonContactAction(input: {
	correlationId?: string;
	personId: string;
	contactId: string;
	valueText: string;
	isPrimary?: boolean;
	expectedVersion: number;
}): Promise<ActionResult<{ contact: PersonContact }>> {
	return await runOperatorPermissionAction({
		path: "updatePersonContactAction",
		permission: "human-resources.personal-details.manage",
		safeMessage: "Could not update person contact.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					contactId: z.string().uuid(),
					valueText: z.string().trim().min(1).max(500),
					isPrimary: z.boolean().optional(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person contact update.",
				});
			}
			const result = await updatePersonContact(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contact: mapped.data } };
		},
	});
}

export async function retirePersonContactAction(input: {
	correlationId?: string;
	personId: string;
	contactId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ contact: PersonContact }>> {
	return await runOperatorPermissionAction({
		path: "retirePersonContactAction",
		permission: "human-resources.personal-details.manage",
		safeMessage: "Could not retire person contact.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					contactId: z.string().uuid(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person contact retire request.",
				});
			}
			const result = await retirePersonContact(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contact: mapped.data } };
		},
	});
}

export async function listPersonContactsAction(input: {
	correlationId?: string;
	personId: string;
}): Promise<ActionResult<{ contacts: readonly PersonContact[] }>> {
	return await runOperatorPermissionAction({
		path: "listPersonContactsAction",
		permission: "human-resources.personal-details.read",
		safeMessage: "Could not list person contacts.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person contacts list request.",
				});
			}
			const result = await listPersonContacts(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contacts: mapped.data } };
		},
	});
}

export async function addPersonIdentifierAction(input: {
	correlationId?: string;
	personId: string;
	idempotencyKey: string;
	identifierType: string;
	identifierValue: string;
	documentRef?: string | null;
	effectiveFrom: string;
}): Promise<ActionResult<{ identifier: PersonIdentifier }>> {
	return await runOperatorPermissionAction({
		path: "addPersonIdentifierAction",
		permission: "human-resources.sensitive-identifiers.manage",
		safeMessage: "Could not add person identifier.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					idempotencyKey: z.string().trim().min(1).max(128),
					identifierType: z.string().trim().min(1).max(64),
					identifierValue: z.string().trim().min(1).max(200),
					documentRef: z.string().trim().min(1).max(500).nullable().optional(),
					effectiveFrom: isoDateSchema,
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person identifier.",
				});
			}
			const result = await addPersonIdentifier(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { identifier: mapped.data } };
		},
	});
}

export async function retirePersonIdentifierAction(input: {
	correlationId?: string;
	personId: string;
	identifierId: string;
	effectiveTo: string;
	expectedVersion: number;
}): Promise<ActionResult<{ identifier: PersonIdentifier }>> {
	return await runOperatorPermissionAction({
		path: "retirePersonIdentifierAction",
		permission: "human-resources.sensitive-identifiers.manage",
		safeMessage: "Could not retire person identifier.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					identifierId: z.string().uuid(),
					effectiveTo: isoDateSchema,
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person identifier retire request.",
				});
			}
			const result = await retirePersonIdentifier(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { identifier: mapped.data } };
		},
	});
}

export async function listPersonIdentifiersAction(input: {
	correlationId?: string;
	personId: string;
}): Promise<ActionResult<{ identifiers: readonly PersonIdentifier[] }>> {
	return await runOperatorPermissionAction({
		path: "listPersonIdentifiersAction",
		permission: "human-resources.sensitive-identifiers.read",
		safeMessage: "Could not list person identifiers.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person identifiers list request.",
				});
			}
			const result = await listPersonIdentifiers(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { identifiers: mapped.data } };
		},
	});
}

export async function detectPersonDuplicatesAction(input: {
	correlationId?: string;
	personId: string;
}): Promise<ActionResult<{ candidates: readonly PersonDuplicateCandidate[] }>> {
	return await runOperatorPermissionAction({
		path: "detectPersonDuplicatesAction",
		permission: "human-resources.person.read",
		safeMessage: "Could not detect person duplicates.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid duplicate detection request.",
				});
			}
			const result = await detectPersonDuplicates(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { candidates: mapped.data } };
		},
	});
}

export async function getPersonAction(input: {
	correlationId?: string;
	personId: string;
}): Promise<ActionResult<{ person: Person }>> {
	return await runOperatorPermissionAction({
		path: "getPersonAction",
		permission: "human-resources.person.read",
		safeMessage: "Could not get person.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person get request.",
				});
			}
			const result = await getPersonById(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { person: mapped.data } };
		},
	});
}

export async function getPersonAsOfAction(input: {
	correlationId?: string;
	personId: string;
	asOf: string;
}): Promise<ActionResult<{ person: PersonIdentityAtAsOf }>> {
	return await runOperatorPermissionAction({
		path: "getPersonAsOfAction",
		permission: "human-resources.person.read",
		safeMessage: "Could not get person as-of.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					personId: z.string().uuid(),
					asOf: isoDateSchema,
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid person as-of request.",
				});
			}
			const result = await getPersonAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { person: mapped.data } };
		},
	});
}

type CreateWorkerActionInput =
	| {
			correlationId?: string;
			idempotencyKey: string;
			personId: string;
			workerType: "employee";
			employeeId?: string | null;
			status?: "active" | "inactive" | "former";
			effectiveFrom: string;
			effectiveTo?: string | null;
	  }
	| {
			correlationId?: string;
			idempotencyKey: string;
			personId: string;
			workerType: "contractor" | "contingent_worker" | "intern";
			employeeId?: null;
			status?: "active" | "inactive" | "former";
			effectiveFrom: string;
			effectiveTo?: string | null;
	  };

export async function createWorkerAction(
	input: CreateWorkerActionInput,
): Promise<ActionResult<{ worker: Worker }>> {
	return await runOperatorPermissionAction({
		path: "createWorkerAction",
		permission: "human-resources.worker.manage",
		safeMessage: "Could not create worker.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createWorkerActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid worker.",
				});
			}
			const result = await createWorker(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { worker: mapped.data } };
		},
	});
}

type ChangeWorkerTypeActionInput =
	| {
			correlationId?: string;
			workerId: string;
			workerType: "employee";
			employeeId?: string | null;
			effectiveOn: string;
			reasonCode: string;
			evidenceRef?: string;
			expectedVersion: number;
	  }
	| {
			correlationId?: string;
			workerId: string;
			workerType: "contractor" | "contingent_worker" | "intern";
			employeeId?: null;
			effectiveOn: string;
			reasonCode: string;
			evidenceRef?: string;
			expectedVersion: number;
	  };

export async function changeWorkerTypeAction(
	input: ChangeWorkerTypeActionInput,
): Promise<ActionResult<{ worker: Worker }>> {
	return await runOperatorPermissionAction({
		path: "changeWorkerTypeAction",
		permission: "human-resources.worker.manage",
		safeMessage: "Could not change worker type.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(changeWorkerTypeActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid worker type change.",
				});
			}
			const result = await changeWorkerType(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { worker: mapped.data } };
		},
	});
}

export async function changeWorkerStatusAction(input: {
	correlationId?: string;
	workerId: string;
	status: "active" | "inactive" | "former";
	effectiveOn: string;
	reasonCode: string;
	evidenceRef?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ worker: Worker }>> {
	return await runOperatorPermissionAction({
		path: "changeWorkerStatusAction",
		permission: "human-resources.worker.manage",
		safeMessage: "Could not change worker status.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					workerId: z.string().uuid(),
					status: workerStatusSchema,
					effectiveOn: isoDateSchema,
					reasonCode: z.string().trim().min(1).max(64),
					evidenceRef: z.string().trim().min(1).max(500).optional(),
					expectedVersion: z.number().int().positive(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid worker status change.",
				});
			}
			const result = await changeWorkerStatus(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { worker: mapped.data } };
		},
	});
}

export async function getWorkerAction(input: {
	correlationId?: string;
	workerId: string;
}): Promise<ActionResult<{ worker: Worker }>> {
	return await runOperatorPermissionAction({
		path: "getWorkerAction",
		permission: "human-resources.worker.read",
		safeMessage: "Could not get worker.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					workerId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid worker get request.",
				});
			}
			const result = await getWorkerById(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { worker: mapped.data } };
		},
	});
}

export async function getWorkerAsOfAction(input: {
	correlationId?: string;
	workerId: string;
	asOf: string;
}): Promise<ActionResult<{ worker: WorkerClassificationAtAsOf }>> {
	return await runOperatorPermissionAction({
		path: "getWorkerAsOfAction",
		permission: "human-resources.worker.read",
		safeMessage: "Could not get worker as-of.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					workerId: z.string().uuid(),
					asOf: isoDateSchema,
				}),
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid worker as-of request.",
				});
			}
			const result = await getWorkerAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { worker: mapped.data } };
		},
	});
}
