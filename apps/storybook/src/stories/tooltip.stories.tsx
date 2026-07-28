import { Tooltip } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Overlays/Tooltip",
	component: Tooltip,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Tooltip surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="tooltip" />,
	play: interactionFor("tooltip"),
};
