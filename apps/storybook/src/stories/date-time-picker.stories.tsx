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
								label="Close in progress"
								size="sm"
								status="pending"
							/>
						</div>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								July period close schedule
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Enter posting and approval instants for the organization time
								zone (MYT). Feature code owns conversion, allowed ranges, and
								persistence.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Period close schedule</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Area
							</dt>
							<dd className="text-sm">Accounts receivable</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Date-time instants with zone guidance</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								State
							</dt>
							<dd className="text-sm">Close in progress</dd>
						</div>
					</dl>
				</header>

				<section aria-labelledby="dtp-posting-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="dtp-posting-title"
						>
							Posting instant
						</h2>
						<p className="text-foreground-secondary text-sm">
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
								defaultValue="2026-07-28T09:30"
								description="Values use the organization time zone (MYT)."
								label="Posting date and time"
							/>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button size="sm" type="button">
								Schedule posting
							</Button>
						</CardFooter>
					</Card>
				</section>

				<section aria-labelledby="dtp-deadline-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="dtp-deadline-title"
						>
							Invalid deadline
						</h2>
						<p className="text-foreground-secondary text-sm">
							Entered value is preserved while validation explains the failure.
						</p>
					</div>
					<DateTimePicker
						defaultValue="2026-07-20T17:00"
						description="Must remain in the future for the open close window."
						error="Deadline must be in the future."
						label="Approval deadline"
					/>
				</section>

				<section aria-labelledby="dtp-locked-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="dtp-locked-title"
						>
							Locked period boundary
						</h2>
						<p className="text-foreground-secondary text-sm">
							Disabled remains readable when the operator cannot change the
							instant.
						</p>
					</div>
					<DateTimePicker
						defaultValue="2026-06-30T23:59"
						description="June close is complete and cannot be reopened from this surface."
						disabled
						label="Locked period end"
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
					defaultValue="2026-07-28T09:30"
					description="Values use the organization time zone (MYT)."
					label="Posting date and time"
				/>
			</StorySection>

			<StorySection title="Approval deadline">
				<DateTimePicker
					defaultValue="2026-07-28T17:00"
					description="Finance-control review must complete before this instant."
					label="Approval deadline"
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
				<div className="w-full max-w-xs rounded-xl border border-border border-dashed p-4">
					<DateTimePicker
						defaultValue="2026-07-28T17:00"
						description="Organization time zone: Asia/Kuala_Lumpur (MYT, UTC+08:00)."
						label="Finance-control approval deadline"
					/>
				</div>
			</StorySection>
			<StorySection title="Long validation consequence">
				<DateTimePicker
					defaultValue="2026-07-20T17:00"
					description="Organization time zone: Asia/Kuala_Lumpur (MYT, UTC+08:00)."
					error="Choose an instant inside the currently open July posting window."
					label="Posting date and time"
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
				defaultValue="2026-07-28T09:30"
				description="Organization time zone (MYT)."
				label="Default posting instant"
			/>
			<DateTimePicker
				defaultValue="2026-07-20T17:00"
				description="Must remain in the future."
				error="Deadline must be in the future."
				label="Invalid approval deadline"
			/>
			<DateTimePicker
				defaultValue="2026-06-30T23:59"
				description="June close cannot be edited."
				disabled
				label="Disabled locked period end"
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
						<StatusBadge label="Awaiting schedule" size="sm" status="pending" />
					</div>
					<CardTitle>Finance-control approval window</CardTitle>
					<CardDescription>
						INV batch · July 2026 · organization time zone MYT
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<DateTimePicker
						defaultValue="2026-07-28T08:00"
						description="Operators may begin approval after this instant."
						label="Review opens"
					/>
					<DateTimePicker
						defaultValue="2026-07-28T17:00"
						description="Unapproved journals remain blocked after this instant."
						label="Review closes"
					/>
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button size="sm" type="button" variant="outline">
						Cancel
					</Button>
					<Button size="sm" type="button">
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
					defaultValue="2026-07-28T09:30"
					description="Organization time zone (MYT)."
					label="Posting date and time"
				/>
			</StorySection>

			<StorySection title="Do not: omit zone context">
				<div className="grid gap-2">
					<DateTimePicker
						defaultValue="2026-07-28T09:30"
						label="Posting date and time"
					/>
					<p className="text-foreground-secondary text-sm">
						Without zone guidance, operators may assume browser local time
						instead of organization MYT.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep invalid values visible">
				<DateTimePicker
					defaultValue="2026-07-20T17:00"
					error="Deadline must be in the future."
					label="Approval deadline"
				/>
			</StorySection>

			<StorySection title="Do not: treat DateTimePicker as duration">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					Durations such as “30 minutes to close” belong on a dedicated duration
					control — not a date-time instant.
				</div>
			</StorySection>

			<StorySection title="Do: use DatePicker when time is unused">
				<p className="text-foreground-secondary text-sm">
					Invoice due dates without a time-of-day requirement should use
					DatePicker, not DateTimePicker.
				</p>
			</StorySection>

			<StorySection title="Do not: silently convert zones">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					Feature code must not rewrite MYT entry to UTC inside the control
					without an explicit conversion surface.
				</div>
			</StorySection>
		</div>
	),
};
