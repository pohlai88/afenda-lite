import {
	Badge,
	Button,
	EntityHeader,
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

const evidence = contractEvidence("ui.page-header");
const meta = {
	title: "UI System/Layout/Page Header",
	component: PageHeader,
	tags: ["autodocs", "test"],
	parameters: {
		docs: { description: { component: evidenceDescription(evidence) } },
	},
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: () => <EnterpriseComponentShowcase component="page-header" />,
};

export const Usage: Story = {
	render: () => (
		<PageHeader>
			<div>
				<PageHeaderHeading>Supplier invoices</PageHeaderHeading>
				<PageHeaderDescription>
					Review approval and posting readiness.
				</PageHeaderDescription>
			</div>
			<PageHeaderActions>
				<Button variant="outline">Export</Button>
				<Button>New invoice</Button>
			</PageHeaderActions>
		</PageHeader>
	),
};

export const StatesAndAccessibility: Story = {
	render: () => (
		<PageHeader aria-labelledby="invoice-page-title">
			<div>
				<PageHeaderHeading id="invoice-page-title">
					Accounts payable
				</PageHeaderHeading>
				<PageHeaderDescription>
					One page-level heading identifies this workspace.
				</PageHeaderDescription>
			</div>
		</PageHeader>
	),
};

export const Composition: Story = {
	render: () => (
		<EntityHeader
			title="INV-1042"
			status={<Badge>Approved</Badge>}
			description="Northwind Trading Sdn. Bhd."
			metadata={
				<>
					<span>MYR 18,420.00</span>
					<span>Due 15 Aug 2026</span>
				</>
			}
			actions={<Button variant="outline">More actions</Button>}
		/>
	),
};

export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6">
			<StorySection title="Do: one clear page heading">
				<PageHeaderHeading>Purchase orders</PageHeaderHeading>
			</StorySection>
			<StorySection title="Do not: let actions compete with the title">
				<p className="text-sm text-foreground-secondary">
					Keep secondary commands visually subordinate to the page subject.
				</p>
			</StorySection>
		</div>
	),
};
