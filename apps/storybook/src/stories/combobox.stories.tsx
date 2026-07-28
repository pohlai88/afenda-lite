import { Combobox } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Forms/Combobox",
	component: Combobox,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Combobox surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="combobox" />,
	play: interactionFor("combobox"),
};
