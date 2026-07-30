"use client";

import { type MouseEvent, useCallback, useState } from "react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";

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
	const [open, setOpen] = useState(false);
	const fallback = initials ?? name.slice(0, 2).toUpperCase();
	const toggleOpen = useCallback(() => setOpen((value) => !value), []);
	const handleAction = useCallback(
		(event: MouseEvent<HTMLButtonElement>) =>
			onAction?.(event.currentTarget.value),
		[onAction],
	);

	return (
		<div>
			<Button
				aria-label={`Open profile menu for ${name}`}
				onClick={toggleOpen}
				size="icon-sm"
				type="button"
				variant="ghost"
			>
				<Avatar className="size-6">
					<AvatarFallback>{fallback}</AvatarFallback>
				</Avatar>
			</Button>
			{open && onAction !== undefined ? (
				<div aria-label="Profile menu" role="menu">
					{actions.map((action) => (
						<button
							key={action.id}
							onClick={handleAction}
							role="menuitem"
							type="button"
							value={action.id}
						>
							{action.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
