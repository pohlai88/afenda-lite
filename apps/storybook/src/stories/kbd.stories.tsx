import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Kbd,
	KbdGroup,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.kbd");

type WorkbenchSectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}>;

function WorkbenchSection({
	id,
	title,
	description,
	children,
}: WorkbenchSectionProps) {
	return (
		<section aria-labelledby={id} className="grid gap-4">
			<div className="grid gap-1">
				<h2 className="font-semibold text-base tracking-tight" id={id}>
					{title}
				</h2>
				<p className="max-w-5xl text-foreground-secondary text-sm leading-5">
					{description}
				</p>
			</div>
			{children}
		</section>
	);
}

const meta = {
	title: "UI System/Keyboard Key",
	component: Kbd,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Keyboard Key"),
		docs: {
			description: {
				component:
					"Kbd and KbdGroup present keyboard shortcut notation only. Feature code owns registration, focus scope, conflict handling, platform mapping, and authorization. Shortcuts must never be the sole path to critical actions.",
			},
		},
	},
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Receivables keyboard guidance for shortcuts that are implemented in the current context. Kbd presents key notation only; feature code owns registration, focus scope, conflict handling, platform mapping, and authorization.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounts receivable</Badge>
							<StatusBadge
								label="Operator shortcuts"
								size="sm"
								status="active"
							/>
						</div>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Invoice queue · keyboard guidance
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Kbd and KbdGroup display implemented shortcuts beside labelled
								actions. Feature code owns registration, platform mapping, and
								whether a shortcut is available.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Keyboard notation</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Shortcuts only</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">Notation and grouping</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Lifecycle
							</dt>
							<dd className="text-sm">Implemented and discoverable</dd>
						</div>
					</dl>
				</header>

				<section aria-labelledby="kbd-palette-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="kbd-palette-title"
						>
							Command palette
						</h2>
						<p className="text-foreground-secondary text-sm">
							Open search without making the shortcut the only path.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Find invoices and suppliers</CardTitle>
							<CardDescription>
								Press the shortcut or use the button — both stay available.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap items-center justify-between gap-3">
							<p className="text-foreground-secondary text-sm">
								Open command palette
							</p>
							<KbdGroup aria-label="Ctrl plus K">
								<Kbd>Ctrl</Kbd>
								<span className="text-muted-foreground">+</span>
								<Kbd>K</Kbd>
							</KbdGroup>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button size="sm" type="button">
								Open palette
							</Button>
						</CardFooter>
					</Card>
				</section>

				<section aria-labelledby="kbd-row-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="kbd-row-title"
						>
							Row actions
						</h2>
						<p className="text-foreground-secondary text-sm">
							Shortcuts apply only to the focused work context and never bypass
							confirmation, authorization, or validation.
						</p>
					</div>
					<Card className="shadow-none">
						<CardContent className="grid gap-4 pt-6">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-foreground text-sm">
									Confirm selected invoice
								</p>
								<KbdGroup aria-label="Command plus Enter">
									<Kbd>⌘</Kbd>
									<span className="text-muted-foreground">+</span>
									<Kbd>Enter</Kbd>
								</KbdGroup>
							</div>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-foreground text-sm">Dismiss focus</p>
								<Kbd>Esc</Kbd>
							</div>
						</CardContent>
					</Card>
				</section>
			</div>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Use Kbd for a single key and KbdGroup for a chord or sequence that is implemented, discoverable, and available through an equivalent visible control.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Kbd labels a shortcut only when the action is implemented and discoverable through an equivalent control."
			id="kbd-usage-title"
			title="Implemented shortcut notation"
		>
			<div className="grid w-full max-w-md gap-6">
				<StorySection
					description="One key when the action uses a solitary press."
					title="Single key"
				>
					<p className="text-foreground text-sm">
						Close the drawer with <Kbd>Esc</Kbd>.
					</p>
				</StorySection>
				<StorySection
					description="Keep press order in a KbdGroup with separators."
					title="Chord sequence"
				>
					<p className="text-foreground text-sm">
						Search with{" "}
						<KbdGroup aria-label="Ctrl plus K">
							<Kbd>Ctrl</Kbd>
							<span className="text-muted-foreground">+</span>
							<Kbd>K</Kbd>
						</KbdGroup>
						.
					</p>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Kbd remains non-interactive and unfocusable. Surrounding copy explains the action, KbdGroup supplies a readable accessible name, and platform symbols never replace understandable text.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<StorySection
				description="Group carries an accessible label for the full sequence."
				title="Named chord"
			>
				<p className="text-foreground text-sm">
					Save draft{" "}
					<KbdGroup aria-label="Control plus S">
						<Kbd>Ctrl</Kbd>
						<span className="text-muted-foreground">+</span>
						<Kbd>S</Kbd>
					</KbdGroup>
				</p>
			</StorySection>
			<StorySection
				description="Symbol keys need understandable accessible text on the group."
				title="Platform symbol"
			>
				<p className="text-foreground text-sm">
					Confirm row{" "}
					<KbdGroup aria-label="Command plus Enter">
						<Kbd>⌘</Kbd>
						<span className="text-muted-foreground">+</span>
						<Kbd>Enter</Kbd>
					</KbdGroup>
				</p>
			</StorySection>
			<StorySection
				description="Surrounding sentence remains the primary instruction."
				title="Instructional context"
			>
				<p className="text-foreground-secondary text-sm">
					Press <Kbd>?</Kbd> to open the shortcut legend, or use Help in the
					toolbar if keyboard shortcuts are unavailable.
				</p>
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose Kbd beside the labelled action it accelerates. Buttons, menus, or links remain the primary path; shortcuts are supplemental and must respect the active focus context.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<CardTitle>Posting batch shortcuts</CardTitle>
				<CardDescription>
					Shortcuts mirror toolbar actions for journal batch JB-2044.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<span className="text-foreground text-sm">Review differences</span>
					<KbdGroup aria-label="Ctrl plus D">
						<Kbd>Ctrl</Kbd>
						<span className="text-muted-foreground">+</span>
						<Kbd>D</Kbd>
					</KbdGroup>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<span className="text-foreground text-sm">Post batch</span>
					<KbdGroup aria-label="Ctrl plus Enter">
						<Kbd>Ctrl</Kbd>
						<span className="text-muted-foreground">+</span>
						<Kbd>Enter</Kbd>
					</KbdGroup>
				</div>
			</CardContent>
			<CardFooter className="justify-end gap-2 border-t">
				<Button size="sm" type="button" variant="outline">
					Review differences
				</Button>
				<Button size="sm" type="button">
					Post batch
				</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Do document implemented, conflict-checked shortcuts beside an equivalent action. Do not advertise unavailable chords, hide destructive operations behind shortcuts, or treat Kbd as a control.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<StorySection
				description="Implemented shortcut with a labelled primary button."
				title="Do"
			>
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
					<div className="grid gap-1">
						<p className="font-medium text-foreground text-sm">Open palette</p>
						<p className="text-foreground-secondary text-xs">
							<KbdGroup aria-label="Ctrl plus K">
								<Kbd>Ctrl</Kbd>
								<span className="text-muted-foreground">+</span>
								<Kbd>K</Kbd>
							</KbdGroup>
						</p>
					</div>
					<Button size="sm" type="button">
						Open palette
					</Button>
				</div>
			</StorySection>
			<StorySection
				description="Do not advertise shortcuts that are not registered, or use Kbd as a click target."
				title="Do not"
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<p className="text-foreground text-sm">
						Delete forever{" "}
						<KbdGroup aria-label="Ctrl plus Shift plus Delete">
							<Kbd>Ctrl</Kbd>
							<span className="text-muted-foreground">+</span>
							<Kbd>Shift</Kbd>
							<span className="text-muted-foreground">+</span>
							<Kbd>Del</Kbd>
						</KbdGroup>
					</p>
					<p className="text-destructive text-xs">
						Unimplemented shortcut guidance and no alternate control path.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
