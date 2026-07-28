import { Popover } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Overlays/Popover",
	component: Popover,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Popover surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="popover" />,
	play: interactionFor("popover"),
};
