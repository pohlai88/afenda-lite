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
import { ContractDocsPage } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.button");
const submitForApproval = fn();
const approveRequest = fn();
const disabledAction = fn();
const pendingAction = fn();

const meta = {
	title: "UI System/Forms/Button",
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
		asChild: {
			control: false,
			description:
				"Delegates rendering to one semantically appropriate interactive child, such as an anchor for navigation.",
		},
	},
	parameters: {
		docs: {
			page: () => <ContractDocsPage evidence={evidence} title="Button" />,
		},
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		docs: {
			description: {
				story:
					"The recommended default action trigger. Use one dominant default Button for the recommended next step in a local decision context.",
			},
		},
	},
	play: async ({ canvasElement }) => {
		const button = within(canvasElement).getByRole("button", {
			name: "Submit for approval",
		});
		const style = getComputedStyle(button);
		await expect(style.fontFamily).toContain("Geist Variable");
		await expect(style.fontSize).toBe("14px");
		await expect(style.fontWeight).toBe("500");
		await expect(style.height).toBe("36px");
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
				<p className="text-sm text-muted-foreground">
					Use once for the recommended action in this decision context.
				</p>
			</StorySection>
			<StorySection title="Secondary · neutral support">
				<Button variant="secondary">Save as draft</Button>
				<p className="text-sm text-muted-foreground">
					Useful and available, but not the recommended next step.
				</p>
			</StorySection>
			<StorySection title="Outline · visible alternative">
				<Button variant="outline">Export transactions</Button>
				<p className="text-sm text-muted-foreground">
					A supporting action that needs a clear, persistent affordance.
				</p>
			</StorySection>
			<StorySection title="Ghost · compact context">
				<Button variant="ghost">Clear filters</Button>
				<p className="text-sm text-muted-foreground">
					A low-emphasis action in a toolbar or repeated control group.
				</p>
			</StorySection>
			<StorySection title="Destructive · harmful outcome">
				<Button variant="destructive">Delete supplier</Button>
				<p className="text-sm text-muted-foreground">
					Use only for difficult-to-recover harm. Feature policy still decides
					whether confirmation is required.
				</p>
			</StorySection>
			<StorySection title="Link · low-emphasis action">
				<Button variant="link">Show approval guidance</Button>
				<p className="text-sm text-muted-foreground">
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
					<div className="grid justify-items-center gap-2 text-xs text-muted-foreground">
						<Button size="icon" aria-label="Edit supplier">
							<PencilIcon />
						</Button>
						<span>Edit supplier</span>
					</div>
					<div className="grid justify-items-center gap-2 text-xs text-muted-foreground">
						<Button size="icon-xs" aria-label="Remove filter">
							<XIcon />
						</Button>
						<span>Remove filter</span>
					</div>
					<div className="grid justify-items-center gap-2 text-xs text-muted-foreground">
						<Button size="icon-sm" aria-label="Refresh records">
							<RefreshCwIcon />
						</Button>
						<span>Refresh records</span>
					</div>
					<div className="grid justify-items-center gap-2 text-xs text-muted-foreground">
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
					"Proves keyboard activation, native disabled behavior, consumer-supplied pending composition, progress context, and icon-only naming.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
			<StorySection title="Enabled and keyboard operable">
				<Button onClick={approveRequest}>Approve request</Button>
				<p className="text-sm text-muted-foreground">
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
				<p id="post-journal-reason" className="text-sm text-muted-foreground">
					Resolve the out-of-balance journal before posting.
				</p>
			</StorySection>
			<StorySection title="Pending supplied by feature code">
				<Button disabled aria-busy="true" onClick={pendingAction}>
					<Spinner aria-hidden="true" size="sm" variant="secondary" />
					Saving supplier
				</Button>
				<p className="text-sm text-muted-foreground">
					The consumer determines pending state; Button prevents repeat
					activation and retains command context.
				</p>
			</StorySection>
			<StorySection title="Icon-only with an accessible name">
				<Button size="icon" aria-label="Edit supplier">
					<PencilIcon />
				</Button>
				<p className="text-sm text-muted-foreground">
					The icon is decorative to the name supplied by aria-label.
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
		const pending = canvas.getByRole("button", { name: "Saving supplier" });

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
		await expect(pending).toHaveTextContent("Saving supplier");
		await disabledPointerUser.click(pending);
		await disabledPointerUser.click(pending);
		await expect(pendingAction).toHaveBeenCalledTimes(0);
		await expect(
			canvas.getByRole("button", { name: "Edit supplier" }),
		).toHaveAccessibleName("Edit supplier");
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
				<form onSubmit={(event) => event.preventDefault()}>
					<Card>
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
						<CardFooter className="justify-end gap-2">
							<Button type="button" variant="ghost">
								Cancel
							</Button>
							<Button type="submit">Save supplier</Button>
						</CardFooter>
					</Card>
				</form>

				<Card>
					<CardHeader>
						<CardTitle>Supplier administration</CardTitle>
						<CardDescription>
							Confirmation policy belongs to the consuming workflow.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-foreground-secondary">
						Deleting SUP-1042 permanently removes an inactive supplier record.
					</CardContent>
					<CardFooter className="justify-end">
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
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Contrasts approved command naming, destructive meaning, action hierarchy, and navigation semantics with common ERP misuse.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-6xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: name the command">
				<Button>Approve purchase order</Button>
			</StorySection>
			<StorySection title="Do not: use vague confirmation copy">
				<Button>Yes</Button>
			</StorySection>
			<StorySection title="Do: reserve destructive treatment for harm">
				<Button variant="destructive">Void posted invoice</Button>
			</StorySection>
			<StorySection title="Do not: style authority as destructive">
				<Button variant="destructive">Approve invoice</Button>
			</StorySection>
			<StorySection title="Do: identify one recommended action">
				<div className="flex gap-2">
					<Button variant="outline">Save draft</Button>
					<Button>Submit for approval</Button>
				</div>
			</StorySection>
			<StorySection title="Do not: create competing primary actions">
				<div className="flex gap-2">
					<Button>Save draft</Button>
					<Button>Submit for approval</Button>
				</div>
			</StorySection>
			<StorySection title="Do: preserve link semantics for navigation">
				<Button asChild variant="link">
					<a href="/suppliers/SUP-1042">View supplier profile</a>
				</Button>
			</StorySection>
			<StorySection title="Do not: imply navigation with a native button">
				<Button variant="link">View supplier profile</Button>
			</StorySection>
		</div>
	),
};
