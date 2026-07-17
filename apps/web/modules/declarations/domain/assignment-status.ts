/**
 * Client assignment lifecycle status values (N17).
 * Shared to avoid domain import cycles between draft and submit ports.
 */

export const SUBMITTED_ASSIGNMENT_STATUS = "submitted" as const;

export type AssignmentLifecycleStatus =
	| "pending"
	| typeof SUBMITTED_ASSIGNMENT_STATUS
	| (string & {});
