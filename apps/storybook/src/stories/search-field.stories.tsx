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
import { type ChangeEvent, useCallback, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.search-field");
const ignoreSearchChange = () => undefined;

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
	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setQuery(event.target.value);
	}, []);
	const handleClear = useCallback(() => setQuery(""), []);
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
					<p className="font-medium text-foreground-secondary text-sm">
						Master data · suppliers
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Supplier directory
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
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
								aria-label="Search suppliers"
								id="supplier-search"
								onChange={handleChange}
								onClear={handleClear}
								placeholder="Name or reference"
								value={query}
							/>
						</div>
						<p className="text-foreground-secondary text-sm">
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
	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setValue(event.target.value);
	}, []);
	const handleClear = useCallback(() => setValue(""), []);
	return (
		<div className="grid gap-2">
			<Label htmlFor={id}>{label}</Label>
			<SearchField
				aria-label={ariaLabel ?? label}
				disabled={disabled}
				id={id}
				onChange={handleChange}
				onClear={handleClear}
				placeholder={placeholder}
				value={value}
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
					ariaLabel="Search invoices"
					id="invoice-search"
					initialValue="INV-104"
					label="Invoices"
					placeholder="Invoice or supplier"
				/>
			</StorySection>
			<StorySection title="Purchase order search">
				<ControlledSearchField
					ariaLabel="Search purchase orders"
					id="po-search"
					label="Purchase orders"
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
				ariaLabel="Search journals"
				id="usage-search"
				initialValue="JB-22"
				label="Journals"
				placeholder="Batch or account"
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
				ariaLabel="Search suppliers"
				id="a11y-search"
				initialValue="Northwind"
				label="Suppliers"
			/>
			<div className="grid gap-2">
				<Label htmlFor="disabled-search">Locked directory</Label>
				<SearchField
					aria-label="Locked supplier search"
					disabled
					id="disabled-search"
					value="Read only"
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
	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setQuery(event.target.value);
	}, []);
	const handleClear = useCallback(() => setQuery(""), []);
	return (
		<div className="grid w-full max-w-5xl gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<p className="text-foreground-secondary text-sm">
					Showing suppliers matching “{query || "all"}”
				</p>
				<div className="w-72">
					<SearchField
						aria-label="Search suppliers"
						onChange={handleChange}
						onClear={handleClear}
						placeholder="Name or reference"
						value={query}
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
					ariaLabel="Search invoices"
					id="do-search"
					initialValue="INV"
					label="Invoices"
					placeholder="INV or supplier"
				/>
			</StorySection>
			<StorySection title="Do not: placeholder as the only name">
				<SearchField
					onChange={ignoreSearchChange}
					placeholder="Search something"
					value=""
				/>
				<p className="mt-2 text-foreground-secondary text-sm">
					Placeholder is not an accessible name. Collection search needs a real
					label or aria-label.
				</p>
			</StorySection>
		</div>
	),
};
