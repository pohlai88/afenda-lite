import { BulkActionBar } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Actions/Bulk Action Bar",
	component: BulkActionBar,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned BulkActionBar surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof BulkActionBar>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="bulk-action-bar" />,
};
