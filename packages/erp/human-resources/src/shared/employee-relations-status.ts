import { z } from "zod";

export const employeeCaseTypeSchema = z.enum([
	"grievance",
	"conduct",
	"attendance_misconduct",
	"workplace_conflict",
	"harassment",
	"policy_breach",
	"disciplinary_review",
]);

export type EmployeeCaseType = z.infer<typeof employeeCaseTypeSchema>;

export const employeeCaseStatusSchema = z.enum([
	"open",
	"investigating",
	"finding_recorded",
	"action_pending",
	"action_approved",
	"under_appeal",
	"closed",
]);

export type EmployeeCaseStatus = z.infer<typeof employeeCaseStatusSchema>;

export const employeeCaseSeveritySchema = z.enum([
	"low",
	"medium",
	"high",
	"critical",
]);

export type EmployeeCaseSeverity = z.infer<typeof employeeCaseSeveritySchema>;

export const employeeCaseInterimStatusSchema = z.enum([
	"active",
	"expired",
	"lifted",
]);

export type EmployeeCaseInterimStatus = z.infer<
	typeof employeeCaseInterimStatusSchema
>;

export const employeeCaseEventKindSchema = z.enum([
	"case_opened",
	"classification_updated",
	"owner_assigned",
	"participant_added",
	"investigation_note",
	"evidence_reference_added",
	"evidence_redacted",
	"interim_measure_issued",
	"finding_recorded",
	"action_recommended",
	"action_approved",
	"action_rejected",
	"appeal_recorded",
	"appeal_resolved",
	"case_closed",
	"case_reopened",
]);

export type EmployeeCaseEventKind = z.infer<typeof employeeCaseEventKindSchema>;

export const employeeCaseActionTypeSchema = z.enum([
	"warning",
	"training",
	"suspension_recommendation",
	"termination_recommendation",
	"other_policy_action",
]);

export type EmployeeCaseActionType = z.infer<
	typeof employeeCaseActionTypeSchema
>;

export const employeeCaseActionStatusSchema = z.enum([
	"recommended",
	"approved",
	"rejected",
]);

export type EmployeeCaseActionStatus = z.infer<
	typeof employeeCaseActionStatusSchema
>;

export const employeeCaseAppealStatusSchema = z.enum(["open", "resolved"]);

export type EmployeeCaseAppealStatus = z.infer<
	typeof employeeCaseAppealStatusSchema
>;

export const employeeCaseParticipantRoleSchema = z.enum([
	"investigator",
	"witness",
	"representative",
	"hr_partner",
	"subject",
]);

export type EmployeeCaseParticipantRole = z.infer<
	typeof employeeCaseParticipantRoleSchema
>;

export function isEmployeeCaseClosed(status: EmployeeCaseStatus): boolean {
	return status === "closed";
}

export function isEmployeeCaseMutable(status: EmployeeCaseStatus): boolean {
	return status !== "closed";
}
