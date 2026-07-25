import { z } from "zod";

import {
	humanResourcesEmployeeIdSchema,
	humanResourcesPersonIdSchema,
	humanResourcesWorkerIdSchema,
} from "../brands";
import { HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS } from "../privacy";
import {
	NON_EMPLOYEE_WORKER_TYPES,
	WORKER_STATUSES,
	WORKER_TYPES,
} from "../workforce-foundation/classification";
import { PERSON_CONTACT_TYPES } from "../workforce-foundation/types";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

export const workerTypeSchema = z.enum(WORKER_TYPES);
export const nonEmployeeWorkerTypeSchema = z.enum(NON_EMPLOYEE_WORKER_TYPES);
export const workerStatusSchema = z.enum(WORKER_STATUSES);

const effectiveRangeShape = {
	effectiveFrom: isoDateSchema,
	effectiveTo: isoDateSchema.nullable().optional(),
};

function hasValidInclusiveEffectiveRange(range: {
	effectiveFrom: string;
	effectiveTo?: string | null;
}): boolean {
	return (
		range.effectiveTo === null ||
		range.effectiveTo === undefined ||
		range.effectiveTo >= range.effectiveFrom
	);
}

const inclusiveEffectiveRangeIssue = {
	message: "Effective end date must be on or after effective start date",
	path: ["effectiveTo"],
};

export const createPersonInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		legalName: z.string().trim().min(1).max(200),
		preferredName: z.string().trim().min(1).max(200).nullable().optional(),
		privacyClassification: z
			.enum(HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS)
			.optional()
			.default("workforce_core"),
	})
	.strict();

export type CreatePersonInput = z.infer<typeof createPersonInputSchema>;

export const updatePersonNameInputSchema = humanResourcesMutationContextSchema
	.extend({
		personId: humanResourcesPersonIdSchema,
		legalName: z.string().trim().min(1).max(200),
		effectiveOn: isoDateSchema,
		reasonCode: z.string().trim().min(1).max(64),
		evidenceRef: z.string().trim().min(1).max(500).optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdatePersonNameInput = z.infer<typeof updatePersonNameInputSchema>;

export const updatePersonPreferredNameInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			personId: humanResourcesPersonIdSchema,
			preferredName: z.string().trim().min(1).max(200).nullable(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdatePersonPreferredNameInput = z.infer<
	typeof updatePersonPreferredNameInputSchema
>;

export const setPersonPrivacyClassificationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			personId: humanResourcesPersonIdSchema,
			privacyClassification: z.enum(HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type SetPersonPrivacyClassificationInput = z.infer<
	typeof setPersonPrivacyClassificationInputSchema
>;

export const personContactTypeSchema = z.enum(PERSON_CONTACT_TYPES);

export const addPersonContactInputSchema = humanResourcesMutationContextSchema
	.extend({
		personId: humanResourcesPersonIdSchema,
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		contactType: personContactTypeSchema,
		valueText: z.string().trim().min(1).max(500),
		isPrimary: z.boolean().optional().default(false),
	})
	.strict();

export type AddPersonContactInput = z.infer<typeof addPersonContactInputSchema>;

export const updatePersonContactInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			personId: humanResourcesPersonIdSchema,
			contactId: z.string().uuid(),
			valueText: z.string().trim().min(1).max(500),
			isPrimary: z.boolean().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdatePersonContactInput = z.infer<
	typeof updatePersonContactInputSchema
>;

export const retirePersonContactInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			personId: humanResourcesPersonIdSchema,
			contactId: z.string().uuid(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RetirePersonContactInput = z.infer<
	typeof retirePersonContactInputSchema
>;

export const listPersonContactsInputSchema = humanResourcesMutationContextSchema
	.pick({
		organizationId: true,
		actorUserId: true,
		correlationId: true,
	})
	.extend({
		personId: humanResourcesPersonIdSchema,
	})
	.strict();

export type ListPersonContactsInput = z.infer<
	typeof listPersonContactsInputSchema
>;

export const addPersonIdentifierInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			personId: humanResourcesPersonIdSchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			identifierType: z.string().trim().min(1).max(64),
			identifierValue: z.string().trim().min(1).max(200),
			documentRef: z.string().trim().min(1).max(500).nullable().optional(),
			effectiveFrom: isoDateSchema,
		})
		.strict();

export type AddPersonIdentifierInput = z.infer<
	typeof addPersonIdentifierInputSchema
>;

export const retirePersonIdentifierInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			personId: humanResourcesPersonIdSchema,
			identifierId: z.string().uuid(),
			effectiveTo: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RetirePersonIdentifierInput = z.infer<
	typeof retirePersonIdentifierInputSchema
>;

export const listPersonIdentifiersInputSchema =
	humanResourcesMutationContextSchema
		.pick({
			organizationId: true,
			actorUserId: true,
			correlationId: true,
		})
		.extend({
			personId: humanResourcesPersonIdSchema,
		})
		.strict();

export type ListPersonIdentifiersInput = z.infer<
	typeof listPersonIdentifiersInputSchema
>;

export const detectPersonDuplicatesInputSchema =
	humanResourcesMutationContextSchema
		.pick({
			organizationId: true,
			actorUserId: true,
			correlationId: true,
		})
		.extend({
			personId: humanResourcesPersonIdSchema,
		})
		.strict();

export type DetectPersonDuplicatesInput = z.infer<
	typeof detectPersonDuplicatesInputSchema
>;

const createWorkerCommonShape = {
	...humanResourcesMutationContextSchema.shape,
	idempotencyKey: humanResourcesIdempotencyKeySchema,
	personId: humanResourcesPersonIdSchema,
	status: workerStatusSchema.optional().default("active"),
	...effectiveRangeShape,
};

const createEmployeeWorkerInputSchema = z
	.object({
		...createWorkerCommonShape,
		workerType: z.literal("employee"),
		employeeId: humanResourcesEmployeeIdSchema
			.nullable()
			.optional()
			.default(null),
	})
	.strict()
	.refine(hasValidInclusiveEffectiveRange, inclusiveEffectiveRangeIssue);

const createNonEmployeeWorkerInputSchema = z
	.object({
		...createWorkerCommonShape,
		workerType: nonEmployeeWorkerTypeSchema,
		employeeId: z.null().optional().default(null),
	})
	.strict()
	.refine(hasValidInclusiveEffectiveRange, inclusiveEffectiveRangeIssue);

export const createWorkerInputSchema = z.discriminatedUnion("workerType", [
	createEmployeeWorkerInputSchema,
	createNonEmployeeWorkerInputSchema,
]);

export type CreateWorkerInput = z.infer<typeof createWorkerInputSchema>;

const changeWorkerTypeCommonShape = {
	...humanResourcesMutationContextSchema.shape,
	workerId: humanResourcesWorkerIdSchema,
	expectedVersion: humanResourcesExpectedVersionSchema,
	effectiveOn: isoDateSchema,
	reasonCode: z.string().trim().min(1).max(64),
	evidenceRef: z.string().trim().min(1).max(500).optional(),
};

const changeToEmployeeWorkerTypeInputSchema = z
	.object({
		...changeWorkerTypeCommonShape,
		workerType: z.literal("employee"),
		employeeId: humanResourcesEmployeeIdSchema
			.nullable()
			.optional()
			.default(null),
	})
	.strict();

const changeToNonEmployeeWorkerTypeInputSchema = z
	.object({
		...changeWorkerTypeCommonShape,
		workerType: nonEmployeeWorkerTypeSchema,
		employeeId: z.null().optional().default(null),
	})
	.strict();

export const changeWorkerTypeInputSchema = z.discriminatedUnion("workerType", [
	changeToEmployeeWorkerTypeInputSchema,
	changeToNonEmployeeWorkerTypeInputSchema,
]);

export type ChangeWorkerTypeInput = z.infer<typeof changeWorkerTypeInputSchema>;

export const changeWorkerStatusInputSchema = humanResourcesMutationContextSchema
	.extend({
		workerId: humanResourcesWorkerIdSchema,
		status: workerStatusSchema,
		effectiveOn: isoDateSchema,
		reasonCode: z.string().trim().min(1).max(64),
		evidenceRef: z.string().trim().min(1).max(500).optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type ChangeWorkerStatusInput = z.infer<
	typeof changeWorkerStatusInputSchema
>;

export const getPersonInputSchema = humanResourcesMutationContextSchema
	.pick({
		organizationId: true,
		actorUserId: true,
		correlationId: true,
	})
	.extend({
		personId: humanResourcesPersonIdSchema,
	})
	.strict();

export type GetPersonInput = z.infer<typeof getPersonInputSchema>;

export const getWorkerInputSchema = humanResourcesMutationContextSchema
	.pick({
		organizationId: true,
		actorUserId: true,
		correlationId: true,
	})
	.extend({
		workerId: humanResourcesWorkerIdSchema,
	})
	.strict();

export type GetWorkerInput = z.infer<typeof getWorkerInputSchema>;

export const getPersonAsOfInputSchema = humanResourcesMutationContextSchema
	.pick({
		organizationId: true,
		actorUserId: true,
		correlationId: true,
	})
	.extend({
		personId: humanResourcesPersonIdSchema,
		asOf: isoDateSchema,
	})
	.strict();

export type GetPersonAsOfInput = z.infer<typeof getPersonAsOfInputSchema>;

export const getWorkerAsOfInputSchema = humanResourcesMutationContextSchema
	.pick({
		organizationId: true,
		actorUserId: true,
		correlationId: true,
	})
	.extend({
		workerId: humanResourcesWorkerIdSchema,
		asOf: isoDateSchema,
	})
	.strict();

export type GetWorkerAsOfInput = z.infer<typeof getWorkerAsOfInputSchema>;
