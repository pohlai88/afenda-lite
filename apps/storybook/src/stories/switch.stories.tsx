import { Switch } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Forms/Switch",
	component: Switch,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Switch surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="switch" />,
	play: interactionFor("switch"),
};
