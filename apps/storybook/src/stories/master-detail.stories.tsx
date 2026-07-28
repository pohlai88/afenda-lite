import { MasterDetail } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Layout/Master Detail",
	component: MasterDetail,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned MasterDetail surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof MasterDetail>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="master-detail" />,
};
