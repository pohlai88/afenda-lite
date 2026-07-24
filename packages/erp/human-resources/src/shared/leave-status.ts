import { z } from "zod";

export const LEAVE_POLICY_STATUSES = [
	"draft",
	"published",
	"superseded",
	"archived",
] as const;
export type LeavePolicyStatus = (typeof LEAVE_POLICY_STATUSES)[number];

export const LEAVE_ENTITLEMENT_STATUSES = [
	"active",
	"expired",
	"carried_forward",
	"closed",
] as const;
export type LeaveEntitlementStatus =
	(typeof LEAVE_ENTITLEMENT_STATUSES)[number];

export const LEAVE_ADJUSTMENT_STATUSES = ["posted"] as const;
export type LeaveAdjustmentStatus = (typeof LEAVE_ADJUSTMENT_STATUSES)[number];

export const LEAVE_ADJUSTMENT_KINDS = [
	"manual",
	"accrual",
	"carry_forward",
	"expiry",
	"consumption",
	"cancellation_reversal",
] as const;
export type LeaveAdjustmentKind = (typeof LEAVE_ADJUSTMENT_KINDS)[number];

export const LEAVE_REQUEST_STATUSES = [
	"draft",
	"submitted",
	"returned",
	"approved",
	"rejected",
	"withdrawn",
	"cancelled",
] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

export const LEAVE_UNITS = ["days", "hours"] as const;
export type LeaveUnit = (typeof LEAVE_UNITS)[number];

export const LEAVE_TYPES = ["annual", "sick", "unpaid", "other"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const DAY_PORTIONS = ["morning", "afternoon", "full"] as const;
export type DayPortion = (typeof DAY_PORTIONS)[number];

export const APPROVAL_DECISIONS = [
	"approved",
	"rejected",
	"returned",
	"cancelled",
] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const leavePolicyStatusSchema = z.enum(LEAVE_POLICY_STATUSES);
export const leaveEntitlementStatusSchema = z.enum(LEAVE_ENTITLEMENT_STATUSES);
export const leaveAdjustmentStatusSchema = z.enum(LEAVE_ADJUSTMENT_STATUSES);
export const leaveAdjustmentKindSchema = z.enum(LEAVE_ADJUSTMENT_KINDS);
export const leaveRequestStatusSchema = z.enum(LEAVE_REQUEST_STATUSES);
export const leaveUnitSchema = z.enum(LEAVE_UNITS);
export const leaveTypeSchema = z.enum(LEAVE_TYPES);
export const dayPortionSchema = z.enum(DAY_PORTIONS);
export const approvalDecisionSchema = z.enum(APPROVAL_DECISIONS);

export function isLeavePolicyEditable(status: LeavePolicyStatus): boolean {
	return status === "draft";
}

export function isLeavePolicyPublished(status: LeavePolicyStatus): boolean {
	return status === "published";
}

export function isLeaveEntitlementActive(
	status: LeaveEntitlementStatus,
): boolean {
	return status === "active";
}

export function isLeaveRequestTerminal(status: LeaveRequestStatus): boolean {
	return (
		status === "approved" ||
		status === "rejected" ||
		status === "withdrawn" ||
		status === "cancelled"
	);
}

export function isLeaveRequestPendingApproval(
	status: LeaveRequestStatus,
): boolean {
	return status === "submitted";
}

export function canTransitionLeavePolicyStatus(
	current: LeavePolicyStatus,
	next: LeavePolicyStatus,
): boolean {
	if (current === next) return false;
	if (current === "draft" && next === "published") return true;
	if (current === "published" && next === "superseded") return true;
	if (current === "published" && next === "archived") return true;
	if (current === "superseded" && next === "archived") return true;
	return false;
}

export function canTransitionLeaveRequestStatus(
	current: LeaveRequestStatus,
	next: LeaveRequestStatus,
): boolean {
	if (current === next) return false;
	switch (current) {
		case "draft":
			return next === "submitted" || next === "withdrawn";
		case "submitted":
			return (
				next === "approved" ||
				next === "rejected" ||
				next === "returned" ||
				next === "withdrawn"
			);
		case "returned":
			return next === "submitted" || next === "withdrawn";
		case "approved":
			return next === "cancelled";
		default:
			return false;
	}
}

export function canTransitionLeaveEntitlementStatus(
	current: LeaveEntitlementStatus,
	next: LeaveEntitlementStatus,
): boolean {
	if (current === next) return false;
	if (current === "active" && next === "expired") return true;
	if (current === "active" && next === "carried_forward") return true;
	if (current === "active" && next === "closed") return true;
	if (current === "expired" && next === "closed") return true;
	if (current === "carried_forward" && next === "closed") return true;
	return false;
}
