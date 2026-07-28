import { Sidebar } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Navigation/Sidebar",
	component: Sidebar,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Sidebar surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="sidebar" />,
};
