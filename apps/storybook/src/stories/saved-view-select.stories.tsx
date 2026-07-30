import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	type SavedViewOption,
	SavedViewSelect,
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

const evidence = contractEvidence("ui.saved-view-select");
const ignoreViewChange = () => undefined;

const invoiceViews = [
	{ id: "overdue", label: "Overdue invoices" },
	{ id: "mine", label: "Owned by me" },
	{ id: "awaiting", label: "Awaiting approval" },
	{ id: "archived", label: "Archived", disabled: true },
] as const satisfies readonly SavedViewOption[];

const meta = {
	title: "UI System/Saved View Select",
	component: SavedViewSelect,
	tags: ["autodocs", "test"],
	args: {
		value: "overdue",
		views: invoiceViews,
		onValueChange: () => undefined,
	},
	parameters: {
		...contractDocsParameters(evidence, "Saved View Select"),
	},
} satisfies Meta<typeof SavedViewSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

meta.args = {
	value: "overdue",
	views: invoiceViews,
	onValueChange: () => undefined,
};

function PayablesViewWorkbench() {
	const [viewId, setViewId] = useState("overdue");
	const active = invoiceViews.find((view) => view.id === viewId);

	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Accounts payable
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Invoice register
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						SavedViewSelect applies a stored collection configuration. Feature
						code owns filters, authorization, and URL state.
					</p>
				</header>

				<div className="flex flex-wrap items-end justify-between gap-4">
					<div className="grid gap-1">
						<p className="font-medium text-foreground text-sm">Saved view</p>
						<p className="text-foreground-secondary text-sm">
							Active: {active?.label ?? "None"}
						</p>
					</div>
					<SavedViewSelect
						onValueChange={setViewId}
						value={viewId}
						views={invoiceViews}
					/>
				</div>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Matching invoices</CardTitle>
						<CardDescription>
							Selection does not prove filters remain authorized.
						</CardDescription>
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
									<TableCell className="font-medium">INV-1039</TableCell>
									<TableCell>Fabrikam Packaging</TableCell>
									<TableCell className="text-right">MYR 2,480.00</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">INV-1031</TableCell>
									<TableCell>Contoso Logistics</TableCell>
									<TableCell className="text-right">MYR 9,120.00</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function ControlledSavedViewSelect({
	initialValue = "overdue",
	views = invoiceViews,
	disabled,
	placeholder,
}: {
	initialValue?: string;
	views?: readonly SavedViewOption[];
	disabled?: boolean;
	placeholder?: string;
}) {
	const [value, setValue] = useState(initialValue);
	return (
		<SavedViewSelect
			onValueChange={setValue}
			value={value}
			views={views}
			{...(disabled === undefined ? {} : { disabled })}
			{...(placeholder === undefined ? {} : { placeholder })}
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
					"One payables register: SavedViewSelect sits with the collection it configures. Stable ids identify views — display labels do not.",
			},
		},
	},
	render: () => <PayablesViewWorkbench />,
	play: interactionFor("saved-view-select"),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Personal, shared, and unavailable views are feature data. Disabled options mark inaccessible views without inventing authorization.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Personal and shared views">
				<ControlledSavedViewSelect
					initialValue="team"
					views={[
						{ id: "mine", label: "Owned by me" },
						{ id: "team", label: "Shared · AP team" },
						{ id: "default", label: "Organization default" },
					]}
				/>
			</StorySection>
			<StorySection title="Unavailable view remains explicit">
				<ControlledSavedViewSelect
					views={[
						{ id: "overdue", label: "Overdue invoices" },
						{ id: "archived", label: "Archived", disabled: true },
					]}
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
					"Controlled selection with a placeholder when no view is applied. Feature code wires onValueChange to URL or query state.",
			},
		},
	},
	render: () => (
		<div className="grid w-72 gap-4">
			<ControlledSavedViewSelect placeholder="Choose a saved view" />
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"The control exposes a Saved view accessible name. Disabled state blocks interaction; disabled options remain visible.",
			},
		},
	},
	render: () => (
		<div className="grid w-72 gap-4">
			<ControlledSavedViewSelect />
			<SavedViewSelect
				disabled
				onValueChange={ignoreViewChange}
				value="overdue"
				views={invoiceViews}
			/>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const [enabledSelect, disabledSelect] = canvas.getAllByRole("combobox", {
			name: "Saved view",
		});
		if (!(enabledSelect && disabledSelect)) {
			throw new Error("Expected enabled and disabled Saved View selects.");
		}
		await expect(enabledSelect).toBeEnabled();
		await expect(disabledSelect).toBeDisabled();
		await userEvent.selectOptions(enabledSelect, "awaiting");
		await expect(enabledSelect).toHaveValue("awaiting");
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose SavedViewSelect above the table it configures. Do not store view definitions inside the selector.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-foreground-secondary text-sm">
					236 suppliers · Malaysia preferred
				</p>
				<ControlledSavedViewSelect
					initialValue="mine"
					views={[
						{ id: "mine", label: "Owned by me" },
						{ id: "preferred", label: "Preferred suppliers" },
						{ id: "all", label: "All suppliers" },
					]}
				/>
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
					</TableBody>
				</Table>
			</div>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do use stable ids and revalidate criteria. Do not apply unauthorized filters merely because a saved view lists them.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: stable identifiers">
				<ControlledSavedViewSelect
					initialValue="view_overdue_v3"
					views={[
						{ id: "view_overdue_v3", label: "Overdue invoices" },
						{ id: "view_mine_v1", label: "Owned by me" },
					]}
				/>
			</StorySection>
			<StorySection title="Do not: trust display names as ids">
				<p className="text-foreground-secondary text-sm">
					Labels change with locale and rename. Persist view_overdue_v3 — not
					the string “Overdue invoices”.
				</p>
			</StorySection>
		</div>
	),
};
