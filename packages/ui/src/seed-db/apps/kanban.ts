import type { Assignee, Task } from "../../types/apps/kanban-types";
import { requireAt } from "../require-at";

export const teamMembers: Assignee[] = [
	{
		name: "Alex Johnson",
		avatar: "/images/avatars/avatar-1.webp",
	},
	{
		name: "Sarah Chen",
		avatar: "/images/avatars/avatar-2.webp",
	},
	{
		name: "Michael Rodriguez",
		avatar: "/images/avatars/avatar-3.webp",
	},
	{
		name: "Emma Wilson",
		avatar: "/images/avatars/avatar-4.webp",
	},
	{
		name: "David Kim",
		avatar: "/images/avatars/avatar-5.webp",
	},
	{
		name: "Aron Thompson",
		avatar: "/images/avatars/avatar-6.webp",
	},
	{
		name: "James Brown",
		avatar: "/images/avatars/avatar-7.webp",
	},
	{
		name: "Olivia Sparks",
		avatar: "/images/avatars/avatar-8.webp",
	},
	{
		name: "Howard Lloyd",
		avatar: "/images/avatars/avatar-9.webp",
	},
	{
		name: "Hallie Richards",
		avatar: "/images/avatars/avatar-10.webp",
	},
];

export const initialColumns: Record<string, Task[]> = {
	backlog: [
		{
			id: "1",
			title: "AI Dashboard Research",
			priority: "high",
			image: "/images/misc/flower-1.webp",
			description:
				"Research competitor dashboards and define analytics requirements.",
			assignees: [
				requireAt(teamMembers, 0, "teamMember"),
				requireAt(teamMembers, 2, "teamMember"),
			],
			dueDate: "Jul 05, 2026",
		},
		{
			id: "2",
			title: "Create Landing Page Wireframes",
			priority: "medium",
			description: "Design low-fidelity wireframes for the marketing website.",
			assignees: [requireAt(teamMembers, 1, "teamMember")],
			dueDate: "Jul 08, 2026",
		},
		{
			id: "3",
			title: "User Interview Analysis",
			priority: "low",
			assignees: [requireAt(teamMembers, 7, "teamMember")],
			dueDate: "Jul 12, 2026",
		},
	],

	inProgress: [
		{
			id: "4",
			title: "Build Authentication Flow",
			priority: "high",
			description: "Implement OAuth, JWT tokens, and protected routes.",
			assignees: [
				requireAt(teamMembers, 3, "teamMember"),
				requireAt(teamMembers, 4, "teamMember"),
			],
			dueDate: "Jul 15, 2026",
		},
		{
			id: "5",
			title: "Dark Mode Implementation",
			priority: "medium",
			image: "/images/misc/flower-2.webp",
			description: "Create dark theme tokens and update UI components.",
			assignees: [requireAt(teamMembers, 5, "teamMember")],
			dueDate: "Jul 18, 2026",
		},
		{
			id: "6",
			title: "Mobile Responsive Layout",
			priority: "high",
			assignees: [requireAt(teamMembers, 6, "teamMember")],
			dueDate: "Jul 20, 2026",
		},
	],

	review: [
		{
			id: "7",
			title: "Analytics Charts",
			priority: "medium",
			image: "/images/misc/flower-3.webp",
			description: "Awaiting design review and stakeholder approval.",
			assignees: [
				requireAt(teamMembers, 8, "teamMember"),
				requireAt(teamMembers, 9, "teamMember"),
			],
			dueDate: "Jul 22, 2026",
		},
		{
			id: "8",
			title: "Notification System",
			priority: "high",
			assignees: [
				requireAt(teamMembers, 0, "teamMember"),
				requireAt(teamMembers, 4, "teamMember"),
			],
			dueDate: "Jul 23, 2026",
		},
	],

	done: [
		{
			id: "9",
			title: "Project Setup",
			priority: "high",
			assignees: [
				requireAt(teamMembers, 5, "teamMember"),
				requireAt(teamMembers, 6, "teamMember"),
			],
			dueDate: "Jun 28, 2026",
		},
		{
			id: "10",
			title: "Design System Foundation",
			priority: "medium",
			description: "Created color palette and reusable components.",
			assignees: [
				requireAt(teamMembers, 2, "teamMember"),
				requireAt(teamMembers, 3, "teamMember"),
			],
			dueDate: "Jun 30, 2026",
		},
		{
			id: "11",
			title: "Database Architecture",
			priority: "high",
			image: "/images/misc/flower-4.webp",
			assignees: [requireAt(teamMembers, 1, "teamMember")],
			dueDate: "Jul 01, 2026",
		},
	],
};
