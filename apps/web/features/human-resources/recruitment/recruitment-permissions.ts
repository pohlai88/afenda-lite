import type { Session } from "@afenda/auth";

import {
	type ProductPermissionCode,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";

import type { RecruitmentCapabilities } from "./types";

function has(session: Session, code: ProductPermissionCode) {
	return sessionHasPermission(session, code);
}

export async function resolveRecruitmentCapabilities(
	session: Session,
): Promise<RecruitmentCapabilities> {
	const [
		canManageRequisitions,
		canManageCandidates,
		canReadInterviews,
		canRecordInterviews,
		canManageOffers,
		canHire,
	] = await Promise.all([
		has(session, "human-resources.requisition.create"),
		has(session, "human-resources.candidate.manage"),
		has(session, "human-resources.interview.read"),
		has(session, "human-resources.interview.record"),
		has(session, "human-resources.offer.approve"),
		has(session, "human-resources.hire.orchestrate"),
	]);
	return {
		canManageRequisitions,
		canManageCandidates,
		canReadInterviews,
		canRecordInterviews,
		canManageOffers,
		canHire,
	};
}

export function hasRecruitmentCapability(
	capabilities: RecruitmentCapabilities,
) {
	return Object.values(capabilities).some(Boolean);
}
