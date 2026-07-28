import { Button, DataTable, StatusBadge } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { ComponentShowcase } from "./catalog";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

type Invoice = Record<string, unknown> & {
	id: string;
	supplier: string;
	amount: string;
	status: string;
};

const rows: Invoice[] = [
	{
		id: "INV-1042",
		supplier: "Northwind",
		amount: "MYR 18,420",
		status: "Approved",
	},
	{
		id: "INV-1043",
		supplier: "Contoso",
		amount: "MYR 7,900",
		status: "Pending",
	},
];
const columns = [
	{ key: "id" as const, title: "Invoice", sortable: true },
	{ key: "supplier" as const, title: "Supplier", filterable: true },
	{ key: "amount" as const, title: "Amount" },
	{
		key: "status" as const,
		title: "Status",
		render: (value: Invoice[keyof Invoice]) => (
			<StatusBadge
				status={value === "Approved" ? "success" : "pending"}
				label={String(value)}
			/>
		),
	},
];

function InteractiveTable() {
	const [selected, setSelected] = React.useState<Set<string>>(new Set());
	return (
		<DataTable
			columns={columns}
			data={rows}
			getRowId={(row) => row.id}
			selectable
			selectedRowIds={selected}
			onSelectionChange={setSelected}
			bulkActions={<Button size="sm">Approve selected invoices</Button>}
		/>
	);
}

const evidence = contractEvidence("ui.data-table");
const meta = {
	title: "UI System/Data Display/Data Table",
	component: DataTable,
	tags: ["autodocs", "test"],
	parameters: {
		docs: { description: { component: evidenceDescription(evidence) } },
	},
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	tags: ["visual"],
	render: () => <ComponentShowcase component="data-table" />,
};

export const Usage: Story = {
	render: () => (
		<DataTable
			columns={columns}
			data={rows}
			getRowId={(row) => row.id}
			rowActions={(row) => (
				<Button size="sm" variant="ghost" aria-label={`Review ${row.id}`}>
					Review
				</Button>
			)}
		/>
	),
};

export const StatesAndAccessibility: Story = {
	render: () => <InteractiveTable />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const firstRow = canvas.getByRole("checkbox", { name: "Select row 1" });
		await userEvent.click(firstRow);
		await expect(firstRow).toBeChecked();
		await expect(
			canvas.getByRole("button", { name: "Approve selected invoices" }),
		).toBeVisible();
	},
};

export const Composition: Story = {
	render: () => (
		<div className="grid gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-medium">Supplier invoices</h2>
					<p className="text-sm text-foreground-secondary">
						Review current approval work.
					</p>
				</div>
				<Button>New invoice</Button>
			</div>
			<DataTable columns={columns} data={rows} getRowId={(row) => row.id} />
		</div>
	),
};

export const VariantsAndSizes: Story = {
	render: () => (
		<div className="grid gap-6">
			<StorySection title="Comfortable review density">
				<DataTable columns={columns} data={rows} density="comfortable" />
			</StorySection>
			<StorySection title="Compact operational density">
				<DataTable columns={columns} data={rows} density="compact" />
			</StorySection>
		</div>
	),
};

export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6">
			<StorySection title="Do: expose explicit row actions">
				<DataTable
					columns={columns}
					data={rows.slice(0, 1)}
					rowActions={(row) => (
						<Button aria-label={`Review ${row.id}`}>Review</Button>
					)}
				/>
			</StorySection>
			<StorySection title="Do not: make the entire row an ambiguous action">
				<p className="text-sm text-foreground-secondary">
					Rows remain structural; navigation and commands use named controls.
				</p>
			</StorySection>
		</div>
	),
};
