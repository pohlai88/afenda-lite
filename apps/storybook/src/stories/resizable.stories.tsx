import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.resizable");

const RESIZABLE_MATURITY_DOCTRINE =
	"Resizable benchmarks enterprise workspace maturity rather than another product’s appearance. It must allocate space only between peer panes, expose a visible keyboard-operable separator, preserve usable minimum sizes under zoom and narrow layouts, allow feature-owned preference persistence, and never encode selection, priority, authorization, or business state in dimensions.";

const meta = {
	title: "UI System/Resizable",
	component: ResizablePanelGroup,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Resizable"),
		docs: {
			description: {
				component: RESIZABLE_MATURITY_DOCTRINE,
			},
		},
	},
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One payables master-detail workspace demonstrates operator-controlled space allocation between peer list and detail panes. Dimensions are layout preferences only and never communicate selection, priority, authority, or workflow status.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounts payable
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Invoice workspace
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Drag or use the keyboard-operable handle to allocate space. Feature
						code owns minimum sizes, persistence, responsive fallback, and
						selection.
					</p>
					<p className="max-w-5xl text-xs leading-5 text-foreground-tertiary">
						Operational standard: separator purpose, focus, pane relationships,
						and required controls must remain usable at minimum size, zoom, and
						high contrast.
					</p>
				</header>

				<ResizablePanelGroup
					orientation="horizontal"
					className="h-[28rem] rounded-lg border bg-card"
				>
					<ResizablePanel defaultSize="36%" minSize="24%">
						<div className="flex h-full flex-col gap-3 bg-muted/40 p-4">
							<p className="text-sm font-medium text-foreground">
								Open invoices
							</p>
							<ul className="grid gap-2 text-sm">
								<li className="rounded-md border bg-card px-3 py-2">
									INV-1048 · Northwind
								</li>
								<li className="rounded-md border border-transparent px-3 py-2 text-foreground-secondary">
									INV-1042 · Contoso
								</li>
								<li className="rounded-md border border-transparent px-3 py-2 text-foreground-secondary">
									INV-1039 · Fabrikam
								</li>
							</ul>
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="64%" minSize="40%">
						<div className="flex h-full flex-col gap-2 p-5">
							<p className="text-lg font-semibold tracking-tight">INV-1048</p>
							<p className="text-sm text-foreground-secondary">
								Northwind Trading Sdn. Bhd. · MYR 18,420.00 · Due 15 Aug 2026
							</p>
							<p className="mt-4 text-sm text-foreground-secondary">
								Detail pane content stays reachable at the declared minimum
								size.
							</p>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
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
					"Use horizontal orientation for side-by-side peers and vertical orientation for stacked peers. Orientation and initial proportions describe workspace layout only; they do not encode semantic priority.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-8">
			<StorySection title="Horizontal · list and detail">
				<ResizablePanelGroup
					orientation="horizontal"
					className="h-56 rounded-lg border"
				>
					<ResizablePanel defaultSize="40%" minSize="25%">
						<div className="flex h-full items-center justify-center bg-muted/40 p-4 text-sm">
							<button type="button" className="sr-only">
								Focus master list pane
							</button>
							Master list
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="60%" minSize="35%">
						<div className="flex h-full items-center justify-center p-4 text-sm">
							<button type="button" className="sr-only">
								Focus record detail pane
							</button>
							Record detail
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</StorySection>
			<StorySection title="Vertical · preview and evidence">
				<ResizablePanelGroup
					orientation="vertical"
					className="h-64 rounded-lg border"
				>
					<ResizablePanel defaultSize="55%" minSize="30%">
						<div className="flex h-full items-center justify-center p-4 text-sm">
							<button type="button" className="sr-only">
								Focus document preview pane
							</button>
							Document preview · invoice-1048.pdf
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="45%" minSize="25%">
						<div className="flex h-full items-center justify-center bg-muted/40 p-4 text-sm">
							<button type="button" className="sr-only">
								Focus evidence notes pane
							</button>
							Evidence notes
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
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
					"Declare intentional default and minimum sizes, test pane content at those limits, and keep a visible handle available to keyboard and pointer operators.",
			},
		},
	},
	render: () => (
		<ResizablePanelGroup
			orientation="horizontal"
			className="h-48 w-full max-w-5xl rounded-lg border"
		>
			<ResizablePanel defaultSize="30%" minSize="20%">
				<div className="flex h-full items-center justify-center bg-muted/40 text-sm">
					Filters
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize="70%" minSize="40%">
				<div className="flex h-full items-center justify-center text-sm">
					Results
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"The separator exposes orientation and remains focusable. Keyboard resizing must be possible, and minimum sizes must keep required controls, labels, and scrolling regions reachable at supported zoom levels.",
			},
		},
	},
	render: () => (
		<ResizablePanelGroup
			orientation="horizontal"
			className="h-52 w-full max-w-5xl rounded-lg border"
		>
			<ResizablePanel defaultSize="45%" minSize="30%">
				<div className="grid h-full gap-2 p-4">
					<p className="text-sm font-medium">Supplier list</p>
					<p className="text-sm text-foreground-secondary">
						Required controls stay usable at minSize.
					</p>
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize="55%" minSize="35%">
				<div className="grid h-full gap-2 p-4">
					<p className="text-sm font-medium">Supplier detail</p>
					<p className="text-sm text-foreground-secondary">
						Panel size is layout preference only.
					</p>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose Resizable inside a clearly bounded workspace shell. Feature code may persist user layout preference, but dimensions must never carry business state or replace responsive layout decisions.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-3">
			<p className="text-sm text-foreground-secondary">
				Goods receipt GRN-2201 · document and checklist
			</p>
			<ResizablePanelGroup
				orientation="vertical"
				className="h-72 rounded-lg border bg-card"
			>
				<ResizablePanel defaultSize="60%" minSize="35%">
					<div className="flex h-full flex-col justify-center gap-1 p-5">
						<button type="button" className="sr-only">
							Focus packing list preview pane
						</button>
						<p className="text-sm font-medium">Packing list preview</p>
						<p className="text-sm text-foreground-secondary">
							grn-2201-packing-list.pdf
						</p>
					</div>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel defaultSize="40%" minSize="25%">
					<div className="flex h-full flex-col justify-center gap-1 bg-muted/40 p-5">
						<button type="button" className="sr-only">
							Focus receiving checklist pane
						</button>
						<p className="text-sm font-medium">Receiving checklist</p>
						<p className="text-sm text-foreground-secondary">
							Quantity, lot, and damage checks
						</p>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do use Resizable for peer workspace panes with tested minimum sizes and visible separators. Do not use it for ordinary spacing, semantic priority, or hiding required controls.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: peer panes with minSize">
				<ResizablePanelGroup
					orientation="horizontal"
					className="h-40 rounded-lg border"
				>
					<ResizablePanel defaultSize="40%" minSize="25%">
						<div className="flex h-full items-center justify-center text-sm">
							List
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="60%" minSize="35%">
						<div className="flex h-full items-center justify-center text-sm">
							Detail
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</StorySection>
			<StorySection title="Do not: decorative page gutters">
				<p className="text-sm text-foreground-secondary">
					Margins, section spacing, and Card gaps are layout primitives — not
					Resizable panels. Do not encode approval priority in panel width.
				</p>
			</StorySection>

			<StorySection title="Do: test minimum-size content">
				<p className="text-sm text-foreground-secondary">
					At minSize, pane headings, required controls, and local scrolling must
					remain operable without overlapping the separator.
				</p>
			</StorySection>

			<StorySection title="Do not: persist dimensions as domain data">
				<p className="text-sm text-foreground-secondary">
					A 70% detail pane is a user preference, not evidence that an invoice
					is selected, important, approved, or authorized.
				</p>
			</StorySection>
		</div>
	),
};
