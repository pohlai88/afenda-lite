import { z } from "zod";

import {
	humanResourcesDocumentRequirementIdSchema,
	humanResourcesEmployeeDocumentIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesPolicyAcknowledgementIdSchema,
	humanResourcesWorkEligibilityIdSchema,
} from "../brands";
import {
	documentRequirementStatusSchema,
	employeeDocumentVerificationStatusSchema,
	policyAcknowledgementStatusSchema,
	workEligibilityStatusSchema,
} from "../shared/compliance-status";
import { humanResourcesMutationContextSchema } from "./common";

const versionedMutationSchema = humanResourcesMutationContextSchema.extend({
	expectedVersion: z.number().int().positive(),
});

const idempotencySchema = z.object({
	idempotencyKey: z.string().trim().min(1).max(128),
});

export const createDocumentRequirementInputSchema =
	humanResourcesMutationContextSchema.extend({
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		documentType: z.string().trim().min(1).max(128),
		issuingJurisdiction: z.string().trim().min(1).max(64).optional(),
		appliesToNote: z.string().trim().min(1).max(512).optional(),
	});

export const updateDocumentRequirementInputSchema =
	versionedMutationSchema.extend({
		requirementId: humanResourcesDocumentRequirementIdSchema,
		name: z.string().trim().min(1).max(256).optional(),
		documentType: z.string().trim().min(1).max(128).optional(),
		issuingJurisdiction: z.string().trim().min(1).max(64).nullable().optional(),
		appliesToNote: z.string().trim().min(1).max(512).nullable().optional(),
	});

export const documentRequirementTransitionInputSchema =
	versionedMutationSchema.extend({
		requirementId: humanResourcesDocumentRequirementIdSchema,
	});

export const registerEmployeeDocumentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			requirementId: humanResourcesDocumentRequirementIdSchema.optional(),
			documentType: z.string().trim().min(1).max(128),
			issuingJurisdiction: z.string().trim().min(1).max(64).optional(),
			issuedOn: z.string().date(),
			expiresOn: z.string().date().optional(),
			documentRef: z.string().trim().min(1).max(2048),
			documentIdentifier: z.string().trim().min(1).max(256).optional(),
			metadata: z.record(z.string(), z.unknown()).optional(),
		})
		.merge(idempotencySchema);

export const updateEmployeeDocumentMetadataInputSchema =
	versionedMutationSchema.extend({
		documentId: humanResourcesEmployeeDocumentIdSchema,
		issuingJurisdiction: z.string().trim().min(1).max(64).nullable().optional(),
		expiresOn: z.string().date().nullable().optional(),
		metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	});

export const verifyEmployeeDocumentInputSchema = versionedMutationSchema.extend(
	{
		documentId: humanResourcesEmployeeDocumentIdSchema,
		evidenceDate: z.string().date(),
	},
);

export const rejectEmployeeDocumentInputSchema = versionedMutationSchema.extend(
	{
		documentId: humanResourcesEmployeeDocumentIdSchema,
		rejectionReason: z.string().trim().min(1).max(512),
	},
);

export const employeeDocumentTransitionInputSchema =
	versionedMutationSchema.extend({
		documentId: humanResourcesEmployeeDocumentIdSchema,
	});

export const getEmployeeDocumentInputSchema =
	humanResourcesMutationContextSchema.extend({
		documentId: humanResourcesEmployeeDocumentIdSchema,
	});

export const listEmployeeDocumentsInputSchema =
	humanResourcesMutationContextSchema.extend({
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		verificationStatus: employeeDocumentVerificationStatusSchema.optional(),
	});

export const listMissingRequiredDocumentsInputSchema =
	humanResourcesMutationContextSchema.extend({
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
	});

export const listExpiringEmployeeDocumentsInputSchema =
	humanResourcesMutationContextSchema.extend({
		asOf: z.string().date(),
		withinDays: z.number().int().positive().max(365).optional(),
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
	});

export const recordWorkEligibilityInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			countryCode: z.string().trim().min(2).max(3),
			jurisdiction: z.string().trim().min(1).max(128).optional(),
			issuedOn: z.string().date(),
			expiresOn: z.string().date().optional(),
			documentRef: z.string().trim().min(1).max(2048).optional(),
		})
		.merge(idempotencySchema);

export const verifyWorkEligibilityInputSchema = versionedMutationSchema.extend({
	eligibilityId: humanResourcesWorkEligibilityIdSchema,
	evidenceDate: z.string().date(),
});

export const workEligibilityTransitionInputSchema =
	versionedMutationSchema.extend({
		eligibilityId: humanResourcesWorkEligibilityIdSchema,
	});

export const renewWorkEligibilityInputSchema = versionedMutationSchema.extend({
	eligibilityId: humanResourcesWorkEligibilityIdSchema,
	issuedOn: z.string().date(),
	expiresOn: z.string().date().optional(),
	documentRef: z.string().trim().min(1).max(2048).optional(),
});

export const getEmployeeWorkEligibilityInputSchema =
	humanResourcesMutationContextSchema.extend({
		employeeId: humanResourcesEmployeeIdSchema,
	});

export const listEmployeesWithWorkEligibilityRiskInputSchema =
	humanResourcesMutationContextSchema.extend({
		asOf: z.string().date(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
	});

export const issuePolicyAcknowledgementRequirementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			policyCode: z.string().trim().min(1).max(128),
			policyVersion: z.string().trim().min(1).max(64),
		})
		.merge(idempotencySchema);

export const acknowledgePolicyInputSchema = versionedMutationSchema.extend({
	acknowledgementId: humanResourcesPolicyAcknowledgementIdSchema,
});

export const revokePolicyAcknowledgementInputSchema =
	versionedMutationSchema.extend({
		acknowledgementId: humanResourcesPolicyAcknowledgementIdSchema,
	});

export const supersedePolicyAcknowledgementRequirementInputSchema =
	versionedMutationSchema.extend({
		acknowledgementId: humanResourcesPolicyAcknowledgementIdSchema,
		newPolicyVersion: z.string().trim().min(1).max(64),
	});

export const getPolicyAcknowledgementStatusInputSchema =
	humanResourcesMutationContextSchema.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		policyCode: z.string().trim().min(1).max(128),
		policyVersion: z.string().trim().min(1).max(64).optional(),
	});

export const listOutstandingPolicyAcknowledgementsInputSchema =
	humanResourcesMutationContextSchema.extend({
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
	});

export const getEmployeeComplianceSummaryInputSchema =
	humanResourcesMutationContextSchema.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		asOf: z.string().date().optional(),
	});

export const documentRequirementStatusFilterSchema =
	documentRequirementStatusSchema;
export const workEligibilityStatusFilterSchema = workEligibilityStatusSchema;
export const policyAcknowledgementStatusFilterSchema =
	policyAcknowledgementStatusSchema;
