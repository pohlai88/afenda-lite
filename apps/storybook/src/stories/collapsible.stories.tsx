import { Collapsible } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Display/Collapsible",
	component: Collapsible,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Collapsible surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="collapsible" />,
	play: interactionFor("collapsible"),
};
