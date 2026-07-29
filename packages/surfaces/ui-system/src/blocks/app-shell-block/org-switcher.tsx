"use client";

import { useState } from "react";

export function OrgSwitcher({
	onOrganizationChange,
	organizations,
}: Readonly<{
	organizations: readonly { id: string; name: string }[];
	onOrganizationChange?: (id: string) => void;
}>) {
	const [current, setCurrent] = useState(organizations[0]);
	return (
		<div>
			<button type="button">
				Switch organization. Current organization: {current?.name ?? "None"}
			</button>
			{organizations.slice(1).map((organization) => (
				<button
					key={organization.id}
					type="button"
					role="menuitem"
					onClick={() => {
						setCurrent(organization);
						onOrganizationChange?.(organization.id);
					}}
				>
					{organization.name}
				</button>
			))}
		</div>
	);
}
