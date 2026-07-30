import type { Session } from "@afenda/auth";

import {
	type ProductPermissionCode,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";

import type { SelfServicePermissions } from "./types";

async function has(session: Session, code: ProductPermissionCode) {
	return await sessionHasPermission(session, code);
}

export async function resolveSelfServicePermissions(
	session: Session,
): Promise<SelfServicePermissions> {
	const [
		canViewProfile,
		canReadLeavePolicy,
		canReadLeaveEntitlement,
		canManageOwnLeave,
		canViewAttendance,
		canRecordAttendance,
		canViewTimesheet,
		canSubmitTimesheet,
		canViewLearning,
		canViewCertifications,
		canViewPerformance,
		canViewDocuments,
		canViewAcknowledgements,
		canAcknowledgePolicy,
		canCancelApprovedLeave,
	] = await Promise.all([
		has(session, "human-resources.employee.read"),
		has(session, "human-resources.leave-policy.read"),
		has(session, "human-resources.leave-entitlement.read"),
		has(session, "human-resources.leave-request.own"),
		has(session, "human-resources.time.attendance.read"),
		has(session, "human-resources.time.attendance.self.record"),
		has(session, "human-resources.time.timesheet.read"),
		has(session, "human-resources.time.timesheet.submit"),
		has(session, "human-resources.learning.manage"),
		has(session, "human-resources.certification.manage"),
		has(session, "human-resources.performance.own.read"),
		has(session, "human-resources.employee-document.own.read"),
		has(session, "human-resources.compliance.administer"),
		has(session, "human-resources.policy-acknowledgement.administer"),
		has(session, "human-resources.leave-request.approve-team"),
	]);

	return {
		canViewProfile,
		canViewLeave:
			canReadLeavePolicy && canReadLeaveEntitlement && canManageOwnLeave,
		canViewAttendance,
		canViewTimesheet,
		canViewLearning,
		canViewCertifications,
		canViewPerformance,
		canViewDocuments,
		canViewAcknowledgements,
		canRecordAttendance,
		canCancelApprovedLeave,
		canSubmitTimesheet,
		canAcknowledgePolicy,
	};
}

export function hasSelfServiceCapability(
	permissions: SelfServicePermissions,
): boolean {
	return Object.values(permissions).some(Boolean);
}
