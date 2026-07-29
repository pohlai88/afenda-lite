import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.menubar");

const meta = {
	title: "UI System/Menubar",
	component: Menubar,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Menubar"),
	},
} satisfies Meta<typeof Menubar>;

export default meta;
type Story = StoryObj<typeof meta>;

function JournalRecordMenubar() {
	return (
		<Menubar aria-label="Journal record commands">
			<MenubarMenu>
				<MenubarTrigger>Record</MenubarTrigger>
				<MenubarContent>
					<MenubarLabel>Journal</MenubarLabel>
					<MenubarItem>
						Open record
						<MenubarShortcut>⌘O</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>
						Duplicate draft
						<MenubarShortcut>⇧⌘D</MenubarShortcut>
					</MenubarItem>
					<MenubarSeparator />
					<MenubarCheckboxItem checked>Show audit details</MenubarCheckboxItem>
					<MenubarSub>
						<MenubarSubTrigger>Export</MenubarSubTrigger>
						<MenubarSubContent>
							<MenubarItem>Export PDF</MenubarItem>
							<MenubarItem>Export CSV</MenubarItem>
						</MenubarSubContent>
					</MenubarSub>
					<MenubarItem disabled>Delete posted record</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu>
				<MenubarTrigger>View</MenubarTrigger>
				<MenubarContent>
					<MenubarLabel>Density</MenubarLabel>
					<MenubarRadioGroup value="comfortable">
						<MenubarRadioItem value="comfortable">Comfortable</MenubarRadioItem>
						<MenubarRadioItem value="compact">Compact</MenubarRadioItem>
					</MenubarRadioGroup>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Accounting journal workspace keeps Post visible on the Card. Menubar hosts Record and View desktop commands — including a disabled Delete posted record — without replacing page actions.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounting · journal operations
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Journal JV-2026-1042
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Menubar is a desktop command strip. Authorization and posting
						outcomes stay in feature code — visible items are not proof of
						permission.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader className="gap-4">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounting</Badge>
							<span className="font-mono text-xs text-foreground-tertiary">
								JV-2026-1042
							</span>
							<StatusBadge size="sm" status="pending" label="Awaiting post" />
						</div>
						<CardTitle>Afenda Holdings · July 2026</CardTitle>
						<CardDescription>
							MYR 84,250.00 · balanced · finance-control review
						</CardDescription>
						<div className="w-[min(720px,calc(100vw-4rem))]">
							<JournalRecordMenubar />
						</div>
					</CardHeader>
					<CardContent className="grid gap-3 text-sm">
						<p className="text-foreground-secondary">
							18 journal lines · controls passed · ready for posting run.
						</p>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Export register
						</Button>
						<Button type="button">Post journal</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("menubar"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Group commands by task context. Use checkbox items for view toggles, radio groups for exclusive density, and submenus for export formats.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Record + View command groups">
				<div className="w-[min(720px,calc(100vw-4rem))]">
					<JournalRecordMenubar />
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
					"Disabled destructive commands stay discoverable. Shortcuts are supplemental. Keyboard Home / Arrow / Escape must restore focus predictably.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Disabled — Delete posted record">
				<div className="w-[min(720px,calc(100vw-4rem))]">
					<Menubar aria-label="Posted journal commands">
						<MenubarMenu>
							<MenubarTrigger>Record</MenubarTrigger>
							<MenubarContent>
								<MenubarItem>
									Open record
									<MenubarShortcut>⌘O</MenubarShortcut>
								</MenubarItem>
								<MenubarItem>
									Duplicate draft
									<MenubarShortcut>⇧⌘D</MenubarShortcut>
								</MenubarItem>
								<MenubarSeparator />
								<MenubarItem disabled>Delete posted record</MenubarItem>
							</MenubarContent>
						</MenubarMenu>
					</Menubar>
				</div>
				<p className="text-sm text-foreground-secondary">
					Posted journals cannot be deleted from this surface. The command
					remains visible and disabled so operators understand the constraint.
				</p>
			</StorySection>

			<StorySection title="Checked and radio choices">
				<div className="w-[min(720px,calc(100vw-4rem))]">
					<Menubar aria-label="View preferences">
						<MenubarMenu>
							<MenubarTrigger>View</MenubarTrigger>
							<MenubarContent>
								<MenubarCheckboxItem checked>
									Show audit details
								</MenubarCheckboxItem>
								<MenubarSeparator />
								<MenubarLabel>Density</MenubarLabel>
								<MenubarRadioGroup value="compact">
									<MenubarRadioItem value="comfortable">
										Comfortable
									</MenubarRadioItem>
									<MenubarRadioItem value="compact">Compact</MenubarRadioItem>
								</MenubarRadioGroup>
							</MenubarContent>
						</MenubarMenu>
					</Menubar>
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
					"Card owns the journal subject. Menubar owns desktop commands. StatusBadge owns lifecycle. Post stays in CardFooter — not buried as the only path inside Record.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6">
			<Card className="shadow-none">
				<CardHeader className="gap-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounting</Badge>
						<StatusBadge size="sm" status="success" label="Balanced" />
					</div>
					<CardTitle>Journal command strip</CardTitle>
					<CardDescription>
						Desktop Menubar beside primary Post action
					</CardDescription>
					<div className="w-[min(720px,calc(100vw-4rem))]">
						<JournalRecordMenubar />
					</div>
				</CardHeader>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button">Post journal</Button>
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
					"Menubar is a desktop command surface. It is not Sidebar navigation, and it must not hide the only critical posting action.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: keep Post on the page">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
					<div className="w-[min(280px,100%)]">
						<Menubar aria-label="Journal commands">
							<MenubarMenu>
								<MenubarTrigger>Record</MenubarTrigger>
								<MenubarContent>
									<MenubarItem>Open record</MenubarItem>
									<MenubarItem>Duplicate draft</MenubarItem>
									<MenubarItem disabled>Delete posted record</MenubarItem>
								</MenubarContent>
							</MenubarMenu>
						</Menubar>
					</div>
					<Button type="button" size="sm">
						Post journal
					</Button>
				</div>
			</StorySection>

			<StorySection title="Do not: bury the only critical action">
				<p className="text-sm text-foreground-secondary">
					If Post journal is the primary workflow for this surface, do not make
					Menubar the only place it appears. Keep the command visible in
					CardFooter or PageHeader actions.
				</p>
			</StorySection>

			<StorySection title="Do: disable unauthorized destructive commands">
				<p className="text-sm text-foreground-secondary">
					Delete posted record stays visible and disabled so operators learn the
					constraint without inventing a fake success path.
				</p>
			</StorySection>

			<StorySection title="Do not: use Menubar as product navigation">
				<p className="text-sm text-foreground-secondary">
					Module routing belongs in Sidebar or app chrome. Menubar groups
					commands for the current desktop workspace subject.
				</p>
			</StorySection>
		</div>
	),
};
