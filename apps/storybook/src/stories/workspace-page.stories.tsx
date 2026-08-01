import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	WorkspacePage,
	WorkspacePageContent,
	WorkspacePageHeader,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence } from "./evidence";

const evidence = contractEvidence("ui.workspace-page");

const meta = {
	title: "UI System/Workspace Page",
	component: WorkspacePage,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Workspace Page"),
	},
} satisfies Meta<typeof WorkspacePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		docs: {
			description: {
				story:
					"One canonical workspace region owns responsive page geometry and composes page identity through PageHeader. Feature content remains domain-owned.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<WorkspacePage aria-label="Sales workspace">
				<WorkspacePageHeader
					description="Review customer commitments, fulfillment readiness, and posting status."
					scope="Operator · Sales"
					title="Sales orders"
				/>
				<WorkspacePageContent>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Order register</CardTitle>
							<CardDescription>
								24 orders · updated 01 Aug 2026, 14:30 MYT
							</CardDescription>
						</CardHeader>
						<CardContent className="text-foreground-secondary text-sm">
							Feature-owned filters, records, actions, and state render in this
							content region without recreating page geometry.
						</CardContent>
					</Card>
				</WorkspacePageContent>
			</WorkspacePage>
		</div>
	),
};
