import { Empty } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Feedback/Empty",
	component: Empty,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Empty surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="empty" />,
};
