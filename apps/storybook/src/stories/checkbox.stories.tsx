import { Checkbox } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Forms/Checkbox",
	component: Checkbox,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Checkbox surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="checkbox" />,
	play: interactionFor("checkbox"),
};
