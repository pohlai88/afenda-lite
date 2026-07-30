import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Combobox,
	type ComboboxOption,
	Label,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.combobox");

const COMBOBOX_MATURITY_DOCTRINE =
	"Combobox benchmarks enterprise operating maturity rather than another product’s appearance. It must support predictable keyboard search and selection, preserve stable persisted values independently from localized labels, adapt to constrained layouts, communicate empty and disabled states clearly, and never act as authorization, validation, or lifecycle authority.";

const meta = {
	title: "UI System/Combobox",
	component: Combobox,
	tags: ["autodocs", "test"],
	args: {
		options: [{ value: "accounting", label: "Accounting" }],
	},
	parameters: {
		...contractDocsParameters(evidence, "Combobox"),
		docs: {
			description: {
				component: COMBOBOX_MATURITY_DOCTRINE,
			},
		},
	},
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const MODULE_OPTIONS: readonly ComboboxOption[] = [
	{ value: "accounting", label: "Accounting" },
	{ value: "inventory", label: "Inventory" },
	{ value: "payroll", label: "Payroll" },
	{ value: "receivables", label: "Receivables" },
	{ value: "payables", label: "Payables" },
];

const SUPPLIER_OPTIONS: readonly ComboboxOption[] = [
	{ value: "sup-1042", label: "Northwind Trading Sdn. Bhd." },
	{ value: "sup-1038", label: "Contoso Logistics Pte. Ltd." },
	{ value: "sup-0881", label: "Fabrikam Packaging Co." },
	{ value: "sup-0770", label: "Adventure Works Materials", disabled: true },
];

function ModuleCombobox({
	initialValue = "accounting",
	ariaLabel = "Module",
	disabled = false,
	id,
}: {
	initialValue?: string;
	ariaLabel?: string;
	disabled?: boolean;
	id?: string;
}) {
	const [value, setValue] = useState(initialValue);

	return (
		<Combobox
			{...(id === undefined ? {} : { id })}
			aria-label={ariaLabel}
			disabled={disabled}
			emptyMessage="No modules match this search."
			onValueChange={setValue}
			options={[...MODULE_OPTIONS]}
			placeholder="Select a module"
			searchPlaceholder="Search modules..."
			value={value}
		/>
	);
}

function MultiModuleCombobox({
	initialValue = ["accounting", "payroll"] as string[],
	id,
}: {
	initialValue?: string[];
	id?: string;
}) {
	const [value, setValue] = useState(initialValue);

	return (
		<Combobox
			{...(id === undefined ? {} : { id })}
			aria-label="Multiple modules"
			emptyMessage="No modules match this search."
			multiple
			onValueChange={setValue}
			options={[...MODULE_OPTIONS]}
			placeholder="Select modules"
			searchPlaceholder="Search modules..."
			value={value}
		/>
	);
}

function SupplierCombobox({
	initialValue = "",
	id,
}: {
	initialValue?: string;
	id?: string;
}) {
	const [value, setValue] = useState(initialValue);

	return (
		<Combobox
			{...(id === undefined ? {} : { id })}
			aria-label="Supplier"
			emptyMessage="No suppliers match this search."
			onValueChange={setValue}
			options={[...SUPPLIER_OPTIONS]}
			placeholder="Select a supplier"
			searchPlaceholder="Search suppliers..."
			value={value}
		/>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Permission catalog filtering uses Combobox for searchable selection from a bounded module set. Stable identifiers persist independently from display labels, keyboard and pointer operators receive equivalent selection behavior, and the control never authorizes module access.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Platform · permission catalog
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Module scope filter
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Combobox searches a bounded ERP option set. Client filtering helps
						operators find Accounting or Payroll, while stable values protect
						saved filters across label and locale changes.
					</p>
					<p className="max-w-5xl text-foreground-tertiary text-xs leading-5">
						Operational standard: keyboard search, selection state, empty
						results, disabled options, and focus must remain understandable
						across narrow layouts and high-contrast presentation.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Admin</Badge>
							<StatusBadge label="Operational" size="sm" status="active" />
						</div>
						<CardTitle>Catalog view filters</CardTitle>
						<CardDescription>
							org-fragrant-lake · limit the permission list to one owning module
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="grid max-w-md gap-2">
							<Label htmlFor="module-scope">Module</Label>
							<ModuleCombobox ariaLabel="Module" id="module-scope" />
						</div>
						<p className="text-foreground-secondary text-sm">
							Selected value is a stable module id. Display labels may change
							with locale without breaking saved filters.
						</p>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Reset filters
						</Button>
						<Button type="button">Apply filters</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("combobox"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Single selection chooses one stable value. Multiple selection is reserved for tasks that genuinely accept several concurrent values. Search narrows the supplied catalogue; it does not create new values.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Single module selection">
				<div className="grid gap-2">
					<Label htmlFor="usage-owning-module">Owning module</Label>
					<ModuleCombobox id="usage-owning-module" />
				</div>
			</StorySection>

			<StorySection title="Multiple module scopes">
				<div className="grid gap-2">
					<Label htmlFor="usage-included-modules">Included modules</Label>
					<MultiModuleCombobox id="usage-included-modules" />
				</div>
			</StorySection>

			<StorySection title="Supplier master-data lookup">
				<div className="grid gap-2">
					<Label htmlFor="usage-remittance-supplier">Remittance supplier</Label>
					<SupplierCombobox id="usage-remittance-supplier" />
				</div>
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
					"Triggers expose combobox semantics, current value, and expanded state. Keyboard operators can open, search, traverse, select, and dismiss. Disabled options may remain visible for policy transparency but stay unselectable; disabled controls block interaction without implying authorization.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Enabled with a current selection">
				<ModuleCombobox initialValue="payroll" />
			</StorySection>

			<StorySection title="Empty selection awaiting operator choice">
				<ModuleCombobox ariaLabel="Module without selection" initialValue="" />
			</StorySection>

			<StorySection title="Disabled control">
				<ModuleCombobox
					ariaLabel="Disabled module"
					disabled
					initialValue="accounting"
				/>
			</StorySection>

			<StorySection title="Catalogue includes a policy-disabled option">
				<SupplierCombobox initialValue="sup-1042" />
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card owns the persistent filter workbench. Combobox owns searchable bounded selection. Labels identify the field, Buttons apply or clear the choice, and StatusBadge owns lifecycle meaning — a selected option is not an approval.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Permissions</Badge>
						<StatusBadge label="Draft filter" size="sm" status="pending" />
					</div>
					<CardTitle>Module catalog filter</CardTitle>
					<CardDescription>
						Search Accounting, Inventory, or Payroll before applying
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-2">
					<Label htmlFor="composition-module">Module</Label>
					<ModuleCombobox id="composition-module" />
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline">
						Cancel
					</Button>
					<Button type="button">Apply module filter</Button>
				</CardFooter>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Payables</Badge>
						<StatusBadge label="Operational" size="sm" status="active" />
					</div>
					<CardTitle>Payment run suppliers</CardTitle>
					<CardDescription>
						Include several modules in the remittance batch scope
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-2">
					<Label htmlFor="composition-included-modules">Included modules</Label>
					<MultiModuleCombobox id="composition-included-modules" />
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline">
						Clear
					</Button>
					<Button type="button">Save batch scope</Button>
				</CardFooter>
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
					"Combobox selects stable values from a bounded option set. It is not freeform text, an authorization mechanism, a validation substitute, or lifecycle authority.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: search a bounded ERP option set">
				<div className="grid gap-2">
					<Label htmlFor="guidance-owning-module">Owning module</Label>
					<ModuleCombobox id="guidance-owning-module" />
				</div>
			</StorySection>

			<StorySection title="Do not: accept freeform text as the value">
				<p className="text-foreground-secondary text-sm">
					Operators must choose from options. Freeform notes belong in Textarea
					or a governed notes field — never as Combobox persistence.
				</p>
			</StorySection>

			<StorySection title="Do: keep stable values distinct from labels">
				<div className="grid gap-2 rounded-lg border p-4 text-sm">
					<p className="font-medium text-foreground">
						value: <span className="font-mono">accounting</span>
					</p>
					<p className="text-foreground-secondary">
						label: Accounting — locale may change the label without rewriting
						saved filters.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do not: treat a missing option as authorization">
				<p className="text-foreground-secondary text-sm">
					Omitting Payroll from a client option list does not revoke
					payroll.access. Authorization stays on the server; Combobox only
					presents the allowed catalogue the feature loaded.
				</p>
			</StorySection>

			<StorySection title="Do: provide task-specific empty copy">
				<p className="text-foreground-secondary text-sm">
					“No suppliers match this search” identifies both the searched entity
					and the current outcome.
				</p>
			</StorySection>

			<StorySection title="Do not: use a vague empty message">
				<p className="text-foreground-secondary text-sm">
					Generic copy such as “No data” does not tell the operator what was
					searched or whether the catalogue failed to load.
				</p>
			</StorySection>
		</div>
	),
};
