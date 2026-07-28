import { Tabs } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Navigation/Tabs",
	component: Tabs,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Tabs surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="tabs" />,
	play: interactionFor("tabs"),
};
