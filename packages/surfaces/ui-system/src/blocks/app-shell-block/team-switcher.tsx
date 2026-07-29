"use client";

import type { ReactNode } from "react";
import { useState } from "react";

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
	return (
		<div>
			<button type="button">
				Switch team. Current team: {current?.name ?? "None"}
			</button>
			{teams.slice(1).map((team) => (
				<button
					key={team.id}
					type="button"
					role="menuitem"
					onClick={() => {
						setCurrent(team);
						onTeamChange?.(team.id);
					}}
				>
					{team.name}
				</button>
			))}
			{onCreateTeam ? (
				<button type="button" role="menuitem" onClick={onCreateTeam}>
					Add team
				</button>
			) : null}
		</div>
	);
}
