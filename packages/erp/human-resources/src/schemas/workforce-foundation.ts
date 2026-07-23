import { z } from "zod";

import {
	humanResourcesEmployeeIdSchema,
	humanResourcesPersonIdSchema,
	humanResourcesWorkerIdSchema,
} from "../brands";
import {
	NON_EMPLOYEE_WORKER_TYPES,
	WORKER_STATUSES,
	WORKER_TYPES,
} from "../workforce-foundation/classification";
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
	})
	.strict();

export type CreatePersonInput = z.infer<typeof createPersonInputSchema>;

export const updatePersonNameInputSchema = humanResourcesMutationContextSchema
	.extend({
		personId: humanResourcesPersonIdSchema,
		legalName: z.string().trim().min(1).max(200),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdatePersonNameInput = z.infer<typeof updatePersonNameInputSchema>;

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
