import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BellIcon, InfoIcon } from "lucide-react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.tooltip");

const meta = {
	title: "UI System/Tooltip",
	component: Tooltip,
	tags: ["autodocs", "test"],
	parameters: {
		layout: "padded",
		...contractDocsParameters(evidence, "Tooltip"),
	},
	decorators: [
		(Story) => (
			<TooltipProvider delayDuration={0}>
				<Story />
			</TooltipProvider>
		),
	],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Invoice-workbench supplemental disclosure for a truncated identifier and icon control. Tooltip owns brief hover/focus presentation only; the trigger must remain named, understandable, and operable without it.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Accounts receivable
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Open invoice clarification
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Tooltip owns brief hover/focus disclosure. The trigger must remain
						operable and named without the tip.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>July open invoice</CardTitle>
								<CardDescription>
									Northwind Trading · remittance queue
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Invoice</Badge>
								<StatusBadge label="Open" status="pending" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex w-full items-center justify-between gap-4 rounded-md border border-border bg-background p-3">
							<div className="min-w-0">
								<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
									Open invoice
								</p>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											className="max-w-56 truncate text-left font-medium text-foreground text-sm underline-offset-4 hover:underline"
											type="button"
										>
											INV-1042-NORTHWIND-JULY-BATCH-18
										</button>
									</TooltipTrigger>
									<TooltipContent>
										INV-1042-NORTHWIND-JULY-BATCH-18
									</TooltipContent>
								</Tooltip>
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button size="icon" type="button" variant="outline">
										<BellIcon />
										<span className="sr-only">Notifications</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Notifications</TooltipContent>
							</Tooltip>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("tooltip"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved roles: truncated identifier reveal, icon control name, and short field hint. Errors stay on FormField — not Tooltip.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap items-center gap-6">
			<StorySection title="Truncated id">
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							className="max-w-40 truncate font-medium text-sm underline-offset-4 hover:underline"
							type="button"
						>
							INV-1042-NORTHWIND-JULY-BATCH-18
						</button>
					</TooltipTrigger>
					<TooltipContent>INV-1042-NORTHWIND-JULY-BATCH-18</TooltipContent>
				</Tooltip>
			</StorySection>
			<StorySection title="Icon name">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button size="icon" type="button" variant="outline">
							<BellIcon />
							<span className="sr-only">Notifications</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Notifications</TooltipContent>
				</Tooltip>
			</StorySection>
			<StorySection title="Short hint">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button size="icon" type="button" variant="ghost">
							<InfoIcon />
							<span className="sr-only">Tax id format</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Format: MY-TAX-####</TooltipContent>
				</Tooltip>
			</StorySection>
		</div>
	),
};

export const ControlledUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Wrap the app region in TooltipProvider. Keep tip copy short; name the trigger independently when the tip is supplemental.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-sm gap-3">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button size="icon" type="button" variant="outline">
						<BellIcon />
						<span className="sr-only">Notifications</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>Notifications</TooltipContent>
			</Tooltip>
			<p className="text-foreground-secondary text-sm">
				Touch users must still understand the control without hovering.
			</p>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Focus and hover both reveal the tip, Escape dismisses it, and the trigger remains the keyboard target. Disabled controls must not depend on tooltip-only explanation because native disabled elements cannot receive focus.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap items-center gap-4">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button size="icon" type="button" variant="outline">
						<BellIcon />
						<span className="sr-only">Notifications</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>Notifications</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex">
						<Button disabled size="icon" type="button" variant="outline">
							<BellIcon />
							<span className="sr-only">Notifications locked</span>
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>Available after activation</TooltipContent>
			</Tooltip>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Family inventory: TooltipProvider · Tooltip · TooltipTrigger · TooltipContent. No size scale — tip denseness is fixed chrome.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap items-center gap-6">
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					Text trigger
				</p>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							className="text-sm underline-offset-4 hover:underline"
							type="button"
						>
							INV-1048
						</button>
					</TooltipTrigger>
					<TooltipContent>Open INV-1048 detail</TooltipContent>
				</Tooltip>
			</div>
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					Icon trigger
				</p>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button size="icon" type="button" variant="outline">
							<InfoIcon />
							<span className="sr-only">Payment terms</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Net 30 from invoice date</TooltipContent>
				</Tooltip>
			</div>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose Tooltip on Card chrome beside Badge and StatusBadge. Lifecycle stays on StatusBadge — not in tip copy.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>Remittance notice</CardTitle>
						<CardDescription>July batch</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Finance</Badge>
						<StatusBadge label="Queued" status="pending" />
						<Tooltip>
							<TooltipTrigger asChild>
								<Button size="icon" type="button" variant="ghost">
									<InfoIcon />
									<span className="sr-only">Batch timing</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Posts after 17:00 MYT close</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</CardHeader>
			<CardContent className="text-foreground-secondary text-sm">
				Tip clarifies timing. It does not replace field errors or approval
				commands.
			</CardContent>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do keep tips short and supplemental. Do not put errors, forms, or required instructions in Tooltip.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: short supplemental name">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button size="icon" type="button" variant="outline">
							<BellIcon />
							<span className="sr-only">Notifications</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Notifications</TooltipContent>
				</Tooltip>
			</StorySection>
			<StorySection title="Do not: critical instructions in the tip">
				<p className="text-foreground-secondary text-sm">
					Do not put “Enter tax id or save will fail”, recovery links, or
					interactive controls inside Tooltip — use FormField, Alert, or
					Popover.
				</p>
			</StorySection>
		</div>
	),
};

export const AdaptiveTouchAndHighContrast: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Tooltip content stays brief, readable, and within the viewport. Touch and coarse-pointer users must receive the same essential meaning through persistent labels or another explicit disclosure pattern.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Long identifier remains selectable elsewhere">
				<div className="grid gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								className="max-w-56 truncate text-left font-medium text-sm underline-offset-4 hover:underline"
								type="button"
							>
								INV-1042-NORTHWIND-JULY-BATCH-18
							</button>
						</TooltipTrigger>
						<TooltipContent>INV-1042-NORTHWIND-JULY-BATCH-18</TooltipContent>
					</Tooltip>
					<p className="text-foreground-secondary text-sm">
						Provide copy or full-detail access outside the tip when exact text
						is operationally important.
					</p>
				</div>
			</StorySection>
			<StorySection title="Touch-safe icon control">
				<div className="flex items-center gap-3">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="icon" type="button" variant="outline">
								<BellIcon aria-hidden="true" />
								<span className="sr-only">Notifications</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent>Notifications</TooltipContent>
					</Tooltip>
					<span className="text-foreground-secondary text-sm">
						Notifications
					</span>
				</div>
			</StorySection>
		</div>
	),
};
