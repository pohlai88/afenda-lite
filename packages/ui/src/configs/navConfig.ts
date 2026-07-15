import {
	Building2,
	CalendarDays,
	FileText,
	LayoutDashboard,
	type LucideIcon,
	Settings2,
	Shield,
	ShoppingCart,
	UserRound,
} from "lucide-react";

export const NAV_ICONS = {
	LayoutDashboard,
	FileText,
	Building2,
	CalendarDays,
	ShoppingCart,
	Shield,
	UserRound,
	Settings2,
} as const;

export type LucideIconName = keyof typeof NAV_ICONS;

export type MenuLeafSubItem = {
	label: string;
	href: string;
	activePath?: string;
	badge?: string;
	badgeClassName?: string;
	target?: "_blank" | "_self" | "_parent" | "_top";
};

export type MenuGroupSubItem = {
	label: string;
	childItems: MenuLeafSubItem[];
};

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem;

export type MenuItem = {
	icon: LucideIconName;
	label: string;
} & (
	| {
			href: string;
			activePath?: string;
			badge?: string;
			badgeClassName?: string;
			childItems?: never;
			target?: "_blank" | "_self" | "_parent" | "_top";
	  }
	| {
			href?: never;
			badge?: never;
			activePath?: never;
			childItems: MenuSubItem[];
	  }
);

export type NavItem = {
	groupLabel?: string;
	items: MenuItem[];
};

/** @deprecated Use MenuLeafSubItem — archive alias */
export type MenuLeafItem = MenuLeafSubItem;

/** @deprecated Use NavItem — archive alias */
export type NavGroup = NavItem;

export function getNavIcon(name: LucideIconName): LucideIcon {
	return NAV_ICONS[name];
}

/**
 * Living product destinations (ARCH-012).
 * Adapted from archive `navConfig.tsx` type DNA — Studio demo apps omitted.
 */
export const navItems: NavItem[] = [
	{
		groupLabel: "Workspace",
		items: [
			{
				icon: "LayoutDashboard",
				label: "Client dashboard",
				href: "/client/dashboard",
			},
			{
				icon: "FileText",
				label: "Declarations",
				href: "/dashboard",
				activePath: "/dashboard",
			},
			{
				icon: "Building2",
				label: "Organization",
				childItems: [
					{ label: "Clients", href: "/dashboard/clients" },
					{
						label: "Users",
						href: "/dashboard/users",
						activePath: "/dashboard/users",
					},
					{ label: "Roles", href: "/dashboard/roles" },
					{ label: "Permissions", href: "/dashboard/permissions" },
				],
			},
		],
	},
	{
		groupLabel: "Feed Farm Trade",
		items: [
			{
				icon: "CalendarDays",
				label: "Events",
				href: "/fft/events",
				activePath: "/fft/events",
			},
			{
				icon: "ShoppingCart",
				label: "My orders",
				href: "/fft/my-orders",
			},
			{
				icon: "Shield",
				label: "FFT admin",
				childItems: [
					{
						label: "Admin events",
						href: "/fft/admin/events",
						activePath: "/fft/admin/events",
					},
					{ label: "RBAC", href: "/fft/admin/rbac" },
				],
			},
		],
	},
	{
		groupLabel: "Account",
		items: [
			{
				icon: "UserRound",
				label: "Account",
				href: "/account/settings",
				activePath: "/account",
			},
			{
				icon: "Settings2",
				label: "Operator",
				childItems: [
					{ label: "Admin", href: "/admin" },
					{ label: "FFT ops", href: "/fft" },
				],
			},
		],
	},
];
