"use client";

import {
	LogOutIcon,
	type LucideIcon,
	SettingsIcon,
	UserIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type ProfileUser = {
	fullName: string;
	email: string;
	imageUrl?: string;
	initials: string;
};

type ProfileMenuItem = {
	href: string;
	label: string;
	icon: LucideIcon;
};

type ProfileDropdownProps = {
	user?: ProfileUser;
	items?: ProfileMenuItem[];
	onSignOut?: () => void;
	signOutLabel?: string;
};

const DEFAULT_USER: ProfileUser = {
	fullName: "Signed-in user",
	email: "user@example.com",
	initials: "U",
};

const DEFAULT_ITEMS: ProfileMenuItem[] = [
	{ href: "/account/settings", label: "My Account", icon: UserIcon },
	{ href: "/account/settings", label: "Settings", icon: SettingsIcon },
];

function MenuLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a href={href} className="flex flex-1 items-center gap-2">
			{children}
		</a>
	);
}

const ProfileDropdown = ({
	user = DEFAULT_USER,
	items = DEFAULT_ITEMS,
	onSignOut,
	signOutLabel = "Sign out",
}: ProfileDropdownProps) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative rounded-full hover:bg-transparent"
					/>
				}
			>
				<Avatar>
					{user.imageUrl ? (
						<AvatarImage src={user.imageUrl} alt={user.fullName} />
					) : null}
					<AvatarFallback>{user.initials}</AvatarFallback>
				</Avatar>
				<span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex items-center gap-4 px-2 py-2.5 font-normal">
						<div className="relative">
							<Avatar className="size-10">
								{user.imageUrl ? (
									<AvatarImage src={user.imageUrl} alt={user.fullName} />
								) : null}
								<AvatarFallback>{user.initials}</AvatarFallback>
							</Avatar>
							<span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
						</div>
						<div className="flex flex-1 flex-col items-start">
							<span className="text-foreground text-base font-semibold">
								{user.fullName}
							</span>
							<span className="text-muted-foreground text-sm">
								{user.email}
							</span>
						</div>
					</DropdownMenuLabel>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					{items.map((item) => {
						const Icon = item.icon;
						return (
							<DropdownMenuItem key={`${item.href}:${item.label}`}>
								<MenuLink href={item.href}>
									<Icon />
									<span>{item.label}</span>
								</MenuLink>
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem variant="destructive" onClick={onSignOut}>
						<LogOutIcon />
						<span>{signOutLabel}</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ProfileDropdown;
