import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	DatePicker,
	DateRangePicker,
	FormField,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const ignoreDateChange = () => undefined;

const evidence = contractEvidence("ui.date-picker");

/** Fixed July 2026 surface for stable visual and docs evidence. */
const periodCloseDate = new Date(2026, 6, 28);
const rangeStart = new Date(2026, 6, 28);
const rangeEnd = new Date(2026, 7, 4);

const meta = {
	title: "UI System/Date Picker",
	component: DatePicker,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Date Picker"),
		docs: {
			description: {
				component:
					"DatePicker and DateRangePicker capture calendar-day values through labelled popover controls. They own selection mechanics and display formatting; feature code owns calendar policy, locale, time-zone interpretation, disabled-day rules, validation, authorization, persistence, and inclusive-range semantics.",
			},
		},
	},
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One period-close workbench: DatePicker captures the posting cut-off inside a labelled FormField. DateRangePicker covers the collection window. Date-time instants stay on DateTimePicker.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								July period close dates
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								DatePicker composes labelled single-date and range selection
								with calendar disclosure. Feature code owns availability, time
								zone, and validation — visible days are not eligibility.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Period close dates</dd>
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
							<dd className="text-sm">Single and range selection</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								State
							</dt>
							<dd className="text-sm">July 2026 close</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>Posting and collection dates</CardTitle>
								<CardDescription>
									July 2026 receivables · org-fragrant-lake
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Period close</Badge>
								<StatusBadge label="Awaiting confirmation" status="pending" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="grid gap-6 sm:grid-cols-2">
						<FormField
							description="Single calendar date for the July batch."
							label="Posting cut-off"
							required
						>
							<DatePicker
								id="overview-cutoff"
								onChange={ignoreDateChange}
								placeholder="Select cut-off date"
								value={periodCloseDate}
							/>
						</FormField>
						<FormField
							description="Inclusive from/to range for follow-up."
							label="Collection window"
						>
							<DateRangePicker
								id="overview-window"
								onChange={ignoreDateChange}
								placeholder="Select collection window"
								value={{ from: rangeStart, to: rangeEnd }}
							/>
						</FormField>
					</CardContent>
				</Card>
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
					"Approved roles: single posting/due date via DatePicker, inclusive window via DateRangePicker. Pair both with FormField labels.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Single posting cut-off">
				<FormField label="Posting cut-off" required>
					<DatePicker
						id="semantic-cutoff"
						onChange={ignoreDateChange}
						value={periodCloseDate}
					/>
				</FormField>
			</StorySection>
			<StorySection title="Inclusive collection window">
				<FormField label="Collection window">
					<DateRangePicker
						id="semantic-window"
						onChange={ignoreDateChange}
						value={{ from: rangeStart, to: rangeEnd }}
					/>
				</FormField>
			</StorySection>
			<StorySection title="Invoice due date">
				<FormField
					description="Displayed as a calendar date — not an instant."
					label="Due date"
				>
					<DatePicker
						id="semantic-due"
						onChange={ignoreDateChange}
						placeholder="Select due date"
						value={periodCloseDate}
					/>
				</FormField>
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
					"Bind value and onChange from feature state. Keep placeholders short and domain-specific when the empty state needs context.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-3">
			<FormField label="Invoice due date" required>
				<DatePicker
					id="usage-due"
					onChange={ignoreDateChange}
					placeholder="Select due date"
					value={periodCloseDate}
				/>
			</FormField>
			<p className="text-foreground-secondary text-sm">
				Locale and week-start stay with the feature. The control formats the
				selected day for display only.
			</p>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Calendar-day meaning remains explicit in narrow drawers and dense forms. Field labels and complete selected ranges wrap; the trigger must not collapse into an unexplained calendar icon.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-8">
			<StorySection title="Narrow invoice drawer">
				<div className="w-full max-w-xs rounded-xl border border-border border-dashed p-4">
					<FormField
						description="Calendar date under the supplier payment terms."
						label="Contractual payment due date"
					>
						<DatePicker
							id="adaptive-due"
							onChange={ignoreDateChange}
							value={periodCloseDate}
						/>
					</FormField>
				</div>
			</StorySection>
			<StorySection title="Range inside a constrained filter panel">
				<div className="w-full max-w-sm">
					<FormField
						description="Both boundary dates remain visible and independently validated."
						label="Inclusive collection follow-up window"
					>
						<DateRangePicker
							id="adaptive-range"
							onChange={ignoreDateChange}
							value={{ from: rangeStart, to: rangeEnd }}
						/>
					</FormField>
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
					"Empty shows the placeholder. Disabled blocks interaction. Invalid associates FormField error with the trigger. Partial ranges keep from without inventing to.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<FormField
				description="No value yet — placeholder remains."
				label="Due date"
			>
				<DatePicker
					id="a11y-empty"
					onChange={ignoreDateChange}
					placeholder="Select due date"
				/>
			</FormField>
			<FormField description="Ready for selection." label="Due date">
				<DatePicker
					id="a11y-ready"
					onChange={ignoreDateChange}
					value={periodCloseDate}
				/>
			</FormField>
			<FormField
				description="Selection locked by policy."
				label="Closed period"
			>
				<DatePicker
					disabled
					id="a11y-disabled"
					onChange={ignoreDateChange}
					value={periodCloseDate}
				/>
			</FormField>
			<FormField
				error="Enter a cut-off date within the open ledger window."
				label="Cut-off date"
			>
				<DatePicker
					onChange={ignoreDateChange}
					placeholder="Select cut-off date"
				/>
			</FormField>
			<FormField
				description="Partial range — from selected, to still open."
				label="Collection window"
			>
				<DateRangePicker
					id="a11y-partial"
					onChange={ignoreDateChange}
					placeholder="Select collection window"
					value={{ from: rangeStart }}
				/>
			</FormField>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const [emptyTrigger] = canvas.getAllByLabelText("Due date", {
			selector: "button",
		});
		if (!emptyTrigger) {
			throw new Error("Expected the empty due-date trigger.");
		}
		const disabledTrigger = canvas.getByLabelText("Closed period", {
			selector: "button",
		});

		emptyTrigger.focus();
		await expect(emptyTrigger).toHaveFocus();
		await userEvent.tab();
		await expect(disabledTrigger).toBeDisabled();
	},
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Family inventory: DatePicker (single) and DateRangePicker (inclusive range). Neither exposes a size scale — denseness comes from FormField and layout width.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					DatePicker
				</p>
				<FormField label="Single date">
					<DatePicker
						id="variant-single"
						onChange={ignoreDateChange}
						value={periodCloseDate}
					/>
				</FormField>
			</div>
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					DateRangePicker
				</p>
				<FormField label="Date range">
					<DateRangePicker
						id="variant-range"
						onChange={ignoreDateChange}
						value={{ from: rangeStart, to: rangeEnd }}
					/>
				</FormField>
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
					"Compose DatePicker and DateRangePicker in a supplier invoice Card with StatusBadge for lifecycle. Taxonomy stays on Badge.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>INV-1048 dates</CardTitle>
						<CardDescription>Northwind Trading · remittance</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Finance</Badge>
						<StatusBadge label="Awaiting approval" status="pending" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				<FormField label="Invoice date" required>
					<DatePicker
						id="composition-invoice"
						onChange={ignoreDateChange}
						value={periodCloseDate}
					/>
				</FormField>
				<FormField label="Collection window">
					<DateRangePicker
						id="composition-window"
						onChange={ignoreDateChange}
						value={{ from: rangeStart, to: rangeEnd }}
					/>
				</FormField>
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
					"Do label pickers and use DateRangePicker for windows. Do not use DatePicker for date-time instants or treat enabled cells as authorization.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: label every date control">
				<FormField label="Posting cut-off" required>
					<DatePicker
						id="do-label"
						onChange={ignoreDateChange}
						value={periodCloseDate}
					/>
				</FormField>
			</StorySection>

			<StorySection title="Do not: leave an unlabeled trigger">
				<div className="grid gap-2">
					<DatePicker onChange={ignoreDateChange} value={periodCloseDate} />
					<p className="text-foreground-secondary text-sm">
						Without a FormField label, operators cannot tell what the date
						governs.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: use DateRangePicker for inclusive windows">
				<FormField label="Collection window">
					<DateRangePicker
						id="do-range"
						onChange={ignoreDateChange}
						value={{ from: rangeStart, to: rangeEnd }}
					/>
				</FormField>
			</StorySection>

			<StorySection title="Do not: use DatePicker for date-time instants">
				<p className="text-foreground-secondary text-sm">
					Posting timestamps and scheduled run instants belong on
					DateTimePicker. DatePicker only selects a calendar day.
				</p>
			</StorySection>

			<StorySection title="Do: keep Calendar for embedded panels">
				<p className="text-foreground-secondary text-sm">
					When the layout needs an always-visible grid without field chrome, use
					Calendar. Prefer DatePicker when operators need a labelled trigger and
					popover.
				</p>
			</StorySection>

			<StorySection title="Do not: silently complete a partial range">
				<p className="text-foreground-secondary text-sm">
					If only from is selected, keep the trigger showing the open range.
					Feature validation rejects incomplete windows — the control must not
					invent to.
				</p>
			</StorySection>

			<StorySection title="Do not: infer eligibility from enabled days">
				<p className="text-foreground-secondary text-sm">
					Closed ledgers and policy windows are validated in feature Actions.
					Calendar cells do not authorize posting.
				</p>
			</StorySection>
		</div>
	),
};
