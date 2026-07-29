import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Progress,
	Spinner,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.progress");

const meta = {
	title: "UI System/Progress",
	component: Progress,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Progress"),
		docs: {
			description: {
				component:
					"Progress presents a determinate, bounded measurement supplied by feature code. It owns progressbar semantics and visual fill; it does not estimate unknown work, poll services, infer completion, commit mutations, or report final workflow success.",
			},
		},
	},
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One period-close export job: Progress reports a known bounded value with accompanying text. A full bar does not prove the server committed.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Financial close
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						July pack export
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Feature code owns polling and failure handling. Progress only
						presents the bounded value the consumer supplies.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
						<div className="grid gap-1">
							<CardTitle>Trial balance export</CardTitle>
							<CardDescription>
								Building the July 2026 close pack for org-fragrant-lake
							</CardDescription>
						</div>
						<StatusBadge size="sm" status="pending" label="Running" />
					</CardHeader>
					<CardContent className="grid gap-3">
						<div className="flex items-center justify-between gap-3 text-sm">
							<p className="text-foreground-secondary">
								Writing ledger worksheets
							</p>
							<p className="font-medium tabular-nums text-foreground">68%</p>
						</div>
						<Progress
							value={68}
							aria-label="Trial balance export progress"
							getValueLabel={(value, max) =>
								`${value} of ${max} percent complete`
							}
						/>
						<p className="text-xs text-foreground-tertiary">
							Visual fill is not authoritative commit success.
						</p>
					</CardContent>
					<CardFooter className="justify-end">
						<Button type="button" variant="outline">
							Cancel export
						</Button>
					</CardFooter>
				</Card>
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
					"Use Progress only when a meaningful bounded value is known. Pair fill with operation name and exact value text.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Early · known start">
				<div className="grid gap-2">
					<div className="flex justify-between text-sm">
						<span className="text-foreground-secondary">
							Validating invoice lines
						</span>
						<span className="tabular-nums">12%</span>
					</div>
					<Progress value={12} aria-label="Invoice line validation" />
				</div>
			</StorySection>
			<StorySection title="Mid · bounded work">
				<div className="grid gap-2">
					<div className="flex justify-between text-sm">
						<span className="text-foreground-secondary">
							Allocating remittances
						</span>
						<span className="tabular-nums">55%</span>
					</div>
					<Progress value={55} aria-label="Remittance allocation" />
				</div>
			</StorySection>
			<StorySection title="Near complete · still not committed">
				<div className="grid gap-2">
					<div className="flex justify-between text-sm">
						<span className="text-foreground-secondary">
							Sealing close package
						</span>
						<span className="tabular-nums">96%</span>
					</div>
					<Progress value={96} aria-label="Close package seal" />
				</div>
			</StorySection>
		</div>
	),
};

export const ControlledUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Minimal determinate bar with an accessible name. Prefer accompanying text when operators need the exact value.",
			},
		},
	},
	render: () => (
		<div className="grid w-96 gap-2">
			<p className="text-sm text-foreground-secondary">Import 40 of 100 rows</p>
			<Progress
				value={40}
				max={100}
				aria-label="Supplier import progress"
				getValueLabel={(value, max) => `${value} of ${max} rows imported`}
			/>
		</div>
	),
};

export const LifecycleAndCompletion: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Progress value and workflow lifecycle are separate signals. A value of 100 means the measured work reached its bound; StatusBadge or feature-owned result feedback confirms whether the operation committed, failed, or requires reconciliation.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Measured work complete, commit pending">
				<Card className="shadow-none">
					<CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
						<div className="grid gap-1">
							<CardTitle>Ledger export</CardTitle>
							<CardDescription>
								All 1,240 rows written to the transfer package.
							</CardDescription>
						</div>
						<StatusBadge size="sm" status="pending" label="Confirming commit" />
					</CardHeader>
					<CardContent className="grid gap-2">
						<div className="flex justify-between text-sm">
							<span className="text-foreground-secondary">Rows written</span>
							<span className="font-medium tabular-nums">1,240 / 1,240</span>
						</div>
						<Progress
							value={1240}
							max={1240}
							aria-label="Ledger export row progress"
							getValueLabel={(value, max) => `${value} of ${max} rows written`}
						/>
					</CardContent>
				</Card>
			</StorySection>
			<StorySection title="Failure is not represented by reversing the bar">
				<p className="text-sm leading-6 text-foreground-secondary">
					Keep the last trustworthy measured value and present failure through
					the owning job state or error surface. Do not reset to zero or colour
					a full bar as the only failure signal.
				</p>
			</StorySection>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Progress preserves operation name and exact value in constrained workbench regions. Supporting text may wrap; the bar remains full-width and must not become the only carrier of meaning.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-8">
			<StorySection title="Narrow job panel">
				<div className="w-full max-w-xs rounded-lg border p-4">
					<div className="grid gap-3">
						<div className="grid gap-1 text-sm">
							<span className="text-foreground-secondary">
								Validating supplier master-data import
							</span>
							<span className="font-medium tabular-nums">320 of 500 rows</span>
						</div>
						<Progress
							value={320}
							max={500}
							aria-label="Supplier import validation progress"
							getValueLabel={(value, max) =>
								`${value} of ${max} rows validated`
							}
						/>
					</div>
				</div>
			</StorySection>
			<StorySection title="Wide operational surface">
				<div className="grid gap-2">
					<div className="flex flex-wrap justify-between gap-2 text-sm">
						<span className="text-foreground-secondary">
							Generating consolidated close package
						</span>
						<span className="font-medium tabular-nums">84%</span>
					</div>
					<Progress
						value={84}
						aria-label="Consolidated close package progress"
					/>
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
					"Progress exposes role=progressbar with valuemin, valuemax, valuenow, and valuetext. Name each bar when several share a surface.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-4">
			<div className="grid gap-2">
				<p className="text-sm font-medium">Document upload</p>
				<Progress
					value={25}
					aria-label="Document upload progress"
					getValueLabel={(value) => `${value} percent uploaded`}
				/>
			</div>
			<div className="grid gap-2">
				<p className="text-sm font-medium">Permission sync</p>
				<Progress
					value={80}
					aria-label="Permission sync progress"
					getValueLabel={(value) => `${value} percent synced`}
				/>
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const upload = canvas.getByRole("progressbar", {
			name: "Document upload progress",
		});
		await expect(upload).toHaveAttribute("aria-valuenow", "25");
		await expect(upload).toHaveAttribute(
			"aria-valuetext",
			"25 percent uploaded",
		);
		await expect(
			canvas.getByRole("progressbar", { name: "Permission sync progress" }),
		).toHaveAttribute("aria-valuenow", "80");
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose Progress inside a job Card with StatusBadge for lifecycle and a cancel action. Failure remains a separate notice — not a full bar.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-xl shadow-none">
			<CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
				<div className="grid gap-1">
					<CardTitle>Bank statement import</CardTitle>
					<CardDescription>Statement file STM-441 · 1,240 rows</CardDescription>
				</div>
				<StatusBadge size="sm" status="pending" label="In progress" />
			</CardHeader>
			<CardContent className="grid gap-3">
				<div className="flex justify-between text-sm">
					<span className="text-foreground-secondary">Rows processed</span>
					<span className="font-medium tabular-nums">740 / 1,240</span>
				</div>
				<Progress
					value={740}
					max={1240}
					aria-label="Bank statement import progress"
					getValueLabel={(value, max) => `${value} of ${max} rows processed`}
				/>
			</CardContent>
			<CardFooter className="justify-end gap-2">
				<Button type="button" variant="outline">
					Cancel
				</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do use Progress for known bounded work with text. Do not fabricate percentages for indeterminate work — use Spinner instead.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: bounded value with label">
				<div className="grid gap-2">
					<p className="text-sm text-foreground-secondary">
						Reconciliation 72% complete
					</p>
					<Progress value={72} aria-label="Bank reconciliation progress" />
				</div>
			</StorySection>
			<StorySection title="Do not: fake percent for unknown total">
				<div className="flex items-center gap-3 rounded-lg border px-4 py-3">
					<Spinner label="Waiting for server response" />
					<p className="text-sm text-foreground-secondary">
						Waiting for the posting service — total work is unknown.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
