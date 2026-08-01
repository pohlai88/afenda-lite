"use client";

import { useCallback } from "react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export function ProfileDropdown({
	actions = [],
	initials,
	name,
	onAction,
}: Readonly<{
	actions?: readonly { id: string; label: string }[];
	initials?: string;
	name: string;
	onAction?: (id: string) => void;
}>) {
	const fallback = initials ?? name.slice(0, 2).toUpperCase();
	const handleAction = useCallback(
		(event: Event) => {
			const actionId = (event.currentTarget as HTMLElement | null)?.dataset
				.actionId;
			if (actionId !== undefined) {
				onAction?.(actionId);
			}
		},
		[onAction],
	);
	if (actions.length === 0 || onAction === undefined) {
		return (
			<div
				aria-label={`Signed in as ${name}`}
				className="flex size-8 items-center justify-center"
				role="img"
			>
				<Avatar className="size-6">
					<AvatarFallback className="text-foreground-secondary">
						{fallback}
					</AvatarFallback>
				</Avatar>
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label={`Open profile menu for ${name}`}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<Avatar className="size-6">
						<AvatarFallback className="text-foreground-secondary">
							{fallback}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{actions.map((action) => (
					<DropdownMenuItem
						data-action-id={action.id}
						key={action.id}
						onSelect={handleAction}
					>
						{action.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
