import { AlertDialog } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import { interactionFor } from "./interactions";

const meta = {
	title: "UI System/Overlays/Alert Dialog",
	component: AlertDialog,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Alert Dialog surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="alert-dialog" />,
	play: interactionFor("alert-dialog"),
};
