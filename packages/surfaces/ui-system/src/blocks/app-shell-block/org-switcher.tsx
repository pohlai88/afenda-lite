"use client";

import { type MouseEvent, useCallback, useState } from "react";

export function OrgSwitcher({
	onOrganizationChange,
	organizations,
}: Readonly<{
	organizations: readonly { id: string; name: string }[];
	onOrganizationChange?: (id: string) => void;
}>) {
	const [current, setCurrent] = useState(organizations[0]);
	const handleOrganizationChange = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const organization = organizations.find(
				(candidate) => candidate.id === event.currentTarget.value,
			);
			if (organization) {
				setCurrent(organization);
				onOrganizationChange?.(organization.id);
			}
		},
		[onOrganizationChange, organizations],
	);
	return (
		<div>
			<button type="button">
				Switch organization. Current organization: {current?.name ?? "None"}
			</button>
			{organizations.slice(1).map((organization) => (
				<button
					key={organization.id}
					onClick={handleOrganizationChange}
					role="menuitem"
					type="button"
					value={organization.id}
				>
					{organization.name}
				</button>
			))}
		</div>
	);
}
