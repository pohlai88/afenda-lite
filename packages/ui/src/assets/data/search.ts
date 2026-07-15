import type { LucideIcon } from "lucide-react";
import {
	Building2,
	CalendarDays,
	FileText,
	LayoutDashboard,
	Settings2,
	Shield,
	ShoppingCart,
	UserRound,
} from "lucide-react";

export type SearchItem = {
	name: string;
	href: string;
	icon: LucideIcon;
	tags: string[];
	shortcut?: string;
	openInNewTab?: boolean;
};

export type SearchGroup = {
	title: string;
	data: SearchItem[];
};

/** Command palette destinations aligned to Living ARCH-012 routes. */
export const searchData: SearchGroup[] = [
	{
		title: "Workspace",
		data: [
			{
				name: "Client dashboard",
				href: "/client/dashboard",
				icon: LayoutDashboard,
				tags: ["client", "workspace", "home"],
			},
			{
				name: "Declarations",
				href: "/dashboard",
				icon: FileText,
				tags: ["declarations", "dashboard"],
			},
			{
				name: "Clients",
				href: "/dashboard/clients",
				icon: Building2,
				tags: ["organization", "clients"],
			},
			{
				name: "Users",
				href: "/dashboard/users",
				icon: UserRound,
				tags: ["organization", "users"],
			},
			{
				name: "Roles",
				href: "/dashboard/roles",
				icon: Shield,
				tags: ["organization", "roles", "rbac"],
			},
			{
				name: "Permissions",
				href: "/dashboard/permissions",
				icon: Shield,
				tags: ["organization", "permissions", "rbac"],
			},
		],
	},
	{
		title: "Feed Farm Trade",
		data: [
			{
				name: "FFT events",
				href: "/fft/events",
				icon: CalendarDays,
				tags: ["fft", "events", "trade"],
			},
			{
				name: "My orders",
				href: "/fft/my-orders",
				icon: ShoppingCart,
				tags: ["fft", "orders"],
			},
			{
				name: "FFT admin events",
				href: "/fft/admin/events",
				icon: Settings2,
				tags: ["fft", "admin"],
			},
		],
	},
	{
		title: "Account",
		data: [
			{
				name: "Account settings",
				href: "/account/settings",
				icon: UserRound,
				tags: ["account", "settings", "profile"],
			},
			{
				name: "Operator admin",
				href: "/admin",
				icon: Settings2,
				tags: ["operator", "admin"],
			},
		],
	},
];
