import type { Session } from "@afenda/auth";
import {
	type ProductPermissionCode,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";
import type { HrOperationsCapabilities } from "./types";

const has = (session: Session, code: ProductPermissionCode) =>
	sessionHasPermission(session, code);

export async function resolveHrOperationsCapabilities(
	session: Session,
): Promise<HrOperationsCapabilities> {
	const [
		canOnboard,
		canOffboard,
		canManageEmployment,
		canAdministerCompliance,
		canOpenCases,
		canReadCases,
		canReadWorkforcePlans,
		canPrepareWorkforcePlans,
		canViewIntegrationHealth,
	] = await Promise.all([
		has(session, "human-resources.onboarding.manage"),
		has(session, "human-resources.offboarding.manage"),
		has(session, "human-resources.employment.manage"),
		has(session, "human-resources.compliance.administer"),
		has(session, "human-resources.employee-case.open"),
		has(session, "human-resources.employee-case.assigned.read"),
		has(session, "human-resources.workforce-plan.read"),
		has(session, "human-resources.workforce-plan.prepare"),
		has(session, "human-resources.organization.read"),
	]);
	return {
		canOnboard,
		canOffboard,
		canManageEmployment,
		canAdministerCompliance,
		canOpenCases,
		canReadCases,
		canReadWorkforcePlans,
		canPrepareWorkforcePlans,
		canViewIntegrationHealth,
	};
}

export const hasHrOperationsCapability = (
	capabilities: HrOperationsCapabilities,
) => Object.values(capabilities).some(Boolean);
