import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Switch,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.switch");

const meta = {
	title: "UI System/Switch",
	component: Switch,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Switch"),
		docs: {
			description: {
				component:
					"Switch owns a binary on or off state for transient feature settings. It does not submit forms, save records, or represent approval status.",
			},
		},
	},
	args: {
		defaultChecked: true,
		children: "Email notifications",
	},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One preferences workbench: Switch owns the local binary choice while the parent card keeps the record context visible.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Account preferences
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Notification settings
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Use Switch for a binary preference that changes immediately in
								the current scope. Save, submit, or approval actions stay
								outside the control.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">User preferences</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Transient setting</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">Feature state</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Lifecycle
							</dt>
							<dd className="text-sm">On or off</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Email notification preferences</CardTitle>
						<CardDescription>
							Change a single setting without leaving the record surface.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-4">
						<Switch aria-label="Email notifications" defaultChecked>
							Email notifications
						</Switch>
						<Switch aria-label="SMS notifications">SMS notifications</Switch>
					</CardContent>
				</Card>
			</main>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use Switch for a direct binary setting. Use Button for commands and Checkbox for multi-select record fields.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: binary preference">
				<Switch aria-label="Email notifications" defaultChecked>
					Email notifications
				</Switch>
			</StorySection>
			<StorySection title="Do not: submit forms">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Save changes</CardTitle>
						<CardDescription>Use Button for commits and saves.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-foreground-secondary text-sm leading-6">
							Switch should not be used as a commit action or a workflow step.
						</p>
					</CardContent>
				</Card>
			</StorySection>
		</div>
	),
	play: interactionFor("switch"),
};
