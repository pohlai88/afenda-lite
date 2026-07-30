import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.pagination");

const meta = {
	title: "UI System/Pagination",
	component: Pagination,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Pagination"),
	},
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

const invoices = [
	{ id: "INV-1042", supplier: "Northwind Trading", amount: "MYR 18,420.00" },
	{ id: "INV-1041", supplier: "Contoso Logistics", amount: "MYR 6,110.50" },
	{ id: "INV-1040", supplier: "Fabrikam Packaging", amount: "MYR 2,480.00" },
] as const;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One payables register: Pagination sits with the collection it controls. Feature code owns page count, URLs, and fetch — the control owns navigation chrome.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Accounts payable
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Supplier invoice register
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Page 2 of 12 · filters for July 2026 remain active across page
						changes.
					</p>
				</header>

				<div className="overflow-hidden rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Invoice</TableHead>
								<TableHead>Supplier</TableHead>
								<TableHead className="text-right">Amount</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invoices.map((invoice) => (
								<TableRow key={invoice.id}>
									<TableCell className="font-medium">{invoice.id}</TableCell>
									<TableCell>{invoice.supplier}</TableCell>
									<TableCell className="text-right">{invoice.amount}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<Pagination aria-label="Invoice register pages">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious href="#page-1" />
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#page-1">1</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#page-2" isActive>
								2
							</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#page-3">3</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#page-12">12</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationNext href="#page-3" />
						</PaginationItem>
					</PaginationContent>
				</Pagination>
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
					"Semantic links with a marked current page. Ellipsis abbreviates a known range — it does not imply unknown data.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Current page marked">
				<Pagination aria-label="Open purchase orders">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious href="#po-page-1" />
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#po-page-1">1</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#po-page-2" isActive>
								2
							</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#po-page-3">3</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationNext href="#po-page-3" />
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</StorySection>
			<StorySection title="Ellipsis for a known range">
				<Pagination aria-label="Goods receipts">
					<PaginationContent>
						<PaginationItem>
							<PaginationLink href="#grn-1">1</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#grn-8" isActive>
								8
							</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#grn-24">24</PaginationLink>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</StorySection>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Minimal previous, current, and next composition for a short collection.",
			},
		},
	},
	render: () => (
		<Pagination aria-label="Journal batches">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href="#batch-1" />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="#batch-1">1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="#batch-2" isActive>
						2
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href="#batch-3" />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Pagination is a navigation landmark. The current page uses aria-current. Previous and next keep explicit accessible names.",
			},
		},
	},
	render: () => (
		<Pagination aria-label="Supplier directory pages">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href="#suppliers-1" />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="#suppliers-1">1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="#suppliers-2" isActive>
						2
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="#suppliers-3">3</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href="#suppliers-3" />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const nav = canvas.getByRole("navigation", {
			name: "Supplier directory pages",
		});
		await expect(nav).toBeVisible();
		const current = canvas.getByRole("link", { name: "2" });
		await expect(current).toHaveAttribute("aria-current", "page");
		await userEvent.tab();
		await expect(
			canvas.getByRole("link", { name: "Go to previous page" }),
		).toHaveFocus();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose Pagination below the table it pages. Preserve filters in the surrounding surface — Pagination does not own query state.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<p className="text-foreground-secondary text-sm">
				Showing 21–40 of 236 suppliers · filter: Malaysia preferred
			</p>
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Supplier</TableHead>
							<TableHead>Reference</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell>Northwind Trading</TableCell>
							<TableCell>SUP-1042</TableCell>
						</TableRow>
						<TableRow>
							<TableCell>Contoso Logistics</TableCell>
							<TableCell>SUP-2201</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
			<Pagination aria-label="Supplier results">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious href="#results-1" />
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href="#results-1">1</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href="#results-2" isActive>
							2
						</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationEllipsis />
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href="#results-12">12</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationNext href="#results-3" />
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do mark the current page and keep Pagination with the collection. Do not put Pagination in PageHeader or treat it as a wizard Stepper.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: landmark with current page">
				<Pagination aria-label="Approved invoices">
					<PaginationContent>
						<PaginationItem>
							<PaginationLink href="#ok-1">1</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationLink href="#ok-2" isActive>
								2
							</PaginationLink>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</StorySection>
			<StorySection title="Do not: invent page chrome without destinations">
				<p className="text-foreground-secondary text-sm">
					Feature code owns URLs and fetch. Pagination only presents navigation
					structure for destinations the consumer provides.
				</p>
			</StorySection>
		</div>
	),
};
