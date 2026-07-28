import { Sheet } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Overlays/Sheet",
	component: Sheet,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Sheet surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="sheet" />,
	play: interactionFor("sheet"),
};
