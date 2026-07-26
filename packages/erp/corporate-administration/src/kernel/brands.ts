import { z } from "zod";

const trustedContextIdSchema = z.string().trim().min(1).max(128);
const opaqueReferenceSchema = z.string().trim().min(1).max(256);

export const organizationIdSchema =
	trustedContextIdSchema.brand<"OrganizationId">();
export type OrganizationId = z.infer<typeof organizationIdSchema>;

export const userIdSchema = trustedContextIdSchema.brand<"UserId">();
export type UserId = z.infer<typeof userIdSchema>;

export const correlationIdSchema =
	trustedContextIdSchema.brand<"CorrelationId">();
export type CorrelationId = z.infer<typeof correlationIdSchema>;

export const causationIdSchema = trustedContextIdSchema.brand<"CausationId">();
export type CausationId = z.infer<typeof causationIdSchema>;

export const idempotencyKeySchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.brand<"IdempotencyKey">();
export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;

export const legalCompanyIdSchema = z.string().uuid().brand<"LegalCompanyId">();
export type LegalCompanyId = z.infer<typeof legalCompanyIdSchema>;

export const legalEstablishmentIdSchema = z
	.string()
	.uuid()
	.brand<"LegalEstablishmentId">();
export type LegalEstablishmentId = z.infer<typeof legalEstablishmentIdSchema>;

export const approvalRequestIdSchema =
	opaqueReferenceSchema.brand<"ApprovalRequestId">();
export type ApprovalRequestId = z.infer<typeof approvalRequestIdSchema>;

export const approvalDecisionIdSchema =
	opaqueReferenceSchema.brand<"ApprovalDecisionId">();
export type ApprovalDecisionId = z.infer<typeof approvalDecisionIdSchema>;

export const documentObjectRefSchema =
	opaqueReferenceSchema.brand<"DocumentObjectRef">();
export type DocumentObjectRef = z.infer<typeof documentObjectRefSchema>;

export const commandFingerprintSchema = z
	.string()
	.regex(/^[a-f0-9]{64}$/)
	.brand<"CommandFingerprint">();
export type CommandFingerprint = z.infer<typeof commandFingerprintSchema>;
