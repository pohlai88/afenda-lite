import {
	Button,
	FormField,
	Input,
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.popover");

const meta = {
	title: "UI System/Popover",
	component: Popover,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Popover"),
	},
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One journal posting row: Popover holds compact period context beside the trigger. Non-modal — opening does not commit posting or protect unfinished work.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						General ledger
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						July batch posting
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Use Popover for short contextual controls. Move substantial edits to
						Dialog or Sheet.
					</p>
				</header>

				<div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
					<div className="grid gap-1">
						<p className="text-sm font-medium text-foreground">
							Journal batch JB-2201
						</p>
						<p className="text-sm text-foreground-secondary">
							14 validated lines · ready for period check
						</p>
					</div>
					<Popover>
						<PopoverTrigger asChild>
							<Button type="button" variant="outline">
								Open details
							</Button>
						</PopoverTrigger>
						<PopoverContent aria-label="Posting details" className="w-80">
							<PopoverHeader>
								<PopoverTitle>Posting details</PopoverTitle>
								<PopoverDescription>
									Review the target period before continuing. Opening this panel
									does not post the batch.
								</PopoverDescription>
							</PopoverHeader>
							<FormField
								label="Posting period"
								description="YYYY-MM from the open ledger calendar."
							>
								<Input defaultValue="2026-07" autoComplete="off" />
							</FormField>
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</div>
	),
	play: interactionFor("popover"),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Popover is for compact contextual work tied to one trigger. Prefer Dialog when the workflow needs modal focus or substantial form space.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Compact contextual hint">
				<Popover>
					<PopoverTrigger asChild>
						<Button type="button" variant="outline">
							View allocation tip
						</Button>
					</PopoverTrigger>
					<PopoverContent aria-label="Allocation tip">
						<PopoverHeader>
							<PopoverTitle>Allocation tip</PopoverTitle>
							<PopoverDescription>
								Match remittance references before applying partial payments.
							</PopoverDescription>
						</PopoverHeader>
					</PopoverContent>
				</Popover>
			</StorySection>
			<StorySection title="One lightweight field">
				<Popover>
					<PopoverTrigger asChild>
						<Button type="button" variant="outline">
							Adjust display currency
						</Button>
					</PopoverTrigger>
					<PopoverContent aria-label="Display currency">
						<PopoverHeader>
							<PopoverTitle>Display currency</PopoverTitle>
							<PopoverDescription>
								Changes the on-screen label only — not the ledger currency.
							</PopoverDescription>
						</PopoverHeader>
						<FormField label="Currency code">
							<Input defaultValue="MYR" autoComplete="off" />
						</FormField>
					</PopoverContent>
				</Popover>
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
					"Trigger needs a clear accessible name. Provide a title when the panel purpose is not obvious from the trigger alone.",
			},
		},
	},
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline">
					Open posting period
				</Button>
			</PopoverTrigger>
			<PopoverContent aria-label="Posting period">
				<PopoverHeader>
					<PopoverTitle>Posting period</PopoverTitle>
					<PopoverDescription>
						Confirm the open period for this legal entity.
					</PopoverDescription>
				</PopoverHeader>
				<FormField label="Period">
					<Input defaultValue="2026-07" autoComplete="off" />
				</FormField>
			</PopoverContent>
		</Popover>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Keyboard Escape dismisses. Focus returns predictably. Label PopoverContent when the trigger name alone is not enough.",
			},
		},
	},
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline">
					Show remittance note
				</Button>
			</PopoverTrigger>
			<PopoverContent aria-label="Remittance note">
				<PopoverHeader>
					<PopoverTitle>Remittance note</PopoverTitle>
					<PopoverDescription>
						Supplier prefers email remittance advice for amounts above MYR
						10,000.
					</PopoverDescription>
				</PopoverHeader>
			</PopoverContent>
		</Popover>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const page = within(canvasElement.ownerDocument.body);
		await userEvent.click(
			canvas.getByRole("button", { name: "Show remittance note" }),
		);
		await waitFor(() =>
			expect(page.getByText("Remittance note")).toBeVisible(),
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(page.queryByText("Remittance note")).not.toBeInTheDocument(),
		);
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose Popover beside row actions. Keep content short — one description or one field. Feature code owns persistence.",
			},
		},
	},
	render: () => (
		<div className="flex w-full max-w-xl items-center justify-between gap-4 rounded-lg border px-4 py-3">
			<div className="grid gap-1">
				<p className="text-sm font-medium">INV-1042</p>
				<p className="text-sm text-foreground-secondary">
					Northwind Trading · awaiting period check
				</p>
			</div>
			<Popover>
				<PopoverTrigger asChild>
					<Button type="button" size="sm" variant="outline">
						Period check
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" aria-label="Period check">
					<PopoverHeader>
						<PopoverTitle>Period check</PopoverTitle>
						<PopoverDescription>
							July 2026 is open for this entity. Posting remains a separate
							command.
						</PopoverDescription>
					</PopoverHeader>
				</PopoverContent>
			</Popover>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do use Popover for compact context. Do not place consequential confirmation or long forms here — use AlertDialog or Dialog.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: short contextual panel">
				<Popover>
					<PopoverTrigger asChild>
						<Button type="button" variant="outline">
							Why is posting blocked?
						</Button>
					</PopoverTrigger>
					<PopoverContent aria-label="Posting block reason">
						<PopoverHeader>
							<PopoverTitle>Posting block reason</PopoverTitle>
							<PopoverDescription>
								The target ledger account is inactive. Restore it before retry.
							</PopoverDescription>
						</PopoverHeader>
					</PopoverContent>
				</Popover>
			</StorySection>
			<StorySection title="Do not: confirm irreversible harm here">
				<p className="text-sm text-foreground-secondary">
					Voiding an invoice or deleting a supplier requires AlertDialog.
					Popover visibility never means commitment.
				</p>
			</StorySection>
		</div>
	),
};
