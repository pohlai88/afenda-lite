import {
	Badge,
	Button,
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	ChangeDiff,
	ChangeDiffRow,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.change-diff");

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
				<h2
					className="font-semibold text-base text-foreground tracking-tight"
					id={id}
				>
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

const CHANGE_DIFF_MATURITY_DOCTRINE =
	"ChangeDiff benchmarks enterprise operating maturity rather than another product’s appearance. It must preserve authoritative before-and-after meaning, remain understandable without colour or strike-through, adapt without losing field relationships, and keep provenance, authorization, redaction, completeness, and workflow policy in the consuming feature.";

const meta = {
	title: "UI System/Change Diff",
	component: ChangeDiff,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Change Diff"),
		docs: {
			description: {
				component: CHANGE_DIFF_MATURITY_DOCTRINE,
			},
		},
	},
} satisfies Meta<typeof ChangeDiff>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Enterprise review pattern for one supplier amendment. Material changes appear first, intentionally unchanged terms remain explicit, and posted history becomes quieter without losing meaning. ChangeDiff presents authoritative before-and-after values, preserves field relationships across responsive layouts, and never invents provenance, authority, or completeness.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Master data</Badge>
							<StatusBadge label="Awaiting review" size="sm" status="pending" />
						</div>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Supplier amendment SUP-004821
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Review labelled previous and new values from the authoritative
								change record. The surrounding workflow owns actor, timestamp,
								authorization, redaction, completeness, and approval policy.
							</p>
							<p className="max-w-5xl text-foreground-tertiary text-xs leading-5">
								Operational standard: meaning must survive keyboard-only use,
								high-contrast presentation, narrow layouts, and the absence of
								colour.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Supplier amendment review</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Area
							</dt>
							<dd className="text-sm">Master data governance</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Before-and-after field review</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								State
							</dt>
							<dd className="text-sm">Awaiting approval</dd>
						</div>
					</dl>
				</header>

				<section
					aria-labelledby="change-diff-material-title"
					className="grid gap-3"
				>
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="change-diff-material-title"
						>
							Material changes
						</h2>
						<p className="text-foreground-secondary text-sm">
							Amended fields ordered by review importance.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle id="change-diff-material-card-title">
								Legal and remittance identity
							</CardTitle>
							<CardDescription>
								Change set CS-77821 · Submitted 28 Jul 2026 09:14 MYT
							</CardDescription>
							<CardAction>
								<StatusBadge
									label="Requires review"
									size="sm"
									status="warning"
								/>
							</CardAction>
						</CardHeader>
						<CardContent>
							<ChangeDiff aria-labelledby="change-diff-material-card-title">
								<ChangeDiffRow
									after="Northwind Trading Sdn. Bhd."
									before="Northwind Trading"
									label="Supplier legal name"
								/>
								<ChangeDiffRow
									after="Banking verification complete. Use the registered Kuala Lumpur remittance address for all future settlements."
									before="Use the legacy remittance address until banking verification completes."
									label="Remittance address"
								/>
								<ChangeDiffRow
									after="C1234567890-T"
									before="C1234567890"
									label="Tax identifier"
								/>
							</ChangeDiff>
						</CardContent>
						<CardFooter className="justify-end gap-2 border-t">
							<Button size="sm" type="button" variant="outline">
								Reject amendment
							</Button>
							<Button size="sm" type="button">
								Approve amendment
							</Button>
						</CardFooter>
					</Card>
				</section>

				<section
					aria-labelledby="change-diff-unchanged-title"
					className="grid gap-3"
				>
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="change-diff-unchanged-title"
						>
							Reviewed unchanged
						</h2>
						<p className="text-foreground-secondary text-sm">
							Intentionally identical values confirm no drift on commercial
							terms.
						</p>
					</div>
					<ChangeDiff>
						<ChangeDiffRow
							after="Net 30"
							before="Net 30"
							changed={false}
							label="Payment terms"
						/>
						<ChangeDiffRow
							after="MYR"
							before="MYR"
							changed={false}
							label="Settlement currency"
						/>
					</ChangeDiff>
				</section>

				<section
					aria-labelledby="change-diff-complete-title"
					className="grid gap-3"
				>
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="change-diff-complete-title"
						>
							Posted amendment
						</h2>
						<p className="text-foreground-secondary text-sm">
							Quiet completion — values remain readable without intervention
							theatre.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Credit limit update · CUS-001104</CardTitle>
							<CardDescription>
								Posted to the commercial register at 11:02 MYT
							</CardDescription>
							<CardAction>
								<StatusBadge label="Posted" size="sm" status="success" />
							</CardAction>
						</CardHeader>
						<CardContent>
							<ChangeDiff>
								<ChangeDiffRow
									after="MYR 75,000.00"
									before="MYR 50,000.00"
									label="Credit limit"
								/>
							</ChangeDiff>
						</CardContent>
					</Card>
				</section>
			</main>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole("heading", {
				name: "Supplier amendment SUP-004821",
			}),
		).toBeVisible();
		await expect(
			canvas.getByRole("heading", { name: "Material changes" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Approve amendment" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Reject amendment" }),
		).toBeVisible();
	},
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use ChangeDiff for authoritative field review. Order rows by review importance, mark intentionally identical values with changed={false}, and keep labels stable across widths. Consumers own provenance, authorization, redaction, completeness, and workflow decisions.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<StorySection title="Amended commercial fields">
				<ChangeDiff>
					<ChangeDiffRow after="Net 30" before="Net 15" label="Payment terms" />
					<ChangeDiffRow
						after="MYR 75,000.00"
						before="MYR 50,000.00"
						label="Credit limit"
					/>
				</ChangeDiff>
			</StorySection>

			<StorySection title="Reviewed with unchanged terms">
				<ChangeDiff>
					<ChangeDiffRow
						after="SUP-004821"
						before="SUP-004821"
						changed={false}
						label="Supplier code"
					/>
					<ChangeDiffRow
						after="Northwind Trading Sdn. Bhd."
						before="Northwind Trading"
						label="Legal name"
					/>
				</ChangeDiff>
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
					"Previous and new values carry screen-reader prefixes. Missing, unchanged, and redacted values stay explicit. Meaning remains clear without colour, strike-through, hover, or pointer interaction, including high-contrast presentation.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<StorySection title="Changed, unchanged, missing, and redacted">
				<ChangeDiff>
					<ChangeDiffRow
						after="Northwind Trading Sdn. Bhd."
						before="Northwind Ops"
						label="Bank account name"
					/>
					<ChangeDiffRow
						after="Net 30"
						before="Net 30"
						changed={false}
						label="Payment terms"
					/>
					<ChangeDiffRow
						after="finance@northwind.example"
						before="Not provided"
						label="Secondary contact"
					/>
					<ChangeDiffRow
						after="•••• 4218"
						before="•••• 4218"
						changed={false}
						label="Bank account number"
					/>
				</ChangeDiff>
			</StorySection>

			<p className="max-w-5xl text-foreground-secondary text-sm">
				Labels remain visible text. Strike-through and info fill reinforce
				change but do not replace the labelled previous and new values.
			</p>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText("Bank account name")).toBeVisible();
		await expect(canvas.getByText("Not provided")).toBeVisible();
		await expect(canvas.getAllByText("•••• 4218")).toHaveLength(2);
		await expect(canvas.getByText("Payment terms")).toBeVisible();
	},
};

export const ResponsiveAndContrast: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Demonstrates that field labels and previous/new relationships remain coherent in constrained layouts and on contrasting surfaces. Layout adaptation must not reorder semantic meaning.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 lg:grid-cols-2">
			<StorySection title="Constrained review pane">
				<div className="max-w-sm rounded-lg border bg-card p-4">
					<ChangeDiff>
						<ChangeDiffRow
							after="Level 16, Northwind Tower, Kuala Lumpur"
							before="Level 8, Legacy Commerce Centre, Kuala Lumpur"
							label="Registered remittance address"
						/>
						<ChangeDiffRow
							after="MYR"
							before="MYR"
							changed={false}
							label="Settlement currency"
						/>
					</ChangeDiff>
				</div>
			</StorySection>

			<StorySection title="High-contrast-safe meaning">
				<div className="rounded-lg border bg-surface-sunken p-4">
					<ChangeDiff>
						<ChangeDiffRow
							after="MYR 75,000.00"
							before="MYR 50,000.00"
							label="Approval threshold"
						/>
						<ChangeDiffRow
							after="Finance director"
							before="Finance manager"
							label="Review route"
						/>
					</ChangeDiff>
				</div>
				<p className="text-foreground-secondary text-sm">
					Labels and explicit previous/new semantics carry the meaning; colour
					is only reinforcement.
				</p>
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
					"Compose ChangeDiff inside a persistent review context that names the amendment subject. StatusBadge owns lifecycle meaning; Button children own commands; feature policy owns who may approve, reject, or view sensitive values.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Compose ChangeDiff inside a persistent review context that names the amendment subject. StatusBadge owns lifecycle meaning; Button children own commands; feature policy owns who may approve, reject, or view sensitive values."
			id="invoice-header-amendment"
			title="Invoice header amendment · INV-1042"
		>
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Invoice header amendment · INV-1042</CardTitle>
					<CardDescription>
						Change set CS-77904 · Actor Aisha Rahman
					</CardDescription>
					<CardAction>
						<StatusBadge label="Awaiting approval" size="sm" status="pending" />
					</CardAction>
				</CardHeader>
				<CardContent>
					<ChangeDiff>
						<ChangeDiffRow
							after="30 Aug 2026"
							before="23 Aug 2026"
							label="Due date"
						/>
						<ChangeDiffRow
							after="MYR 18,420.00"
							before="MYR 18,420.00"
							changed={false}
							label="Invoice amount"
						/>
						<ChangeDiffRow
							after="Tax evidence attached. Ready for posting review."
							before="Hold for tax evidence."
							label="Internal note"
						/>
					</ChangeDiff>
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button size="sm" type="button" variant="outline">
						Reject
					</Button>
					<Button size="sm" type="button">
						Approve
					</Button>
				</CardFooter>
			</Card>
		</WorkbenchSection>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do present authoritative labelled diffs, preserve previous/new relationships, and mark reviewed-unchanged rows. Do not invent audit facts, encode authority through styling, expose unauthorized values, or present a partial comparison as a complete record.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: label changed and unchanged fields">
				<ChangeDiff>
					<ChangeDiffRow
						after="Northwind Trading Sdn. Bhd."
						before="Northwind Trading"
						label="Legal name"
					/>
					<ChangeDiffRow
						after="MYR"
						before="MYR"
						changed={false}
						label="Currency"
					/>
				</ChangeDiff>
			</StorySection>

			<StorySection title="Do not: invent provenance inside the diff">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					Actor, timestamp, and authorization belong on the surrounding Card or
					audit header — not fabricated inside ChangeDiffRow values.
				</div>
			</StorySection>

			<StorySection title="Do: keep redacted values explicit">
				<ChangeDiff>
					<ChangeDiffRow
						after="•••• 8831"
						before="•••• 4218"
						label="Bank account number"
					/>
				</ChangeDiff>
			</StorySection>

			<StorySection title="Do not: expose unauthorized secrets">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					Never render full account numbers or tokens the operator is not
					authorized to see.
				</div>
			</StorySection>

			<StorySection title="Do: state when the set is partial">
				<p className="text-foreground-secondary text-sm">
					If only commercial fields are shown, the surrounding copy must say so.
					Omitted tax fields must not imply no tax change occurred.
				</p>
			</StorySection>

			<StorySection title="Do not: present a partial set as complete">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					A three-row Diff is not an audit certificate. Completeness is
					consumer-owned.
				</div>
			</StorySection>

			<StorySection title="Do: keep authority outside presentation">
				<p className="text-foreground-secondary text-sm">
					The surrounding workflow determines whether the current operator may
					view, approve, reject, or reveal sensitive values.
				</p>
			</StorySection>

			<StorySection title="Do not: imply permission through styling">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					A highlighted row communicates review emphasis, not permission,
					approval state, or policy outcome.
				</div>
			</StorySection>
		</div>
	),
};
