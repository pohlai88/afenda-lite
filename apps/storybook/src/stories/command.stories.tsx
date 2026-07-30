import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	FileTextIcon,
	SearchIcon,
	SettingsIcon,
	ShieldAlertIcon,
	UserIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { expect, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.command");

const COMMAND_MATURITY_DOCTRINE =
	"Command benchmarks enterprise operating maturity rather than another product’s appearance. It must provide predictable keyboard-first discovery, separate navigation from mutations, keep labels understandable without shortcuts or icons, communicate unavailable and empty states clearly, and never replace visible critical actions, confirmation, authorization, or lifecycle policy.";

const meta = {
	title: "UI System/Command",
	component: Command,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Command"),
		docs: {
			description: {
				component: COMMAND_MATURITY_DOCTRINE,
			},
		},
	},
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

function OperatorCommandCatalogue({
	className = "rounded-lg border shadow-none",
}: {
	className?: string;
}) {
	return (
		<Command className={className}>
			<CommandInput
				aria-label="Search operator commands"
				placeholder="Search navigation and commands..."
			/>
			<CommandList>
				<CommandEmpty>No commands match this search.</CommandEmpty>
				<CommandGroup heading="Navigation">
					<CommandItem value="search-invoices">
						<SearchIcon aria-hidden="true" />
						Search invoices
						<CommandShortcut>⌘K</CommandShortcut>
					</CommandItem>
					<CommandItem value="open-settings">
						<SettingsIcon aria-hidden="true" />
						Open workspace settings
						<CommandShortcut>⌘,</CommandShortcut>
					</CommandItem>
					<CommandItem value="open-supplier">
						<UserIcon aria-hidden="true" />
						Open supplier directory
					</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Mutating commands">
					<CommandItem value="submit-approval">
						<FileTextIcon aria-hidden="true" />
						Submit invoice for approval
					</CommandItem>
					<CommandItem disabled value="escalate-exception">
						<ShieldAlertIcon aria-hidden="true" />
						Escalate payment exception
						<CommandShortcut>Unavailable</CommandShortcut>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

function CommandPaletteDialogDemo() {
	const [open, setOpen] = useState(false);
	const openCommand = useCallback(() => setOpen(true), []);

	return (
		<div className="grid gap-4">
			<div className="flex items-center justify-between gap-3 rounded-lg border p-4">
				<p className="text-foreground-secondary text-sm">
					CommandDialog hosts the same catalogue in modal chrome for global
					palette entry.
				</p>
				<Button onClick={openCommand} type="button" variant="outline">
					Open command palette
				</Button>
			</div>
			<CommandDialog
				description="Search navigation destinations and mutating commands."
				onOpenChange={setOpen}
				open={open}
				title="Operator command palette"
			>
				<CommandInput
					aria-label="Search operator commands"
					placeholder="Type a command or search..."
				/>
				<CommandList>
					<CommandEmpty>No commands match this search.</CommandEmpty>
					<CommandGroup heading="Navigation">
						<CommandItem value="search-invoices">
							<SearchIcon aria-hidden="true" />
							Search invoices
							<CommandShortcut>⌘K</CommandShortcut>
						</CommandItem>
						<CommandItem value="open-settings">
							<SettingsIcon aria-hidden="true" />
							Open workspace settings
						</CommandItem>
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading="Mutating commands">
						<CommandItem value="submit-approval">
							<FileTextIcon aria-hidden="true" />
							Submit invoice for approval
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</div>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Operator workbench embeds Command for keyboard-first discovery from a bounded catalogue. Navigation and mutations remain visibly separated, labels carry meaning without icons or shortcuts, and catalogue presence never grants authority to execute.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Platform · operator workspace
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Command discovery
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Command searches a bounded catalogue of destinations and governed
						actions. Shortcuts and icons reinforce labels; required workflow
						actions remain visible on the record surface.
					</p>
					<p className="max-w-5xl text-foreground-tertiary text-xs leading-5">
						Operational standard: search, grouping, active-item focus, empty
						results, and dismissal must remain coherent in keyboard-only and
						high-contrast use.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Keyboard</Badge>
							<StatusBadge label="Operational" size="sm" status="active" />
						</div>
						<CardTitle>Workspace command catalogue</CardTitle>
						<CardDescription>
							org-fragrant-lake · navigation and governed mutations
						</CardDescription>
					</CardHeader>
					<CardContent>
						<OperatorCommandCatalogue />
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Close catalogue
						</Button>
						<Button type="button">Open invoice INV-1048</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Group navigation destinations separately from mutating commands. Use stable values, concise verb-led labels, task-specific empty copy, and optional shortcuts that never replace visible wording.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Inline searchable catalogue">
				<OperatorCommandCatalogue />
			</StorySection>

			<StorySection title="Navigation-only group">
				<Command className="rounded-lg border shadow-none">
					<CommandInput
						aria-label="Jump to destination"
						placeholder="Jump to..."
					/>
					<CommandList>
						<CommandEmpty>No destinations match this search.</CommandEmpty>
						<CommandGroup heading="Receivables">
							<CommandItem value="open-invoices">Open invoices</CommandItem>
							<CommandItem value="open-collections">
								Open collections queue
							</CommandItem>
						</CommandGroup>
						<CommandGroup heading="Master data">
							<CommandItem value="open-suppliers">
								Open supplier directory
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</StorySection>
		</div>
	),
};

function EmptyResultsCommand() {
	const [query, setQuery] = useState("zzzz-no-match");

	return (
		<Command className="rounded-lg border shadow-none">
			<CommandInput
				aria-label="Search with no matches"
				onValueChange={setQuery}
				placeholder="Search commands..."
				value={query}
			/>
			<CommandList>
				<CommandEmpty>No commands match this search.</CommandEmpty>
				<CommandGroup heading="Navigation">
					<CommandItem value="search-invoices">Search invoices</CommandItem>
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Empty results announce clearly. Disabled items may remain visible when operators need to understand that a capability exists, but they stay unselectable. Keyboard focus, active-item meaning, and shortcuts remain understandable without relying on colour or icons.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Empty results after search">
				<EmptyResultsCommand />
			</StorySection>

			<StorySection title="Unavailable mutating command">
				<Command className="rounded-lg border shadow-none">
					<CommandInput
						aria-label="Search including unavailable commands"
						placeholder="Search commands..."
					/>
					<CommandList>
						<CommandEmpty>No commands match this search.</CommandEmpty>
						<CommandGroup heading="Mutating commands">
							<CommandItem value="submit-approval">
								Submit invoice for approval
							</CommandItem>
							<CommandItem disabled value="escalate-exception">
								Escalate payment exception
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</StorySection>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.getByText("No commands match this search."),
		).toBeVisible();
		await expect(
			canvas.getByRole("option", { name: "Escalate payment exception" }),
		).toHaveAttribute("aria-disabled", "true");
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card hosts an inline catalogue beside persistent workflow actions. CommandDialog provides global palette chrome, focus containment, and dismissal without replacing visible Approve buttons or record-level context.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Receivables</Badge>
						<StatusBadge label="Awaiting approval" size="sm" status="pending" />
					</div>
					<CardTitle>Invoice INV-1048</CardTitle>
					<CardDescription>
						Northwind Trading · command discovery stays secondary to Approve
					</CardDescription>
				</CardHeader>
				<CardContent>
					<OperatorCommandCatalogue className="rounded-md border shadow-none" />
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
						<Badge variant="secondary">Global palette</Badge>
						<StatusBadge label="Operational" size="sm" status="active" />
					</div>
					<CardTitle>CommandDialog entry</CardTitle>
					<CardDescription>
						Modal chrome for workspace-wide discovery
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CommandPaletteDialogDemo />
				</CardContent>
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
					"Command discovers destinations and commands supplied by the feature. It is not authorization, confirmation, a primary-action hiding place, or lifecycle authority.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: separate navigation from mutations">
				<Command className="rounded-lg border shadow-none">
					<CommandInput
						aria-label="Separated command groups"
						placeholder="Search..."
					/>
					<CommandList>
						<CommandEmpty>No commands match this search.</CommandEmpty>
						<CommandGroup heading="Navigation">
							<CommandItem value="open-invoices">Open invoices</CommandItem>
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup heading="Mutating commands">
							<CommandItem value="submit-approval">
								Submit invoice for approval
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</StorySection>

			<StorySection title="Do not: hide required primary actions">
				<p className="text-foreground-secondary text-sm">
					Approve, Submit, and blocking corrections must remain visible Buttons
					on the record surface. Command is discovery — not a substitute for
					required actions.
				</p>
			</StorySection>

			<StorySection title="Do: treat shortcuts as supplemental">
				<div className="rounded-lg border p-4 text-foreground-secondary text-sm">
					Labels carry the instruction (“Search invoices”). Shortcuts such as ⌘K
					are optional accelerators, never the only way to understand the
					command.
				</div>
			</StorySection>

			<StorySection title="Do not: execute from list presence alone">
				<p className="text-foreground-secondary text-sm">
					A listed “Escalate payment exception” item does not grant permission.
					Feature code must authorize and confirm before mutation — listing is
					not StatusBadge lifecycle.
				</p>
			</StorySection>

			<StorySection title="Do: keep labels meaningful without icons">
				<p className="text-foreground-secondary text-sm">
					“Submit invoice for approval” remains understandable when the icon,
					shortcut, and colour treatment are unavailable.
				</p>
			</StorySection>

			<StorySection title="Do not: use ambiguous command nouns">
				<p className="text-foreground-secondary text-sm">
					Labels such as “Invoice” or “Approval” do not tell the operator
					whether the command opens, searches, submits, or approves.
				</p>
			</StorySection>
		</div>
	),
};
