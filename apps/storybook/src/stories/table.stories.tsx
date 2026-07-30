import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	StatusBadge,
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.table");

const meta = {
	title: "UI System/Table",
	component: Table,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Table"),
	},
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One receivables invoice Table with caption, headers, body, and footer total. Table owns semantic structure — not sorting, filtering, or selection state.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounts receivable</Badge>
						<StatusBadge label="July open items" size="sm" status="active" />
					</div>
					<h1 className="font-semibold text-2xl tracking-tight">
						Invoice register
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Table presents row-and-column relationships. Use DataTable when
						governed sorting, filtering, selection, or pagination is required.
					</p>
				</header>

				<section aria-labelledby="table-register-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="table-register-title"
						>
							Open invoices
						</h2>
						<p className="text-foreground-secondary text-sm">
							Caption and headers keep the relationship understandable without
							surrounding copy alone.
						</p>
					</div>
					<Card className="shadow-none">
						<CardContent className="pt-6">
							<Table>
								<TableCaption>July 2026 invoices</TableCaption>
								<TableHeader>
									<TableRow>
										<TableHead>Invoice</TableHead>
										<TableHead>Customer</TableHead>
										<TableHead className="text-right">Amount</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									<TableRow>
										<TableCell>INV-1042</TableCell>
										<TableCell>Northwind</TableCell>
										<TableCell className="text-right">$4,800</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>INV-1043</TableCell>
										<TableCell>Contoso</TableCell>
										<TableCell className="text-right">$2,150</TableCell>
									</TableRow>
								</TableBody>
								<TableFooter>
									<TableRow>
										<TableCell colSpan={2}>Total</TableCell>
										<TableCell className="text-right">$6,950</TableCell>
									</TableRow>
								</TableFooter>
							</Table>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button size="sm" type="button" variant="outline">
								Export CSV
							</Button>
						</CardFooter>
					</Card>
				</section>
			</div>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Approved Table job: semantic tabular relationships with headers and optional caption. Not a generic layout grid.",
			},
		},
	},
	render: () => (
		<div className="w-full max-w-2xl">
			<Table>
				<TableCaption>Supplier remittance lines</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead>Reference</TableHead>
						<TableHead>Supplier</TableHead>
						<TableHead className="text-right">Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<TableRow>
						<TableCell>REM-0718</TableCell>
						<TableCell>Northwind Trading</TableCell>
						<TableCell className="text-right">USD 1,250.00</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Header association, selected row presentation, and footer summary. Row position is not stable record identity.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-2xl gap-6">
			<StorySection
				description="data-state selected styles the row without inventing selection policy."
				title="Selected row"
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Invoice</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow data-state="selected">
							<TableCell>INV-1042</TableCell>
							<TableCell>Open</TableCell>
						</TableRow>
						<TableRow>
							<TableCell>INV-1043</TableCell>
							<TableCell>Paid</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose Table inside a Card workbench. Collection commands stay on the footer — Table remains structural.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-2xl shadow-none">
			<CardHeader>
				<CardTitle>Credit note allocations</CardTitle>
				<CardDescription>
					CN-3391 applied against open AP invoices for Northwind Trading.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Invoice</TableHead>
							<TableHead>Line</TableHead>
							<TableHead className="text-right">Allocated</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell>INV-8841</TableCell>
							<TableCell>Freight variance</TableCell>
							<TableCell className="text-right">USD 480.00</TableCell>
						</TableRow>
						<TableRow>
							<TableCell>INV-8842</TableCell>
							<TableCell>Service fee</TableCell>
							<TableCell className="text-right">USD 120.00</TableCell>
						</TableRow>
					</TableBody>
					<TableFooter>
						<TableRow>
							<TableCell colSpan={2}>Allocated total</TableCell>
							<TableCell className="text-right">USD 600.00</TableCell>
						</TableRow>
					</TableFooter>
				</Table>
			</CardContent>
			<CardFooter className="justify-end gap-2 border-t">
				<Button size="sm" type="button" variant="outline">
					Adjust
				</Button>
				<Button size="sm" type="button">
					Confirm allocation
				</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Do: meaningful columns with headers. Do not: use Table as an arbitrary layout grid or omit headers for aesthetics.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<StorySection
				description="Captioned table with clear column headers."
				title="Do"
			>
				<Table>
					<TableCaption>Open AP</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead>Invoice</TableHead>
							<TableHead className="text-right">Due</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell>INV-1042</TableCell>
							<TableCell className="text-right">28 Jul</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</StorySection>
			<StorySection
				description="Do not drop headers or treat Table as CSS grid chrome."
				title="Do not"
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<Table>
						<TableBody>
							<TableRow>
								<TableCell>INV-1042</TableCell>
								<TableCell>28 Jul</TableCell>
							</TableRow>
						</TableBody>
					</Table>
					<p className="text-destructive text-xs">
						Headerless rows hide the column relationship from assistive tech.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
