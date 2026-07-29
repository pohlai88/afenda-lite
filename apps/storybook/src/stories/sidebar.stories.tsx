import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	BookOpenIcon,
	FileTextIcon,
	LayoutDashboardIcon,
	SettingsIcon,
	UsersIcon,
} from "lucide-react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.sidebar");

const meta = {
	title: "UI System/Sidebar",
	component: Sidebar,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Sidebar"),
	},
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function ErpWorkspaceShell({
	active = "invoices",
}: {
	active?: "dashboard" | "invoices" | "suppliers" | "policies" | "settings";
}) {
	return (
		<SidebarProvider defaultOpen>
			<Sidebar>
				<SidebarHeader>
					<div className="flex items-center gap-2 px-2 py-1.5">
						<span className="text-sm font-semibold tracking-tight">Afenda</span>
						<span className="text-xs text-sidebar-foreground/70">Lite</span>
					</div>
				</SidebarHeader>
				<SidebarSeparator />
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Workspace</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton isActive={active === "dashboard"}>
										<LayoutDashboardIcon />
										<span>Control centre</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton isActive={active === "invoices"}>
										<FileTextIcon />
										<span>Supplier invoices</span>
									</SidebarMenuButton>
									<SidebarMenuBadge>14</SidebarMenuBadge>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton isActive={active === "suppliers"}>
										<UsersIcon />
										<span>Suppliers</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>Administration</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton isActive={active === "policies"}>
										<BookOpenIcon />
										<span>Approval policies</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton isActive={active === "settings"}>
										<SettingsIcon />
										<span>Workspace settings</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton>
								<UsersIcon />
								<span>Aisha Rahman</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset>
				<header className="flex h-14 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<div className="grid gap-0.5">
						<p className="text-sm font-medium">Supplier invoices</p>
						<p className="text-xs text-foreground-secondary">
							Accounts payable · July 2026
						</p>
					</div>
				</header>
				<div className="grid gap-2 p-6 text-sm text-foreground-secondary">
					<p>
						Active styling is derived from the current route in feature code —
						not from local click state alone.
					</p>
					<p>Unauthorized destinations stay out of the composed menu.</p>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One ERP payables shell: Sidebar owns navigation chrome; feature composition owns destinations, active route, and authorization.",
			},
		},
	},
	render: () => (
		<div className="min-h-svh bg-canvas text-foreground">
			<ErpWorkspaceShell />
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Group labels stay stable across expanded and collapsed modes. Badges communicate counts — not authorization.",
			},
		},
	},
	render: () => (
		<div className="min-h-[32rem] bg-canvas">
			<ErpWorkspaceShell active="policies" />
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"SidebarProvider + Sidebar + SidebarInset is the standard workspace shell. SidebarTrigger toggles expanded state.",
			},
		},
	},
	render: () => (
		<div className="min-h-[28rem] bg-canvas">
			<SidebarProvider defaultOpen>
				<Sidebar>
					<SidebarHeader>
						<strong className="px-2 text-sm">Afenda</strong>
					</SidebarHeader>
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>Modules</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton isActive>
											<FileTextIcon />
											<span>Payables</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton>
											<BookOpenIcon />
											<span>Receivables</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>
				</Sidebar>
				<SidebarInset>
					<header className="flex h-12 items-center gap-2 border-b px-4">
						<SidebarTrigger />
						<span className="text-sm">Payables workspace</span>
					</header>
					<div className="p-4 text-sm text-foreground-secondary">
						Main content inset
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Provide a navigation landmark and meaningful names. Collapsed icon-only items must remain named. Toggle shortcut stays available.",
			},
		},
	},
	render: () => (
		<div className="min-h-[28rem] bg-canvas">
			<SidebarProvider defaultOpen>
				<Sidebar>
					<SidebarHeader>
						<span className="px-2 text-sm font-medium">Navigation</span>
					</SidebarHeader>
					<SidebarContent>
						<nav aria-label="Workspace modules">
							<SidebarGroup>
								<SidebarGroupLabel>Finance</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										<SidebarMenuItem>
											<SidebarMenuButton isActive>
												<FileTextIcon />
												<span>Invoices</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
										<SidebarMenuItem>
											<SidebarMenuButton>
												<UsersIcon />
												<span>Suppliers</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						</nav>
					</SidebarContent>
				</Sidebar>
				<SidebarInset>
					<header className="flex h-12 items-center gap-2 border-b px-4">
						<SidebarTrigger />
						<span className="text-sm">Accessible workspace</span>
					</header>
					<div className="p-4 text-sm text-foreground-secondary">
						Active styling is presentation only — not route authorization.
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Compose product destinations in the app shell. SidebarProvider must not hold business workflow state.",
			},
		},
	},
	render: () => (
		<div className="min-h-[32rem] bg-canvas">
			<ErpWorkspaceShell active="suppliers" />
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do derive active from the route and hide unauthorized destinations in feature composition. Do not treat active styling as authorization.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: route-derived active item">
				<SidebarProvider defaultOpen className="min-h-0">
					<div className="w-64 rounded-lg border p-3">
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton isActive>
									<FileTextIcon />
									<span>Supplier invoices</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton>
									<UsersIcon />
									<span>Suppliers</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</div>
				</SidebarProvider>
			</StorySection>
			<StorySection title="Do not: encode authz in isActive">
				<p className="text-sm text-foreground-secondary">
					isActive is presentation for the current route. Authorization hides
					destinations from the composed menu before render.
				</p>
			</StorySection>
		</div>
	),
};
