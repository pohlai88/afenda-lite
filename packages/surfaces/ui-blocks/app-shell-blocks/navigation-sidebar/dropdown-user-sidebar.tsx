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
import { type ReactNode, useCallback } from "react";

export interface DropdownUserSidebarAction {
	icon?: ReactNode;
	id: string;
	label: string;
}

export interface DropdownUserSidebarProps {
	actions?: readonly DropdownUserSidebarAction[];
	email?: string;
	initials: string;
	name: string;
	onAction?: (actionId: string) => void;
	onSignOut?: () => void;
}

function DropdownActionItem({
	action,
	onAction,
}: {
	action: DropdownUserSidebarAction;
	onAction: DropdownUserSidebarProps["onAction"];
}) {
	const handleSelect = useCallback(
		() => onAction?.(action.id),
		[action.id, onAction],
	);
	return (
		<DropdownMenuItem onSelect={handleSelect}>
			{action.icon}
			{action.label}
		</DropdownMenuItem>
	);
}

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
									<DropdownActionItem
										action={action}
										key={action.id}
										onAction={onAction}
									/>
								))}
							</>
						) : null}
						{onSignOut ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={onSignOut} variant="destructive">
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
