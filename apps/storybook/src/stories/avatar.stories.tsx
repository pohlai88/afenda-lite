import { Avatar } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";

const meta = {
	title: "UI System/Display/Avatar",
	component: Avatar,
	tags: ["autodocs", "test", "visual"],
	parameters: {
		docs: {
			description: {
				component:
					"Afenda-owned Avatar surface. The overview covers supported variants and applicable states.",
			},
		},
	},
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	render: () => <ComponentShowcase component="avatar" />,
};
