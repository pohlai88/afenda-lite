import { z } from "zod";

export const COURSE_STATUSES = ["active", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const SESSION_STATUSES = [
	"scheduled",
	"in_progress",
	"completed",
	"cancelled",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ASSIGNMENT_STATUSES = [
	"pending",
	"in_progress",
	"completed",
	"withdrawn",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_TERMINAL_STATUSES = [
	"completed",
	"withdrawn",
] as const satisfies readonly AssignmentStatus[];

export const CERTIFICATION_STATUSES = ["active", "expired", "revoked"] as const;
export type CertificationStatus = (typeof CERTIFICATION_STATUSES)[number];

export const COMPLETION_OUTCOMES = ["passed", "failed", "attended"] as const;
export type CompletionOutcome = (typeof COMPLETION_OUTCOMES)[number];

export const courseStatusSchema = z.enum(COURSE_STATUSES);
export const sessionStatusSchema = z.enum(SESSION_STATUSES);
export const assignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES);
export const certificationStatusSchema = z.enum(CERTIFICATION_STATUSES);
export const completionOutcomeSchema = z.enum(COMPLETION_OUTCOMES);

export function isCourseActive(status: CourseStatus): boolean {
	return status === "active";
}

export function isSessionActive(status: SessionStatus): boolean {
	return status === "scheduled" || status === "in_progress";
}

export function isSessionTerminal(status: SessionStatus): boolean {
	return status === "completed" || status === "cancelled";
}

export function isAssignmentActive(status: AssignmentStatus): boolean {
	return status === "pending" || status === "in_progress";
}

export function isAssignmentTerminal(status: AssignmentStatus): boolean {
	return status === "withdrawn" || status === "completed";
}

export function isCertificationActive(status: CertificationStatus): boolean {
	return status === "active";
}

export function isCertificationTerminal(status: CertificationStatus): boolean {
	return status === "expired" || status === "revoked";
}
