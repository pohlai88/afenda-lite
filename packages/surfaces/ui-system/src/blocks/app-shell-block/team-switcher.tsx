"use client";

import {
	CheckIcon,
	ChevronsUpDownIcon,
	PlusIcon,
	UsersIcon,
} from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { Button } from "../../components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

export function TeamSwitcher({
	onCreateTeam,
	onTeamChange,
	teams,
}: Readonly<{
	teams: readonly {
		id: string;
		name: string;
		logo?: (props: { className?: string }) => ReactNode;
	}[];
	onTeamChange?: (id: string) => void;
	onCreateTeam?: () => void;
}>) {
	const [current, setCurrent] = useState(teams[0]);
	const selectTeam = useCallback(
		(event: Event) => {
			const id =
				event.currentTarget instanceof HTMLElement
					? event.currentTarget.dataset.teamId
					: undefined;
			if (id === undefined) {
				return;
			}
			const team = teams.find((candidate) => candidate.id === id);
			if (!team) {
				return;
			}
			setCurrent(team);
			onTeamChange?.(team.id);
		},
		[onTeamChange, teams],
	);
	const CurrentLogo = current?.logo;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label={`Switch team. Current team: ${current?.name ?? "None"}`}
					className="w-full justify-start"
					disabled={teams.length === 0}
					size="sm"
					type="button"
					variant="ghost"
				>
					{CurrentLogo ? (
						<CurrentLogo />
					) : (
						<UsersIcon data-icon="inline-start" />
					)}
					<span className="truncate">{current?.name ?? "No team"}</span>
					<ChevronsUpDownIcon className="ml-auto" data-icon="inline-end" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64">
				<DropdownMenuLabel>Teams</DropdownMenuLabel>
				<DropdownMenuGroup>
					{teams.map((team) => {
						const Logo = team.logo;
						return (
							<DropdownMenuItem
								data-team-id={team.id}
								key={team.id}
								onSelect={selectTeam}
							>
								{Logo ? <Logo /> : <UsersIcon />}
								<span className="truncate">{team.name}</span>
								{team.id === current?.id ? (
									<CheckIcon className="ml-auto" />
								) : null}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
				{onCreateTeam ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onSelect={onCreateTeam}>
								<PlusIcon />
								Add team
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
