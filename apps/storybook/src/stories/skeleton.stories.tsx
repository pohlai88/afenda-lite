import { Skeleton } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Feedback/Skeleton",
	component: Skeleton,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Skeleton surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="skeleton" />,
};
