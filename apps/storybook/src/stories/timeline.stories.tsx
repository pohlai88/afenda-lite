import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	StatusBadge,
	Timeline,
	TimelineEntry,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckIcon, FileClockIcon } from "lucide-react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.timeline");

const meta = {
	title: "UI System/Timeline",
	component: Timeline,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Timeline"),
	},
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One invoice audit Card: chronological operator events with actor detail. Timeline owns layout — not provenance, completeness, or legal validity.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounts receivable</Badge>
						<StatusBadge label="Audit trail" size="sm" status="active" />
					</div>
					<h1 className="font-semibold text-2xl tracking-tight">
						Invoice INV-1048 · activity
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Timeline presents chronological events. Feature code owns ordering
						policy, redaction, and whether the history is complete.
					</p>
				</header>

				<section aria-labelledby="timeline-audit-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="timeline-audit-title"
						>
							Operator events
						</h2>
						<p className="text-foreground-secondary text-sm">
							Newest first from authoritative timestamps (Asia/Kuala_Lumpur).
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>INV-1048 audit timeline</CardTitle>
							<CardDescription>
								Chronological operator events for finance-control review
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Timeline>
								<TimelineEntry
									description="Aisha Rahman approved INV-1048 for posting."
									icon={<CheckIcon className="size-3" />}
									timestamp="09:42"
									title="Invoice approved"
								/>
								<TimelineEntry
									description="invoice-1048.pdf was added to the record."
									icon={<FileClockIcon className="size-3" />}
									timestamp="09:18"
									title="Evidence attached"
								/>
								<TimelineEntry
									description="Created from purchase order PO-8841 with a deliberately longer audit description that remains readable on narrow screens."
									timestamp="Yesterday"
									title="Draft created"
								/>
							</Timeline>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button size="sm" type="button" variant="outline">
								Export audit CSV
							</Button>
						</CardFooter>
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
					"Approved Timeline job: chronological events with title, time, and supporting detail. Order from authoritative timestamps.",
			},
		},
	},
	render: () => (
		<div className="w-full max-w-md">
			<Timeline>
				<TimelineEntry
					description="Advice REM-0718 emailed to finance@northwind.example."
					timestamp="14:05"
					title="Remittance sent"
				/>
				<TimelineEntry
					description="USD 1,250.00 allocated to INV-8841."
					timestamp="13:40"
					title="Allocation confirmed"
				/>
			</Timeline>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Events with and without icons. Actor, time, and action stay in reading order — marker shape is not the only distinction.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<StorySection
				description="Optional icons remain decorative; titles carry meaning."
				title="With markers"
			>
				<Timeline>
					<TimelineEntry
						description="Journal batch JB-2044 posted."
						icon={<CheckIcon className="size-3" />}
						timestamp="10:00"
						title="Posted"
					/>
					<TimelineEntry
						description="Differences accepted by controller."
						icon={<FileClockIcon className="size-3" />}
						timestamp="09:30"
						title="Reviewed"
					/>
				</Timeline>
			</StorySection>
			<StorySection
				description="Default bullet when no icon is supplied."
				title="Text-only markers"
			>
				<Timeline>
					<TimelineEntry
						description="Statement line matched automatically."
						timestamp="08:00"
						title="Imported from bank"
					/>
				</Timeline>
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose Timeline inside a Card detail panel. Filtering and export stay on the footer — do not present a filtered history as complete without explanation.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<CardTitle>Posting batch JB-2044</CardTitle>
				<CardDescription>
					Showing operator events only · system imports hidden by filter
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Timeline>
					<TimelineEntry
						description="Aisha Rahman posted 14 journal lines."
						icon={<CheckIcon className="size-3" />}
						timestamp="11:12"
						title="Batch posted"
					/>
					<TimelineEntry
						description="Variance under materiality threshold accepted."
						timestamp="10:58"
						title="Differences reviewed"
					/>
					<TimelineEntry
						description="Prepared from receivables run REC-2026-07."
						timestamp="10:20"
						title="Batch prepared"
					/>
				</Timeline>
			</CardContent>
			<CardFooter className="justify-end gap-2 border-t">
				<Button size="sm" type="button" variant="outline">
					Show all events
				</Button>
				<Button size="sm" type="button">
					Export
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
					"Do: authoritative chronological events with clear wording. Do not: fabricate missing audit facts or expose redacted actors.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<StorySection
				description="Immutable audit wording with actor and time."
				title="Do"
			>
				<Timeline>
					<TimelineEntry
						description="Aisha Rahman approved INV-1048 for posting."
						timestamp="09:42"
						title="Invoice approved"
					/>
				</Timeline>
			</StorySection>
			<StorySection
				description="Do not invent events the audit store did not record."
				title="Do not"
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<Timeline>
						<TimelineEntry
							description="Assumed approval because status is open."
							timestamp="Unknown"
							title="Probably approved"
						/>
					</Timeline>
					<p className="text-destructive text-xs">
						Guessed chronology is not an audit trail.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
