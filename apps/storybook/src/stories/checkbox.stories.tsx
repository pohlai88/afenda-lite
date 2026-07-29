import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Checkbox,
	Label,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.checkbox");

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
		<section className="grid gap-4" aria-labelledby={id}>
			<div className="grid gap-1">
				<h2
					className="text-base font-semibold tracking-tight text-foreground"
					id={id}
				>
					{title}
				</h2>
				<p className="max-w-5xl text-sm leading-5 text-foreground-secondary">
					{description}
				</p>
			</div>
			{children}
		</section>
	);
}

const meta = {
	title: "UI System/Checkbox",
	component: Checkbox,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Checkbox"),
	},
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Checkbox represents an independent boolean choice or aggregate selection.
 * It does not own persistence, authorization, approval, or command execution.
 */
export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Enterprise workbench showing the three approved Checkbox roles: independent inclusion, aggregate mixed selection, and a readable locked value. Checkbox communicates selection state; feature policy owns eligibility, persistence, and authorization.",
			},
		},
	},
	play: interactionFor("checkbox"),
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounts receivable</Badge>
							<StatusBadge size="sm" status="active" label="Operational" />
						</div>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Invoice queue scope
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Checkbox is the selection primitive for independent boolean
								choices and aggregate row selection. It must remain labelled,
								keyboard operable, and understandable in high-contrast
								presentation.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Invoice queue</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Boolean selection</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Feature policy</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Checked / mixed / off</dd>
						</div>
					</dl>
				</header>

				<WorkbenchSection
					id="checkbox-filters-title"
					title="Independent inclusions"
					description="Each checked value can coexist with the others; none is exclusive."
				>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Collection filters</CardTitle>
							<CardDescription>
								Apply before listing open invoices for org-fragrant-lake
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							<Label className="flex items-center gap-2">
								<Checkbox defaultChecked />
								Include archived records
							</Label>
							<Label className="flex items-center gap-2">
								<Checkbox />
								Include overdue invoices only
							</Label>
							<Label className="flex items-center gap-2">
								<Checkbox />
								Include unapplied receipts
							</Label>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button type="button" size="sm">
								Apply filters
							</Button>
						</CardFooter>
					</Card>
				</WorkbenchSection>

				<WorkbenchSection
					id="checkbox-selection-title"
					title="Aggregate page selection"
					description="Mixed means some, but not all, selectable descendants are checked."
				>
					<Card className="shadow-none">
						<CardContent className="grid gap-3 pt-6">
							<Label className="flex items-center gap-2">
								<Checkbox checked="indeterminate" />
								Select current page
							</Label>
							<p className="text-sm text-foreground-secondary">
								3 of 12 eligible invoices are selected. The table selection
								model owns descendant state and exclusion rules.
							</p>
						</CardContent>
					</Card>
				</WorkbenchSection>

				<WorkbenchSection
					id="checkbox-locked-title"
					title="Readable locked value"
					description="Disabled communicates that the value is visible but not editable."
				>
					<Label className="flex items-center gap-2 text-foreground-secondary">
						<Checkbox disabled />
						Include locked July period (permission required)
					</Label>
				</WorkbenchSection>
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
					"Approved roles are independent boolean input, aggregate parent selection, and explicit confirmation before a separate command. Use RadioGroup for mutually exclusive choices and Switch for settings that take effect immediately.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<StorySection title="Independent boolean input">
				<div className="grid gap-3">
					<Label className="flex items-center gap-2">
						<Checkbox defaultChecked />
						Include archived records
					</Label>
					<Label className="flex items-center gap-2">
						<Checkbox />
						Include credit notes
					</Label>
				</div>
			</StorySection>

			<StorySection title="Aggregate parent selection">
				<div className="grid gap-2">
					<Label className="flex items-center gap-2">
						<Checkbox checked="indeterminate" />
						Select current page
					</Label>
					<p className="text-sm text-foreground-secondary">
						Mixed state is paired with a count or explanation of descendant
						state.
					</p>
				</div>
			</StorySection>

			<StorySection title="Confirmation before command">
				<div className="grid gap-3">
					<Label className="flex items-center gap-2">
						<Checkbox />I confirm supporting tax evidence is attached
					</Label>
					<div>
						<Button type="button" size="sm">
							Submit for posting
						</Button>
					</div>
				</div>
			</StorySection>
		</div>
	),
};

function ControlledSelectionExample() {
	const [included, setIncluded] = useState(false);

	return (
		<div className="grid max-w-md gap-3">
			<Label className="flex items-center gap-2">
				<Checkbox
					checked={included}
					onCheckedChange={(checked) => setIncluded(checked === true)}
				/>
				Include disputed invoices
			</Label>
			<p className="text-sm text-foreground-secondary" aria-live="polite">
				Current filter: {included ? "included" : "excluded"}
			</p>
		</div>
	);
}

export const ControlledSelection: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use controlled state when Checkbox participates in application state, validation, or a larger selection model. The checked value changes locally; persistence still belongs to the consuming feature.",
			},
		},
	},
	render: () => <ControlledSelectionExample />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const checkbox = canvas.getByRole("checkbox", {
			name: "Include disputed invoices",
		});

		await expect(checkbox).not.toBeChecked();
		await userEvent.click(checkbox);
		await expect(checkbox).toBeChecked();
		await expect(canvas.getByText("Current filter: included")).toBeVisible();
	},
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Checked, unchecked, mixed, disabled, invalid, and focused states remain identifiable beyond colour. Preserve the native checkbox role, visible label association, focus indication, and Space-key activation.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-4">
			<Label className="flex items-center gap-2">
				<Checkbox defaultChecked />
				Checked · include archived records
			</Label>
			<Label className="flex items-center gap-2">
				<Checkbox />
				Unchecked · include overdue invoices only
			</Label>
			<Label className="flex items-center gap-2">
				<Checkbox checked="indeterminate" />
				Mixed · select current page
			</Label>
			<Label className="flex items-center gap-2 text-foreground-secondary">
				<Checkbox disabled />
				Disabled · locked period filter
			</Label>
			<div className="grid gap-1">
				<Label className="flex items-center gap-2">
					<Checkbox aria-invalid />
					Confirmation required before apply
				</Label>
				<p className="pl-6 text-sm text-destructive">
					Confirm the evidence requirement before continuing.
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
					"Checkbox participates in normal tab order and toggles with Space. Do not replace it with a clickable container or remove its visible focus treatment.",
			},
		},
	},
	render: () => <ControlledSelectionExample />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const checkbox = canvas.getByRole("checkbox", {
			name: "Include disputed invoices",
		});

		await userEvent.tab();
		await expect(checkbox).toHaveFocus();
		await userEvent.keyboard(" ");
		await expect(checkbox).toBeChecked();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose labelled Checkboxes inside a Card that owns workflow context. Footer Buttons own apply, clear, submit, or continue commands; Checkbox owns selection only.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-5xl shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>Bulk follow-up scope</CardTitle>
						<CardDescription>
							INV queue · Northwind and Contoso customers
						</CardDescription>
					</div>
					<StatusBadge size="sm" status="pending" label="Draft selection" />
				</div>
			</CardHeader>
			<CardContent className="grid gap-3">
				<Label className="flex items-center gap-2">
					<Checkbox defaultChecked />
					Include invoices awaiting remittance
				</Label>
				<Label className="flex items-center gap-2">
					<Checkbox defaultChecked />
					Include invoices past collection target
				</Label>
				<Label className="flex items-center gap-2">
					<Checkbox />
					Include disputed invoices
				</Label>
			</CardContent>
			<CardFooter className="justify-end gap-2 border-t">
				<Button type="button" size="sm" variant="outline">
					Clear
				</Button>
				<Button type="button" size="sm">
					Continue
				</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do name the checked outcome, explain mixed selection, and keep mutation on an explicit Button. Do not use Checkbox for exclusive options, immediate settings, authorization, or hidden command execution.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: name the checked outcome">
				<Label className="flex items-center gap-2">
					<Checkbox defaultChecked />
					Include archived records
				</Label>
			</StorySection>

			<StorySection title="Do not: rely on an opaque label">
				<div className="grid gap-2">
					<Label className="flex items-center gap-2">
						<Checkbox />
						Enable
					</Label>
					<p className="text-sm text-foreground-secondary">
						The operator cannot determine what becomes enabled.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: explain mixed selection">
				<div className="grid gap-2">
					<Label className="flex items-center gap-2">
						<Checkbox checked="indeterminate" />
						Select current page
					</Label>
					<p className="text-sm text-foreground-secondary">
						3 of 12 eligible rows selected — mixed means partial.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do not: leave mixed unexplained">
				<div className="grid gap-2">
					<Checkbox checked="indeterminate" aria-label="Selection state" />
					<p className="text-sm text-foreground-secondary">
						An isolated mixed mark can look broken or unresolved.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep commands explicit">
				<div className="grid gap-3">
					<Label className="flex items-center gap-2">
						<Checkbox />
						Confirm tax evidence attached
					</Label>
					<div>
						<Button type="button" size="sm">
							Submit for posting
						</Button>
					</div>
				</div>
			</StorySection>

			<StorySection title="Do not: execute a command on check">
				<p className="text-sm text-foreground-secondary">
					Checking a box must not itself post, void, release, or approve a
					record. Use an explicit authorized action with visible outcome and
					error handling.
				</p>
			</StorySection>

			<StorySection title="Do: use RadioGroup for one-of-many">
				<p className="text-sm text-foreground-secondary">
					Payment method, approval outcome, and posting strategy are exclusive
					choices and should not be represented by independent Checkboxes.
				</p>
			</StorySection>

			<StorySection title="Do not: use disabled as authorization">
				<p className="text-sm text-foreground-secondary">
					Disabled presentation is UX guidance. Feature and server policy must
					still reject unauthorized state changes.
				</p>
			</StorySection>
		</div>
	),
};
