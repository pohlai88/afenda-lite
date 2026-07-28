import { Kbd } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Display/Keyboard Key",
	component: Kbd,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Keyboard Key surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="kbd" />,
};
