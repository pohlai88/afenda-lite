import type { AppShellNavSection, CommandMenuGroup } from "@afenda/ui-system";

import {
	SHELL_MODULE_PRESENTATION,
	SHELL_NAV_SECTIONS,
	type ShellNavItem,
} from "@/features/portal-chrome/nav-config";

/** Derive the AppShell navigation projection from the authorized route list. */
export function buildWorkspaceNavigation(
	navItems: readonly ShellNavItem[],
): readonly AppShellNavSection[] {
	return SHELL_NAV_SECTIONS.flatMap((section) => {
		const items = navItems
			.filter(
				(item) =>
					SHELL_MODULE_PRESENTATION[item.moduleId].sectionId === section.id,
			)
			.map((item) => ({
				kind: "link" as const,
				id: item.id,
				label: item.label,
				href: item.href,
				icon: SHELL_MODULE_PRESENTATION[item.moduleId].icon,
			}));
		return items.length === 0 ? [] : [{ ...section, items }];
	});
}

/** Derive command-palette groups from the same authorized navigation input. */
export function buildWorkspaceCommandGroups(
	navItems: readonly ShellNavItem[],
	sections: readonly AppShellNavSection[],
): readonly CommandMenuGroup[] {
	const moduleIdByItemId = new Map(
		navItems.map((item) => [item.id, item.moduleId]),
	);
	return sections.map((section) => ({
		id: section.id,
		label: section.label ?? "ERP modules",
		commands: section.items.map((item) => ({
			id: item.id,
			label: item.label,
			keywords: [moduleIdByItemId.get(item.id) ?? item.id],
		})),
	}));
}

/** Longest matching route wins so `/admin/payables/*` beats `/admin`. */
export function findActiveWorkspaceItem(
	navItems: readonly ShellNavItem[],
	pathname: string,
): ShellNavItem | undefined {
	return [...navItems]
		.sort((left, right) => right.href.length - left.href.length)
		.find(
			(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
		);
}
