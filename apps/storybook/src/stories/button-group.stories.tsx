import {
	Badge,
	Button,
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.button-group");

type WorkbenchSectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: React.ReactNode;
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
	title: "UI System/Button Group",
	component: ButtonGroup,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Button Group"),
		docs: {
			description: {
				component:
					"ButtonGroup is an enterprise action-composition primitive. It visually and semantically binds a small set of directly related controls that act on the same subject. It owns grouping, orientation, connected geometry, separators, and adjacent context. Child Buttons retain their own labels, variants, disabled or pending state, keyboard focus, authorization, confirmation, and command behavior. ButtonGroup is not a toolbar, bulk-action surface, navigation bar, or authorization boundary.",
			},
		},
	},
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Reference ERP composition: one named decision group, one record in focus, stable action wording, visible lifecycle state, and no unrelated page commands. The group remains understandable at normal, narrow, keyboard-only, and high-contrast presentation modes.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Invoice approval
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								ButtonGroup makes the relationship between peer commands
								explicit. It does not decide whether an action is permitted,
								destructive, pending, or confirmed.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">INV-1048</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Record
							</dt>
							<dd className="text-sm">Northwind Trading Sdn. Bhd.</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Amount
							</dt>
							<dd className="text-sm">MYR 18,420.00</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								State
							</dt>
							<dd className="text-sm">Awaiting approval</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>INV-1048</CardTitle>
								<CardDescription>
									Northwind Trading Sdn. Bhd. · MYR 18,420.00 · due 15 Aug 2026
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Malaysia</Badge>
								<StatusBadge status="pending" label="Awaiting approval" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="grid gap-5">
						<div className="grid gap-1 text-sm">
							<p className="font-medium text-foreground">Decision context</p>
							<p className="text-foreground-secondary">
								Remittance owner: Aisha Rahman · July 2026 receivables batch
							</p>
						</div>

						<ButtonGroup aria-label="Invoice approval decision">
							<Button type="button">Approve invoice</Button>
							<ButtonGroupSeparator />
							<Button type="button" variant="outline">
								Reject invoice
							</Button>
							<ButtonGroupText>1 invoice in focus</ButtonGroupText>
						</ButtonGroup>
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
					"Approved uses are intentionally narrow: peer decisions, alternate representations of one record, and compact record-level commands. Every child must share the same subject and immediate task context.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<WorkbenchSection
				id="peer-decision"
				title="Peer decision commands"
				description="Use ButtonGroup when the commands resolve the same subject and decision."
			>
				<div className="grid gap-2">
					<ButtonGroup aria-label="Purchase order approval decision">
						<Button type="button">Approve order</Button>
						<ButtonGroupSeparator />
						<Button type="button" variant="outline">
							Return for revision
						</Button>
					</ButtonGroup>
					<p className="text-sm text-foreground-secondary">
						Both commands resolve the same purchase-order review.
					</p>
				</div>
			</WorkbenchSection>

			<WorkbenchSection
				id="alternate-representations"
				title="Alternate representations of one record"
				description="Keep format choices grouped when the target record stays the same."
			>
				<div className="grid gap-2">
					<ButtonGroup aria-label="Invoice export format">
						<Button type="button" variant="outline">
							Export PDF
						</Button>
						<Button type="button" variant="outline">
							Export CSV
						</Button>
					</ButtonGroup>
					<p className="text-sm text-foreground-secondary">
						The output format changes; the invoice subject does not.
					</p>
				</div>
			</WorkbenchSection>

			<WorkbenchSection
				id="record-navigation"
				title="Compact record-level navigation"
				description="Use only when the controls stay local to the current record and share one context."
			>
				<div className="grid gap-2">
					<ButtonGroup aria-label="Supplier record views">
						<Button type="button" variant="outline">
							Profile
						</Button>
						<Button type="button" variant="outline">
							Ledger
						</Button>
						<Button type="button" variant="outline">
							Remittances
						</Button>
					</ButtonGroup>
					<p className="text-sm text-foreground-secondary">
						Use only when these controls are local to the current supplier
						record; use application navigation primitives for global
						destinations.
					</p>
				</div>
			</WorkbenchSection>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"ButtonGroup supports horizontal and vertical composition. Orientation is an explicit layout decision: use horizontal when labels fit without crowding, and vertical when available width or translation length would make the relationship unclear. Do not rely on accidental wrapping to create an adaptive layout.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<WorkbenchSection
				id="horizontal"
				title="Horizontal"
				description="Use horizontal composition when labels fit without crowding."
			>
				<ButtonGroup
					orientation="horizontal"
					aria-label="Goods receipt decision"
				>
					<Button type="button" variant="outline">
						Accept receipt
					</Button>
					<Button type="button" variant="outline">
						Report variance
					</Button>
				</ButtonGroup>
			</WorkbenchSection>

			<WorkbenchSection
				id="vertical"
				title="Vertical"
				description="Use vertical composition when width or translation length would make the relation unclear."
			>
				<div className="w-full max-w-xs">
					<ButtonGroup
						orientation="vertical"
						aria-label="Supplier exception actions"
					>
						<Button type="button" variant="outline">
							Request corrected invoice
						</Button>
						<Button type="button" variant="outline">
							Place payment on hold
						</Button>
						<Button type="button" variant="outline">
							Escalate to finance manager
						</Button>
					</ButtonGroup>
				</div>
			</WorkbenchSection>
		</div>
	),
};

export const ContextAndEmphasis: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"ButtonGroupText may expose concise, non-interactive context that qualifies the grouped actions. Button variants establish emphasis: use one primary action only when the workflow has a clear preferred continuation; otherwise keep peer actions visually equivalent.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Preferred continuation with supporting context">
				<ButtonGroup aria-label="Journal posting decision">
					<Button type="button">Post journal</Button>
					<ButtonGroupSeparator />
					<Button type="button" variant="outline">
						Save as draft
					</Button>
					<ButtonGroupText>12 balanced lines</ButtonGroupText>
				</ButtonGroup>
			</StorySection>

			<StorySection title="Equivalent peer options">
				<ButtonGroup aria-label="Payment advice export format">
					<Button type="button" variant="outline">
						PDF
					</Button>
					<Button type="button" variant="outline">
						CSV
					</Button>
					<Button type="button" variant="outline">
						XML
					</Button>
				</ButtonGroup>
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
					"The group requires an accessible name when its purpose is not already conveyed by surrounding content. Each Button remains a separate Tab stop and exposes its own name and state. Separators are decorative. Focus indication must remain visible against adjacent borders and in high-contrast modes. Unauthorized actions are omitted; disabled is reserved for an authorized action that is temporarily unavailable for a clear workflow reason.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Independent keyboard focus">
				<ButtonGroup aria-label="Invoice review commands">
					<Button type="button" variant="outline">
						Approve invoice
					</Button>
					<ButtonGroupSeparator />
					<Button type="button" variant="outline">
						Reject invoice
					</Button>
				</ButtonGroup>
			</StorySection>

			<StorySection title="Authorized but temporarily unavailable">
				<div className="grid gap-2">
					<ButtonGroup aria-label="Payment release decision">
						<Button type="button" disabled>
							Release payment
						</Button>
						<ButtonGroupSeparator />
						<Button type="button" variant="outline">
							Return to preparer
						</Button>
					</ButtonGroup>
					<p className="text-sm text-foreground-secondary">
						Release payment is unavailable until bank validation completes.
					</p>
				</div>
			</StorySection>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const approve = canvas.getByRole("button", { name: "Approve invoice" });
		const reject = canvas.getByRole("button", { name: "Reject invoice" });

		await userEvent.tab();
		await expect(approve).toHaveFocus();

		await userEvent.tab();
		await expect(reject).toHaveFocus();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose ButtonGroup beside record identity, taxonomy, lifecycle, and explanatory content without merging their responsibilities. Badge owns classification, StatusBadge owns lifecycle, Card owns containment, and feature actions own business policy.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>PAY-2087</CardTitle>
						<CardDescription>
							Northwind Trading · supplier payment proposal
						</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Accounts payable</Badge>
						<StatusBadge status="pending" label="Validation required" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				<p className="text-sm text-foreground-secondary">
					The payment is balanced. Bank-account validation is still pending.
				</p>
				<ButtonGroup aria-label="Payment proposal actions">
					<Button type="button" disabled>
						Release payment
					</Button>
					<ButtonGroupSeparator />
					<Button type="button" variant="outline">
						Return to preparer
					</Button>
					<ButtonGroupText>1 proposal</ButtonGroupText>
				</ButtonGroup>
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
					"Use ButtonGroup only when grouping improves task comprehension. Do not use connected styling to imply a relationship that does not exist, compress an entire page toolbar, hide authorization rules, or turn the group root into one click target.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-6xl gap-6 md:grid-cols-2">
			<StorySection title="Do: group commands for one decision">
				<ButtonGroup aria-label="Invoice approval decision">
					<Button type="button">Approve invoice</Button>
					<ButtonGroupSeparator />
					<Button type="button" variant="outline">
						Reject invoice
					</Button>
				</ButtonGroup>
			</StorySection>

			<StorySection title="Do not: collect unrelated page commands">
				<div className="grid gap-2">
					<ButtonGroup aria-label="Unrelated page commands">
						<Button type="button" variant="outline">
							Approve
						</Button>
						<Button type="button" variant="outline">
							Open settings
						</Button>
						<Button type="button" variant="outline">
							Sign out
						</Button>
					</ButtonGroup>
					<p className="text-sm text-foreground-secondary">
						Use Toolbar, navigation, or separate placements according to each
						command's role.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep non-interactive context as text">
				<ButtonGroup aria-label="Invoice export actions">
					<Button type="button" variant="outline">
						Export PDF
					</Button>
					<ButtonGroupText>3 attachments</ButtonGroupText>
				</ButtonGroup>
			</StorySection>

			<StorySection title="Do not: disguise context as a disabled control">
				<div className="grid gap-2">
					<ButtonGroup aria-label="Incorrect invoice export actions">
						<Button type="button" variant="outline">
							Export PDF
						</Button>
						<Button type="button" variant="outline" disabled>
							3 attachments
						</Button>
					</ButtonGroup>
					<p className="text-sm text-foreground-secondary">
						A count is information, not an unavailable command.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: omit unauthorized commands">
				<div className="grid gap-2">
					<ButtonGroup aria-label="Invoice actions available to reviewer">
						<Button type="button" variant="outline">
							View audit trail
						</Button>
						<Button type="button" variant="outline">
							Download invoice
						</Button>
					</ButtonGroup>
					<p className="text-sm text-foreground-secondary">
						The reviewer has no posting permission, so no posting command is
						rendered.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do not: replace BulkActionBar">
				<p className="text-sm leading-6 text-foreground-secondary">
					ButtonGroup is local to one subject or decision. When actions apply to
					a changing multi-row selection across a list, use BulkActionBar so
					selection count, persistence, escape behavior, and batch authorization
					remain explicit.
				</p>
			</StorySection>
		</div>
	),
};
