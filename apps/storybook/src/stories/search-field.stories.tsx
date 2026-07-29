import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Label,
	SearchField,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.search-field");

const meta = {
	title: "UI System/Search Field",
	component: SearchField,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Search Field"),
	},
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

const suppliers = [
	{ name: "Northwind Trading Sdn. Bhd.", ref: "SUP-1042" },
	{ name: "Contoso Logistics Pte. Ltd.", ref: "SUP-2201" },
	{ name: "Fabrikam Packaging Co.", ref: "SUP-0881" },
] as const;

function SupplierSearchWorkbench() {
	const [query, setQuery] = useState("Northwind");
	const normalized = query.trim().toLocaleLowerCase("en-US");
	const results =
		normalized.length === 0
			? suppliers
			: suppliers.filter(
					(row) =>
						row.name.toLocaleLowerCase("en-US").includes(normalized) ||
						row.ref.toLocaleLowerCase("en-US").includes(normalized),
				);

	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Master data · suppliers
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Supplier directory
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						SearchField owns query chrome and clear. Feature code owns debounce,
						URL state, ranking, and authorization.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Preferred suppliers</CardTitle>
						<CardDescription>
							org-fragrant-lake · Malaysia procurement roster
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="supplier-search">Suppliers</Label>
							<SearchField
								id="supplier-search"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								onClear={() => setQuery("")}
								aria-label="Search suppliers"
								placeholder="Name or reference"
							/>
						</div>
						<p className="text-sm text-foreground-secondary">
							{results.length} matching supplier
							{results.length === 1 ? "" : "s"}
						</p>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Supplier</TableHead>
									<TableHead>Reference</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{results.map((row) => (
									<TableRow key={row.ref}>
										<TableCell>{row.name}</TableCell>
										<TableCell>{row.ref}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function ControlledSearchField({
	initialValue = "",
	id = "controlled-search",
	label = "Search",
	ariaLabel,
	placeholder,
	disabled,
}: {
	initialValue?: string;
	id?: string;
	label?: string;
	ariaLabel?: string;
	placeholder?: string;
	disabled?: boolean;
}) {
	const [value, setValue] = useState(initialValue);
	return (
		<div className="grid gap-2">
			<Label htmlFor={id}>{label}</Label>
			<SearchField
				id={id}
				value={value}
				onChange={(event) => setValue(event.target.value)}
				onClear={() => setValue("")}
				aria-label={ariaLabel ?? label}
				placeholder={placeholder}
				disabled={disabled}
			/>
		</div>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One supplier directory: SearchField filters the collection beside results. Clear resets the query only — not other filters unless feature code says so.",
			},
		},
	},
	render: () => <SupplierSearchWorkbench />,
	play: interactionFor("search-field"),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"State searchable scope in the label. Keep the controlled value synchronized with feature URL or view state when applicable.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Invoice register search">
				<ControlledSearchField
					id="invoice-search"
					label="Invoices"
					ariaLabel="Search invoices"
					placeholder="Invoice or supplier"
					initialValue="INV-104"
				/>
			</StorySection>
			<StorySection title="Purchase order search">
				<ControlledSearchField
					id="po-search"
					label="Purchase orders"
					ariaLabel="Search purchase orders"
					placeholder="PO number"
				/>
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
					"Provide an accessible name and onClear when operators need a one-action reset. Placeholder is not the accessible name.",
			},
		},
	},
	render: () => (
		<div className="w-96">
			<ControlledSearchField
				id="usage-search"
				label="Journals"
				ariaLabel="Search journals"
				placeholder="Batch or account"
				initialValue="JB-22"
			/>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Clear exposes aria-label Clear search. Disabled blocks entry. Empty query and no-results stay distinct in feature messaging.",
			},
		},
	},
	render: () => (
		<div className="grid w-96 gap-4">
			<ControlledSearchField
				id="a11y-search"
				label="Suppliers"
				ariaLabel="Search suppliers"
				initialValue="Northwind"
			/>
			<div className="grid gap-2">
				<Label htmlFor="disabled-search">Locked directory</Label>
				<SearchField
					id="disabled-search"
					value="Read only"
					disabled
					aria-label="Locked supplier search"
				/>
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Clear search" }));
		await expect(
			canvas.getByRole("searchbox", { name: "Search suppliers" }),
		).toHaveValue("");
		await expect(
			canvas.getByRole("searchbox", { name: "Locked supplier search" }),
		).toBeDisabled();
	},
};

function SearchFieldCompositionDemo() {
	const [query, setQuery] = useState("SUP");
	return (
		<div className="grid w-full max-w-5xl gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<p className="text-sm text-foreground-secondary">
					Showing suppliers matching “{query || "all"}”
				</p>
				<div className="w-72">
					<SearchField
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onClear={() => setQuery("")}
						aria-label="Search suppliers"
						placeholder="Name or reference"
					/>
				</div>
			</div>
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
		</div>
	);
}

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose SearchField above the collection table. Result-count announcements belong with the collection, not the input alone.",
			},
		},
	},
	render: () => <SearchFieldCompositionDemo />,
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do label searchable scope and provide clear. Do not use placeholder-only naming or treat client filter as authorization.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: labelled collection search">
				<ControlledSearchField
					id="do-search"
					label="Invoices"
					ariaLabel="Search invoices"
					placeholder="INV or supplier"
					initialValue="INV"
				/>
			</StorySection>
			<StorySection title="Do not: placeholder as the only name">
				<SearchField
					value=""
					onChange={() => undefined}
					placeholder="Search something"
				/>
				<p className="mt-2 text-sm text-foreground-secondary">
					Placeholder is not an accessible name. Collection search needs a real
					label or aria-label.
				</p>
			</StorySection>
		</div>
	),
};
