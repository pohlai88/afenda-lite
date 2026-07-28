import { Toggle } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Forms/Toggle",
	component: Toggle,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Toggle surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="toggle" />,
	play: interactionFor("toggle"),
};
