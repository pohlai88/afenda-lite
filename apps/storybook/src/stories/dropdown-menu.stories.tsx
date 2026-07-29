import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.dropdown-menu");

const DROPDOWN_MENU_MATURITY_DOCTRINE =
	"DropdownMenu benchmarks enterprise operating maturity rather than another product’s appearance. It must expose an explicit trigger, preserve complete keyboard navigation and focus restoration, group secondary actions by task and consequence, remain legible in high-contrast presentation, and never become the sole path to critical workflow actions, authorization, confirmation, or lifecycle authority.";

const meta = {
	title: "UI System/Dropdown Menu",
	component: DropdownMenu,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Dropdown Menu"),
		docs: {
			description: {
				component: DROPDOWN_MENU_MATURITY_DOCTRINE,
			},
		},
	},
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

function InvoiceWorkbenchMenu({
	triggerLabel = "Open menu",
}: {
	triggerLabel?: string;
}) {
	const [notifications, setNotifications] = React.useState(true);
	const [density, setDensity] = React.useState("comfortable");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline">
					{triggerLabel}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-52">
				<DropdownMenuLabel>Invoice INV-1048</DropdownMenuLabel>
				<DropdownMenuItem>
					Open record
					<DropdownMenuShortcut>⇧O</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>Copy invoice number</DropdownMenuItem>
				<DropdownMenuCheckboxItem
					checked={notifications}
					onCheckedChange={(checked) => setNotifications(checked === true)}
				>
					Watch remittance alerts
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value={density} onValueChange={setDensity}>
					<DropdownMenuLabel inset>List density</DropdownMenuLabel>
					<DropdownMenuRadioItem value="comfortable">
						Comfortable
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>More actions</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>Export PDF</DropdownMenuItem>
						<DropdownMenuItem>Duplicate as draft</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive">
							Archive invoice
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Invoice workbench keeps the recommended action visible while DropdownMenu gathers secondary record actions behind one explicit trigger. Keyboard and pointer operators receive equivalent navigation, Escape dismisses and restores focus, and menu presence never grants authority to execute.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounts receivable · invoice review
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Invoice INV-1048
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						DropdownMenu holds secondary actions for this invoice. Approve
						remains a visible Button, shortcuts remain optional accelerators,
						and feature policy owns authorization and destructive confirmation.
					</p>
					<p className="max-w-5xl text-xs leading-5 text-foreground-tertiary">
						Operational standard: trigger meaning, item grouping, focus state,
						submenus, and consequences must remain understandable without
						colour, icons, or pointer interaction.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
						<div className="grid gap-2">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Invoice</Badge>
								<StatusBadge
									size="sm"
									status="pending"
									label="Awaiting approval"
								/>
							</div>
							<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
							<CardDescription>
								MYR 18,420.00 · July receivables · finance-control review
							</CardDescription>
						</div>
						<InvoiceWorkbenchMenu />
					</CardHeader>
					<CardContent className="text-sm text-foreground-secondary">
						Secondary open, copy, density, and archive actions share one
						trigger. Destructive Archive lives under More actions and still
						requires feature confirmation.
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Request correction
						</Button>
						<Button type="button">Approve invoice</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("dropdown-menu"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use DropdownMenu for secondary actions that share one explicit trigger. Group by task and consequence, keep labels action-oriented, reserve submenus for less-frequent actions, and treat shortcuts as supplemental.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Record secondary actions">
				<div className="flex justify-end rounded-lg border p-4">
					<InvoiceWorkbenchMenu />
				</div>
			</StorySection>

			<StorySection title="Supplier directory overflow">
				<div className="flex justify-end rounded-lg border p-4">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline">
								Supplier actions
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>SUP-1042</DropdownMenuLabel>
							<DropdownMenuItem>Open supplier</DropdownMenuItem>
							<DropdownMenuItem>Copy tax id</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive">
								Deactivate supplier
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</StorySection>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Triggers expose expanded state. Items expose checked, radio, disabled, submenu, and destructive semantics. Keyboard operators can traverse, select, open submenus, dismiss with Escape, and return focus to the trigger without relying on colour alone.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Checked, radio, and disabled items">
				<div className="flex justify-end rounded-lg border p-4">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline">
								View preferences
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Workbench</DropdownMenuLabel>
							<DropdownMenuCheckboxItem checked>
								Show overdue only
							</DropdownMenuCheckboxItem>
							<DropdownMenuSeparator />
							<DropdownMenuRadioGroup value="comfortable">
								<DropdownMenuRadioItem value="comfortable">
									Comfortable
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="compact">
									Compact
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem disabled>
								Escalate — awaiting permission
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</StorySection>

			<StorySection title="Destructive item with concrete consequence">
				<div className="flex justify-end rounded-lg border p-4">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline">
								Draft run actions
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>PAY-2210</DropdownMenuLabel>
							<DropdownMenuItem>Open payment run</DropdownMenuItem>
							<DropdownMenuItem>Export remittance advice</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive">
								Delete draft run
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card owns the persistent record surface and visible workflow actions. DropdownMenu sits in the header as secondary overflow, preserves record context, and never replaces the primary action. StatusBadge owns lifecycle meaning.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Receivables</Badge>
							<StatusBadge
								size="sm"
								status="pending"
								label="Awaiting approval"
							/>
						</div>
						<CardTitle>Invoice INV-1048</CardTitle>
						<CardDescription>Secondary overflow beside Approve</CardDescription>
					</div>
					<InvoiceWorkbenchMenu triggerLabel="Open menu" />
				</CardHeader>
				<CardContent className="text-sm text-foreground-secondary">
					Approve remains a footer Button. Archive stays nested and destructive.
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline">
						Request correction
					</Button>
					<Button type="button">Approve invoice</Button>
				</CardFooter>
			</Card>

			<Card className="shadow-none">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">Master data</Badge>
							<StatusBadge size="sm" status="active" label="Active" />
						</div>
						<CardTitle>Supplier Northwind Trading</CardTitle>
						<CardDescription>
							Submenu groups less-frequent actions
						</CardDescription>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline">
								More
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>SUP-1042</DropdownMenuLabel>
							<DropdownMenuItem>Open supplier</DropdownMenuItem>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>Exports</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuItem>Export master record</DropdownMenuItem>
									<DropdownMenuItem>Export remittance history</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardHeader>
				<CardContent className="text-sm text-foreground-secondary">
					Save remains visible. Menu items do not encode Active lifecycle.
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline">
						Edit supplier
					</Button>
					<Button type="button">Save changes</Button>
				</CardFooter>
			</Card>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"DropdownMenu gathers secondary actions. It is not the only path to critical work, an authorization boundary, a confirmation substitute, or lifecycle authority.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: keep primary actions visible">
				<div className="grid gap-3 rounded-lg border p-4">
					<div className="flex justify-end">
						<InvoiceWorkbenchMenu />
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" size="sm" variant="outline">
							Request correction
						</Button>
						<Button type="button" size="sm">
							Approve invoice
						</Button>
					</div>
				</div>
			</StorySection>

			<StorySection title="Do not: hide Approve only in the menu">
				<p className="text-sm text-foreground-secondary">
					Critical Approve and Submit actions must remain visible Buttons.
					DropdownMenu is secondary overflow — never the sole path.
				</p>
			</StorySection>

			<StorySection title="Do: use destructive only for real consequences">
				<div className="flex justify-end rounded-lg border p-4">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" size="sm" variant="outline">
								Attachment actions
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem>Open preview</DropdownMenuItem>
							<DropdownMenuItem variant="destructive">
								Remove attachment
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</StorySection>

			<StorySection title="Do not: use disabled items as fake auth">
				<p className="text-sm text-foreground-secondary">
					A disabled Escalate item does not replace server authorization.
					Feature code must enforce permissions; disabled state is not
					StatusBadge lifecycle.
				</p>
			</StorySection>

			<StorySection title="Do: name the trigger by scope">
				<p className="text-sm text-foreground-secondary">
					“Supplier actions” or “Attachment actions” tells operators what the
					menu affects before it opens.
				</p>
			</StorySection>

			<StorySection title="Do not: use an unexplained More trigger">
				<p className="text-sm text-foreground-secondary">
					A generic “More” trigger is acceptable only when the surrounding
					record context is unmistakable and an accessible name preserves the
					scope.
				</p>
			</StorySection>
		</div>
	),
};
