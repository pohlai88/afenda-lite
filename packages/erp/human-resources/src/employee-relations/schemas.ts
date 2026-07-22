import { z } from "zod";

import {
	humanResourcesEmployeeCaseActionIdSchema,
	humanResourcesEmployeeCaseAppealIdSchema,
	humanResourcesEmployeeCaseEventIdSchema,
	humanResourcesEmployeeCaseIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentIdSchema,
} from "../brands";
import {
	humanResourcesActorUserIdSchema,
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
} from "../schemas/common";
import {
	employeeCaseActionTypeSchema,
	employeeCaseEventKindSchema,
	employeeCaseParticipantRoleSchema,
	employeeCaseSeveritySchema,
	employeeCaseTypeSchema,
} from "../shared/employee-relations-status";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const caseScopedSchema = humanResourcesMutationContextSchema
	.extend({
		caseId: humanResourcesEmployeeCaseIdSchema,
	})
	.strict();

export const openEmployeeCaseInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		caseType: employeeCaseTypeSchema,
		severity: employeeCaseSeveritySchema,
		allegationSummary: z.string().trim().min(1).max(500),
		classificationCode: z.string().trim().min(1).max(64),
		ownerActorUserId: humanResourcesActorUserIdSchema,
		subjectActorUserId: humanResourcesActorUserIdSchema.nullable().optional(),
		conflictedActorUserIds: z
			.array(humanResourcesActorUserIdSchema)
			.max(50)
			.optional()
			.default([]),
	})
	.strict();

export const updateEmployeeCaseClassificationInputSchema = caseScopedSchema
	.extend({
		classificationCode: z.string().trim().min(1).max(64),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const assignEmployeeCaseOwnerInputSchema = caseScopedSchema
	.extend({
		ownerActorUserId: humanResourcesActorUserIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const addEmployeeCaseParticipantInputSchema = caseScopedSchema
	.extend({
		participantActorUserId: humanResourcesActorUserIdSchema,
		role: employeeCaseParticipantRoleSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const recordEmployeeCaseEventInputSchema = caseScopedSchema
	.extend({
		eventKind: employeeCaseEventKindSchema,
		payloadJson: z.record(z.string(), z.unknown()).nullable().optional(),
	})
	.strict();

export const addEmployeeCaseEvidenceReferenceInputSchema = caseScopedSchema
	.extend({
		documentRef: z.string().trim().min(1).max(2048),
	})
	.strict();

export const redactEmployeeCaseEvidenceReferenceInputSchema = caseScopedSchema
	.extend({
		eventId: humanResourcesEmployeeCaseEventIdSchema,
		reasonCode: z.string().trim().min(1).max(64),
	})
	.strict();

export const issueInterimEmployeeMeasureInputSchema = caseScopedSchema
	.extend({
		interimAuthority: z.string().trim().min(1).max(200),
		interimReason: z.string().trim().min(1).max(500),
		interimStartsOn: isoDateSchema,
		interimReviewOn: isoDateSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const recordEmployeeCaseFindingInputSchema = caseScopedSchema
	.extend({
		findingCode: z.string().trim().min(1).max(64),
		findingSummary: z.string().trim().min(1).max(500),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const recommendEmployeeCaseActionInputSchema = caseScopedSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		actionType: employeeCaseActionTypeSchema,
		recommendationNote: z.string().trim().max(500).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const approveEmployeeCaseActionInputSchema = caseScopedSchema
	.extend({
		actionId: humanResourcesEmployeeCaseActionIdSchema,
		policyValidationRecorded: z.boolean(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const recordEmployeeCaseAppealInputSchema = caseScopedSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		appealGroundsSummary: z.string().trim().min(1).max(500),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const resolveEmployeeCaseAppealInputSchema = caseScopedSchema
	.extend({
		appealId: humanResourcesEmployeeCaseAppealIdSchema,
		appealOutcomeCode: z.string().trim().min(1).max(64),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const closeEmployeeCaseInputSchema = caseScopedSchema
	.extend({
		outcomeCode: z.string().trim().min(1).max(64),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const reopenEmployeeCaseInputSchema = caseScopedSchema
	.extend({
		reasonCode: z.string().trim().min(1).max(64),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const getEmployeeCaseByIdInputSchema = caseScopedSchema;

export const listEmployeeCasesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: z
			.enum([
				"open",
				"investigating",
				"finding_recorded",
				"action_pending",
				"action_approved",
				"under_appeal",
				"closed",
			])
			.optional(),
	})
	.strict();

export const listCasesAssignedToActorInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const getEmployeeCaseTimelineInputSchema = caseScopedSchema;

export const getEmployeeCaseOutcomeInputSchema = caseScopedSchema;

export const listOpenEmployeeRelationsCasesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const getEmployeeRelationsHistoryByEmployeeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export type OpenEmployeeCaseInput = z.infer<typeof openEmployeeCaseInputSchema>;
export type GetEmployeeCaseByIdInput = z.infer<
	typeof getEmployeeCaseByIdInputSchema
>;
