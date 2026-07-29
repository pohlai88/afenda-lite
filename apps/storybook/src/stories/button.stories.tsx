import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	Spinner,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommandIcon, PencilIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.button");

const AFENDA_ENTERPRISE_BENCHMARK =
	"SAP Fiori is a useful benchmark for enterprise consistency, role-aware workflows, adaptive behavior, coherent interaction, keyboard operation and high-contrast support. Afenda does not copy Fiori’s visual language. It targets comparable operational maturity through its own design system: every approved Button pattern must preserve semantic meaning, remain predictable across contexts and breakpoints, expose complete keyboard behavior, maintain visible focus and contrast, and keep workflow authority in feature policy rather than visual styling.";
const submitForApproval = fn();
const approveRequest = fn();
const disabledAction = fn();
const pendingAction = fn();
const deleteSupplier = fn();
const saveSupplier = fn();
const cancelSupplierChanges = fn();

function ButtonOperationalOverview() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<PageHeader>
					<div className="grid gap-2">
						<PageHeaderHeading>Supplier approval queue</PageHeaderHeading>
						<PageHeaderDescription>
							Review validated supplier requests and resolve blocked
							submissions.
						</PageHeaderDescription>
					</div>
					<PageHeaderActions>
						<Button variant="outline">Export queue</Button>
						<Button>Create supplier</Button>
					</PageHeaderActions>
				</PageHeader>

				<div className="grid gap-6 lg:grid-cols-2">
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
							<CardDescription>SUP-1042 · Validation complete</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 text-sm">
							<p className="text-foreground-secondary">
								Tax, banking and ownership evidence passed validation.
							</p>
							<p className="text-foreground-tertiary">
								Requested by Procurement Operations · 28 Jul 2026
							</p>
						</CardContent>
						<CardFooter className="justify-end gap-2 border-t">
							<Button variant="outline">Review evidence</Button>
							<Button onClick={approveRequest}>Approve supplier</Button>
						</CardFooter>
					</Card>

					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Supplier SUP-1038</CardTitle>
							<CardDescription>Bank-account ownership mismatch</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 text-sm">
							<p className="text-foreground-secondary">
								The submitted bank account does not match the registered legal
								entity.
							</p>
							<p className="text-foreground-tertiary">
								Approval remains unavailable until evidence is corrected.
							</p>
						</CardContent>
						<CardFooter className="justify-between gap-2 border-t">
							<Button variant="ghost">Open supplier</Button>
							<Button variant="outline">Request correction</Button>
						</CardFooter>
					</Card>
				</div>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Inactive supplier record</CardTitle>
						<CardDescription>
							SUP-1021 · Eligible for permanent deletion
						</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-foreground-secondary">
						The record has no posted transactions, open orders or active
						integration references.
					</CardContent>
					<CardFooter className="justify-end border-t">
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive">Delete supplier</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete supplier SUP-1021?</AlertDialogTitle>
									<AlertDialogDescription>
										This permanently removes the inactive supplier record and
										cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Keep supplier</AlertDialogCancel>
									<AlertDialogAction variant="destructive">
										Delete supplier
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}

const meta = {
	title: "UI System/Button",
	component: Button,
	tags: ["autodocs", "test"],
	args: {
		children: "Submit for approval",
		type: "button",
		variant: "default",
		size: "default",
	},
	argTypes: {
		variant: {
			control: "select",
			options: evidence.variants,
			description: "Semantic emphasis approved by the Button contract.",
		},
		size: {
			control: "select",
			options: evidence.sizes,
			description:
				"Density and affordance size approved by the Button contract.",
		},
		disabled: {
			control: "boolean",
			description: "Native disabled state. Feature code owns the reason.",
		},
		children: {
			control: false,
		},
		type: {
			control: false,
			table: {
				category: "Native behavior",
			},
		},
		className: {
			control: false,
			table: {
				disable: true,
			},
		},
		style: {
			control: false,
			table: {
				disable: true,
			},
		},
		asChild: {
			control: false,
			description:
				"Delegates rendering to one semantically appropriate interactive child, such as an anchor for navigation.",
		},
	},
	parameters: {
		controls: {
			include: ["variant", "size", "disabled"],
			sort: "none",
		},
		...contractDocsParameters(evidence, "Button"),
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story: `${AFENDA_ENTERPRISE_BENCHMARK} This story demonstrates the resulting Button hierarchy across page actions, record decisions, blocked-workflow recovery and destructive confirmation. Each local decision context contains at most one dominant default action.`,
			},
		},
	},
	render: () => <ButtonOperationalOverview />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole("button", { name: "Approve supplier" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Create supplier" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Delete supplier" }),
		).toBeVisible();
	},
};

export const SemanticUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Maps each visual variant to its permitted ERP meaning. Variant selection communicates local emphasis; it never grants authority or supplies workflow policy.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
			<StorySection title="Default · recommended next step">
				<Button onClick={submitForApproval}>Submit for approval</Button>
				<p className="text-sm text-foreground-secondary">
					Use once for the recommended action in this decision context.
				</p>
			</StorySection>
			<StorySection title="Secondary · neutral decision action">
				<Button variant="secondary">Save as draft</Button>
				<p className="text-sm text-foreground-secondary">
					Use inside a contained decision context when the action remains
					important but is not the recommended next step.
				</p>
			</StorySection>
			<StorySection title="Outline · persistent supporting action">
				<Button variant="outline">Export transactions</Button>
				<p className="text-sm text-foreground-secondary">
					Use for an always-available alternative in page chrome, a toolbar or
					record actions.
				</p>
			</StorySection>
			<StorySection title="Ghost · compact context">
				<Button variant="ghost">Clear filters</Button>
				<p className="text-sm text-foreground-secondary">
					A low-emphasis action in a toolbar or repeated control group.
				</p>
			</StorySection>
			<StorySection title="Destructive · harmful outcome">
				<Button variant="destructive">Delete supplier</Button>
				<p className="text-sm text-foreground-secondary">
					Use only for difficult-to-recover harm. Feature policy still decides
					whether confirmation is required.
				</p>
			</StorySection>
			<StorySection title="Link · low-emphasis action">
				<Button variant="link">Show approval guidance</Button>
				<p className="text-sm text-foreground-secondary">
					This remains a native button because it reveals interface content. URL
					navigation must use asChild with a real link.
				</p>
			</StorySection>
		</div>
	),
	play: async ({ canvasElement }) => {
		submitForApproval.mockClear();
		const canvas = within(canvasElement);
		await userEvent.click(
			canvas.getByRole("button", { name: "Submit for approval" }),
		);
		await expect(submitForApproval).toHaveBeenCalledTimes(1);
	},
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The complete implemented variant inventory. These examples prove API support; Semantic Usage defines when each treatment is permitted.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Button>Submit for approval</Button>
			<Button variant="destructive">Delete supplier</Button>
			<Button variant="outline">Export transactions</Button>
			<Button variant="secondary">Save as draft</Button>
			<Button variant="ghost">Clear filters</Button>
			<Button variant="link">Show approval guidance</Button>
		</div>
	),
	play: async ({ canvasElement }) => {
		const button = within(canvasElement).getByRole("button", {
			name: "Submit for approval",
		});
		const style = getComputedStyle(button);
		await expect(style.fontSize).toBe("14px");
		await expect(style.fontWeight).toBe("500");
		await expect(style.height).toBe("36px");
		await expect(style.borderRadius).toBe("8px");
		await expect(style.boxShadow).toBe("none");
	},
};

export const Sizes: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The complete size inventory. Icon-only controls retain explicit accessible names, and compact icon examples include nearby visible context.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6">
			<StorySection title="Text actions">
				<div className="flex flex-wrap items-center gap-3">
					<Button>Create purchase order</Button>
					<Button size="xs">Add line</Button>
					<Button size="sm">Filter</Button>
					<Button size="lg">Start month-end close</Button>
				</div>
			</StorySection>
			<StorySection title="Icon-only actions">
				<div className="flex flex-wrap items-end gap-4">
					<div className="grid justify-items-center gap-2 text-xs text-foreground-tertiary">
						<Button size="icon" aria-label="Edit supplier">
							<PencilIcon />
						</Button>
						<span>Edit supplier</span>
					</div>
					<div className="grid justify-items-center gap-2 text-xs text-foreground-tertiary">
						<Button size="icon-xs" aria-label="Remove filter">
							<XIcon />
						</Button>
						<span>Remove filter</span>
					</div>
					<div className="grid justify-items-center gap-2 text-xs text-foreground-tertiary">
						<Button size="icon-sm" aria-label="Refresh records">
							<RefreshCwIcon />
						</Button>
						<span>Refresh records</span>
					</div>
					<div className="grid justify-items-center gap-2 text-xs text-foreground-tertiary">
						<Button size="icon-lg" aria-label="Open command menu">
							<CommandIcon />
						</Button>
						<span>Command menu</span>
					</div>
				</div>
			</StorySection>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Proves keyboard activation, native disabled behavior, consumer-supplied pending composition, focus across conflicting surfaces, and icon-only naming.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
			<StorySection title="Enabled and keyboard operable">
				<Button onClick={approveRequest}>Approve request</Button>
				<p className="text-sm text-foreground-secondary">
					The visible focus ring remains intact and Enter activates the command.
				</p>
			</StorySection>
			<StorySection title="Disabled with an apparent reason">
				<Button
					disabled
					aria-describedby="post-journal-reason"
					onClick={disabledAction}
				>
					Post journal
				</Button>
				<p
					id="post-journal-reason"
					className="text-sm text-foreground-secondary"
				>
					Resolve the out-of-balance journal before posting.
				</p>
			</StorySection>
			<StorySection title="Pending supplied by feature code">
				<Button
					disabled
					aria-busy="true"
					aria-describedby="save-supplier-progress"
					onClick={pendingAction}
				>
					<Spinner aria-hidden="true" size="sm" variant="secondary" />
					Save supplier
				</Button>
				<p
					id="save-supplier-progress"
					className="text-sm text-foreground-secondary"
				>
					Supplier changes are being saved.
				</p>
			</StorySection>
			<StorySection title="Icon-only with an accessible name">
				<Button size="icon" aria-label="Edit supplier">
					<PencilIcon />
				</Button>
				<p className="text-sm text-foreground-secondary">
					The icon is decorative to the name supplied by aria-label.
				</p>
			</StorySection>
			<StorySection title="Focus remains distinct across surfaces">
				<div className="grid gap-4">
					<div className="rounded-lg bg-primary p-4">
						<Button variant="secondary">Review approval</Button>
					</div>
					<div className="rounded-lg bg-destructive-subtle p-4">
						<Button variant="destructive">Void invoice</Button>
					</div>
					<div className="rounded-lg bg-surface-sunken p-4">
						<Button variant="outline">Export transactions</Button>
					</div>
				</div>
				<p className="text-sm text-foreground-secondary">
					The keyboard-focus indicator remains visible without becoming a large
					translucent halo or adopting status colour.
				</p>
			</StorySection>
		</div>
	),
	play: async ({ canvasElement }) => {
		approveRequest.mockClear();
		disabledAction.mockClear();
		pendingAction.mockClear();
		const canvas = within(canvasElement);
		const approve = canvas.getByRole("button", { name: "Approve request" });
		const disabled = canvas.getByRole("button", { name: "Post journal" });
		const pending = canvas.getByRole("button", { name: "Save supplier" });

		await userEvent.tab();
		await expect(approve).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect(approveRequest).toHaveBeenCalledTimes(1);
		await expect(disabled).toBeDisabled();
		await expect(disabled).toHaveAccessibleDescription(
			"Resolve the out-of-balance journal before posting.",
		);
		const disabledPointerUser = userEvent.setup({ pointerEventsCheck: 0 });
		await disabledPointerUser.click(disabled);
		await expect(disabledAction).toHaveBeenCalledTimes(0);
		await expect(pending).toBeDisabled();
		await expect(pending).toHaveAttribute("aria-busy", "true");
		await expect(pending).toHaveTextContent("Save supplier");
		await expect(pending).toHaveAccessibleDescription(
			"Supplier changes are being saved.",
		);
		await disabledPointerUser.click(pending);
		await disabledPointerUser.click(pending);
		await expect(pendingAction).toHaveBeenCalledTimes(0);
		await expect(
			canvas.getByRole("button", { name: "Edit supplier" }),
		).toHaveAccessibleName("Edit supplier");

		const reviewApproval = canvas.getByRole("button", {
			name: "Review approval",
		});
		const voidInvoice = canvas.getByRole("button", { name: "Void invoice" });
		const exportTransactions = canvas.getByRole("button", {
			name: "Export transactions",
		});
		await reviewApproval.focus();
		await expect(reviewApproval).toHaveFocus();
		await voidInvoice.focus();
		await expect(voidInvoice).toHaveFocus();
		await exportTransactions.focus();
		await expect(exportTransactions).toHaveFocus();
	},
};

export const Navigation: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Navigation delegates Button styling to a real anchor with a real destination. The resulting accessible role remains link, not button.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap items-center gap-3">
			<Button asChild>
				<a href="/suppliers/SUP-1042">View supplier profile</a>
			</Button>
			<Button asChild variant="link">
				<a href="/policies/supplier-approval">Review approval policy</a>
			</Button>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const link = canvas.getByRole("link", { name: "View supplier profile" });
		await expect(link).toHaveAttribute("href", "/suppliers/SUP-1042");
	},
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Composes Button in three independent ERP decision contexts: page actions, a form footer, and destructive confirmation. Each context has one dominant action.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-6xl gap-6">
			<PageHeader>
				<div className="grid gap-2">
					<PageHeaderHeading>Purchase order PO-1042</PageHeaderHeading>
					<PageHeaderDescription>
						Ready for finance approval.
					</PageHeaderDescription>
				</div>
				<PageHeaderActions>
					<Button variant="outline">Export transactions</Button>
					<Button>Submit for approval</Button>
				</PageHeaderActions>
			</PageHeader>

			<div className="grid gap-6 lg:grid-cols-2">
				<form
					onSubmit={(event) => {
						event.preventDefault();
						saveSupplier();
					}}
				>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Supplier changes</CardTitle>
							<CardDescription>
								Three validated fields are ready to save.
							</CardDescription>
						</CardHeader>
						<CardContent className="text-sm text-foreground-secondary">
							Cancel is explicitly type button; Save supplier is the form submit
							action.
						</CardContent>
						<CardFooter className="justify-end gap-2 border-t">
							<Button
								type="button"
								variant="ghost"
								onClick={cancelSupplierChanges}
							>
								Cancel
							</Button>
							<Button type="submit">Save supplier</Button>
						</CardFooter>
					</Card>
				</form>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Supplier administration</CardTitle>
						<CardDescription>
							Confirmation policy belongs to the consuming workflow.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-foreground-secondary">
						Deleting SUP-1042 permanently removes an inactive supplier record.
					</CardContent>
					<CardFooter className="justify-end border-t">
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive">Delete supplier</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete supplier?</AlertDialogTitle>
									<AlertDialogDescription>
										This permanently removes SUP-1042 and cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Keep supplier</AlertDialogCancel>
									<AlertDialogAction
										variant="destructive"
										onClick={deleteSupplier}
									>
										Delete supplier
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</CardFooter>
				</Card>
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		deleteSupplier.mockClear();
		saveSupplier.mockClear();
		cancelSupplierChanges.mockClear();
		const canvas = within(canvasElement);

		await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
		await expect(cancelSupplierChanges).toHaveBeenCalledTimes(1);
		await expect(saveSupplier).toHaveBeenCalledTimes(0);

		await userEvent.click(
			canvas.getByRole("button", { name: "Save supplier" }),
		);
		await expect(saveSupplier).toHaveBeenCalledTimes(1);

		await userEvent.click(
			canvas.getByRole("button", { name: "Delete supplier" }),
		);
		const dialog = within(document.body).getByRole("alertdialog");
		await expect(dialog).toHaveAccessibleName("Delete supplier?");
		await expect(dialog).toHaveAccessibleDescription(
			"This permanently removes SUP-1042 and cannot be undone.",
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Delete supplier" }),
		);
		await expect(deleteSupplier).toHaveBeenCalledTimes(1);
	},
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Contrasts approved command naming, destructive meaning, action hierarchy, navigation semantics, and disabled-without-reason misuse.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-6xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: name the command">
				<Button>Approve purchase order</Button>
			</StorySection>
			<StorySection title="Do not: use vague confirmation copy">
				<div className="grid gap-3">
					<Button>Yes</Button>
					<p className="text-sm text-foreground-secondary">
						Vague confirmation copy does not name the irreversible command.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do: reserve destructive treatment for harm">
				<Button variant="destructive">Void posted invoice</Button>
			</StorySection>
			<StorySection title="Do not: style authority as destructive">
				<div className="grid gap-3">
					<Button variant="destructive">Approve invoice</Button>
					<p className="text-sm text-foreground-secondary">
						Approval is an authority action — destructive styling is reserved
						for difficult-to-recover harm.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do: identify one recommended action">
				<div className="flex gap-2">
					<Button variant="outline">Save draft</Button>
					<Button>Submit for approval</Button>
				</div>
			</StorySection>
			<StorySection title="Do not: create competing primary actions">
				<div className="grid gap-3">
					<div className="flex gap-2">
						<Button>Save draft</Button>
						<Button>Submit for approval</Button>
					</div>
					<p className="text-sm text-foreground-secondary">
						Two default Buttons create competing recommendations within one
						decision context.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do: preserve link semantics for navigation">
				<Button asChild variant="link">
					<a href="/suppliers/SUP-1042">View supplier profile</a>
				</Button>
			</StorySection>
			<StorySection title="Do not: imply navigation with a native button">
				<div className="grid gap-3">
					<Button variant="link">View supplier profile</Button>
					<p className="text-sm text-foreground-secondary">
						URL navigation must use asChild with a real anchor destination.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do: disable with an apparent reason">
				<div className="grid gap-3">
					<Button disabled aria-describedby="do-post-journal-reason">
						Post journal
					</Button>
					<p
						id="do-post-journal-reason"
						className="text-sm text-foreground-secondary"
					>
						Resolve the out-of-balance journal before posting.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do not: disable without explanation">
				<div className="grid gap-3">
					<Button disabled>Post journal</Button>
					<p className="text-sm text-foreground-secondary">
						A disabled action must have an apparent reason nearby or through an
						accessible description.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
