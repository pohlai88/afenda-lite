import { OPERATOR_ADMIN_PATH } from "@/features/auth/operator-paths";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";

export type ShellNavModuleId = "platform";

export type ShellNavKind = "module";

/**
 * Module-tagged operator shell navigation (ARCH-015 · ARCH-018).
 * Only on-disk operator routes — no `/dashboard/*` or `/playground` (N17 / absent).
 */
export type ShellNavItem = {
	id: string;
	label: string;
	href: string;
	moduleId: ShellNavModuleId;
	kind: ShellNavKind;
	/** Any listed permission grants nav visibility (OR). */
	permissionCodes: readonly ProductPermissionCode[];
};

export const OPERATOR_SHELL_NAV: readonly ShellNavItem[] = [
	{
		id: "org-admin",
		label: "Operator admin",
		href: OPERATOR_ADMIN_PATH,
		moduleId: "platform",
		kind: "module",
		permissionCodes: ["org.roles.manage", "clients.invite"],
	},
] as const;
