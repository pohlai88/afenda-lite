import {
	Badge,
	BulkActionBar,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DownloadIcon, SendIcon, Trash2Icon, XIcon } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.bulk-action-bar");

const meta = {
	title: "UI System/Bulk Action Bar",
	component: BulkActionBar,
	tags: ["autodocs", "test"],
	args: {
		selectedCount: 3,
		selectionLabel: (count: number) => `${count} invoices selected`,
		actions: <></>,
	},
	parameters: {
		...contractDocsParameters(evidence, "Bulk Action Bar"),
		docs: {
			description: {
				component:
					"BulkActionBar is Afenda's contextual command surface for an active multi-record selection. It reports exact selection scope and hosts only commands already authorized for the operator and applicable to the current workflow. It does not own selection, permission evaluation, eligibility checks, confirmation, execution, or result reporting.",
			},
		},
	},
} satisfies Meta<typeof BulkActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const selectedInvoices = [
	{
		id: "INV-1048",
		party: "Northwind Trading",
		amount: "MYR 18,420.00",
		dueDate: "15 Aug 2026",
		badge: "Malaysia",
		badgeVariant: "outline" as const,
		status: "pending" as const,
		statusLabel: "Awaiting approval",
	},
	{
		id: "INV-1051",
		party: "Contoso Logistics",
		amount: "MYR 6,200.00",
		dueDate: "22 Aug 2026",
		badge: "Logistics",
		badgeVariant: "secondary" as const,
		status: "pending" as const,
		statusLabel: "Awaiting approval",
	},
	{
		id: "INV-1054",
		party: "Fabrikam Packaging",
		amount: "MYR 2,980.00",
		dueDate: "30 Aug 2026",
		badge: "Packaging",
		badgeVariant: "outline" as const,
		status: "active" as const,
		statusLabel: "Ready",
	},
] as const;

function InvoiceSelectionCard() {
	return (
		<Card className="shadow-none">
			<CardHeader>
				<CardTitle>Selected invoices</CardTitle>
				<CardDescription>
					org-fragrant-lake · July 2026 receivables batch
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3">
				{selectedInvoices.map((invoice) => (
					<div
						className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
						key={invoice.id}
					>
						<div className="min-w-0 grid gap-0.5">
							<p className="truncate text-sm font-medium text-foreground">
								{invoice.id} · {invoice.party}
							</p>
							<p className="truncate text-sm text-foreground-secondary">
								{invoice.amount} · due {invoice.dueDate}
							</p>
						</div>
						<div className="flex shrink-0 flex-wrap items-center gap-2">
							<Badge variant={invoice.badgeVariant}>{invoice.badge}</Badge>
							<StatusBadge
								status={invoice.status}
								label={invoice.statusLabel}
							/>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Reference receivables workbench. The bar appears only after selection, preserves the meaning of that selection, and presents authorized workflow commands without becoming a second authorization or business-rule layer.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b border-border pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounts receivable
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						July invoice queue
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						The action surface remains contextual, role-aware, adaptive, and
						operationally explicit while retaining Afenda's own visual language.
						Selection identifies scope; feature code still proves permission and
						eligibility before execution.
					</p>
				</header>

				<BulkActionBar
					aria-label="Invoice bulk actions"
					selectedCount={3}
					selectionLabel={(count) => `${count} invoices selected`}
					actions={
						<>
							<Button size="sm" type="button" variant="outline">
								<DownloadIcon />
								Export selected
							</Button>
							<Button size="sm" type="button">
								<SendIcon />
								Submit for approval
							</Button>
							<Button size="sm" type="button" variant="destructive">
								<Trash2Icon />
								Void selected
							</Button>
						</>
					}
				/>

				<InvoiceSelectionCard />
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
					"Approved semantic roles are explicit bulk commands: transfer data, advance workflow, clear selection, or initiate a destructive operation. Labels name both the action and its selected-record scope.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Transfer selected records">
				<BulkActionBar
					aria-label="Authorized payment actions"
					selectedCount={3}
					selectionLabel={(count) => `${count} invoices selected`}
					actions={
						<Button size="sm" type="button" variant="outline">
							<DownloadIcon />
							Export selected
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Advance a governed workflow">
				<BulkActionBar
					aria-label="Authorized export actions"
					selectedCount={3}
					selectionLabel={(count) => `${count} invoices selected`}
					actions={
						<Button size="sm" type="button">
							<SendIcon />
							Submit for approval
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Initiate a destructive command">
				<BulkActionBar
					aria-label="Authorized archive actions"
					selectedCount={2}
					selectionLabel={(count) => `${count} invoices selected`}
					actions={
						<Button size="sm" type="button" variant="destructive">
							<Trash2Icon />
							Void selected
						</Button>
					}
				/>
			</StorySection>
		</div>
	),
};

export const AuthorizationAndEligibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"The bar receives an already-authorized action set. Mixed eligibility must be resolved or communicated by the owning feature before execution; selectedCount alone never authorizes or guarantees success.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Authorized and eligible selection">
				<div className="grid gap-3">
					<BulkActionBar
						aria-label="Eligible posting actions"
						selectedCount={3}
						selectionLabel={(count) => `${count} invoices selected`}
						actions={
							<>
								<Button size="sm" type="button" variant="outline">
									Export selected
								</Button>
								<Button size="sm" type="button">
									Submit for approval
								</Button>
							</>
						}
					/>
					<p className="text-sm leading-6 text-foreground-secondary">
						Feature code has already determined that both commands are visible
						to the operator. The command handler must still revalidate
						eligibility at execution time.
					</p>
				</div>
			</StorySection>

			<StorySection title="Unauthorized commands are omitted">
				<div className="grid gap-3">
					<BulkActionBar
						aria-label="Ineligible posting actions"
						selectedCount={3}
						selectionLabel={(count) => `${count} invoices selected`}
						actions={
							<Button size="sm" type="button" variant="outline">
								Export selected
							</Button>
						}
					/>
					<p className="text-sm leading-6 text-foreground-secondary">
						Do not expose a permanently disabled Void command merely to
						advertise that another role has more authority.
					</p>
				</div>
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
					"Adaptive behavior is demonstrated through constrained containers and long operational labels. The selection meaning remains intact; actions may wrap rather than truncate into ambiguity.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-8">
			<StorySection title="Narrow workbench region">
				<div className="w-full max-w-sm rounded-xl border border-dashed border-border p-3">
					<BulkActionBar
						aria-label="Mixed eligibility actions"
						selectedCount={3}
						selectionLabel={(count) => `${count} invoices selected`}
						actions={
							<>
								<Button size="sm" type="button" variant="outline">
									Clear selection
								</Button>
								<Button size="sm" type="button" variant="outline">
									Export selected
								</Button>
								<Button size="sm" type="button">
									Submit for approval
								</Button>
							</>
						}
					/>
				</div>
			</StorySection>

			<StorySection title="Large filtered selection">
				<BulkActionBar
					aria-label="Adaptive invoice actions"
					selectedCount={128}
					selectionLabel={(count) =>
						`${count} supplier records selected in the current filtered result`
					}
					actions={
						<>
							<Button size="sm" type="button" variant="outline">
								Assign owner
							</Button>
							<Button size="sm" type="button">
								Approve selected records
							</Button>
						</>
					}
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
					"Zero selection renders no contextual chrome. Active selection exposes a labelled bulk-actions region, announces the updated selection count, preserves visible button text, and relies on standard keyboard-operable Button composition.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-2xl gap-8">
			<StorySection title="No selection">
				<div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-foreground-secondary">
					BulkActionBar returns null when selectedCount is 0. The surrounding
					layout does not reserve an empty toolbar.
					<BulkActionBar selectedCount={0} actions={null} />
				</div>
			</StorySection>

			<StorySection title="Keyboard-operable active selection">
				<BulkActionBar
					aria-label="Interactive invoice actions"
					selectedCount={3}
					selectionLabel={(count) => `${count} invoices selected`}
					actions={
						<>
							<Button size="sm" type="button" variant="outline">
								<XIcon />
								Clear selection
							</Button>
							<Button size="sm" type="button" variant="outline">
								<DownloadIcon />
								Export selected
							</Button>
							<Button size="sm" type="button">
								<SendIcon />
								Submit for approval
							</Button>
						</>
					}
				/>
			</StorySection>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const clearSelection = canvas.getByRole("button", {
			name: "Clear selection",
		});
		const exportSelected = canvas.getByRole("button", {
			name: "Export selected",
		});
		const submitForApproval = canvas.getByRole("button", {
			name: "Submit for approval",
		});

		await userEvent.tab();
		await expect(clearSelection).toHaveFocus();
		await userEvent.tab();
		await expect(exportSelected).toHaveFocus();
		await userEvent.tab();
		await expect(submitForApproval).toHaveFocus();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose the bar adjacent to the selectable collection it controls. Clear selection remains an ordinary consumer action, confirmation remains in the destructive workflow, and final outcomes remain in feature-owned feedback surfaces.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-2xl gap-4">
			<BulkActionBar
				aria-label="Composed invoice actions"
				selectedCount={2}
				selectionLabel={(count) => `${count} invoices selected`}
				actions={
					<>
						<Button size="sm" type="button" variant="outline">
							Clear selection
						</Button>
						<Button size="sm" type="button" variant="outline">
							Export selected
						</Button>
						<Button size="sm" type="button">
							Submit for approval
						</Button>
					</>
				}
			/>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Invoice selection</CardTitle>
					<CardDescription>INV-1048 and INV-1051 selected</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-2 text-sm text-foreground-secondary">
					<p>INV-1048 · Northwind Trading · awaiting approval</p>
					<p>INV-1051 · Contoso Logistics · awaiting approval</p>
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
					"The approved contract favors explicit operational meaning over decorative flexibility: exact scope, named commands, authorized visibility, adaptive composition, and feature-owned execution semantics.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: name the selected record type">
				<BulkActionBar
					aria-label="Approved bulk actions"
					selectedCount={3}
					selectionLabel={(count) => `${count} invoices selected`}
					actions={
						<Button size="sm" type="button" variant="outline">
							Export selected
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Do not: use vague scope and commands">
				<div className="grid gap-2">
					<BulkActionBar
						aria-label="Overloaded bulk actions"
						selectedCount={3}
						actions={
							<Button size="sm" type="button" variant="outline">
								Go
							</Button>
						}
					/>
					<p className="text-sm leading-6 text-foreground-secondary">
						“3 selected” and “Go” do not communicate record type, operation, or
						consequence.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: omit unauthorized actions">
				<BulkActionBar
					aria-label="Destructive bulk actions"
					selectedCount={3}
					selectionLabel={(count) => `${count} invoices selected`}
					actions={
						<Button size="sm" type="button" variant="outline">
							Export selected
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Do not: advertise unavailable authority">
				<p className="text-sm leading-6 text-foreground-secondary">
					Do not render permanently disabled approval or destructive commands
					solely to reveal capabilities the current operator does not possess.
				</p>
			</StorySection>

			<StorySection title="Do: hide the bar at zero selection">
				<p className="text-sm leading-6 text-foreground-secondary">
					selectedCount below 1 renders null. Contextual commands should not
					become permanent page furniture.
				</p>
			</StorySection>

			<StorySection title="Do not: imply atomic success">
				<p className="text-sm leading-6 text-foreground-secondary">
					Bulk execution may be rejected, partially applied, or become stale.
					Revalidation, confirmation, progress, and result reporting belong to
					the owning feature workflow.
				</p>
			</StorySection>
		</div>
	),
};
