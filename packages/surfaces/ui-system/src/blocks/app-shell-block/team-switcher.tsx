"use client";

import { type MouseEvent, type ReactNode, useCallback, useState } from "react";

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
	const handleTeamChange = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const team = teams.find(
				(candidate) => candidate.id === event.currentTarget.value,
			);
			if (team) {
				setCurrent(team);
				onTeamChange?.(team.id);
			}
		},
		[onTeamChange, teams],
	);
	return (
		<div>
			<button type="button">
				Switch team. Current team: {current?.name ?? "None"}
			</button>
			{teams.slice(1).map((team) => (
				<button
					key={team.id}
					onClick={handleTeamChange}
					role="menuitem"
					type="button"
					value={team.id}
				>
					{team.name}
				</button>
			))}
			{onCreateTeam ? (
				<button onClick={onCreateTeam} role="menuitem" type="button">
					Add team
				</button>
			) : null}
		</div>
	);
}
