"use client";

import { useState } from "react";
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

	return (
		<div>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Open profile menu for ${name}`}
				onClick={() => setOpen((value) => !value)}
			>
				<Avatar className="size-6">
					<AvatarFallback>{fallback}</AvatarFallback>
				</Avatar>
			</Button>
			{open && onAction !== undefined ? (
				<div role="menu" aria-label="Profile menu">
					{actions.map((action) => (
						<button
							key={action.id}
							type="button"
							role="menuitem"
							onClick={() => onAction(action.id)}
						>
							{action.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
