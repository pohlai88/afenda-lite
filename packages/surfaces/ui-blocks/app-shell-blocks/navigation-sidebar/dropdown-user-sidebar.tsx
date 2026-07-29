"use client";

import {
	Avatar,
	AvatarFallback,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@afenda/ui-system";
import type { ReactNode } from "react";

export type DropdownUserSidebarAction = {
	id: string;
	label: string;
	icon?: ReactNode;
};

export type DropdownUserSidebarProps = {
	name: string;
	email?: string;
	initials: string;
	actions?: readonly DropdownUserSidebarAction[];
	onAction?: (actionId: string) => void;
	onSignOut?: () => void;
};

export function DropdownUserSidebar({
	name,
	email,
	initials,
	actions,
	onAction,
	onSignOut,
}: DropdownUserSidebarProps) {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton className="h-12 gap-3">
							<Avatar size="sm">
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<span className="grid min-w-0 flex-1 text-left">
								<span className="truncate font-medium">{name}</span>
								{email ? (
									<span className="truncate text-muted-foreground text-xs">
										{email}
									</span>
								) : null}
							</span>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel>
							<span className="grid min-w-0">
								<span className="truncate font-medium">{name}</span>
								{email ? (
									<span className="truncate text-muted-foreground text-xs">
										{email}
									</span>
								) : null}
							</span>
						</DropdownMenuLabel>
						{actions?.length ? (
							<>
								<DropdownMenuSeparator />
								{actions.map((action) => (
									<DropdownMenuItem
										key={action.id}
										onSelect={() => onAction?.(action.id)}
									>
										{action.icon}
										{action.label}
									</DropdownMenuItem>
								))}
							</>
						) : null}
						{onSignOut ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onSelect={() => onSignOut()}
								>
									Sign out
								</DropdownMenuItem>
							</>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
