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
