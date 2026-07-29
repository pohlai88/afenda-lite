import {
	Badge,
	Calendar,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.calendar");

/** Fixed dates keep visual, interaction, and documentation evidence deterministic. */
const periodMonth = new Date(2026, 6, 1);
const periodCloseDate = new Date(2026, 6, 28);
const rangeStart = new Date(2026, 6, 28);
const rangeEnd = new Date(2026, 7, 4);
const closedLedgerDay = new Date(2026, 6, 15);
const finalPostingDay = new Date(2026, 6, 31);

const meta = {
	title: "UI System/Calendar",
	component: Calendar,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Calendar"),
	},
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledPostingCalendar() {
	const [selected, setSelected] = useState<Date | undefined>(periodCloseDate);

	return (
		<div className="grid gap-4">
			<div className="grid gap-1">
				<p
					className="text-sm font-medium text-foreground"
					id="controlled-label"
				>
					Posting cut-off date
				</p>
				<p className="text-sm text-foreground-secondary" id="controlled-help">
					Choose an open ledger day on or before 31 July 2026.
				</p>
			</div>
			<Calendar
				mode="single"
				defaultMonth={periodMonth}
				selected={selected}
				onSelect={setSelected}
				disabled={[closedLedgerDay, { after: finalPostingDay }]}
				aria-labelledby="controlled-label"
				aria-describedby="controlled-help"
			/>
			<p className="text-sm text-foreground-secondary" aria-live="polite">
				Selected:{" "}
				{selected?.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				}) ?? "No date"}
			</p>
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
					"ERP benchmark: a role-specific period-close task with persistent context, explicit selection meaning, policy-disabled dates, keyboard-operable day controls, and stable high-contrast semantics. Afenda retains its own visual language rather than imitating another enterprise system.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounts receivable · Period close
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Confirm July posting cut-off
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Calendar is the embedded date-grid primitive for governed
						scheduling. Its surrounding workflow must explain the operator role,
						business meaning, eligibility rules, and resulting action. Use
						DatePicker when the same selection belongs in form-field chrome.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>Posting cut-off date</CardTitle>
								<CardDescription>
									July 2026 receivables · org-fragrant-lake
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Period close</Badge>
								<StatusBadge status="pending" label="Awaiting confirmation" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="grid gap-4">
						<p className="text-sm text-foreground-secondary" id="cutoff-label">
							Select the final posting date for this close cycle. Closed ledger
							days and dates outside the permitted period remain unavailable.
						</p>
						<Calendar
							mode="single"
							month={periodMonth}
							defaultMonth={periodMonth}
							selected={periodCloseDate}
							disabled={[closedLedgerDay, { after: finalPostingDay }]}
							aria-labelledby="cutoff-label"
						/>
						<div className="grid gap-1 border-t pt-4 text-sm text-foreground-secondary">
							<p>
								<strong className="font-medium text-foreground">
									Selected:
								</strong>{" "}
								28 July 2026
							</p>
							<p>
								Final authorization and date validation remain feature and
								server responsibilities.
							</p>
						</div>
					</CardContent>
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
					"Approved ERP roles: choose one operational date, choose an inclusive date range, or communicate policy-unavailable dates. Selection mode must match the consuming workflow's domain meaning.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-3">
			<StorySection title="Single operational date">
				<div className="grid gap-2">
					<p className="text-sm text-foreground-secondary" id="single-label">
						Posting cut-off
					</p>
					<Calendar
						mode="single"
						defaultMonth={periodMonth}
						selected={periodCloseDate}
						aria-labelledby="single-label"
					/>
				</div>
			</StorySection>

			<StorySection title="Inclusive reporting range">
				<div className="grid gap-2">
					<p className="text-sm text-foreground-secondary" id="range-label">
						Collection follow-up window
					</p>
					<Calendar
						mode="range"
						defaultMonth={periodMonth}
						selected={{ from: rangeStart, to: rangeEnd }}
						aria-labelledby="range-label"
					/>
				</div>
			</StorySection>

			<StorySection title="Policy-unavailable date">
				<div className="grid gap-2">
					<p className="text-sm text-foreground-secondary" id="disabled-label">
						15 July is closed in the ledger and cannot be selected.
					</p>
					<Calendar
						mode="single"
						defaultMonth={periodMonth}
						selected={periodCloseDate}
						disabled={closedLedgerDay}
						aria-labelledby="disabled-label"
					/>
				</div>
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
					"Calendar exposes selection modes, not visual variants or sizes. Density comes from the surrounding layout; do not invent a Calendar size scale to solve page-composition problems.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
			<div className="grid gap-3">
				<div className="grid gap-1">
					<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
						mode=single
					</p>
					<p className="text-sm text-foreground-secondary">
						Use when one date becomes the authoritative operational value.
					</p>
				</div>
				<Calendar
					mode="single"
					defaultMonth={periodMonth}
					selected={periodCloseDate}
					aria-label="Single posting date"
				/>
			</div>

			<div className="grid gap-3">
				<div className="grid gap-1">
					<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
						mode=range
					</p>
					<p className="text-sm text-foreground-secondary">
						Use when both boundaries are meaningful and inclusive.
					</p>
				</div>
				<Calendar
					mode="range"
					defaultMonth={periodMonth}
					selected={{ from: rangeStart, to: rangeEnd }}
					aria-label="Inclusive collection range"
				/>
			</div>
		</div>
	),
};

export const ControlledSelection: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use controlled selection when the surrounding workflow must react immediately to the chosen date. Keep business rules explicit through disabled matchers and retain server-side validation.",
			},
		},
	},
	render: () => (
		<div className="w-full max-w-md">
			<ControlledPostingCalendar />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const nextDate = canvas.getByRole("button", { name: /July 29/i });

		await userEvent.click(nextDate);

		await expect(nextDate.closest("td")).toHaveAttribute(
			"aria-selected",
			"true",
		);
		await expect(canvas.getByText("Selected: July 29, 2026")).toBeVisible();
	},
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Selected, current, focused, outside-month, and disabled days must remain distinguishable without relying on color alone. Preserve DayPicker roles, names, focus behavior, and disabled semantics.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-2xl gap-5">
			<div className="grid gap-1">
				<p className="text-sm font-medium text-foreground" id="a11y-label">
					Period close cut-off
				</p>
				<p className="text-sm text-foreground-secondary" id="a11y-help">
					Closed ledger days and dates after the posting boundary are
					unavailable.
				</p>
			</div>
			<Calendar
				mode="single"
				defaultMonth={periodMonth}
				selected={periodCloseDate}
				disabled={[closedLedgerDay, { after: finalPostingDay }]}
				aria-labelledby="a11y-label"
				aria-describedby="a11y-help"
			/>
			<div className="grid gap-2 border-t pt-4 text-sm text-foreground-secondary">
				<p>
					<strong className="font-medium text-foreground">Keyboard:</strong> Tab
					enters the calendar controls; arrow keys move through the day grid;
					Enter or Space selects an eligible date.
				</p>
				<p>
					<strong className="font-medium text-foreground">Contrast:</strong>{" "}
					selected, focused, and disabled states require shape, border, text, or
					semantic differences in addition to color.
				</p>
			</div>
		</div>
	),
};

export const KeyboardOperation: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Interaction evidence confirms that eligible day buttons remain keyboard reachable and selectable. Do not replace semantic day buttons with decorative elements or intercept navigation keys in feature code.",
			},
		},
	},
	render: () => (
		<div className="w-full max-w-md">
			<ControlledPostingCalendar />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const selectedDate = canvas.getByRole("button", {
			name: /July 28/i,
		});

		selectedDate.focus();
		await expect(selectedDate).toHaveFocus();

		await userEvent.keyboard("{ArrowRight}");
		const nextDate = canvas.getByRole("button", {
			name: /July 29/i,
		});
		await expect(nextDate).toHaveFocus();

		await userEvent.keyboard("{Enter}");
		await expect(nextDate.closest("td")).toHaveAttribute(
			"aria-selected",
			"true",
		);
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose Calendar with persistent task context, taxonomy, and lifecycle status. Calendar owns date interaction only; surrounding components explain what the date governs and what happens next.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>Collection window</CardTitle>
						<CardDescription>
							INV-1048 · Northwind Trading remittance
						</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Finance</Badge>
						<StatusBadge status="pending" label="Awaiting approval" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				<p className="text-sm text-foreground-secondary" id="composition-label">
					Select the inclusive dates used by the collection follow-up queue.
				</p>
				<Calendar
					mode="range"
					defaultMonth={periodMonth}
					selected={{ from: rangeStart, to: rangeEnd }}
					aria-labelledby="composition-label"
				/>
				<p className="border-t pt-4 text-sm text-foreground-secondary">
					The approval state belongs to the workflow. The selected dates remain
					plain scheduling data until the feature validates and submits them.
				</p>
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
					"Approved guidance for ERP use: label the operational meaning, expose policy constraints, preserve semantic interaction, and keep authorization and persistence outside the primitive.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: preserve operational context">
				<div className="grid gap-2">
					<p
						className="text-sm text-foreground-secondary"
						id="do-context-label"
					>
						Posting cut-off date for July receivables
					</p>
					<Calendar
						mode="single"
						defaultMonth={periodMonth}
						selected={periodCloseDate}
						aria-labelledby="do-context-label"
					/>
				</div>
			</StorySection>

			<StorySection title="Do not: present an unexplained date grid">
				<p className="text-sm text-foreground-secondary">
					An operator must not have to infer whether the grid controls posting,
					delivery, reporting, leave, or another business event.
				</p>
			</StorySection>

			<StorySection title="Do: derive unavailable days from policy">
				<Calendar
					mode="single"
					defaultMonth={periodMonth}
					selected={periodCloseDate}
					disabled={[closedLedgerDay, { after: finalPostingDay }]}
					aria-label="Posting calendar with policy-unavailable dates"
				/>
			</StorySection>

			<StorySection title="Do not: treat disabled styling as enforcement">
				<p className="text-sm text-foreground-secondary">
					Disabled dates guide interaction. Commands and server-side handlers
					must still reject unauthorized, stale, or otherwise invalid dates.
				</p>
			</StorySection>

			<StorySection title="Do: use DatePicker for form-field chrome">
				<p className="text-sm text-foreground-secondary">
					Use Calendar for embedded scheduling surfaces. Use DatePicker when the
					workflow needs a text value, trigger, popover, validation message, and
					standard form-field relationship.
				</p>
			</StorySection>

			<StorySection title="Do not: infer locale or persistence rules">
				<p className="text-sm text-foreground-secondary">
					Feature code owns locale, week start, time zone, date serialization,
					and boundary conversion. Calendar presents and selects civil dates.
				</p>
			</StorySection>

			<StorySection title="Do: keep focus and state visible">
				<p className="text-sm text-foreground-secondary">
					Focused, selected, today, outside-month, and disabled days must remain
					distinguishable in default, dark, and high-contrast themes.
				</p>
			</StorySection>

			<StorySection title="Do not: override day-button semantics">
				<p className="text-sm text-foreground-secondary">
					Do not replace day buttons with decorative spans, remove accessible
					names, suppress focus rings, or intercept arrow-key navigation.
				</p>
			</StorySection>
		</div>
	),
};
