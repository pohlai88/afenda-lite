import type { Session } from "@afenda/auth";
import {
	type ProductPermissionCode,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";
import type { CompensationCapabilities } from "./types";

const has = (session: Session, code: ProductPermissionCode) =>
	sessionHasPermission(session, code);

export async function resolveCompensationCapabilities(
	session: Session,
): Promise<CompensationCapabilities> {
	const [canRead, canManage, canManageBenefits] = await Promise.all([
		has(session, "human-resources.compensation.read"),
		has(session, "human-resources.compensation.manage"),
		has(session, "human-resources.benefits.manage"),
	]);
	return { canRead, canManage, canManageBenefits };
}

export const hasCompensationCapability = (
	capabilities: CompensationCapabilities,
) => Object.values(capabilities).some(Boolean);
