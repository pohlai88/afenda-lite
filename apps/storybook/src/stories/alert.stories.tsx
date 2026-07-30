import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	AlertTriangleIcon,
	BellIcon,
	CheckCircleIcon,
	CircleAlertIcon,
	InfoIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.alert");

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
	title: "UI System/Alert",
	component: Alert,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Alert"),
	},
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Alert presents persistent ERP conditions in context. Blocking failures receive destructive treatment; guidance and successful readiness remain visually quieter.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								July period-close notices
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Alerts remain beside the affected work. They explain conditions
								and recovery without replacing workflow status, validation
								fields, or primary page actions.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Period-close notices</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Persistent alerts</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">Contextual condition</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Lifecycle
							</dt>
							<dd className="text-sm">Info · guidance · failure</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Current notice stream</CardTitle>
						<CardDescription>
							Alerts remain adjacent to the affected work and do not replace
							page status.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						<Alert variant="destructive">
							<CircleAlertIcon aria-hidden="true" />

							<AlertTitle>Posting failed for INV-1039</AlertTitle>

							<AlertDescription>
								The target ledger account is inactive. Restore the account
								before retrying the July posting batch.
							</AlertDescription>
						</Alert>
						<Alert>
							<BellIcon aria-hidden="true" />

							<AlertTitle>Period close in progress</AlertTitle>

							<AlertDescription>
								Complete the remaining controls before the close window ends at
								17:00 MYT.
							</AlertDescription>
						</Alert>
						<Alert>
							<CheckCircleIcon aria-hidden="true" />

							<AlertTitle>Ledger validation complete</AlertTitle>

							<AlertDescription>
								All July 2026 journals passed validation. Posting may proceed
								after approval.
							</AlertDescription>
						</Alert>
					</CardContent>
				</Card>
			</div>
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Alert explains persistent conditions affecting the current work. Default communicates information or readiness; destructive communicates confirmed failure or blocking harm.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Default alerts explain conditions; destructive alerts communicate confirmed blocking failure."
			id="alert-semantic-usage-title"
			title="Operational roles"
		>
			<div className="grid w-full max-w-5xl gap-4">
				<StorySection title="Default · information">
					<Alert>
						<InfoIcon aria-hidden="true" />

						<AlertTitle>Exchange rate source</AlertTitle>

						<AlertDescription>
							The invoice uses the central-bank rate published for 28 July 2026.
						</AlertDescription>
					</Alert>
				</StorySection>

				<StorySection title="Default · operational guidance">
					<Alert>
						<BellIcon aria-hidden="true" />

						<AlertTitle>Period close in progress</AlertTitle>

						<AlertDescription>
							Complete the remaining controls before the close window ends at
							17:00 MYT.
						</AlertDescription>
					</Alert>
				</StorySection>

				<StorySection title="Default · successful readiness">
					<Alert>
						<CheckCircleIcon aria-hidden="true" />

						<AlertTitle>Ledger ready for review</AlertTitle>

						<AlertDescription>
							All July 2026 journals passed validation. Posting may proceed
							after approval.
						</AlertDescription>
					</Alert>
				</StorySection>

				<StorySection title="Destructive · blocking failure">
					<Alert variant="destructive">
						<CircleAlertIcon aria-hidden="true" />

						<AlertTitle>Posting failed</AlertTitle>

						<AlertDescription>
							INV-1039 could not post because the target ledger account is
							inactive.
						</AlertDescription>
					</Alert>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const SeverityAndPriority: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Visual urgency must follow operational consequence. Do not use destructive styling merely to attract attention.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<Alert>
				<InfoIcon aria-hidden="true" />

				<AlertTitle>Reference data refreshed</AlertTitle>

				<AlertDescription>
					Currency and tax reference data were refreshed at 08:30 MYT.
				</AlertDescription>
			</Alert>

			<Alert>
				<AlertTriangleIcon aria-hidden="true" />

				<AlertTitle>Review recommended</AlertTitle>

				<AlertDescription>
					Five invoices are approaching their credit-control threshold. Posting
					is still permitted.
				</AlertDescription>
			</Alert>

			<Alert variant="destructive">
				<CircleAlertIcon aria-hidden="true" />

				<AlertTitle>Posting blocked</AlertTitle>

				<AlertDescription>
					The journal is out of balance by MYR 1,240.00 and cannot be posted.
				</AlertDescription>
			</Alert>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use role=status for non-urgent updates and role=alert only for newly surfaced conditions requiring immediate awareness. Titles and icons preserve meaning without relying on color.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<Alert role="status">
				<CheckCircleIcon aria-hidden="true" />

				<AlertTitle>Validation complete</AlertTitle>

				<AlertDescription>
					No blocking errors remain for the selected journal batch.
				</AlertDescription>
			</Alert>

			<Alert>
				<BellIcon aria-hidden="true" />

				<AlertTitle>Approval still required</AlertTitle>

				<AlertDescription>
					The batch remains ready for review but cannot post until approval is
					recorded.
				</AlertDescription>
			</Alert>

			<Alert role="alert" variant="destructive">
				<CircleAlertIcon aria-hidden="true" />

				<AlertTitle>Validation blocked</AlertTitle>

				<AlertDescription>
					Three line items fail tax-identifier checks and must be corrected
					before posting.
				</AlertDescription>
			</Alert>

			<Alert>
				<InfoIcon aria-hidden="true" />

				<AlertTitle>
					Long titles wrap without losing the relationship between the condition
					and its supporting explanation
				</AlertTitle>

				<AlertDescription>
					The Alert remains readable at constrained widths and does not require
					horizontal scrolling.
				</AlertDescription>
			</Alert>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Alert may include one contextual recovery or navigation action. The notice owns explanation; feature code owns command execution and authorization.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<Alert>
				<BellIcon aria-hidden="true" />

				<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="grid min-w-0 gap-1">
						<AlertTitle>14 overdue invoices require follow-up</AlertTitle>

						<AlertDescription>
							Receivables exceptions require collection review today.
						</AlertDescription>
					</div>

					<Button
						className="shrink-0"
						size="sm"
						type="button"
						variant="outline"
					>
						Open exceptions
					</Button>
				</div>
			</Alert>

			<Alert variant="destructive">
				<CircleAlertIcon aria-hidden="true" />

				<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="grid min-w-0 gap-1">
						<AlertTitle>Posting failed for INV-1039</AlertTitle>

						<AlertDescription>
							Restore the inactive ledger account before retrying.
						</AlertDescription>
					</div>

					<Button
						className="shrink-0"
						size="sm"
						type="button"
						variant="destructive"
					>
						Retry posting
					</Button>
				</div>
			</Alert>

			<Alert>
				<InfoIcon aria-hidden="true" />

				<div className="grid min-w-0 flex-1 gap-1">
					<AlertTitle>Supplier evidence policy</AlertTitle>

					<AlertDescription>
						Bank evidence must be issued within the previous 90 days.{" "}
						<a
							className="font-medium text-foreground underline underline-offset-4"
							href="#supplier-evidence-policy"
						>
							View policy
						</a>
					</AlertDescription>
				</div>
			</Alert>
		</div>
	),
};

export const Variants: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Alert supports the implemented default and destructive variants. Width and spacing follow the enclosing page or panel; Alert has no independent size axis.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<Alert>
				<InfoIcon aria-hidden="true" />

				<AlertTitle>Default</AlertTitle>

				<AlertDescription>
					Information, guidance, readiness, or non-blocking conditions.
				</AlertDescription>
			</Alert>

			<Alert variant="destructive">
				<CircleAlertIcon aria-hidden="true" />

				<AlertTitle>Destructive</AlertTitle>

				<AlertDescription>
					Confirmed failure or blocking harm requiring operator attention.
				</AlertDescription>
			</Alert>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use Alert for persistent conditions affecting current work. Keep titles specific, treatment proportional, and recovery actions focused.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: describe the condition clearly">
				<Alert variant="destructive">
					<CircleAlertIcon aria-hidden="true" />

					<AlertTitle>Journal is out of balance</AlertTitle>

					<AlertDescription>
						Debits exceed credits by MYR 1,240.00. Correct the journal before
						posting.
					</AlertDescription>
				</Alert>
			</StorySection>

			<StorySection title="Do not: use vague error wording">
				<div className="grid gap-2">
					<Alert variant="destructive">
						<CircleAlertIcon aria-hidden="true" />

						<AlertTitle>Something went wrong</AlertTitle>

						<AlertDescription>Please try again.</AlertDescription>
					</Alert>

					<p className="text-foreground-secondary text-sm leading-6">
						Name the failed operation, affected object, and required recovery.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: reserve destructive for blocking harm">
				<Alert variant="destructive">
					<CircleAlertIcon aria-hidden="true" />

					<AlertTitle>Posting blocked</AlertTitle>

					<AlertDescription>
						The accounting period is closed and no posting override is
						available.
					</AlertDescription>
				</Alert>
			</StorySection>

			<StorySection title="Do not: style successful work as destructive">
				<div className="grid gap-2">
					<Alert variant="destructive">
						<CheckCircleIcon aria-hidden="true" />

						<AlertTitle>Invoice approved</AlertTitle>

						<AlertDescription>
							The approval completed successfully.
						</AlertDescription>
					</Alert>

					<p className="text-foreground-secondary text-sm leading-6">
						Successful outcomes use the default treatment or quieter page
						feedback.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: include one relevant recovery action">
				<Alert variant="destructive">
					<CircleAlertIcon aria-hidden="true" />

					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="grid gap-1">
							<AlertTitle>Supplier account is inactive</AlertTitle>

							<AlertDescription>
								Reactivate the supplier account before retrying invoice posting.
							</AlertDescription>
						</div>

						<div>
							<Button size="sm" type="button" variant="destructive">
								Open supplier account
							</Button>
						</div>
					</div>
				</Alert>
			</StorySection>

			<StorySection title="Do not: add competing actions">
				<div className="grid gap-2">
					<div className="flex flex-wrap gap-2">
						<Button size="sm" type="button">
							Retry
						</Button>

						<Button size="sm" type="button">
							Ignore
						</Button>

						<Button size="sm" type="button">
							Escalate
						</Button>
					</div>

					<p className="text-foreground-secondary text-sm leading-6">
						Move complex decision sets to the owning workflow surface.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep persistent notices on the page">
				<p className="text-foreground-secondary text-sm leading-6">
					Use Alert for conditions operators must continue seeing while they
					work. Use Toast for transient acknowledgement.
				</p>
			</StorySection>

			<StorySection title="Do not: use Alert as record status">
				<p className="text-foreground-secondary text-sm leading-6">
					Posted, pending, blocked, and approved lifecycle labels belong in
					StatusBadge. Alert explains an operational condition.
				</p>
			</StorySection>
		</div>
	),
};
