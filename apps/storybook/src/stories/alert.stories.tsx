import { Alert } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Feedback/Alert",
	component: Alert,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Alert surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="alert" />,
};
