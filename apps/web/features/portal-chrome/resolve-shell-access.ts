import {
	OPERATOR_SHELL_NAV,
	type ShellNavItem,
} from "@/features/portal-chrome/nav-config";
import {
	type PermissionSession,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";

async function itemVisible(
	session: PermissionSession,
	item: ShellNavItem,
): Promise<boolean> {
	const checks = await Promise.all(
		item.permissionCodes.map((code) => sessionHasPermission(session, code)),
	);
	return checks.some(Boolean);
}

/**
 * Filters module-tagged shell nav via Identity permission ports only.
 * No vertical domain imports (Declarations · FFT domain).
 */
export async function resolveOperatorShellNav(
	session: PermissionSession,
	items: readonly ShellNavItem[] = OPERATOR_SHELL_NAV,
): Promise<ShellNavItem[]> {
	const visible: ShellNavItem[] = [];
	for (const item of items) {
		if (await itemVisible(session, item)) {
			visible.push(item);
		}
	}
	return visible;
}
