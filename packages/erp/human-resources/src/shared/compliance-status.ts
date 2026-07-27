import { z } from "zod";

import { humanResourcesEmployeeIdSchema } from "../brands";

export const documentRequirementApplicabilitySchema = z.discriminatedUnion(
	"kind",
	[
		z.object({ kind: z.literal("all_employees") }).strict(),
		z
			.object({
				kind: z.literal("employee_ids"),
				employeeIds: z.array(humanResourcesEmployeeIdSchema).min(1).max(1_000),
			})
			.strict()
			.superRefine((value, context) => {
				if (new Set(value.employeeIds).size !== value.employeeIds.length) {
					context.addIssue({
						code: "custom",
						message: "Applicability employee IDs must be unique",
						path: ["employeeIds"],
					});
				}
			}),
	],
);
export type DocumentRequirementApplicability = z.infer<
	typeof documentRequirementApplicabilitySchema
>;

export const DOCUMENT_REQUIREMENT_STATUSES = [
	"draft",
	"published",
	"retired",
] as const;
export type DocumentRequirementStatus =
	(typeof DOCUMENT_REQUIREMENT_STATUSES)[number];

export const EMPLOYEE_DOCUMENT_VERIFICATION_STATUSES = [
	"pending",
	"verified",
	"rejected",
	"revoked",
	"expired",
] as const;
export type EmployeeDocumentVerificationStatus =
	(typeof EMPLOYEE_DOCUMENT_VERIFICATION_STATUSES)[number];

export const WORK_ELIGIBILITY_STATUSES = [
	"pending",
	"active",
	"suspended",
	"expired",
	"closed",
] as const;
export type WorkEligibilityStatus = (typeof WORK_ELIGIBILITY_STATUSES)[number];

export const POLICY_ACKNOWLEDGEMENT_STATUSES = [
	"outstanding",
	"acknowledged",
	"revoked",
	"superseded",
] as const;
export type PolicyAcknowledgementStatus =
	(typeof POLICY_ACKNOWLEDGEMENT_STATUSES)[number];

export const documentRequirementStatusSchema = z.enum(
	DOCUMENT_REQUIREMENT_STATUSES,
);
export const employeeDocumentVerificationStatusSchema = z.enum(
	EMPLOYEE_DOCUMENT_VERIFICATION_STATUSES,
);
export const workEligibilityStatusSchema = z.enum(WORK_ELIGIBILITY_STATUSES);
export const policyAcknowledgementStatusSchema = z.enum(
	POLICY_ACKNOWLEDGEMENT_STATUSES,
);

export function isDocumentRequirementEditable(
	status: DocumentRequirementStatus,
): boolean {
	return status === "draft";
}

export function isEmployeeDocumentVerified(
	status: EmployeeDocumentVerificationStatus,
): boolean {
	return status === "verified";
}

export function isWorkEligibilityAtRisk(
	status: WorkEligibilityStatus,
): boolean {
	return (
		status === "suspended" ||
		status === "expired" ||
		status === "pending" ||
		status === "closed"
	);
}

export function isPolicyAcknowledgementOutstanding(
	status: PolicyAcknowledgementStatus,
): boolean {
	return status === "outstanding";
}
