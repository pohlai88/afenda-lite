import { Slider } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Forms/Slider",
	component: Slider,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Slider surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="slider" />,
};
