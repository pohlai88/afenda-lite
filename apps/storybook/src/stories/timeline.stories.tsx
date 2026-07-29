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
						<StatusBadge size="sm" status="active" label="Audit trail" />
					</div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Invoice INV-1048 · activity
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Timeline presents chronological events. Feature code owns ordering
						policy, redaction, and whether the history is complete.
					</p>
				</header>

				<section className="grid gap-3" aria-labelledby="timeline-audit-title">
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="timeline-audit-title"
						>
							Operator events
						</h2>
						<p className="text-sm text-foreground-secondary">
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
									title="Invoice approved"
									timestamp="09:42"
									description="Aisha Rahman approved INV-1048 for posting."
									icon={<CheckIcon className="size-3" />}
								/>
								<TimelineEntry
									title="Evidence attached"
									timestamp="09:18"
									description="invoice-1048.pdf was added to the record."
									icon={<FileClockIcon className="size-3" />}
								/>
								<TimelineEntry
									title="Draft created"
									timestamp="Yesterday"
									description="Created from purchase order PO-8841 with a deliberately longer audit description that remains readable on narrow screens."
								/>
							</Timeline>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button type="button" size="sm" variant="outline">
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
					title="Remittance sent"
					timestamp="14:05"
					description="Advice REM-0718 emailed to finance@northwind.example."
				/>
				<TimelineEntry
					title="Allocation confirmed"
					timestamp="13:40"
					description="USD 1,250.00 allocated to INV-8841."
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
				title="With markers"
				description="Optional icons remain decorative; titles carry meaning."
			>
				<Timeline>
					<TimelineEntry
						title="Posted"
						timestamp="10:00"
						description="Journal batch JB-2044 posted."
						icon={<CheckIcon className="size-3" />}
					/>
					<TimelineEntry
						title="Reviewed"
						timestamp="09:30"
						description="Differences accepted by controller."
						icon={<FileClockIcon className="size-3" />}
					/>
				</Timeline>
			</StorySection>
			<StorySection
				title="Text-only markers"
				description="Default bullet when no icon is supplied."
			>
				<Timeline>
					<TimelineEntry
						title="Imported from bank"
						timestamp="08:00"
						description="Statement line matched automatically."
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
						title="Batch posted"
						timestamp="11:12"
						description="Aisha Rahman posted 14 journal lines."
						icon={<CheckIcon className="size-3" />}
					/>
					<TimelineEntry
						title="Differences reviewed"
						timestamp="10:58"
						description="Variance under materiality threshold accepted."
					/>
					<TimelineEntry
						title="Batch prepared"
						timestamp="10:20"
						description="Prepared from receivables run REC-2026-07."
					/>
				</Timeline>
			</CardContent>
			<CardFooter className="justify-end gap-2 border-t">
				<Button type="button" variant="outline" size="sm">
					Show all events
				</Button>
				<Button type="button" size="sm">
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
				title="Do"
				description="Immutable audit wording with actor and time."
			>
				<Timeline>
					<TimelineEntry
						title="Invoice approved"
						timestamp="09:42"
						description="Aisha Rahman approved INV-1048 for posting."
					/>
				</Timeline>
			</StorySection>
			<StorySection
				title="Do not"
				description="Do not invent events the audit store did not record."
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<Timeline>
						<TimelineEntry
							title="Probably approved"
							timestamp="Unknown"
							description="Assumed approval because status is open."
						/>
					</Timeline>
					<p className="text-xs text-destructive">
						Guessed chronology is not an audit trail.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
