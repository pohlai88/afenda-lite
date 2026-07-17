import {
	surveyAnswersSchema,
	uuidSchema,
} from "@/modules/declarations/schemas/common";
import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Client declaration draft contract (REST-001 api-now · API-004).
 */

export const declarationDraftQuerySchema = z.object({
	assignmentId: uuidSchema,
});

export type DeclarationDraftQuery = z.infer<typeof declarationDraftQuerySchema>;

export const saveClientDeclarationDraftSchema = z.object({
	assignmentId: uuidSchema,
	answers: surveyAnswersSchema,
	stepIndex: z.number().int().min(0).max(10_000),
});

export type SaveClientDeclarationDraft = z.infer<
	typeof saveClientDeclarationDraftSchema
>;

export const declarationDraftGetResponseSchema = z.object({
	assignmentId: uuidSchema,
	answers: surveyAnswersSchema,
	stepIndex: z.number().int().min(0),
	savedAt: z.string().datetime().nullable(),
});

export type DeclarationDraftGetResponse = z.infer<
	typeof declarationDraftGetResponseSchema
>;

export const declarationDraftWriteResponseSchema = z.object({
	savedAt: z.string().datetime(),
});

export type DeclarationDraftWriteResponse = z.infer<
	typeof declarationDraftWriteResponseSchema
>;

/**
 * Client declaration submit / owned-read contract (N17 · REST-001 Assignments).
 */

export const submitClientDeclarationSchema = z.object({
	assignmentId: uuidSchema,
});

export type SubmitClientDeclaration = z.infer<
	typeof submitClientDeclarationSchema
>;

export const submitClientDeclarationResponseSchema = z.object({
	assignmentId: uuidSchema,
	status: z.literal("submitted"),
	confirmationCode: z.string().min(1),
	idempotent: z.boolean(),
});

export type SubmitClientDeclarationResponse = z.infer<
	typeof submitClientDeclarationResponseSchema
>;

export const clientDeclarationGetResponseSchema = z.object({
	assignmentId: uuidSchema,
	surveyId: uuidSchema,
	status: z.string().min(1),
	confirmationCode: z.string().nullable(),
	answers: surveyAnswersSchema,
	stepIndex: z.number().int().min(0),
	draftSavedAt: z.string().datetime().nullable(),
	title: z.string().min(1),
	slug: z.string().min(1),
	question: z.string().min(1),
	referenceNumber: z.string().nullable(),
	caseNumber: z.string().nullable(),
	effectiveDate: z.string().nullable(),
	submitBefore: z.string().datetime().nullable(),
	dueDate: z.string().datetime().nullable(),
	surveyorName: z.string().nullable(),
	surveyorOrg: z.string().nullable(),
	surveyeeOrg: z.string().nullable(),
	purpose: z.string().nullable(),
	categories: z.array(z.string()),
	createdAt: z.string().datetime(),
});

export type ClientDeclarationGetResponse = z.infer<
	typeof clientDeclarationGetResponseSchema
>;
