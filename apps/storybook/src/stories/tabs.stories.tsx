import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	KeyValue,
	StatusBadge,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.tabs");

const meta = {
	title: "UI System/Tabs",
	component: Tabs,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Tabs"),
	},
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One invoice record Card: peer Overview and Activity panels. Tabs owns panel selection — not routing authorization or workflow steps.",
			},
		},
	},
	play: interactionFor("tabs"),
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounts receivable</Badge>
						<StatusBadge size="sm" status="pending" label="Awaiting evidence" />
					</div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Invoice INV-1048
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Tabs switch peer views of one local context. Feature code owns URL
						sync, permissions, and panel loading.
					</p>
				</header>

				<section className="grid gap-3" aria-labelledby="tabs-invoice-title">
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="tabs-invoice-title"
						>
							Record views
						</h2>
						<p className="text-sm text-foreground-secondary">
							Peer panels — not a sequential stepper.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>INV-1048</CardTitle>
							<CardDescription>
								Northwind Trading · MYR 18,420.00 · Due 15 Aug 2026
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Tabs defaultValue="overview">
								<TabsList>
									<TabsTrigger value="overview">Overview</TabsTrigger>
									<TabsTrigger value="activity">Activity</TabsTrigger>
									<TabsTrigger value="disabled" disabled>
										Disabled
									</TabsTrigger>
								</TabsList>
								<TabsContent value="overview" className="rounded-md border p-4">
									<p className="text-sm text-foreground-secondary">
										Finance contact Aisha Rahman · Remittance currency MYR
									</p>
								</TabsContent>
								<TabsContent value="activity" className="rounded-md border p-4">
									Recent activity
								</TabsContent>
							</Tabs>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button type="button" size="sm" variant="outline">
								Open full record
							</Button>
						</CardFooter>
					</Card>
				</section>
			</div>
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Approved Tabs job: selection among peer content panels in one local context. Keep labels short and stable.",
			},
		},
	},
	render: () => (
		<div className="w-full max-w-lg">
			<Tabs defaultValue="terms">
				<TabsList>
					<TabsTrigger value="terms">Terms</TabsTrigger>
					<TabsTrigger value="contacts">Contacts</TabsTrigger>
				</TabsList>
				<TabsContent value="terms" className="rounded-md border p-4">
					<p className="text-sm text-foreground-secondary">Net 30 · MYR</p>
				</TabsContent>
				<TabsContent value="contacts" className="rounded-md border p-4">
					<p className="text-sm text-foreground-secondary">
						finance@northwind.example
					</p>
				</TabsContent>
			</Tabs>
		</div>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"TabsList variants default and line. Variant changes chrome — not panel semantics.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-lg gap-6">
			<StorySection
				title="default"
				description="Contained tab list with grouped control background."
			>
				<Tabs defaultValue="overview">
					<TabsList variant="default">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="activity">Activity</TabsTrigger>
					</TabsList>
					<TabsContent value="overview" className="pt-3 text-sm">
						default panel
					</TabsContent>
					<TabsContent value="activity" className="pt-3 text-sm">
						Activity panel
					</TabsContent>
				</Tabs>
			</StorySection>
			<StorySection
				title="line"
				description="Underline-style list for lighter surface chrome."
			>
				<Tabs defaultValue="overview">
					<TabsList variant="line">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="activity">Activity</TabsTrigger>
					</TabsList>
					<TabsContent value="overview" className="pt-3 text-sm">
						line panel
					</TabsContent>
					<TabsContent value="activity" className="pt-3 text-sm">
						Activity panel
					</TabsContent>
				</Tabs>
			</StorySection>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Selected, peer, and disabled tabs. Disabled presentation does not replace authorization checks.",
			},
		},
	},
	render: () => (
		<div className="w-full max-w-lg">
			<Tabs defaultValue="overview">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="activity">Activity</TabsTrigger>
					<TabsTrigger value="audit" disabled>
						Audit (restricted)
					</TabsTrigger>
				</TabsList>
				<TabsContent value="overview" className="rounded-md border p-4 text-sm">
					Selected panel remains keyboard reachable with visible focus.
				</TabsContent>
				<TabsContent value="activity" className="rounded-md border p-4 text-sm">
					Peer panel content
				</TabsContent>
			</Tabs>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose Tabs with KeyValue inside a Card. Actions stay on the footer — tabs stay peer views.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<CardTitle>Supplier SUP-004821</CardTitle>
				<CardDescription>
					Peer identity and remittance panels for Northwind Trading.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="identity">
					<TabsList variant="line">
						<TabsTrigger value="identity">Identity</TabsTrigger>
						<TabsTrigger value="remittance">Remittance</TabsTrigger>
					</TabsList>
					<TabsContent value="identity" className="pt-4">
						<KeyValue label="Legal name" value="Northwind Trading Sdn. Bhd." />
					</TabsContent>
					<TabsContent value="remittance" className="pt-4">
						<KeyValue label="Currency" value="MYR" />
					</TabsContent>
				</Tabs>
			</CardContent>
			<CardFooter className="justify-end border-t">
				<Button type="button" size="sm">
					Edit supplier
				</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Do: peer views of one subject. Do not: use Tabs as a stepper or hide unauthorized content as the only auth control.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<StorySection
				title="Do"
				description="Peer panels for one invoice record."
			>
				<Tabs defaultValue="overview">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="lines">Lines</TabsTrigger>
					</TabsList>
					<TabsContent value="overview" className="pt-3 text-sm">
						INV-1048 summary
					</TabsContent>
					<TabsContent value="lines" className="pt-3 text-sm">
						Line items
					</TabsContent>
				</Tabs>
			</StorySection>
			<StorySection
				title="Do not"
				description="Do not encode sequential workflow steps as tabs."
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<Tabs defaultValue="step-1">
						<TabsList>
							<TabsTrigger value="step-1">1 · Draft</TabsTrigger>
							<TabsTrigger value="step-2">2 · Approve</TabsTrigger>
							<TabsTrigger value="step-3">3 · Post</TabsTrigger>
						</TabsList>
						<TabsContent value="step-1" className="pt-3 text-sm">
							Step content
						</TabsContent>
					</Tabs>
					<p className="text-xs text-destructive">
						Sequential posting belongs in Stepper — not Tabs.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
