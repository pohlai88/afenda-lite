"use client";

import { Building2Icon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "../../components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

export function OrgSwitcher({
	onOrganizationChange,
	organizations,
}: Readonly<{
	organizations: readonly { id: string; name: string }[];
	onOrganizationChange?: (id: string) => void;
}>) {
	const [current, setCurrent] = useState(organizations[0]);
	const selectOrganization = useCallback(
		(event: Event) => {
			const id =
				event.currentTarget instanceof HTMLElement
					? event.currentTarget.dataset.organizationId
					: undefined;
			if (id === undefined) {
				return;
			}
			const organization = organizations.find(
				(candidate) => candidate.id === id,
			);
			if (!organization) {
				return;
			}
			setCurrent(organization);
			onOrganizationChange?.(organization.id);
		},
		[onOrganizationChange, organizations],
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label={`Switch organization. Current organization: ${current?.name ?? "None"}`}
					className="w-full justify-start"
					disabled={organizations.length === 0}
					size="sm"
					type="button"
					variant="ghost"
				>
					<Building2Icon data-icon="inline-start" />
					<span className="truncate">{current?.name ?? "No organization"}</span>
					<ChevronsUpDownIcon className="ml-auto" data-icon="inline-end" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64">
				<DropdownMenuLabel>Organizations</DropdownMenuLabel>
				<DropdownMenuGroup>
					{organizations.map((organization) => (
						<DropdownMenuItem
							data-organization-id={organization.id}
							key={organization.id}
							onSelect={selectOrganization}
						>
							<Building2Icon />
							<span className="truncate">{organization.name}</span>
							{organization.id === current?.id ? (
								<CheckIcon className="ml-auto" />
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
