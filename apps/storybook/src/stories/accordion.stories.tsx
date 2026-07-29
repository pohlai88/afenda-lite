import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.accordion");

const meta = {
	title: "UI System/Accordion",
	component: Accordion,
	tags: ["autodocs", "test"],
	args: {
		type: "single",
	},
	parameters: {
		...contractDocsParameters(evidence, "Accordion"),
	},
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One supplier-onboarding workbench: Accordion reveals optional, related guidance without hiding required ERP fields, decisions, or primary actions. The disclosure owns explanation only; feature code keeps the required record and actions visible.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Supplier master data
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Onboarding guidance
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Review supporting requirements while completing the supplier
								record. Required fields and activation actions remain visible on
								the primary work surface.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Northwind Trading Sdn. Bhd.</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Area
							</dt>
							<dd className="text-sm">Supplier activation</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Focus
							</dt>
							<dd className="text-sm">Evidence guidance</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								State
							</dt>
							<dd className="text-sm">Open review</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
						<CardDescription>
							Open a topic when additional evidence guidance is required.
						</CardDescription>
					</CardHeader>

					<CardContent>
						<h2 className="sr-only">Supplier evidence topics</h2>
						<Accordion type="single" defaultValue="bank-evidence" collapsible>
							<AccordionItem value="bank-evidence">
								<AccordionTrigger>Bank evidence requirements</AccordionTrigger>

								<AccordionContent>
									Provide a bank letter issued within the previous 90 days. The
									supplier name and remittance account must match the supplier
									record.
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="tax-evidence">
								<AccordionTrigger>Tax registration evidence</AccordionTrigger>

								<AccordionContent>
									Provide the tax authority certificate matching the legal name
									and registration number recorded for this supplier.
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="document-quality">
								<AccordionTrigger>
									Document quality requirements
								</AccordionTrigger>

								<AccordionContent>
									Uploaded evidence must be readable, correctly oriented, and
									complete enough for the reviewer to verify the relevant
									details.
								</AccordionContent>
							</AccordionItem>
						</Accordion>
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
					"Use Accordion for peer sections of optional supporting information. Do not use it for required work, navigation, workflow state, or hidden validation rules.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-2xl gap-6">
			<StorySection title="Optional supporting guidance">
				<Accordion type="single" collapsible>
					<AccordionItem value="remittance">
						<AccordionTrigger>
							When is remittance advice issued?
						</AccordionTrigger>

						<AccordionContent>
							Finance contacts receive remittance advice after the payment run
							is posted and the payment reference is assigned.
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="bank-change">
						<AccordionTrigger>
							How are bank-detail changes reviewed?
						</AccordionTrigger>

						<AccordionContent>
							A bank-detail change requires supporting evidence and independent
							review before it becomes effective.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</StorySection>

			<StorySection title="Required information remains visible">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Supplier activation requirements</CardTitle>
						<CardDescription>
							Legal name, tax registration, payment terms, and verified
							remittance details stay on the page.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-sm leading-6 text-foreground-secondary">
						Accordion can add optional context, but it must not hide the only
						copy of required information or validation state.
					</CardContent>
				</Card>
			</StorySection>
		</div>
	),
};

export const DisclosureModes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Prefer single disclosure for focused operational guidance. Use multiple disclosure only when operators need simultaneous comparison, not when one section can own the answer.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<StorySection title="Single: preferred default">
				<Accordion type="single" defaultValue="name-matching" collapsible>
					<AccordionItem value="name-matching">
						<AccordionTrigger>Supplier-name matching</AccordionTrigger>

						<AccordionContent>
							The bank account holder must match the registered supplier name or
							an approved documented trading name.
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="evidence-recency">
						<AccordionTrigger>Evidence recency</AccordionTrigger>

						<AccordionContent>
							Bank evidence must have been issued within the previous 90 days at
							the time of review.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</StorySection>

			<StorySection title="Multiple: comparison exception">
				<Accordion
					type="multiple"
					defaultValue={["standard-review", "enhanced-review"]}
				>
					<AccordionItem value="standard-review">
						<AccordionTrigger>Standard review</AccordionTrigger>

						<AccordionContent>
							Verify the supplier name, bank name, account number, and evidence
							issue date.
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="enhanced-review">
						<AccordionTrigger>Enhanced review</AccordionTrigger>

						<AccordionContent>
							High-risk changes also require independent confirmation through an
							approved supplier contact.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
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
					"Triggers remain keyboard-operable buttons with descriptive labels and expanded-state semantics. Focus stays on the trigger after activation, and disabled items remain clearly unavailable.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-4">
			<p className="text-sm leading-6 text-foreground-secondary">
				Use Tab to enter the Accordion, arrow keys to move between triggers, and
				Enter or Space to expand or collapse a section.
			</p>

			<Accordion type="single" defaultValue="open-section" collapsible>
				<AccordionItem value="open-section">
					<AccordionTrigger>Open by default</AccordionTrigger>

					<AccordionContent>
						Use a default-open section only when most operators are likely to
						need its guidance immediately.
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="closed-section">
					<AccordionTrigger>Closed until requested</AccordionTrigger>

					<AccordionContent>
						Secondary explanatory detail remains collapsed until the operator
						chooses to inspect it.
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="disabled-section" disabled>
					<AccordionTrigger>Unavailable guidance</AccordionTrigger>

					<AccordionContent>
						This content is unavailable in the current record context.
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="descriptive-section">
					<AccordionTrigger>
						How are expired documents handled?
					</AccordionTrigger>

					<AccordionContent>
						Expired evidence cannot satisfy activation requirements. Request a
						current document before continuing.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	),
	play: interactionFor("accordion"),
};

export const DashboardUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"On dashboards, Accordion may explain metrics or data freshness. Critical KPIs and alerts remain visible outside collapsed content.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-2xl shadow-none">
			<CardHeader>
				<CardDescription>Accounts receivable</CardDescription>
				<CardTitle>MYR 248,320 overdue</CardTitle>
			</CardHeader>

			<CardContent className="grid gap-4">
				<p className="text-sm leading-6 text-foreground-secondary">
					Thirty-two customer invoices are past their contractual due dates.
				</p>

				<Accordion type="single" collapsible>
					<AccordionItem value="calculation">
						<AccordionTrigger>
							How is overdue value calculated?
						</AccordionTrigger>

						<AccordionContent>
							The value includes posted customer invoices with an outstanding
							balance and a due date earlier than the reporting date.
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="freshness">
						<AccordionTrigger>When was the data refreshed?</AccordionTrigger>

						<AccordionContent>
							The metric reflects successfully posted ledger activity through 28
							July 2026 at 21:45.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</CardContent>
		</Card>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Parent surfaces own record context and hierarchy. Accordion owns only the disclosure of optional supporting information, not the subject title or the workflow command.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Invoice posting guidance</CardTitle>
					<CardDescription>
						Invoice INV-1048 · Supplier invoice review
					</CardDescription>
				</CardHeader>

				<CardContent>
					<Accordion type="single" collapsible>
						<AccordionItem value="posting-effects">
							<AccordionTrigger>What changes after posting?</AccordionTrigger>

							<AccordionContent>
								Posting records MYR 18,420.00 in the ledger. Corrections must
								use the governed reversal workflow rather than editing the
								posted entry.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="approval-policy">
							<AccordionTrigger>
								Which approval policy applies?
							</AccordionTrigger>

							<AccordionContent>
								Invoices at or above MYR 10,000.00 require finance-control
								review before posting.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="effective-time">
							<AccordionTrigger>
								When does the entry become effective?
							</AccordionTrigger>

							<AccordionContent>
								The ledger entry becomes effective when posting succeeds and the
								accounting period remains open.
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</CardContent>
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
					"Accordion reveals optional supporting information. It does not own required work, navigation, workflow state, complex operational content, or validation-only instructions.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: reveal optional explanation">
				<Accordion type="single" collapsible>
					<AccordionItem value="bank-purpose">
						<AccordionTrigger>Why is bank evidence required?</AccordionTrigger>

						<AccordionContent>
							Bank evidence helps prevent payments from being directed to an
							unverified account after supplier activation.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</StorySection>

			<StorySection title="Do not: bury required work">
				<p className="text-sm leading-6 text-foreground-secondary">
					Legal name, tax registration, validation errors, acknowledgements, and
					activation actions must remain directly visible.
				</p>
			</StorySection>

			<StorySection title="Do: use descriptive triggers">
				<Accordion type="single" collapsible>
					<AccordionItem value="expired-document">
						<AccordionTrigger>
							How are expired documents handled?
						</AccordionTrigger>

						<AccordionContent>
							Request current evidence before continuing supplier activation.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</StorySection>

			<StorySection title="Do not: use vague labels">
				<p className="text-sm leading-6 text-foreground-secondary">
					Avoid labels such as “More”, “Details”, “Information”, or “Click
					here”. The trigger must identify the content being disclosed.
				</p>
			</StorySection>

			<StorySection title="Do: group peer topics">
				<Accordion type="single" collapsible>
					<AccordionItem value="payment-rules">
						<AccordionTrigger>Payment evidence rules</AccordionTrigger>

						<AccordionContent>
							Keep sections related to one subject at the same information
							hierarchy.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</StorySection>

			<StorySection title="Do not: encode workflow status">
				<p className="text-sm leading-6 text-foreground-secondary">
					Open and closed states must never mean approved, rejected, posted,
					authorized, completed, or pending.
				</p>
			</StorySection>

			<StorySection title="Do: keep content concise">
				<p className="text-sm leading-6 text-foreground-secondary">
					Use short explanations, compact lists, or supporting references that
					can be understood independently.
				</p>
			</StorySection>

			<StorySection title="Do not: hide complex operations">
				<p className="text-sm leading-6 text-foreground-secondary">
					Do not place large tables, multi-step forms, nested Accordions,
					primary actions, or complete workflows inside AccordionContent.
				</p>
			</StorySection>

			<StorySection title="Do: preserve the primary record surface">
				<p className="text-sm leading-6 text-foreground-secondary">
					Keep the governing title, required fields, and action buttons outside
					the disclosure so operators do not need to expand Accordion to finish
					the task.
				</p>
			</StorySection>

			<StorySection title="Do not: turn Accordion into a status badge">
				<p className="text-sm leading-6 text-foreground-secondary">
					Open or closed state should not imply posted, approved, blocked, or
					completed. Use the proper lifecycle component for status semantics.
				</p>
			</StorySection>
		</div>
	),
};
