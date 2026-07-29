import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	DateTimePicker,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.date-time-picker");

const meta = {
	title: "UI System/Date Time Picker",
	component: DateTimePicker,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Date Time Picker"),
		docs: {
			description: {
				component:
					"DateTimePicker captures one wall-clock date and time for a named business instant. It owns labelled datetime-local entry and field feedback; feature code owns the authoritative time zone, daylight-saving policy, conversion, validation, authorization, persistence, and conflict handling.",
			},
		},
	},
} satisfies Meta<typeof DateTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One period-close schedule Card: posting instant in the organization time zone, an invalid past approval deadline, then a locked period boundary. Displayed local time is not the persisted zone.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounts receivable</Badge>
							<StatusBadge
								size="sm"
								status="pending"
								label="Close in progress"
							/>
						</div>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								July period close schedule
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Enter posting and approval instants for the organization time
								zone (MYT). Feature code owns conversion, allowed ranges, and
								persistence.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Period close schedule</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Area
							</dt>
							<dd className="text-sm">Accounts receivable</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Date-time instants with zone guidance</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								State
							</dt>
							<dd className="text-sm">Close in progress</dd>
						</div>
					</dl>
				</header>

				<section className="grid gap-3" aria-labelledby="dtp-posting-title">
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="dtp-posting-title"
						>
							Posting instant
						</h2>
						<p className="text-sm text-foreground-secondary">
							Named business instant with explicit zone guidance.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Batch posting window</CardTitle>
							<CardDescription>
								July receivables journals · org-fragrant-lake
							</CardDescription>
						</CardHeader>
						<CardContent>
							<DateTimePicker
								label="Posting date and time"
								description="Values use the organization time zone (MYT)."
								defaultValue="2026-07-28T09:30"
							/>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button type="button" size="sm">
								Schedule posting
							</Button>
						</CardFooter>
					</Card>
				</section>

				<section className="grid gap-3" aria-labelledby="dtp-deadline-title">
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="dtp-deadline-title"
						>
							Invalid deadline
						</h2>
						<p className="text-sm text-foreground-secondary">
							Entered value is preserved while validation explains the failure.
						</p>
					</div>
					<DateTimePicker
						label="Approval deadline"
						description="Must remain in the future for the open close window."
						defaultValue="2026-07-20T17:00"
						error="Deadline must be in the future."
					/>
				</section>

				<section className="grid gap-3" aria-labelledby="dtp-locked-title">
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="dtp-locked-title"
						>
							Locked period boundary
						</h2>
						<p className="text-sm text-foreground-secondary">
							Disabled remains readable when the operator cannot change the
							instant.
						</p>
					</div>
					<DateTimePicker
						label="Locked period end"
						description="June close is complete and cannot be reopened from this surface."
						defaultValue="2026-06-30T23:59"
						disabled
					/>
				</section>
			</main>
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use DateTimePicker when time-of-day is part of the domain value. State the organization time zone. Prefer DatePicker when only a calendar date is required.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<StorySection title="Posting with zone guidance">
				<DateTimePicker
					label="Posting date and time"
					description="Values use the organization time zone (MYT)."
					defaultValue="2026-07-28T09:30"
				/>
			</StorySection>

			<StorySection title="Approval deadline">
				<DateTimePicker
					label="Approval deadline"
					description="Finance-control review must complete before this instant."
					defaultValue="2026-07-28T17:00"
				/>
			</StorySection>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Date-time meaning must survive constrained ERP layouts. Labels, entered values, zone guidance, and errors wrap without being replaced by icon-only or abbreviated controls.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-8">
			<StorySection title="Narrow approval drawer">
				<div className="w-full max-w-xs rounded-xl border border-dashed border-border p-4">
					<DateTimePicker
						label="Finance-control approval deadline"
						description="Organization time zone: Asia/Kuala_Lumpur (MYT, UTC+08:00)."
						defaultValue="2026-07-28T17:00"
					/>
				</div>
			</StorySection>
			<StorySection title="Long validation consequence">
				<DateTimePicker
					label="Posting date and time"
					description="Organization time zone: Asia/Kuala_Lumpur (MYT, UTC+08:00)."
					defaultValue="2026-07-20T17:00"
					error="Choose an instant inside the currently open July posting window."
				/>
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
					"Label, description, and error associate with the datetime-local control. Invalid deadlines keep the entered value. Disabled locks remain labelled and readable.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<DateTimePicker
				label="Default posting instant"
				description="Organization time zone (MYT)."
				defaultValue="2026-07-28T09:30"
			/>
			<DateTimePicker
				label="Invalid approval deadline"
				description="Must remain in the future."
				defaultValue="2026-07-20T17:00"
				error="Deadline must be in the future."
			/>
			<DateTimePicker
				label="Disabled locked period end"
				description="June close cannot be edited."
				defaultValue="2026-06-30T23:59"
				disabled
			/>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const defaultInput = canvas.getByLabelText("Default posting instant");
		const invalidInput = canvas.getByLabelText("Invalid approval deadline");
		const disabledInput = canvas.getByLabelText("Disabled locked period end");

		await userEvent.tab();
		await expect(defaultInput).toHaveFocus();
		await userEvent.tab();
		await expect(invalidInput).toHaveFocus();
		await expect(invalidInput).toHaveAttribute("aria-invalid", "true");
		await expect(disabledInput).toBeDisabled();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose DateTimePicker inside a Card that names the workflow. StatusBadge owns close lifecycle; Button owns the schedule command.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Period close</Badge>
						<StatusBadge size="sm" status="pending" label="Awaiting schedule" />
					</div>
					<CardTitle>Finance-control approval window</CardTitle>
					<CardDescription>
						INV batch · July 2026 · organization time zone MYT
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<DateTimePicker
						label="Review opens"
						description="Operators may begin approval after this instant."
						defaultValue="2026-07-28T08:00"
					/>
					<DateTimePicker
						label="Review closes"
						description="Unapproved journals remain blocked after this instant."
						defaultValue="2026-07-28T17:00"
					/>
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" size="sm" variant="outline">
						Cancel
					</Button>
					<Button type="button" size="sm">
						Save window
					</Button>
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
					"Do label the business instant and state the time zone. Do not silently reinterpret zones, use DateTimePicker for durations, or omit zone context when posting depends on it.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: name the instant and zone">
				<DateTimePicker
					label="Posting date and time"
					description="Organization time zone (MYT)."
					defaultValue="2026-07-28T09:30"
				/>
			</StorySection>

			<StorySection title="Do not: omit zone context">
				<div className="grid gap-2">
					<DateTimePicker
						label="Posting date and time"
						defaultValue="2026-07-28T09:30"
					/>
					<p className="text-sm text-foreground-secondary">
						Without zone guidance, operators may assume browser local time
						instead of organization MYT.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep invalid values visible">
				<DateTimePicker
					label="Approval deadline"
					defaultValue="2026-07-20T17:00"
					error="Deadline must be in the future."
				/>
			</StorySection>

			<StorySection title="Do not: treat DateTimePicker as duration">
				<div className="rounded-md border border-dashed p-4 text-sm text-foreground-tertiary">
					Durations such as “30 minutes to close” belong on a dedicated duration
					control — not a date-time instant.
				</div>
			</StorySection>

			<StorySection title="Do: use DatePicker when time is unused">
				<p className="text-sm text-foreground-secondary">
					Invoice due dates without a time-of-day requirement should use
					DatePicker, not DateTimePicker.
				</p>
			</StorySection>

			<StorySection title="Do not: silently convert zones">
				<div className="rounded-md border border-dashed p-4 text-sm text-foreground-tertiary">
					Feature code must not rewrite MYT entry to UTC inside the control
					without an explicit conversion surface.
				</div>
			</StorySection>
		</div>
	),
};
