import {
	AppShell,
	type AppShellProps,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

function StoryLink({
	"aria-current": ariaCurrent,
	children,
	href,
	rel,
	target,
}: {
	children: ReactNode;
	href: string;
	"aria-current"?: "page";
	rel?: string;
	target?: "_blank" | "_self";
}) {
	return (
		<a href={href} aria-current={ariaCurrent} rel={rel} target={target}>
			{children}
		</a>
	);
}

const shellProps = {
	header: { title: "Operations workspace" },
	themeConfig: {
		brand: { name: "Afenda", homeHref: "/" },
		sidebar: { groupLabelStyle: "uppercase" },
	},
	navConfig: {
		currentPath: "/admin/inventory",
		linkComponent: StoryLink,
		sections: [
			{
				id: "workspace",
				label: "Workspace",
				items: [
					{
						kind: "link",
						id: "dashboard",
						label: "Dashboard",
						href: "/admin",
					},
					{
						kind: "link",
						id: "inventory",
						label: "Inventory",
						href: "/admin/inventory",
					},
				],
			},
		],
	},
	notifications: {
		notifications: [{ read: false }],
	},
	profile: { name: "Aisha Rahman", initials: "AR" },
	showScrollToTop: false,
} satisfies Omit<AppShellProps, "children">;

const meta = {
	title: "UI System/App Shell",
	component: AppShell,
	tags: ["autodocs", "test"],
	parameters: {
		docs: {
			description: {
				component:
					"Foundation workspace shell for ERP navigation, header utilities, and density settings.",
			},
		},
	},
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	args: {
		children: null,
	},
	tags: ["visual"],
	render: () => (
		<AppShell {...shellProps}>
			<div className="grid gap-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Inventory control
						</h1>
						<p className="text-sm text-foreground-secondary">
							Stock movement review and exception handling.
						</p>
					</div>
					<Button type="button">Create adjustment</Button>
				</div>
				<div className="grid gap-3 md:grid-cols-3">
					{[
						["Open movements", "248", "active"],
						["Pending approvals", "12", "pending"],
						["Exceptions", "3", "warning"],
					].map(([label, value, status]) => (
						<Card key={label}>
							<CardHeader>
								<CardTitle>{label}</CardTitle>
							</CardHeader>
							<CardContent className="flex items-end justify-between">
								<span className="text-2xl font-semibold">{value}</span>
								<Badge variant="outline">{status}</Badge>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</AppShell>
	),
};
