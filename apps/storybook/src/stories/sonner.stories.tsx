import { Toaster } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Feedback/Sonner",
	component: Toaster,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Sonner surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="sonner" />,
};
