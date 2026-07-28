import { Toolbar } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnterpriseComponentShowcase } from "./enterprise-catalog";

const meta = {
	title: "UI System/Actions/Toolbar",
	component: Toolbar,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Toolbar surface with supported enterprise states and responsive presentation.",
			},
		},
	},
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <EnterpriseComponentShowcase component="toolbar" />,
};
