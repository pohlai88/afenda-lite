import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	KeyValue,
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.sheet");

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
	title: "UI System/Sheet",
	component: Sheet,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Sheet"),
	},
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One payables register: right-side Sheet inspects INV-1048 while the list stays visible. Edge placement is not authorization.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts payable
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Supplier invoices
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Sheet keeps list context. Named footer actions own approve and
								dismiss — Escape closes unless dirty-state policy intervenes.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Supplier invoices</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Side inspection</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">List-adjacent detail</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Lifecycle
							</dt>
							<dd className="text-sm">Inspect, approve, close</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
						<div className="grid gap-1">
							<CardTitle>Open for approval</CardTitle>
							<CardDescription>14 invoices · July 2026</CardDescription>
						</div>
						<Sheet>
							<SheetTrigger asChild>
								<Button type="button">Inspect invoice</Button>
							</SheetTrigger>
							<SheetContent side="right">
								<SheetHeader>
									<SheetTitle>Invoice INV-1048</SheetTitle>
									<SheetDescription>
										Northwind Trading · awaiting finance approval.
									</SheetDescription>
								</SheetHeader>
								<div className="grid gap-3 p-4">
									<KeyValue
										label="Amount"
										orientation="horizontal"
										size="sm"
										value="MYR 18,420.00"
									/>
									<KeyValue
										label="Due date"
										orientation="horizontal"
										size="sm"
										value="15 Aug 2026"
									/>
									<StatusBadge label="Awaiting approval" status="pending" />
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button type="button" variant="outline">
											Close
										</Button>
									</SheetClose>
									<Button type="button">Approve invoice</Button>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Invoice</TableHead>
									<TableHead>Supplier</TableHead>
									<TableHead className="text-right">Amount</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow>
									<TableCell className="font-medium">INV-1048</TableCell>
									<TableCell>Northwind Trading</TableCell>
									<TableCell className="text-right">MYR 18,420.00</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">INV-1042</TableCell>
									<TableCell>Contoso Logistics</TableCell>
									<TableCell className="text-right">MYR 6,110.50</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("sheet"),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Right-side record inspector is the default ERP Sheet. Other sides remain available for rare layout needs only.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Sheet preserves the list context while revealing the selected record."
			id="sheet-semantic-usage-title"
			title="Adjacent detail inspection"
		>
			<div className="flex flex-wrap gap-3">
				<Sheet>
					<SheetTrigger asChild>
						<Button type="button">Inspect invoice</Button>
					</SheetTrigger>
					<SheetContent side="right">
						<SheetHeader>
							<SheetTitle>Invoice INV-1048</SheetTitle>
							<SheetDescription>
								Northwind Trading · awaiting finance approval.
							</SheetDescription>
						</SheetHeader>
						<div className="grid gap-3 p-4">
							<KeyValue
								label="Amount"
								orientation="horizontal"
								size="sm"
								value="MYR 18,420.00"
							/>
							<StatusBadge label="Awaiting approval" status="pending" />
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button type="button" variant="outline">
									Close
								</Button>
							</SheetClose>
							<Button type="button">Approve invoice</Button>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</div>
		</WorkbenchSection>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"One title, description when needed, and named footer actions. Prefer Dialog for compact decisions.",
			},
		},
	},
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button type="button" variant="outline">
					Open supplier note
				</Button>
			</SheetTrigger>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Supplier SUP-1042</SheetTitle>
					<SheetDescription>
						Remittance preference for amounts above MYR 10,000.
					</SheetDescription>
				</SheetHeader>
				<div className="p-4 text-foreground-secondary text-sm">
					Prefer email remittance advice. Feature code owns dirty-state
					protection on close.
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button type="button">Close</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Focus stays inside while open. Escape closes. Title and description label the dialog.",
			},
		},
	},
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button type="button" variant="outline">
					Open accessible sheet
				</Button>
			</SheetTrigger>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Supplier SUP-1042</SheetTitle>
					<SheetDescription>
						Escape closes the sheet. Focus remains inside while open.
					</SheetDescription>
				</SheetHeader>
				<div className="p-4 text-foreground-secondary text-sm">
					Use named footer actions for approve, save, or dismiss.
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button type="button">Close</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const page = within(canvasElement.ownerDocument.body);
		await userEvent.click(
			canvas.getByRole("button", { name: "Open accessible sheet" }),
		);
		await waitFor(() =>
			expect(
				page.getByRole("dialog", { name: "Supplier SUP-1042" }),
			).toBeVisible(),
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(
				page.queryByRole("dialog", { name: "Supplier SUP-1042" }),
			).not.toBeInTheDocument(),
		);
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"ERP invoice inspector and admin approval-policy side panel without leaving list context.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Sheet>
				<SheetTrigger asChild>
					<Button type="button">Open invoice INV-1048</Button>
				</SheetTrigger>
				<SheetContent side="right">
					<SheetHeader>
						<SheetTitle>Invoice INV-1048</SheetTitle>
						<SheetDescription>
							Northwind Trading Sdn. Bhd. · MYR 18,420.00
						</SheetDescription>
					</SheetHeader>
					<div className="grid gap-3 p-4">
						<KeyValue
							label="Status"
							orientation="horizontal"
							size="sm"
							value={<StatusBadge label="Awaiting approval" status="pending" />}
						/>
						<KeyValue
							label="Owner"
							orientation="horizontal"
							size="sm"
							value="Aisha Rahman"
						/>
						<KeyValue
							label="Due date"
							orientation="horizontal"
							size="sm"
							value="15 Aug 2026"
						/>
					</div>
					<SheetFooter>
						<Button type="button" variant="outline">
							Export
						</Button>
						<Button type="button">Approve invoice</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			<Sheet>
				<SheetTrigger asChild>
					<Button type="button" variant="outline">
						Open approval policy
					</Button>
				</SheetTrigger>
				<SheetContent side="right">
					<SheetHeader>
						<SheetTitle>Approval policy</SheetTitle>
						<SheetDescription>
							High-value supplier invoices · admin configuration
						</SheetDescription>
					</SheetHeader>
					<div className="grid gap-3 p-4">
						<KeyValue
							label="Threshold"
							orientation="horizontal"
							size="sm"
							value="MYR 10,000.00"
						/>
						<KeyValue
							label="Escalation mailbox"
							orientation="horizontal"
							size="sm"
							value="finance-control@example.com"
						/>
						<StatusBadge label="Active" status="active" />
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</SheetClose>
						<Button type="button">Save policy</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Side inventory for layout coverage. Prefer right for ERP record detail; other edges are rare.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap gap-3">
			{(["top", "right", "bottom", "left"] as const).map((side) => (
				<Sheet key={side}>
					<SheetTrigger asChild>
						<Button type="button" variant="outline">
							{side}
						</Button>
					</SheetTrigger>
					<SheetContent side={side}>
						<SheetHeader>
							<SheetTitle>
								{side === "right" ? "Invoice INV-1048" : `${side} sheet`}
							</SheetTitle>
							<SheetDescription>
								{side === "right"
									? "Preferred ERP and admin inspector edge."
									: "Rare layout variant — prefer right for record detail."}
							</SheetDescription>
						</SheetHeader>
						<div className="p-4 text-foreground-secondary text-sm">
							Side inventory for layout coverage only.
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button type="button">Close</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			))}
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do use right-side inspectors with named actions. Do not bury primary commands or use Sheet for irreversible confirmation.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: right-side record inspection">
				<Sheet>
					<SheetTrigger asChild>
						<Button type="button">Inspect INV-1048</Button>
					</SheetTrigger>
					<SheetContent side="right">
						<SheetHeader>
							<SheetTitle>Invoice INV-1048</SheetTitle>
							<SheetDescription>
								Keep the list visible behind the sheet.
							</SheetDescription>
						</SheetHeader>
						<SheetFooter>
							<SheetClose asChild>
								<Button type="button">Close</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</StorySection>
			<StorySection title="Do not: unnamed primary action">
				<p className="text-foreground-secondary text-sm">
					Sheet footers must expose named commands such as Approve invoice or
					Save policy. Irreversible voiding belongs on AlertDialog.
				</p>
			</StorySection>
		</div>
	),
};
