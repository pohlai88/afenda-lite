import {
	Badge,
	Button,
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

const evidence = contractEvidence("ui.card");
const meta = {
	title: "UI System/Display/Card",
	component: Card,
	tags: ["autodocs", "test"],
	parameters: {
		docs: { description: { component: evidenceDescription(evidence) } },
	},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: () => <ComponentShowcase component="card" />,
};

export const Usage: Story = {
	render: () => (
		<Card className="w-[28rem]">
			<CardHeader>
				<CardTitle>Supplier account</CardTitle>
				<CardDescription>Northwind Trading Sdn. Bhd.</CardDescription>
				<CardAction>
					<Badge variant="outline">Verified</Badge>
				</CardAction>
			</CardHeader>
			<CardContent>Payment terms: Net 30</CardContent>
		</Card>
	),
};

export const StatesAndAccessibility: Story = {
	render: () => (
		<Card className="w-[28rem]" aria-labelledby="card-record-title">
			<CardHeader>
				<CardTitle id="card-record-title">Invoice INV-1042</CardTitle>
				<CardDescription>Awaiting supporting evidence.</CardDescription>
			</CardHeader>
			<CardContent>MYR 18,420.00</CardContent>
			<CardFooter>
				<Button variant="outline">Attach evidence</Button>
			</CardFooter>
		</Card>
	),
};

export const Composition: Story = {
	render: () => (
		<div className="grid gap-4 sm:grid-cols-2">
			{["Open invoices", "Overdue invoices"].map((title, index) => (
				<Card key={title}>
					<CardHeader>
						<CardTitle>{title}</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-semibold">
						{index === 0 ? "128" : "14"}
					</CardContent>
				</Card>
			))}
		</div>
	),
};

export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: represent one record">
				<Card>
					<CardHeader>
						<CardTitle>Invoice INV-1042</CardTitle>
					</CardHeader>
					<CardContent>Northwind Trading · MYR 18,420.00</CardContent>
				</Card>
			</StorySection>
			<StorySection title="Do not: use a card only for spacing">
				<Card>
					<CardContent className="pt-6">Unrelated page content</CardContent>
				</Card>
			</StorySection>
		</div>
	),
};
