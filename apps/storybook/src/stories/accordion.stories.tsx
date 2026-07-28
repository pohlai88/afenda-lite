import { Accordion } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Display/Accordion",
	component: Accordion,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Accordion surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="accordion" />,
	play: interactionFor("accordion"),
};
