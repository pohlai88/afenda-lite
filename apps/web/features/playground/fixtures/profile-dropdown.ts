import { SettingsIcon, UserIcon } from "lucide-react";

export const PROFILE_DROPDOWN_FIXTURE = {
	user: {
		fullName: "Ava Operator",
		email: "ava.operator@afenda.local",
		initials: "AO",
	},
	items: [
		{
			href: "/playground/lab/profile-dropdown",
			label: "My Account",
			icon: UserIcon,
		},
		{
			href: "/playground/lab/profile-dropdown",
			label: "Settings",
			icon: SettingsIcon,
		},
	],
	signOutLabel: "Sign out",
} as const;
