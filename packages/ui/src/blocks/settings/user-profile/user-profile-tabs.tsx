import type { UserProfilePageData } from "../../../contracts/pages/user-profile-types";

("use client");

// Third-party Imports
import { parseAsString, useQueryState } from "nuqs";
// React Imports
import { useEffect } from "react";

// Component Imports
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../../../components/ui/tabs";

import ConnectionsCard from "./connections";
import Profile from "./profile";
import ProjectsCard from "./projects";
import TeamsCard from "./teams";

const UserProfileTabs = ({ data }: { data: UserProfilePageData }) => {
	const [activeView, setActiveView] = useQueryState(
		"view",
		parseAsString.withDefault("profile").withOptions({
			history: "push",
			shallow: true,
			clearOnDefault: false,
		}),
	);

	useEffect(() => {
		setActiveView(activeView);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const tabs = [
		{
			name: "Profile",
			value: "profile",
			content: <Profile data={data} />,
		},
		{
			name: "Teams",
			value: "teams",
			content: <TeamsCard data={data} />,
		},
		{
			name: "Projects",
			value: "projects",
			content: <ProjectsCard data={data} />,
		},
		{
			name: "Connections",
			value: "connections",
			content: <ConnectionsCard data={data} />,
		},
	];

	return (
		<div className="w-full">
			<Tabs
				className="gap-4"
				value={activeView}
				onValueChange={(value) => {
					setActiveView(value);
				}}
			>
				<TabsList className="max-sm:w-full">
					{tabs.map((tab) => (
						<TabsTrigger key={tab.value} value={tab.value}>
							{tab.name}
						</TabsTrigger>
					))}
				</TabsList>
				{tabs.map((tab) => (
					<TabsContent key={tab.value} value={tab.value}>
						{tab.content}
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
};

export default UserProfileTabs;
