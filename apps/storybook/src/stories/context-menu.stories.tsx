import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.context-menu");

const CONTEXT_MENU_MATURITY_DOCTRINE =
	"ContextMenu benchmarks enterprise interaction maturity rather than another product’s appearance. It must attach to an unmistakable target, preserve complete keyboard operation, restore focus after dismissal, remain legible in high-contrast presentation, and never become the sole path to critical workflow actions, authorization, or lifecycle authority.";

const meta = {
	title: "UI System/Context Menu",
	component: ContextMenu,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Context Menu"),
		docs: {
			description: {
				component: CONTEXT_MENU_MATURITY_DOCTRINE,
			},
		},
	},
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

function InvoiceRecordContextMenu({
	triggerLabel = "Right-click this region",
	className = "flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-foreground-secondary",
}: {
	triggerLabel?: string;
	className?: string;
}) {
	const [pinned, setPinned] = React.useState(true);
	const [visibility, setVisibility] = React.useState("team");

	return (
		<ContextMenu>
			<ContextMenuTrigger className={className} tabIndex={0}>
				{triggerLabel}
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuLabel>Invoice INV-1048</ContextMenuLabel>
				<ContextMenuItem>
					Open record
					<ContextMenuShortcut>↵</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem>Copy invoice number</ContextMenuItem>
				<ContextMenuCheckboxItem
					checked={pinned}
					onCheckedChange={(checked) => setPinned(checked === true)}
				>
					Pin in workbench
				</ContextMenuCheckboxItem>
				<ContextMenuSeparator />
				<ContextMenuRadioGroup value={visibility} onValueChange={setVisibility}>
					<ContextMenuLabel inset>Share scope</ContextMenuLabel>
					<ContextMenuRadioItem value="team">Team review</ContextMenuRadioItem>
					<ContextMenuRadioItem value="private">
						Private only
					</ContextMenuRadioItem>
				</ContextMenuRadioGroup>
				<ContextMenuSeparator />
				<ContextMenuSub>
					<ContextMenuSubTrigger>More actions</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuItem>Export PDF</ContextMenuItem>
						<ContextMenuItem>Duplicate as draft</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem variant="destructive">
							Archive invoice
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Invoice review keeps the recommended action visible while ContextMenu supplies supplemental actions for an unmistakable record target. Pointer and keyboard operators receive equivalent menu behavior; Escape dismisses and returns focus. The menu never becomes the only path to approval, correction, or other critical workflow commands.",
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
						ContextMenu offers supplemental actions for this clearly identified
						record target. Approve remains a visible Button, shortcuts remain
						optional accelerators, and authorization stays in feature policy.
					</p>
					<p className="max-w-5xl text-xs leading-5 text-foreground-tertiary">
						Operational standard: target meaning, item grouping, focus
						restoration, and consequences must remain understandable without
						colour or pointer interaction.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
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
					</CardHeader>
					<CardContent>
						<InvoiceRecordContextMenu />
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
	play: interactionFor("context-menu"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use ContextMenu for supplemental actions on an obvious target. Group items by task and consequence, keep labels action-oriented, expose destructive outcomes explicitly, and treat shortcuts as optional accelerators.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Record target with supplemental actions">
				<InvoiceRecordContextMenu />
			</StorySection>

			<StorySection title="Attachment region target">
				<ContextMenu>
					<ContextMenuTrigger
						className="flex h-28 items-center justify-center rounded-md border border-dashed text-sm text-foreground-secondary"
						tabIndex={0}
					>
						Right-click bank letter attachment
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuLabel>Bank letter · 12 Jul 2026</ContextMenuLabel>
						<ContextMenuItem>Open preview</ContextMenuItem>
						<ContextMenuItem>Download original</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem variant="destructive">
							Remove attachment
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</StorySection>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"ContextMenuItem supports default and destructive treatments. The family has no independent size scale; menu density remains owned by the primitive.",
			},
		},
	},
	render: () => (
		<StorySection title="Approved item treatments">
			<ContextMenu>
				<ContextMenuTrigger
					className="flex h-28 w-full max-w-xl items-center justify-center rounded-md border border-dashed text-sm text-foreground-secondary"
					tabIndex={0}
				>
					Right-click invoice INV-1048
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuLabel>Invoice INV-1048</ContextMenuLabel>
					<ContextMenuItem variant="default">Open invoice</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem variant="destructive">
						Delete invoice draft
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		</StorySection>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Items expose checked, radio, disabled, submenu, and destructive semantics. Keyboard operators can traverse every available action, open submenus, dismiss with Escape, and return focus to the originating target. Meaning must survive high-contrast presentation without relying on colour alone.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Checked, radio, and disabled items">
				<ContextMenu>
					<ContextMenuTrigger
						className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-foreground-secondary"
						tabIndex={0}
					>
						Right-click supplier row
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuLabel>Supplier SUP-1042</ContextMenuLabel>
						<ContextMenuItem>Open supplier</ContextMenuItem>
						<ContextMenuCheckboxItem checked>
							Watch for remittance changes
						</ContextMenuCheckboxItem>
						<ContextMenuSeparator />
						<ContextMenuRadioGroup value="active">
							<ContextMenuRadioItem value="active">
								Active roster
							</ContextMenuRadioItem>
							<ContextMenuRadioItem value="preferred">
								Preferred roster
							</ContextMenuRadioItem>
						</ContextMenuRadioGroup>
						<ContextMenuSeparator />
						<ContextMenuItem disabled>
							Escalate — awaiting permission
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</StorySection>

			<StorySection title="Destructive item with concrete consequence">
				<ContextMenu>
					<ContextMenuTrigger
						className="flex h-28 items-center justify-center rounded-md border border-dashed text-sm text-foreground-secondary"
						tabIndex={0}
					>
						Right-click draft payment run
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuLabel>Payment run PAY-2210</ContextMenuLabel>
						<ContextMenuItem>Open run</ContextMenuItem>
						<ContextMenuItem>Export remittance advice</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem variant="destructive">
							Delete draft run
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
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
					"Card owns the persistent record surface and visible workflow actions. ContextMenu attaches to a regional target inside the Card, preserves the target relationship, and never replaces Approve or other required commands.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Receivables</Badge>
						<StatusBadge size="sm" status="pending" label="Awaiting approval" />
					</div>
					<CardTitle>Invoice INV-1048</CardTitle>
					<CardDescription>
						Context actions stay on the evidence region
					</CardDescription>
				</CardHeader>
				<CardContent>
					<InvoiceRecordContextMenu
						triggerLabel="Right-click evidence region"
						className="flex h-36 items-center justify-center rounded-md border bg-muted/30 text-sm text-foreground-secondary"
					/>
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline">
						Request correction
					</Button>
					<Button type="button">Approve invoice</Button>
				</CardFooter>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Master data</Badge>
						<StatusBadge size="sm" status="active" label="Active" />
					</div>
					<CardTitle>Supplier Northwind Trading</CardTitle>
					<CardDescription>
						Submenu groups less-frequent supplemental actions
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ContextMenu>
						<ContextMenuTrigger
							className="flex h-36 items-center justify-center rounded-md border border-dashed text-sm text-foreground-secondary"
							tabIndex={0}
						>
							Right-click supplier summary
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuLabel>SUP-1042</ContextMenuLabel>
							<ContextMenuItem>Open supplier</ContextMenuItem>
							<ContextMenuItem>Copy tax id</ContextMenuItem>
							<ContextMenuSub>
								<ContextMenuSubTrigger>More</ContextMenuSubTrigger>
								<ContextMenuSubContent>
									<ContextMenuItem>View remittance history</ContextMenuItem>
									<ContextMenuItem>Export master record</ContextMenuItem>
								</ContextMenuSubContent>
							</ContextMenuSub>
						</ContextMenuContent>
					</ContextMenu>
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
					"ContextMenu supplements an identified target. It is not the only path to critical actions, a substitute for visible workflow hierarchy, an authorization boundary, or lifecycle authority.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: keep primary actions visible">
				<div className="grid gap-3 rounded-lg border p-4">
					<InvoiceRecordContextMenu
						triggerLabel="Right-click record target"
						className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-foreground-secondary"
					/>
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
					ContextMenu is supplemental discovery — never the sole path.
				</p>
			</StorySection>

			<StorySection title="Do: use destructive only for real consequences">
				<ContextMenu>
					<ContextMenuTrigger
						className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-foreground-secondary"
						tabIndex={0}
					>
						Right-click draft attachment
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem>Open preview</ContextMenuItem>
						<ContextMenuItem variant="destructive">
							Remove attachment
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</StorySection>

			<StorySection title="Do not: use disabled items as fake auth">
				<p className="text-sm text-foreground-secondary">
					A disabled Escalate item does not replace server authorization.
					Feature code must enforce permissions; disabled state is not
					StatusBadge lifecycle.
				</p>
			</StorySection>

			<StorySection title="Do: preserve an unmistakable target">
				<p className="text-sm text-foreground-secondary">
					The trigger region must make the affected invoice, attachment, row, or
					record obvious before the menu opens.
				</p>
			</StorySection>

			<StorySection title="Do not: attach actions to ambiguous whitespace">
				<p className="text-sm text-foreground-secondary">
					A menu opened from an unlabeled page region leaves operators uncertain
					which record or evidence item will be affected.
				</p>
			</StorySection>
		</div>
	),
};
